import { CURRENT_USER } from "@/lib/auth/current-user";
import type {
  Category,
  Invoice,
  Product,
  Purchase,
  StockMovement,
  Supplier,
  User,
} from "@/lib/types";

export function createId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

const now = () => new Date();

const seedUser: User = {
  id: "u1",
  email: CURRENT_USER.email,
  name: CURRENT_USER.name,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const seedCategories: Category[] = [
  {
    id: "c1",
    name: "Smartphones",
    description: "Telephones et accessoires premium",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "c2",
    name: "Accessoires",
    description: "Cables, coques, audio, energie",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "c3",
    name: "Audio",
    description: "Casques et enceintes",
    isActive: true,
    createdAt: new Date("2026-02-01"),
    updatedAt: new Date("2026-02-01"),
  },
];

const seedSuppliers: Supplier[] = [
  {
    id: "s1",
    name: "Tech Distrib SA",
    email: "commandes@techdistrib.ci",
    phone: "+225 07 00 00 01",
    address: "Abidjan, Plateau",
    notes: "Delai 48h",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "s2",
    name: "Access Plus",
    email: "ventes@accessplus.ci",
    phone: "+225 05 00 00 02",
    address: "Abidjan, Cocody",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "s3",
    name: "Global Gadgets",
    email: "hello@globalgadgets.com",
    phone: "+225 01 00 00 03",
    isActive: true,
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-01"),
  },
];

const seedProducts: Product[] = [
  {
    id: "p1",
    name: "Samsung Galaxy S24 Ultra",
    sku: "S24U-256-BLK",
    quantity: 12,
    minStock: 3,
    purchasePrice: 650_000,
    salePrice: 850_000,
    isActive: true,
    categoryId: "c1",
    supplierId: "s1",
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
  },
  {
    id: "p2",
    name: "iPhone 15 Pro",
    sku: "IP15P-128-TI",
    quantity: 8,
    minStock: 2,
    purchasePrice: 720_000,
    salePrice: 950_000,
    isActive: true,
    categoryId: "c1",
    supplierId: "s1",
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
  },
  {
    id: "p3",
    name: "AirPods Pro 2",
    sku: "APP2-USB-C",
    quantity: 25,
    minStock: 5,
    purchasePrice: 95_000,
    salePrice: 145_000,
    isActive: true,
    categoryId: "c2",
    supplierId: "s2",
    createdAt: new Date("2026-01-12"),
    updatedAt: new Date("2026-01-12"),
  },
  {
    id: "p4",
    name: "Chargeur USB-C 45W",
    sku: "CHG-45W-UC",
    quantity: 40,
    minStock: 10,
    purchasePrice: 8_000,
    salePrice: 15_000,
    isActive: true,
    categoryId: "c2",
    supplierId: "s2",
    createdAt: new Date("2026-01-12"),
    updatedAt: new Date("2026-01-12"),
  },
  {
    id: "p5",
    name: "Coque transparente S24U",
    sku: "CASE-S24U-CLR",
    quantity: 0,
    minStock: 5,
    purchasePrice: 2_500,
    salePrice: 7_500,
    isActive: true,
    categoryId: "c2",
    supplierId: "s2",
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
  },
  {
    id: "p6",
    name: "Powerbank 20000mAh",
    sku: "PB-20K-BLK",
    quantity: 18,
    minStock: 4,
    purchasePrice: 12_000,
    salePrice: 22_000,
    isActive: true,
    categoryId: "c2",
    supplierId: "s2",
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
  },
  {
    id: "p7",
    name: "Cable USB-C 2m",
    sku: "CBL-UC-2M",
    quantity: 2,
    minStock: 8,
    purchasePrice: 1_500,
    salePrice: 4_000,
    isActive: true,
    categoryId: "c2",
    createdAt: new Date("2026-01-20"),
    updatedAt: new Date("2026-01-20"),
  },
];

const seedMovements: StockMovement[] = [
  {
    id: "m1",
    productId: "p1",
    productName: "Samsung Galaxy S24 Ultra",
    type: "IN",
    quantity: 12,
    unitPrice: 650_000,
    reference: "ACH-SEED-001",
    createdById: "u1",
    createdAt: new Date("2026-01-10"),
  },
  {
    id: "m2",
    productId: "p7",
    productName: "Cable USB-C 2m",
    type: "OUT",
    quantity: 6,
    reference: "FV-SEED-001",
    createdById: "u1",
    createdAt: new Date("2026-07-20"),
  },
  {
    id: "m3",
    productId: "p5",
    productName: "Coque transparente S24U",
    type: "ADJUSTMENT",
    quantity: -2,
    notes: "Inventaire",
    createdById: "u1",
    createdAt: new Date("2026-07-22"),
  },
];

const seedPurchases: Purchase[] = [
  {
    id: "pu1",
    reference: "ACH-20260701-001",
    supplierId: "s2",
    supplierName: "Access Plus",
    status: "PENDING",
    totalAmount: 160_000,
    notes: "Reassort accessoires",
    purchasedAt: new Date("2026-07-01"),
    items: [
      {
        id: "pui1",
        purchaseId: "pu1",
        productId: "p4",
        productName: "Chargeur USB-C 45W",
        productSku: "CHG-45W-UC",
        quantity: 10,
        unitPrice: 8_000,
      },
      {
        id: "pui2",
        purchaseId: "pu1",
        productId: "p7",
        productName: "Cable USB-C 2m",
        productSku: "CBL-UC-2M",
        quantity: 20,
        unitPrice: 1_500,
      },
    ],
    createdAt: new Date("2026-07-01"),
    updatedAt: new Date("2026-07-01"),
  },
  {
    id: "pu2",
    reference: "ACH-20260615-002",
    supplierId: "s1",
    supplierName: "Tech Distrib SA",
    status: "RECEIVED",
    totalAmount: 1_300_000,
    purchasedAt: new Date("2026-06-15"),
    items: [
      {
        id: "pui3",
        purchaseId: "pu2",
        productId: "p1",
        productName: "Samsung Galaxy S24 Ultra",
        productSku: "S24U-256-BLK",
        quantity: 2,
        unitPrice: 650_000,
      },
    ],
    createdAt: new Date("2026-06-15"),
    updatedAt: new Date("2026-06-20"),
  },
];

const seedInvoices: Invoice[] = [
  {
    id: "inv1",
    number: "FV-20260720-1000",
    customerName: "Client N~1",
    status: "PAID",
    paymentMethod: "CASH",
    subtotal: 22_000,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 22_000,
    amountReceived: 25_000,
    changeDue: 3_000,
    issuedAt: new Date("2026-07-20T10:00:00"),
    issuedById: "u1",
    issuedByName: CURRENT_USER.name,
    items: [
      {
        id: "ii1",
        invoiceId: "inv1",
        productId: "p6",
        productName: "Powerbank 20000mAh",
        productSku: "PB-20K-BLK",
        quantity: 1,
        unitPrice: 22_000,
      },
    ],
    createdAt: new Date("2026-07-20T10:00:00"),
    updatedAt: new Date("2026-07-20T10:00:00"),
  },
  {
    id: "inv2",
    number: "FV-20260721-1430",
    customerName: "Awa Koné",
    status: "PAID",
    paymentMethod: "MOBILE_MONEY",
    subtotal: 145_000,
    discountAmount: 5_000,
    taxAmount: 0,
    totalAmount: 140_000,
    amountReceived: 140_000,
    changeDue: 0,
    notes: "Client fidele",
    issuedAt: new Date("2026-07-21T14:30:00"),
    issuedById: "u1",
    issuedByName: CURRENT_USER.name,
    items: [
      {
        id: "ii2",
        invoiceId: "inv2",
        productId: "p3",
        productName: "AirPods Pro 2",
        productSku: "APP2-USB-C",
        quantity: 1,
        unitPrice: 145_000,
      },
    ],
    createdAt: new Date("2026-07-21T14:30:00"),
    updatedAt: new Date("2026-07-21T14:30:00"),
  },
];

export type MockStore = {
  users: User[];
  categories: Category[];
  suppliers: Supplier[];
  products: Product[];
  movements: StockMovement[];
  purchases: Purchase[];
  invoices: Invoice[];
};

function createSeedStore(): MockStore {
  return {
    users: [structuredClone(seedUser)],
    categories: structuredClone(seedCategories),
    suppliers: structuredClone(seedSuppliers),
    products: structuredClone(seedProducts),
    movements: structuredClone(seedMovements),
    purchases: structuredClone(seedPurchases),
    invoices: structuredClone(seedInvoices),
  };
}

const globalStore = globalThis as unknown as {
  __bcfMockStore?: MockStore;
};

export function getStore(): MockStore {
  if (!globalStore.__bcfMockStore) {
    globalStore.__bcfMockStore = createSeedStore();
  }
  return globalStore.__bcfMockStore;
}

export function resetStore() {
  globalStore.__bcfMockStore = createSeedStore();
}

export function touch() {
  return now();
}
