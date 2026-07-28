import { createId, getStore, touch } from "@/lib/mock/store";
import { createMovement } from "@/lib/repositories/movements";
import { getProduct } from "@/lib/repositories/products";
import { getSupplier } from "@/lib/repositories/suppliers";
import type {
  Purchase,
  PurchaseItem,
  PurchaseStatus,
  RepoResult,
} from "@/lib/types";

export type PurchaseItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type PurchaseInput = {
  supplierId: string;
  notes?: string;
  items: PurchaseItemInput[];
  purchasedAt?: Date;
};

function buildReference(date = new Date()) {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = String(getStore().purchases.length + 1).padStart(3, "0");
  return `ACH-${stamp}-${suffix}`;
}

export function listPurchases() {
  return [...getStore().purchases].sort(
    (a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime(),
  );
}

export function getPurchase(id: string) {
  return getStore().purchases.find((item) => item.id === id) ?? null;
}

export function createPurchase(input: PurchaseInput): RepoResult<Purchase> {
  const supplier = getSupplier(input.supplierId);
  if (!supplier) return { ok: false, error: "Fournisseur introuvable" };
  if (!input.items.length) return { ok: false, error: "Ajoutez au moins une ligne" };

  const purchaseId = createId("pu");
  const items: PurchaseItem[] = [];

  for (const line of input.items) {
    const product = getProduct(line.productId);
    if (!product) return { ok: false, error: "Produit introuvable" };
    if (line.quantity <= 0) return { ok: false, error: "Quantite invalide" };

    items.push({
      id: createId("pui"),
      purchaseId,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      quantity: Math.trunc(line.quantity),
      unitPrice: Math.max(0, line.unitPrice),
    });
  }

  const now = touch();
  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  const purchase: Purchase = {
    id: purchaseId,
    reference: buildReference(now),
    supplierId: supplier.id,
    supplierName: supplier.name,
    status: "PENDING",
    totalAmount,
    notes: input.notes?.trim() || undefined,
    purchasedAt: input.purchasedAt ?? now,
    items,
    createdAt: now,
    updatedAt: now,
  };

  getStore().purchases.unshift(purchase);
  return { ok: true, data: purchase };
}

export function updatePurchase(
  id: string,
  input: PurchaseInput,
): RepoResult<Purchase> {
  const store = getStore();
  const index = store.purchases.findIndex((p) => p.id === id);
  if (index < 0) return { ok: false, error: "Achat introuvable" };

  const current = store.purchases[index];
  if (current.status !== "PENDING") {
    return { ok: false, error: "Seul un achat en attente peut etre modifie" };
  }

  const supplier = getSupplier(input.supplierId);
  if (!supplier) return { ok: false, error: "Fournisseur introuvable" };
  if (!input.items.length) return { ok: false, error: "Ajoutez au moins une ligne" };

  const items: PurchaseItem[] = [];
  for (const line of input.items) {
    const product = getProduct(line.productId);
    if (!product) return { ok: false, error: "Produit introuvable" };
    items.push({
      id: createId("pui"),
      purchaseId: current.id,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      quantity: Math.trunc(line.quantity),
      unitPrice: Math.max(0, line.unitPrice),
    });
  }

  const updated: Purchase = {
    ...current,
    supplierId: supplier.id,
    supplierName: supplier.name,
    notes: input.notes?.trim() || undefined,
    items,
    totalAmount: items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    ),
    updatedAt: touch(),
  };
  store.purchases[index] = updated;
  return { ok: true, data: updated };
}

export function setPurchaseStatus(
  id: string,
  status: PurchaseStatus,
): RepoResult<Purchase> {
  const store = getStore();
  const index = store.purchases.findIndex((p) => p.id === id);
  if (index < 0) return { ok: false, error: "Achat introuvable" };

  const current = store.purchases[index];
  if (current.status === status) return { ok: true, data: current };

  if (status === "RECEIVED") {
    if (current.status !== "PENDING") {
      return { ok: false, error: "Cet achat ne peut pas etre recu" };
    }
    for (const item of current.items) {
      const movement = createMovement({
        productId: item.productId,
        type: "IN",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        reference: current.reference,
        notes: "Reception achat",
      });
      if (!movement.ok) return movement;
    }
  }

  if (status === "CANCELLED" && current.status === "RECEIVED") {
    return { ok: false, error: "Un achat deja recu ne peut pas etre annule" };
  }

  const updated: Purchase = {
    ...current,
    status,
    updatedAt: touch(),
  };
  store.purchases[index] = updated;
  return { ok: true, data: updated };
}
