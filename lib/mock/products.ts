import { getStore } from "@/lib/mock/store";
import type { Product } from "@/lib/types";

/** Catalogue produits pour le POS — lit le store mock partagé. */
export function getCatalogProducts() {
  return getStore().products.filter((p) => p.isActive);
}

export const mockProducts = getCatalogProducts();

export function searchProducts(query: string, products?: Product[]) {
  const source = products ?? getCatalogProducts();
  const q = query.trim().toLowerCase();
  if (!q) return source;

  return source.filter(
    (product) =>
      product.name.toLowerCase().includes(q) ||
      product.sku.toLowerCase().includes(q),
  );
}

export function findProductByCode(code: string, products?: Product[]) {
  const source = products ?? getCatalogProducts();
  const normalized = code.trim().toLowerCase();
  if (!normalized) return undefined;

  return source.find((product) => product.sku.toLowerCase() === normalized);
}
