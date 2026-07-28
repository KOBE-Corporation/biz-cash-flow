import { createId, getStore, touch } from "@/lib/mock/store";
import type { Product, RepoResult } from "@/lib/types";

export type ProductInput = {
  name: string;
  sku: string;
  description?: string;
  quantity?: number;
  minStock?: number;
  purchasePrice: number;
  salePrice: number;
  categoryId: string;
  supplierId?: string;
  isActive?: boolean;
};

export function listProducts() {
  return [...getStore().products].sort((a, b) =>
    a.name.localeCompare(b.name, "fr"),
  );
}

export function getProduct(id: string) {
  return getStore().products.find((item) => item.id === id) ?? null;
}

export function createProduct(input: ProductInput): RepoResult<Product> {
  const name = input.name.trim();
  const sku = input.sku.trim().toUpperCase();
  if (!name) return { ok: false, error: "Le nom est obligatoire" };
  if (!sku) return { ok: false, error: "Le SKU est obligatoire" };
  if (!input.categoryId) return { ok: false, error: "La categorie est obligatoire" };

  const store = getStore();
  if (!store.categories.some((c) => c.id === input.categoryId)) {
    return { ok: false, error: "Categorie introuvable" };
  }
  if (
    input.supplierId &&
    !store.suppliers.some((s) => s.id === input.supplierId)
  ) {
    return { ok: false, error: "Fournisseur introuvable" };
  }
  if (store.products.some((p) => p.sku.toLowerCase() === sku.toLowerCase())) {
    return { ok: false, error: "Ce SKU existe deja" };
  }

  const now = touch();
  const product: Product = {
    id: createId("p"),
    name,
    sku,
    description: input.description?.trim() || undefined,
    quantity: Math.max(0, input.quantity ?? 0),
    minStock: Math.max(0, input.minStock ?? 0),
    purchasePrice: Math.max(0, input.purchasePrice),
    salePrice: Math.max(0, input.salePrice),
    isActive: input.isActive ?? true,
    categoryId: input.categoryId,
    supplierId: input.supplierId || undefined,
    createdAt: now,
    updatedAt: now,
  };
  store.products.push(product);
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

  if (
    store.products.some(
      (p) => p.id !== id && p.sku.toLowerCase() === sku.toLowerCase(),
    )
  ) {
    return { ok: false, error: "Ce SKU existe deja" };
  }

  const current = store.products[index];
  const updated: Product = {
    ...current,
    name,
    sku,
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
    isActive: input.isActive ?? current.isActive,
    categoryId: input.categoryId,
    supplierId: input.supplierId || undefined,
    updatedAt: touch(),
  };
  store.products[index] = updated;
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

  const before = store.products.length;
  store.products = store.products.filter((p) => p.id !== id);
  store.movements = store.movements.filter((m) => m.productId !== id);
  if (store.products.length === before) {
    return { ok: false, error: "Produit introuvable" };
  }
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
