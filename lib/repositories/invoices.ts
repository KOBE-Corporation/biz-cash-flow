import { createId, getStore, touch } from "@/lib/mock/store";
import { getActor, recordAudit } from "@/lib/repositories/audit";
import {
  postRefundCash,
  postSaleCash,
} from "@/lib/repositories/cash-ledger";
import { createMovement } from "@/lib/repositories/movements";
import { siteConfig } from "@/lib/constants/site";
import { paymentMethodLabels } from "@/lib/sales/cart";
import type {
  CreditNote,
  CreditNoteItem,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  PaymentMethod,
  RepoResult,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

/** Solde restant du a encaisser (apres paiements et avoirs). */
export function getInvoiceBalance(invoice: Invoice) {
  return Math.max(
    0,
    invoice.totalAmount - (invoice.amountPaid ?? 0) - (invoice.creditedAmount ?? 0),
  );
}

export function isInvoiceOpen(invoice: Invoice) {
  return (
    invoice.status !== "CANCELLED" && getInvoiceBalance(invoice) > 0
  );
}

export function deriveInvoiceStatus(invoice: Invoice): InvoiceStatus {
  if (invoice.status === "CANCELLED") return "CANCELLED";
  if (invoice.status === "DRAFT") return "DRAFT";
  const balance = getInvoiceBalance(invoice);
  if (balance <= 0) return "PAID";
  if ((invoice.amountPaid ?? 0) > 0) return "PARTIALLY_PAID";
  return "SENT";
}

export function listInvoices() {
  return [...getStore().invoices].sort(
    (a, b) => b.issuedAt.getTime() - a.issuedAt.getTime(),
  );
}

export function listCreditNotes(invoiceId?: string) {
  const notes = getStore().creditNotes;
  const filtered = invoiceId
    ? notes.filter((n) => n.invoiceId === invoiceId)
    : notes;
  return [...filtered].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export function getInvoice(id: string) {
  return getStore().invoices.find((item) => item.id === id) ?? null;
}

export function listInvoiceIssuers() {
  const map = new Map<string, string>();
  for (const inv of getStore().invoices) {
    map.set(inv.issuedById, inv.issuedByName);
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export function countInvoicesByStatus() {
  const invoices = getStore().invoices;
  const open = invoices.filter(isInvoiceOpen);
  return {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "PAID").length,
    unpaid: open.length,
    cancelled: invoices.filter((i) => i.status === "CANCELLED").length,
    draft: invoices.filter((i) => i.status === "DRAFT").length,
    sent: invoices.filter((i) => i.status === "SENT").length,
    partiallyPaid: invoices.filter((i) => i.status === "PARTIALLY_PAID")
      .length,
    paidTotal: invoices
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + i.totalAmount, 0),
    unpaidTotal: open.reduce((sum, i) => sum + getInvoiceBalance(i), 0),
    cancelledTotal: invoices
      .filter((i) => i.status === "CANCELLED")
      .reduce((sum, i) => sum + i.totalAmount, 0),
  };
}

export function updateInvoiceNotes(
  id: string,
  notes: string,
): RepoResult<Invoice> {
  const store = getStore();
  const index = store.invoices.findIndex((inv) => inv.id === id);
  if (index < 0) return { ok: false, error: "Facture introuvable" };

  const updated: Invoice = {
    ...store.invoices[index],
    notes: notes.trim() || undefined,
    updatedAt: touch(),
  };
  store.invoices[index] = updated;
  recordAudit({
    action: "UPDATE",
    entityType: "Invoice",
    entityId: id,
    summary: `Notes facture maj : ${updated.number}`,
  });
  return { ok: true, data: updated };
}

function restoreStockFromItems(
  items: Array<Pick<InvoiceItem, "productId" | "productName" | "unitPrice" | "unitsOfBase" | "quantity" | "packName">>,
  reference: string,
  notePrefix: string,
): RepoResult<true> {
  for (const item of items) {
    if (!item.productId) continue;
    const units = item.unitsOfBase ?? item.quantity;
    if (units <= 0) continue;
    const movement = createMovement({
      productId: item.productId,
      type: "IN",
      quantity: units,
      unitPrice: item.unitPrice,
      reference,
      notes: `${notePrefix} ${item.packName ?? ""}`.trim(),
    });
    if (!movement.ok) {
      return {
        ok: false,
        error: `Impossible de restocker « ${item.productName} » : ${movement.error}`,
      };
    }
  }
  return { ok: true, data: true };
}

function restoreStockFromInvoice(invoice: Invoice): RepoResult<true> {
  return restoreStockFromItems(
    invoice.items,
    invoice.number,
    "Annulation vente — retour stock",
  );
}

/**
 * Enregistre un encaissement (total ou partiel) sur une facture a credit / partielle.
 */
export function recordInvoicePayment(
  id: string,
  amount: number,
  paymentMethod: PaymentMethod = "CASH",
): RepoResult<Invoice> {
  if (paymentMethod === "CREDIT") {
    return { ok: false, error: "Choisissez Especes ou Mobile Money pour encaisser" };
  }
  const store = getStore();
  const index = store.invoices.findIndex((inv) => inv.id === id);
  if (index < 0) return { ok: false, error: "Facture introuvable" };

  const current = store.invoices[index];
  if (current.status === "CANCELLED") {
    return { ok: false, error: "Facture annulee" };
  }

  const balance = getInvoiceBalance(current);
  if (balance <= 0) {
    return { ok: false, error: "Facture deja soldée" };
  }

  const pay = Math.min(Math.max(0, Math.round(amount)), balance);
  if (pay <= 0) return { ok: false, error: "Montant invalide" };

  const now = touch();
  const cash = postSaleCash({
    invoiceId: current.id,
    invoiceNumber: current.number,
    amount: pay,
    paymentMethod,
    occurredAt: now,
    customerName: current.customerName,
  });
  if (!cash.ok) return cash;

  const amountPaid = (current.amountPaid ?? 0) + pay;
  const draft: Invoice = {
    ...current,
    amountPaid,
    paymentMethod:
      current.paymentMethod === "CREDIT" ? paymentMethod : current.paymentMethod,
    updatedAt: now,
  };
  draft.status = deriveInvoiceStatus(draft);
  store.invoices[index] = draft;

  recordAudit({
    action: "UPDATE",
    entityType: "Invoice",
    entityId: id,
    summary: `Encaissement ${formatCurrency(pay)} sur ${draft.number}`,
    metadata: { amount: pay, paymentMethod },
  });
  return { ok: true, data: draft };
}

/** Relance client : marque la date et renvoie le texte pret a envoyer. */
export function markInvoiceReminder(id: string): RepoResult<{
  invoice: Invoice;
  message: string;
  whatsappUrl: string;
  mailtoUrl: string;
}> {
  const store = getStore();
  const index = store.invoices.findIndex((inv) => inv.id === id);
  if (index < 0) return { ok: false, error: "Facture introuvable" };

  const current = store.invoices[index];
  if (!isInvoiceOpen(current)) {
    return { ok: false, error: "Aucun solde a relancer" };
  }

  const now = touch();
  const updated: Invoice = {
    ...current,
    lastReminderAt: now,
    updatedAt: now,
  };
  store.invoices[index] = updated;

  const share = buildInvoiceSharePayload(updated);
  recordAudit({
    action: "OTHER",
    entityType: "Invoice",
    entityId: id,
    summary: `Relance envoyee : ${updated.number}`,
  });

  return {
    ok: true,
    data: {
      invoice: updated,
      message: share.text,
      whatsappUrl: share.whatsappUrl,
      mailtoUrl: share.mailtoUrl,
    },
  };
}

export function buildInvoiceSharePayload(invoice: Invoice) {
  const balance = getInvoiceBalance(invoice);
  const lines = invoice.items
    .map(
      (item) =>
        `• ${item.productName} × ${item.quantity} = ${formatCurrency(item.quantity * item.unitPrice)}`,
    )
    .join("\n");

  const text = [
    `${siteConfig.name} — Facture ${invoice.number}`,
    `Client : ${invoice.customerName}`,
    `Date : ${formatShareDate(invoice.issuedAt)}`,
    `Paiement : ${paymentMethodLabels[invoice.paymentMethod]}`,
    `Statut : ${statusLabel(invoice.status)}`,
    "",
    lines,
    "",
    `Total : ${formatCurrency(invoice.totalAmount)}`,
    invoice.creditedAmount > 0
      ? `Avoirs : −${formatCurrency(invoice.creditedAmount)}`
      : null,
    `Deja paye : ${formatCurrency(invoice.amountPaid ?? 0)}`,
    balance > 0 ? `Reste a payer : ${formatCurrency(balance)}` : "Soldee",
    invoice.notes ? `Note : ${invoice.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const phone = normalizePhone(invoice.customerPhone);
  const whatsappUrl = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(`${siteConfig.name} — ${invoice.number}`)}&body=${encodeURIComponent(text)}`;

  return { text, whatsappUrl, mailtoUrl };
}

function normalizePhone(raw?: string) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  return digits;
}

function formatShareDate(date: Date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function statusLabel(status: InvoiceStatus) {
  const labels: Record<InvoiceStatus, string> = {
    DRAFT: "Brouillon",
    SENT: "A credit",
    PARTIALLY_PAID: "Partiel",
    PAID: "Payee",
    CANCELLED: "Annulee",
  };
  return labels[status];
}

/**
 * Change le statut d'une facture.
 * Annulation d'une facture encaisee : remboursement caisse + retour stock.
 */
export function setInvoiceStatus(
  id: string,
  status: InvoiceStatus,
  options?: { cancelReason?: string },
): RepoResult<Invoice> {
  const store = getStore();
  const index = store.invoices.findIndex((inv) => inv.id === id);
  if (index < 0) return { ok: false, error: "Facture introuvable" };

  const current = store.invoices[index];
  if (current.status === status) return { ok: true, data: current };

  if (current.status === "CANCELLED" && status !== "CANCELLED") {
    return { ok: false, error: "Une facture annulee ne peut pas etre reactivee" };
  }

  const actor = getActor();
  const now = touch();

  if (status === "CANCELLED") {
    const reason = options?.cancelReason?.trim() ?? "";
    if (reason.length < 3) {
      return {
        ok: false,
        error: "Motif d'annulation obligatoire (3 caracteres min.)",
      };
    }

    const paid = current.amountPaid ?? 0;
    if (paid > 0) {
      const refund = postRefundCash({
        invoiceId: current.id,
        invoiceNumber: current.number,
        amount: paid,
        paymentMethod:
          current.paymentMethod === "CREDIT" ? "CASH" : current.paymentMethod,
        occurredAt: now,
      });
      if (!refund.ok) return refund;
    }

    // Restock du solde non deja couvert par des avoirs
    const credited = current.creditedAmount ?? 0;
    const restockAmount = Math.max(0, current.totalAmount - credited);
    if (restockAmount > 0) {
      const stockItems =
        credited > 0
          ? scaleItemsForAmount(current.items, restockAmount)
          : current.items;
      const stock = restoreStockFromItems(
        stockItems,
        current.number,
        "Annulation vente — retour stock",
      );
      if (!stock.ok) return stock;
    }

    const updated: Invoice = {
      ...current,
      status: "CANCELLED",
      cancelledAt: now,
      cancelledById: actor.id,
      cancelledByName: actor.name,
      cancelReason: reason,
      notes: current.notes
        ? `${current.notes}\n[Annulation] ${reason}`
        : `[Annulation] ${reason}`,
      updatedAt: now,
    };
    store.invoices[index] = updated;
    recordAudit({
      action: "CANCEL",
      entityType: "Invoice",
      entityId: id,
      summary: `Facture annulee : ${updated.number} — ${reason}`,
      metadata: {
        previousStatus: current.status,
        amount: updated.totalAmount,
        reason,
      },
    });
    return { ok: true, data: updated };
  }

  if (status === "PAID" && current.status !== "PAID") {
    const balance = getInvoiceBalance(current);
    if (balance > 0) {
      const sale = postSaleCash({
        invoiceId: current.id,
        invoiceNumber: current.number,
        amount: balance,
        paymentMethod:
          current.paymentMethod === "CREDIT" ? "CASH" : current.paymentMethod,
        occurredAt: current.issuedAt,
        customerName: current.customerName,
      });
      if (!sale.ok) return sale;
      current.amountPaid = (current.amountPaid ?? 0) + balance;
    }
  }

  const updated: Invoice = {
    ...current,
    status,
    amountPaid: current.amountPaid,
    updatedAt: now,
  };
  if (status === "PAID") {
    updated.status = "PAID";
  }
  store.invoices[index] = updated;
  recordAudit({
    action: "UPDATE",
    entityType: "Invoice",
    entityId: id,
    summary: `Facture ${status.toLowerCase()} : ${updated.number}`,
  });
  return { ok: true, data: updated };
}

/** Alias explicite pour l'UI — motif obligatoire. */
export function cancelInvoice(
  id: string,
  cancelReason: string,
): RepoResult<Invoice> {
  return setInvoiceStatus(id, "CANCELLED", { cancelReason });
}

/**
 * Cree un avoir (note de credit) : rembourse le cash deja encaisse
 * (dans la limite) + restock des lignes choisies + reduit le solde.
 */
export function createCreditNote(input: {
  invoiceId: string;
  amount: number;
  reason: string;
  itemIds?: string[];
}): RepoResult<{ creditNote: CreditNote; invoice: Invoice }> {
  const reason = input.reason.trim();
  if (reason.length < 3) {
    return { ok: false, error: "Motif obligatoire (3 caracteres min.)" };
  }

  const store = getStore();
  const index = store.invoices.findIndex((inv) => inv.id === input.invoiceId);
  if (index < 0) return { ok: false, error: "Facture introuvable" };

  const current = store.invoices[index];
  if (current.status === "CANCELLED") {
    return { ok: false, error: "Facture annulee" };
  }

  const maxCredit =
    current.totalAmount - (current.creditedAmount ?? 0);
  const amount = Math.min(Math.max(0, Math.round(input.amount)), maxCredit);
  if (amount <= 0) {
    return { ok: false, error: "Montant d'avoir invalide" };
  }

  const selectedItems: CreditNoteItem[] = (
    input.itemIds?.length
      ? current.items.filter((i) => input.itemIds!.includes(i.id))
      : current.items
  ).map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    productSku: item.productSku,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unitsOfBase: item.unitsOfBase,
    packName: item.packName,
  }));

  // Restock proportionnel si montant partiel sans selection precise
  const stockItems =
    input.itemIds?.length
      ? selectedItems
      : scaleItemsForAmount(current.items, amount);

  const actor = getActor();
  const now = touch();
  const noteNumber = buildCreditNoteNumber(now);

  const stock = restoreStockFromItems(
    stockItems,
    noteNumber,
    `Avoir ${noteNumber} — retour stock`,
  );
  if (!stock.ok) return stock;

  // Rembourse le cash deja encaisse, dans la limite de amountPaid
  const refundable = Math.min(amount, current.amountPaid ?? 0);
  if (refundable > 0) {
    const refund = postRefundCash({
      invoiceId: current.id,
      invoiceNumber: current.number,
      amount: refundable,
      paymentMethod:
        current.paymentMethod === "CREDIT" ? "CASH" : current.paymentMethod,
      occurredAt: now,
    });
    if (!refund.ok) return refund;
  }

  const creditNote: CreditNote = {
    id: createId("cn"),
    number: noteNumber,
    invoiceId: current.id,
    invoiceNumber: current.number,
    amount,
    reason,
    items: stockItems,
    createdAt: now,
    createdById: actor.id,
    createdByName: actor.name,
  };
  store.creditNotes.unshift(creditNote);

  const draft: Invoice = {
    ...current,
    amountPaid: Math.max(0, (current.amountPaid ?? 0) - refundable),
    creditedAmount: (current.creditedAmount ?? 0) + amount,
    updatedAt: now,
  };
  draft.status = deriveInvoiceStatus(draft);
  store.invoices[index] = draft;

  recordAudit({
    action: "UPDATE",
    entityType: "CreditNote",
    entityId: creditNote.id,
    summary: `Avoir ${creditNote.number} : ${formatCurrency(amount)} sur ${current.number}`,
    metadata: { reason, refundable },
  });

  return { ok: true, data: { creditNote, invoice: draft } };
}

/** Repartit un montant d'avoir sur les lignes (stock proportionnel). */
function scaleItemsForAmount(
  items: InvoiceItem[],
  amount: number,
): CreditNoteItem[] {
  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  if (total <= 0) return [];
  const ratio = Math.min(1, amount / total);
  return items
    .map((item) => {
      const units = Math.max(
        1,
        Math.round((item.unitsOfBase ?? item.quantity) * ratio),
      );
      const qty = Math.max(1, Math.round(item.quantity * ratio));
      return {
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: qty,
        unitPrice: item.unitPrice,
        unitsOfBase: units,
        packName: item.packName,
      };
    })
    .filter((i) => (i.unitsOfBase ?? i.quantity) > 0);
}

function buildCreditNoteNumber(date = new Date()) {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join("");
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `AV-${stamp}-${suffix}`;
}

/** Utilise par le POS mock — synchronise facture + journal caisse. */
export function addInvoice(
  invoice: Omit<Invoice, "id" | "createdAt" | "updatedAt" | "amountPaid" | "creditedAmount"> & {
    id?: string;
    amountPaid?: number;
    creditedAmount?: number;
  },
) {
  const now = touch();
  const isCredit = invoice.paymentMethod === "CREDIT";
  const amountPaid =
    invoice.amountPaid ??
    (isCredit || invoice.status === "SENT" || invoice.status === "DRAFT"
      ? 0
      : invoice.totalAmount);
  const creditedAmount = invoice.creditedAmount ?? 0;

  const full: Invoice = {
    ...invoice,
    id: invoice.id ?? createId("inv"),
    amountPaid,
    creditedAmount,
    createdAt: now,
    updatedAt: now,
  };
  full.status = deriveInvoiceStatus(full);
  getStore().invoices.unshift(full);

  if (amountPaid > 0 && full.status !== "CANCELLED") {
    postSaleCash({
      invoiceId: full.id,
      invoiceNumber: full.number,
      amount: amountPaid,
      paymentMethod:
        full.paymentMethod === "CREDIT" ? "CASH" : full.paymentMethod,
      occurredAt: full.issuedAt,
      customerName: full.customerName,
    });
  }

  recordAudit({
    action: "SALE",
    entityType: "Invoice",
    entityId: full.id,
    summary: isCredit
      ? `Vente a credit : ${full.number} (${full.totalAmount})`
      : `Vente enregistree : ${full.number} (${full.totalAmount})`,
  });

  return full;
}
