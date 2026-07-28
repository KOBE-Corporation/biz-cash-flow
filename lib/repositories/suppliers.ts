import { createId, getStore, touch } from "@/lib/mock/store";
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

  const now = touch();
  const supplier: Supplier = {
    id: createId("s"),
    name,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    address: input.address?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
  getStore().suppliers.push(supplier);
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

  const current = store.suppliers[index];
  const updated: Supplier = {
    ...current,
    name,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    address: input.address?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    isActive: input.isActive ?? current.isActive,
    updatedAt: touch(),
  };
  store.suppliers[index] = updated;
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
  const before = store.suppliers.length;
  store.suppliers = store.suppliers.filter((s) => s.id !== id);
  if (store.suppliers.length === before) {
    return { ok: false, error: "Fournisseur introuvable" };
  }
  return { ok: true, data: true };
}
