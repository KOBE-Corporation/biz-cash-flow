import { createId, getStore, touch } from "@/lib/mock/store";
import { getActor, recordAudit } from "@/lib/repositories/audit";
import {
  countOffersForSupplier,
  deleteOffersForSupplier,
  listOffersForProduct,
  listOffersForSupplier,
} from "@/lib/repositories/offers";
import type {
  Product,
  ProductSupplierOffer,
  Purchase,
  RepoResult,
  Supplier,
} from "@/lib/types";

export type SupplierInput = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
};

export type SupplierSummary = Supplier & {
  productCount: number;
  purchaseCount: number;
  pendingPurchaseCount: number;
  receivedPurchaseCount: number;
  offerCount: number;
  receivedSpend: number;
  pendingSpend: number;
  lastPurchaseAt: Date | null;
};

export type SupplierPriceEdge = {
  productId: string;
  productName: string;
  productSku: string;
  offers: Array<{
    supplierId: string;
    supplierName: string;
    costPerBaseUnit: number;
    purchasePackName: string;
    packPurchasePrice: number;
  }>;
  bestCost: number;
  thisSupplierCost: number;
  isBest: boolean;
  potentialSavingPerBase: number;
};

export type SupplierDetail = SupplierSummary & {
  products: Product[];
  purchases: Purchase[];
  offers: Array<
    ProductSupplierOffer & { productName: string; productSku: string }
  >;
  priceEdges: SupplierPriceEdge[];
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

export function countProductsForSupplier(supplierId: string) {
  return getStore().products.filter((p) => p.supplierId === supplierId).length;
}

function buildSummary(supplier: Supplier): SupplierSummary {
  const store = getStore();
  const purchases = store.purchases.filter((p) => p.supplierId === supplier.id);
  const received = purchases.filter((p) => p.status === "RECEIVED");
  const pending = purchases.filter((p) => p.status === "PENDING");
  const lastPurchaseAt =
    purchases
      .map((p) => p.purchasedAt)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return {
    ...supplier,
    productCount: store.products.filter((p) => p.supplierId === supplier.id)
      .length,
    purchaseCount: purchases.length,
    pendingPurchaseCount: pending.length,
    receivedPurchaseCount: received.length,
    offerCount: countOffersForSupplier(supplier.id),
    receivedSpend: received.reduce((s, p) => s + p.totalAmount, 0),
    pendingSpend: pending.reduce((s, p) => s + p.totalAmount, 0),
    lastPurchaseAt,
  };
}

export function listSupplierSummaries(): SupplierSummary[] {
  return listSuppliers().map(buildSummary);
}

export function getSupplierOverview() {
  const summaries = listSupplierSummaries();
  const active = summaries.filter((s) => s.isActive);
  const inactive = summaries.filter((s) => !s.isActive);
  const withPending = summaries.filter((s) => s.pendingPurchaseCount > 0);
  const totalReceivedSpend = summaries.reduce(
    (s, item) => s + item.receivedSpend,
    0,
  );
  const totalPendingSpend = summaries.reduce(
    (s, item) => s + item.pendingSpend,
    0,
  );
  const topBySpend = [...summaries]
    .sort((a, b) => b.receivedSpend - a.receivedSpend)
    .slice(0, 5);
  return {
    total: summaries.length,
    activeCount: active.length,
    inactiveCount: inactive.length,
    withPendingCount: withPending.length,
    totalReceivedSpend,
    totalPendingSpend,
    topBySpend,
    offerCount: getStore().supplierOffers.length,
  };
}

export function getSupplierDetail(id: string): SupplierDetail | null {
  const supplier = getSupplier(id);
  if (!supplier) return null;

  const store = getStore();
  const summary = buildSummary(supplier);
  const products = store.products
    .filter((p) => p.supplierId === id)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const purchases = store.purchases
    .filter((p) => p.supplierId === id)
    .sort((a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime());

  const productMap = new Map(store.products.map((p) => [p.id, p]));
  const offers = listOffersForSupplier(id).map((offer) => {
    const product = productMap.get(offer.productId);
    return {
      ...offer,
      productName: product?.name ?? "Produit inconnu",
      productSku: product?.sku ?? "—",
    };
  });

  const priceEdges: SupplierPriceEdge[] = [];
  const seenProducts = new Set<string>();
  for (const offer of offers) {
    if (seenProducts.has(offer.productId)) continue;
    seenProducts.add(offer.productId);
    const all = listOffersForProduct(offer.productId);
    if (all.length === 0) continue;
    const costs = all.map((o) => o.costPerBaseUnit);
    const bestCost = Math.min(...costs);
    const thisSupplierCost = Math.min(
      ...all
        .filter((o) => o.supplierId === id)
        .map((o) => o.costPerBaseUnit),
    );
    const worstCost = Math.max(...costs);
    priceEdges.push({
      productId: offer.productId,
      productName: offer.productName,
      productSku: offer.productSku,
      offers: all.map((o) => ({
        supplierId: o.supplierId,
        supplierName: o.supplierName,
        costPerBaseUnit: o.costPerBaseUnit,
        purchasePackName: o.purchasePackName,
        packPurchasePrice: o.packPurchasePrice,
      })),
      bestCost,
      thisSupplierCost,
      isBest: thisSupplierCost <= bestCost,
      potentialSavingPerBase: worstCost - bestCost,
    });
  }

  return {
    ...summary,
    products,
    purchases,
    offers,
    priceEdges: priceEdges.sort(
      (a, b) => b.potentialSavingPerBase - a.potentialSavingPerBase,
    ),
  };
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
  const purgedOffers = deleteOffersForSupplier(id);
  recordAudit({
    action: "DELETE",
    entityType: "Supplier",
    entityId: id,
    summary: `Fournisseur supprime : ${supplier?.name ?? id}${
      purgedOffers > 0 ? ` (${purgedOffers} offre(s) retiree(s))` : ""
    }`,
  });
  return { ok: true, data: true };
}
