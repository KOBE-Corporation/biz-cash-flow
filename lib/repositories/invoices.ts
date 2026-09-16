import { createId, getStore, touch } from "@/lib/mock/store";
import { getActor, recordAudit } from "@/lib/repositories/audit";
import {
  postRefundCash,
  postSaleCash,
} from "@/lib/repositories/cash-ledger";
import type { Invoice, InvoiceStatus, RepoResult } from "@/lib/types";

export function listInvoices() {
  return [...getStore().invoices].sort(
    (a, b) => b.issuedAt.getTime() - a.issuedAt.getTime(),
  );
}

export function getInvoice(id: string) {
  return getStore().invoices.find((item) => item.id === id) ?? null;
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

export function setInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): RepoResult<Invoice> {
  const store = getStore();
  const index = store.invoices.findIndex((inv) => inv.id === id);
  if (index < 0) return { ok: false, error: "Facture introuvable" };

  const current = store.invoices[index];
  if (current.status === "CANCELLED" && status !== "CANCELLED") {
    return { ok: false, error: "Une facture annulee ne peut pas etre reactivee" };
  }

  if (status === "CANCELLED" && current.status === "PAID") {
    const refund = postRefundCash({
      invoiceId: current.id,
      invoiceNumber: current.number,
      amount: current.totalAmount,
      paymentMethod: current.paymentMethod,
    });
    if (!refund.ok) return refund;
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
    updatedAt: touch(),
  };
  store.invoices[index] = updated;
  recordAudit({
    action: status === "CANCELLED" ? "CANCEL" : "UPDATE",
    entityType: "Invoice",
    entityId: id,
    summary: `Facture ${status.toLowerCase()} : ${updated.number}`,
  });
  return { ok: true, data: updated };
}

/** Utilise par le POS mock si on veut synchroniser sans Prisma. */
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
