import { createId, getStore, touch } from "@/lib/mock/store";
import { getActor, recordAudit } from "@/lib/repositories/audit";
import { createMovement } from "@/lib/repositories/movements";
import { upsertSupplierOffer } from "@/lib/repositories/offers";
import { getProduct } from "@/lib/repositories/products";
import { getSupplier } from "@/lib/repositories/suppliers";
import { costPerBaseUnit } from "@/lib/sales/pricing";
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
  purchasePackName?: string;
  unitsPerPurchasePack?: number;
};

export type PurchaseInput = {
  supplierId?: string;
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

function buildItems(
  purchaseId: string,
  inputItems: PurchaseItemInput[],
): RepoResult<PurchaseItem[]> {
  const items: PurchaseItem[] = [];
  for (const line of inputItems) {
    const product = getProduct(line.productId);
    if (!product) return { ok: false, error: "Produit introuvable" };
    if (line.quantity <= 0) return { ok: false, error: "Quantite invalide" };

    const unitsPerPurchasePack = Math.max(
      1,
      Math.trunc(line.unitsPerPurchasePack ?? 1),
    );
    items.push({
      id: createId("pui"),
      purchaseId,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      quantity: Math.trunc(line.quantity),
      unitPrice: Math.max(0, line.unitPrice),
      purchasePackName:
        line.purchasePackName?.trim() || product.baseUnitName || "lot",
      unitsPerPurchasePack,
    });
  }
  return { ok: true, data: items };
}

export function createPurchase(input: PurchaseInput): RepoResult<Purchase> {
  if (!input.items.length) return { ok: false, error: "Ajoutez au moins une ligne" };

  let supplierName: string | undefined;
  if (input.supplierId) {
    const supplier = getSupplier(input.supplierId);
    if (!supplier) return { ok: false, error: "Fournisseur introuvable" };
    supplierName = supplier.name;
  }

  const purchaseId = createId("pu");
  const built = buildItems(purchaseId, input.items);
  if (!built.ok) return built;

  const actor = getActor();
  const now = touch();
  const items = built.data;
  const purchase: Purchase = {
    id: purchaseId,
    reference: buildReference(now),
    supplierId: input.supplierId || undefined,
    supplierName,
    status: "PENDING",
    totalAmount: items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    ),
    notes: input.notes?.trim() || undefined,
    purchasedAt: input.purchasedAt ?? now,
    items,
    createdById: actor.id,
    createdByName: actor.name,
    createdAt: now,
    updatedAt: now,
  };

  getStore().purchases.unshift(purchase);
  recordAudit({
    action: "CREATE",
    entityType: "Purchase",
    entityId: purchase.id,
    summary: `Achat cree : ${purchase.reference}`,
  });
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

  let supplierName: string | undefined;
  if (input.supplierId) {
    const supplier = getSupplier(input.supplierId);
    if (!supplier) return { ok: false, error: "Fournisseur introuvable" };
    supplierName = supplier.name;
  }

  if (!input.items.length) return { ok: false, error: "Ajoutez au moins une ligne" };
  const built = buildItems(current.id, input.items);
  if (!built.ok) return built;

  const actor = getActor();
  const updated: Purchase = {
    ...current,
    supplierId: input.supplierId || undefined,
    supplierName,
    notes: input.notes?.trim() || undefined,
    items: built.data,
    totalAmount: built.data.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    ),
    updatedById: actor.id,
    updatedByName: actor.name,
    updatedAt: touch(),
  };
  store.purchases[index] = updated;
  recordAudit({
    action: "UPDATE",
    entityType: "Purchase",
    entityId: updated.id,
    summary: `Achat mis a jour : ${updated.reference}`,
  });
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

  const actor = getActor();

  if (status === "RECEIVED") {
    if (current.status !== "PENDING") {
      return { ok: false, error: "Cet achat ne peut pas etre recu" };
    }
    for (const item of current.items) {
      const baseQty = item.quantity * item.unitsPerPurchasePack;
      const cost = costPerBaseUnit(item.unitPrice, item.unitsPerPurchasePack);
      const movement = createMovement({
        productId: item.productId,
        type: "IN",
        quantity: baseQty,
        unitPrice: cost,
        reference: current.reference,
        notes: `Reception ${item.quantity} × ${item.purchasePackName}`,
      });
      if (!movement.ok) return movement;

      const product = getProduct(item.productId);
      if (product) {
        product.purchasePrice = cost;
        product.updatedById = actor.id;
        product.updatedByName = actor.name;
        product.updatedAt = touch();
      }

      if (current.supplierId && current.supplierName) {
        upsertSupplierOffer({
          productId: item.productId,
          supplierId: current.supplierId,
          supplierName: current.supplierName,
          packPurchasePrice: item.unitPrice,
          purchasePackName: item.purchasePackName,
          unitsPerPurchasePack: item.unitsPerPurchasePack,
        });
      }
    }
  }

  if (status === "CANCELLED" && current.status === "RECEIVED") {
    return { ok: false, error: "Un achat deja recu ne peut pas etre annule" };
  }

  const updated: Purchase = {
    ...current,
    status,
    updatedById: actor.id,
    updatedByName: actor.name,
    ...(status === "RECEIVED"
      ? { receivedById: actor.id, receivedByName: actor.name }
      : {}),
    ...(status === "CANCELLED"
      ? { cancelledById: actor.id, cancelledByName: actor.name }
      : {}),
    updatedAt: touch(),
  };
  store.purchases[index] = updated;
  recordAudit({
    action:
      status === "RECEIVED"
        ? "RECEIVE"
        : status === "CANCELLED"
          ? "CANCEL"
          : "UPDATE",
    entityType: "Purchase",
    entityId: updated.id,
    summary: `Achat ${status.toLowerCase()} : ${updated.reference}`,
  });
  return { ok: true, data: updated };
}
