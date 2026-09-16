import { createId, getStore, touch } from "@/lib/mock/store";
import { getActor, recordAudit } from "@/lib/repositories/audit";
import { getCategory } from "@/lib/repositories/categories";
import {
  generateBarcode,
  templatesToProductPrices,
} from "@/lib/sales/pricing";
import {
  analyzeCatalogPricing,
  formatCatalogBelowCostError,
  productPricingDiff,
} from "@/lib/sales/pricing-guard";
import type { Product, ProductPackPrice, RepoResult } from "@/lib/types";

export type ProductInput = {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  quantity?: number;
  minStock?: number;
  purchasePrice: number;
  salePrice: number;
  categoryId: string;
  supplierId?: string;
  baseUnitName?: string;
  packLevels?: ProductPackPrice[];
  isActive?: boolean;
  manufacturedAt?: Date | null;
  expiresAt?: Date | null;
  batchNumber?: string | null;
  serialNumber?: string | null;
};

export function listProducts() {
  return [...getStore().products].sort((a, b) =>
    a.name.localeCompare(b.name, "fr"),
  );
}

export function getProduct(id: string) {
  return getStore().products.find((item) => item.id === id) ?? null;
}

export function findProductByBarcode(barcode: string) {
  const code = barcode.trim();
  if (!code) return null;
  return (
    getStore().products.find(
      (p) => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase(),
    ) ?? null
  );
}

export function createProduct(input: ProductInput): RepoResult<Product> {
  const name = input.name.trim();
  const sku = input.sku.trim().toUpperCase();
  if (!name) return { ok: false, error: "Le nom est obligatoire" };
  if (!sku) return { ok: false, error: "Le SKU est obligatoire" };
  if (!input.categoryId) return { ok: false, error: "La categorie est obligatoire" };

  const category = getCategory(input.categoryId);
  if (!category) return { ok: false, error: "Categorie introuvable" };

  const store = getStore();
  if (
    input.supplierId &&
    !store.suppliers.some((s) => s.id === input.supplierId)
  ) {
    return { ok: false, error: "Fournisseur introuvable" };
  }
  if (store.products.some((p) => p.sku.toLowerCase() === sku.toLowerCase())) {
    return { ok: false, error: "Ce SKU existe deja" };
  }

  const barcode = (input.barcode?.trim() || generateBarcode(sku)).replace(
    /\s/g,
    "",
  );
  if (store.products.some((p) => p.barcode === barcode)) {
    return { ok: false, error: "Ce code-barres existe deja" };
  }

  const actor = getActor();
  const baseUnitName = input.baseUnitName?.trim() || category.baseUnitName;
  const packLevels =
    input.packLevels?.length
      ? input.packLevels
      : templatesToProductPrices(category.packLevels, input.purchasePrice);

  const salePrice = Math.max(
    0,
    input.salePrice || packLevels[0]?.salePrice || 0,
  );
  const purchasePrice = Math.max(0, input.purchasePrice);
  const catalogCheck = analyzeCatalogPricing(
    salePrice,
    purchasePrice,
    packLevels,
  );
  if (!catalogCheck.ok) {
    recordAudit({
      action: "BELOW_COST",
      entityType: "Product",
      summary: `Creation produit a perte bloquee : ${name} — ${actor.name}`,
      metadata: {
        blocked: true,
        cashierId: actor.id,
        cashierName: actor.name,
        breaches: catalogCheck.breaches,
        purchasePrice,
        salePrice,
      },
    });
    return {
      ok: false,
      error: formatCatalogBelowCostError(name, catalogCheck.breaches),
    };
  }

  const now = touch();
  const product: Product = {
    id: createId("p"),
    name,
    sku,
    barcode,
    description: input.description?.trim() || undefined,
    quantity: Math.max(0, input.quantity ?? 0),
    minStock: Math.max(0, input.minStock ?? 0),
    purchasePrice,
    salePrice,
    baseUnitName,
    packLevels,
    isActive: input.isActive ?? true,
    categoryId: input.categoryId,
    supplierId: input.supplierId || undefined,
    manufacturedAt: input.manufacturedAt ?? undefined,
    expiresAt: input.expiresAt ?? undefined,
    batchNumber: input.batchNumber?.trim() || undefined,
    serialNumber: input.serialNumber?.trim() || undefined,
    createdById: actor.id,
    createdByName: actor.name,
    createdAt: now,
    updatedAt: now,
  };
  store.products.push(product);
  recordAudit({
    action: "CREATE",
    entityType: "Product",
    entityId: product.id,
    summary: `Produit cree : ${product.name} (${product.sku})`,
    metadata: {
      cashierId: actor.id,
      cashierName: actor.name,
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
    },
  });
  return { ok: true, data: product };
}

export function updateProduct(
  id: string,
  input: ProductInput,
): RepoResult<Product> {
  const store = getStore();
  const index = store.products.findIndex((p) => p.id === id);
  if (index < 0) return { ok: false, error: "Produit introuvable" };

  const name = input.name.trim();
  const sku = input.sku.trim().toUpperCase();
  if (!name) return { ok: false, error: "Le nom est obligatoire" };
  if (!sku) return { ok: false, error: "Le SKU est obligatoire" };
  if (!input.categoryId) return { ok: false, error: "La categorie est obligatoire" };

  const category = getCategory(input.categoryId);
  if (!category) return { ok: false, error: "Categorie introuvable" };

  if (
    store.products.some(
      (p) => p.id !== id && p.sku.toLowerCase() === sku.toLowerCase(),
    )
  ) {
    return { ok: false, error: "Ce SKU existe deja" };
  }

  const barcode = (
    input.barcode?.trim() ||
    store.products[index].barcode ||
    generateBarcode(sku)
  ).replace(/\s/g, "");
  if (store.products.some((p) => p.id !== id && p.barcode === barcode)) {
    return { ok: false, error: "Ce code-barres existe deja" };
  }

  const actor = getActor();
  const current = store.products[index];
  const packLevels =
    input.packLevels?.length
      ? input.packLevels
      : templatesToProductPrices(
          category.packLevels,
          input.purchasePrice,
          current.packLevels,
        );

  const updated: Product = {
    ...current,
    name,
    sku,
    barcode,
    description: input.description?.trim() || undefined,
    quantity:
      input.quantity !== undefined
        ? Math.max(0, input.quantity)
        : current.quantity,
    minStock:
      input.minStock !== undefined
        ? Math.max(0, input.minStock)
        : current.minStock,
    purchasePrice: Math.max(0, input.purchasePrice),
    salePrice: Math.max(0, input.salePrice),
    baseUnitName: input.baseUnitName?.trim() || category.baseUnitName,
    packLevels,
    isActive: input.isActive ?? current.isActive,
    categoryId: input.categoryId,
    supplierId: input.supplierId || undefined,
    manufacturedAt:
      input.manufacturedAt === null
        ? undefined
        : (input.manufacturedAt ?? current.manufacturedAt),
    expiresAt:
      input.expiresAt === null
        ? undefined
        : (input.expiresAt ?? current.expiresAt),
    batchNumber:
      input.batchNumber === null
        ? undefined
        : input.batchNumber !== undefined
          ? input.batchNumber.trim() || undefined
          : current.batchNumber,
    serialNumber:
      input.serialNumber === null
        ? undefined
        : input.serialNumber !== undefined
          ? input.serialNumber.trim() || undefined
          : current.serialNumber,
    updatedById: actor.id,
    updatedByName: actor.name,
    updatedAt: touch(),
  };

  const diff = productPricingDiff(current, updated);
  const catalogCheck = analyzeCatalogPricing(
    updated.salePrice,
    updated.purchasePrice,
    updated.packLevels,
  );

  const saleSideTouched = diff.saleChanged || diff.packsChanged;
  // Prix vente / packs sous cout : interdit.
  // Exception : hausse du seul cout d'achat (reception / correction) —
  // autorisee mais tracee ; la caisse bloquera toute vente a perte.
  if (!catalogCheck.ok && saleSideTouched) {
    recordAudit({
      action: "BELOW_COST",
      entityType: "Product",
      entityId: id,
      summary: `Tentative prix catalogue a perte bloquee : ${updated.name} — ${actor.name}`,
      metadata: {
        blocked: true,
        cashierId: actor.id,
        cashierName: actor.name,
        breaches: catalogCheck.breaches,
        ...diff,
      },
    });
    return {
      ok: false,
      error: formatCatalogBelowCostError(updated.name, catalogCheck.breaches),
    };
  }

  store.products[index] = updated;

  if (diff.anyPriceChange) {
    const parts: string[] = [];
    if (diff.purchaseChanged) {
      parts.push(
        `cout ${diff.before.purchasePrice}→${diff.after.purchasePrice}`,
      );
    }
    if (diff.saleChanged) {
      parts.push(`vente ${diff.before.salePrice}→${diff.after.salePrice}`);
    }
    if (diff.packsChanged) parts.push("packs");
    recordAudit({
      action: "PRICE_CHANGE",
      entityType: "Product",
      entityId: updated.id,
      summary: `Prix modifies : ${updated.name} (${parts.join(", ")}) — ${actor.name}`,
      metadata: {
        cashierId: actor.id,
        cashierName: actor.name,
        catalogBelowCost: !catalogCheck.ok,
        ...diff,
      },
    });
  }

  if (!catalogCheck.ok && diff.purchaseChanged && !saleSideTouched) {
    recordAudit({
      action: "BELOW_COST",
      entityType: "Product",
      entityId: updated.id,
      summary: `Cout > prix vente apres maj cout : ${updated.name} — corriger le prix vente — ${actor.name}`,
      metadata: {
        blocked: false,
        catalogBelowCost: true,
        cashierId: actor.id,
        cashierName: actor.name,
        breaches: catalogCheck.breaches,
        ...diff,
      },
    });
  }

  recordAudit({
    action: "UPDATE",
    entityType: "Product",
    entityId: updated.id,
    summary: `Produit mis a jour : ${updated.name}`,
    metadata: {
      priceChange: diff.anyPriceChange,
      catalogBelowCost: !catalogCheck.ok,
      cashierId: actor.id,
      cashierName: actor.name,
    },
  });
  return { ok: true, data: updated };
}

export function removeProduct(id: string): RepoResult<true> {
  const store = getStore();
  const usedInInvoice = store.invoices.some((inv) =>
    inv.items.some((item) => item.productId === id),
  );
  const usedInPurchase = store.purchases.some((pu) =>
    pu.items.some((item) => item.productId === id),
  );
  if (usedInInvoice || usedInPurchase) {
    return {
      ok: false,
      error: "Produit utilise dans des factures/achats — desactivez-le",
    };
  }

  const product = store.products.find((p) => p.id === id);
  const before = store.products.length;
  store.products = store.products.filter((p) => p.id !== id);
  store.movements = store.movements.filter((m) => m.productId !== id);
  store.supplierOffers = store.supplierOffers.filter((o) => o.productId !== id);
  if (store.products.length === before) {
    return { ok: false, error: "Produit introuvable" };
  }
  recordAudit({
    action: "DELETE",
    entityType: "Product",
    entityId: id,
    summary: `Produit supprime : ${product?.name ?? id}`,
  });
  return { ok: true, data: true };
}

export function adjustProductQuantity(productId: string, delta: number) {
  const store = getStore();
  const product = store.products.find((p) => p.id === productId);
  if (!product) return null;
  product.quantity = Math.max(0, product.quantity + delta);
  product.updatedAt = touch();
  return product;
}
