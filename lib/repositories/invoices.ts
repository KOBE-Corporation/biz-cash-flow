import { createId, getStore, touch } from "@/lib/mock/store";
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

  const updated: Invoice = {
    ...current,
    status,
    updatedAt: touch(),
  };
  store.invoices[index] = updated;
  return { ok: true, data: updated };
}

/** Utilise par le POS mock si on veut synchroniser sans Prisma. */
export function addInvoice(invoice: Omit<Invoice, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const now = touch();
  const full: Invoice = {
    ...invoice,
    id: invoice.id ?? createId("inv"),
    createdAt: now,
    updatedAt: now,
  };
  getStore().invoices.unshift(full);
  return full;
}
