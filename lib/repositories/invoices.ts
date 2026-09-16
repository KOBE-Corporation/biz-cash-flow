import { createId, getStore, touch } from "@/lib/mock/store";
import { getActor, recordAudit } from "@/lib/repositories/audit";
import {
  postRefundCash,
  postSaleCash,
} from "@/lib/repositories/cash-ledger";
import { createMovement } from "@/lib/repositories/movements";
import type { Invoice, InvoiceStatus, RepoResult } from "@/lib/types";

export function listInvoices() {
  return [...getStore().invoices].sort(
    (a, b) => b.issuedAt.getTime() - a.issuedAt.getTime(),
  );
}

export function getInvoice(id: string) {
  return getStore().invoices.find((item) => item.id === id) ?? null;
}

export function countInvoicesByStatus() {
  const invoices = getStore().invoices;
  return {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "PAID").length,
    cancelled: invoices.filter((i) => i.status === "CANCELLED").length,
    draft: invoices.filter((i) => i.status === "DRAFT").length,
    sent: invoices.filter((i) => i.status === "SENT").length,
    paidTotal: invoices
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + i.totalAmount, 0),
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

function restoreStockFromInvoice(invoice: Invoice): RepoResult<true> {
  for (const item of invoice.items) {
    if (!item.productId) continue;
    const units = item.unitsOfBase ?? item.quantity;
    if (units <= 0) continue;
    const movement = createMovement({
      productId: item.productId,
      type: "IN",
      quantity: units,
      unitPrice: item.unitPrice,
      reference: invoice.number,
      notes: `Annulation vente — retour stock ${item.packName ?? ""}`.trim(),
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

/**
 * Change le statut d'une facture.
 * Annulation d'une facture PAID : remboursement caisse + retour stock.
 */
export function setInvoiceStatus(
  id: string,
  status: InvoiceStatus,
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
    // Remboursement caisse si la vente avait ete encaisee
    if (current.status === "PAID") {
      const refund = postRefundCash({
        invoiceId: current.id,
        invoiceNumber: current.number,
        amount: current.totalAmount,
        paymentMethod: current.paymentMethod,
        occurredAt: now,
      });
      if (!refund.ok) return refund;

      const stock = restoreStockFromInvoice(current);
      if (!stock.ok) return stock;
    }

    const updated: Invoice = {
      ...current,
      status: "CANCELLED",
      cancelledAt: now,
      cancelledById: actor.id,
      cancelledByName: actor.name,
      updatedAt: now,
    };
    store.invoices[index] = updated;
    recordAudit({
      action: "CANCEL",
      entityType: "Invoice",
      entityId: id,
      summary: `Facture annulee : ${updated.number} (${updated.totalAmount}) — stock + caisse`,
      metadata: {
        previousStatus: current.status,
        amount: updated.totalAmount,
      },
    });
    return { ok: true, data: updated };
  }

  if (status === "PAID" && current.status !== "PAID") {
    const sale = postSaleCash({
      invoiceId: current.id,
      invoiceNumber: current.number,
      amount: current.totalAmount,
      paymentMethod: current.paymentMethod,
      occurredAt: current.issuedAt,
      customerName: current.customerName,
    });
    if (!sale.ok) return sale;
  }

  const updated: Invoice = {
    ...current,
    status,
    updatedAt: now,
  };
  store.invoices[index] = updated;
  recordAudit({
    action: "UPDATE",
    entityType: "Invoice",
    entityId: id,
    summary: `Facture ${status.toLowerCase()} : ${updated.number}`,
  });
  return { ok: true, data: updated };
}

/** Alias explicite pour l'UI. */
export function cancelInvoice(id: string): RepoResult<Invoice> {
  return setInvoiceStatus(id, "CANCELLED");
}

/** Utilise par le POS mock — synchronise facture + journal caisse. */
export function addInvoice(
  invoice: Omit<Invoice, "id" | "createdAt" | "updatedAt"> & { id?: string },
) {
  const now = touch();
  const full: Invoice = {
    ...invoice,
    id: invoice.id ?? createId("inv"),
    createdAt: now,
    updatedAt: now,
  };
  getStore().invoices.unshift(full);

  if (full.status === "PAID") {
    postSaleCash({
      invoiceId: full.id,
      invoiceNumber: full.number,
      amount: full.totalAmount,
      paymentMethod: full.paymentMethod,
      occurredAt: full.issuedAt,
      customerName: full.customerName,
    });
  }

  recordAudit({
    action: "SALE",
    entityType: "Invoice",
    entityId: full.id,
    summary: `Vente enregistree : ${full.number} (${full.totalAmount})`,
  });

  return full;
}
