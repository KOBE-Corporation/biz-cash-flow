import { createId, getStore, touch } from "@/lib/mock/store";
import { getActor, recordAudit } from "@/lib/repositories/audit";
import type { RepoResult, Supplier } from "@/lib/types";

export type SupplierInput = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
};

export function listSuppliers() {
  return [...getStore().suppliers].sort((a, b) =>
    a.name.localeCompare(b.name, "fr"),
  );
}

export function getSupplier(id: string) {
  return getStore().suppliers.find((item) => item.id === id) ?? null;
}

export function countPurchasesForSupplier(supplierId: string) {
  return getStore().purchases.filter((p) => p.supplierId === supplierId).length;
}

export function createSupplier(input: SupplierInput): RepoResult<Supplier> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Le nom est obligatoire" };

  const actor = getActor();
  const now = touch();
  const supplier: Supplier = {
    id: createId("s"),
    name,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    address: input.address?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    isActive: input.isActive ?? true,
    createdById: actor.id,
    createdByName: actor.name,
    createdAt: now,
    updatedAt: now,
  };
  getStore().suppliers.push(supplier);
  recordAudit({
    action: "CREATE",
    entityType: "Supplier",
    entityId: supplier.id,
    summary: `Fournisseur cree : ${supplier.name}`,
  });
  return { ok: true, data: supplier };
}

export function updateSupplier(
  id: string,
  input: SupplierInput,
): RepoResult<Supplier> {
  const store = getStore();
  const index = store.suppliers.findIndex((s) => s.id === id);
  if (index < 0) return { ok: false, error: "Fournisseur introuvable" };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Le nom est obligatoire" };

  const actor = getActor();
  const current = store.suppliers[index];
  const updated: Supplier = {
    ...current,
    name,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    address: input.address?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    isActive: input.isActive ?? current.isActive,
    updatedById: actor.id,
    updatedByName: actor.name,
    updatedAt: touch(),
  };
  store.suppliers[index] = updated;
  recordAudit({
    action: "UPDATE",
    entityType: "Supplier",
    entityId: updated.id,
    summary: `Fournisseur mis a jour : ${updated.name}`,
  });
  return { ok: true, data: updated };
}

export function removeSupplier(id: string): RepoResult<true> {
  const store = getStore();
  if (countPurchasesForSupplier(id) > 0) {
    return {
      ok: false,
      error: "Impossible de supprimer : des achats sont lies",
    };
  }
  if (store.products.some((p) => p.supplierId === id)) {
    return {
      ok: false,
      error: "Impossible de supprimer : des produits sont lies",
    };
  }
  const supplier = store.suppliers.find((s) => s.id === id);
  const before = store.suppliers.length;
  store.suppliers = store.suppliers.filter((s) => s.id !== id);
  if (store.suppliers.length === before) {
    return { ok: false, error: "Fournisseur introuvable" };
  }
  recordAudit({
    action: "DELETE",
    entityType: "Supplier",
    entityId: id,
    summary: `Fournisseur supprime : ${supplier?.name ?? id}`,
  });
  return { ok: true, data: true };
}
