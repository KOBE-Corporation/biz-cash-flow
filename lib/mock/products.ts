import type { Product } from "@/lib/types";

export const mockProducts: Product[] = [
  {
    id: "p1",
    name: "Samsung Galaxy S24 Ultra",
    sku: "S24U-256-BLK",
    quantity: 12,
    minStock: 3,
    purchasePrice: 650_000,
    salePrice: 850_000,
    categoryId: "c1",
    supplierId: "s1",
  },
  {
    id: "p2",
    name: "iPhone 15 Pro",
    sku: "IP15P-128-TI",
    quantity: 8,
    minStock: 2,
    purchasePrice: 720_000,
    salePrice: 950_000,
    categoryId: "c1",
    supplierId: "s1",
  },
  {
    id: "p3",
    name: "AirPods Pro 2",
    sku: "APP2-USB-C",
    quantity: 25,
    minStock: 5,
    purchasePrice: 95_000,
    salePrice: 145_000,
    categoryId: "c2",
    supplierId: "s2",
  },
  {
    id: "p4",
    name: "Chargeur USB-C 45W",
    sku: "CHG-45W-UC",
    quantity: 40,
    minStock: 10,
    purchasePrice: 8_000,
    salePrice: 15_000,
    categoryId: "c2",
    supplierId: "s2",
  },
  {
    id: "p5",
    name: "Coque transparente S24U",
    sku: "CASE-S24U-CLR",
    quantity: 0,
    minStock: 5,
    purchasePrice: 2_500,
    salePrice: 7_500,
    categoryId: "c2",
    supplierId: "s2",
  },
  {
    id: "p6",
    name: "Powerbank 20000mAh",
    sku: "PB-20K-BLK",
    quantity: 18,
    minStock: 4,
    purchasePrice: 12_000,
    salePrice: 22_000,
    categoryId: "c2",
    supplierId: "s2",
  },
  {
    id: "p7",
    name: "Cable USB-C 2m",
    sku: "CBL-UC-2M",
    quantity: 2,
    minStock: 8,
    purchasePrice: 1_500,
    salePrice: 4_000,
    categoryId: "c2",
  },
];

export function searchProducts(query: string, products = mockProducts) {
  const q = query.trim().toLowerCase();
  if (!q) return products;

  return products.filter(
    (product) =>
      product.name.toLowerCase().includes(q) ||
      product.sku.toLowerCase().includes(q),
  );
}

export function findProductByCode(code: string, products = mockProducts) {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return undefined;

  return products.find(
    (product) => product.sku.toLowerCase() === normalized,
  );
}
