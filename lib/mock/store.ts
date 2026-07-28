import { CURRENT_USER } from "@/lib/auth/current-user";
import { createPackLevelId, generateBarcode } from "@/lib/sales/pricing";
import type {
  Category,
  Invoice,
  Product,
  ProductSupplierOffer,
  Purchase,
  StockMovement,
  Supplier,
  User,
} from "@/lib/types";

export function createId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

const touchDate = () => new Date();

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
    description: "Telephones",
    baseUnitName: "piece",
    packLevels: [
      { id: "pl_s1", name: "piece", unitsOfBase: 1 },
    ],
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "c2",
    name: "Accessoires",
    description: "Cables, coques, energie",
    baseUnitName: "piece",
    packLevels: [{ id: "pl_a1", name: "piece", unitsOfBase: 1 }],
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "c4",
    name: "Cigarettes",
    description: "Paquet / cartouche / carton",
    baseUnitName: "paquet",
    packLevels: [
      { id: "pl_cig1", name: "paquet", unitsOfBase: 1 },
      { id: "pl_cig2", name: "cartouche", unitsOfBase: 20 },
      { id: "pl_cig3", name: "carton", unitsOfBase: 200 },
    ],
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "c5",
    name: "Bieres",
    description: "Bouteille / casiers 12-15-24",
    baseUnitName: "bouteille",
    packLevels: [
      { id: "pl_b1", name: "bouteille", unitsOfBase: 1 },
      { id: "pl_b2", name: "casier 12", unitsOfBase: 12 },
      { id: "pl_b3", name: "casier 15", unitsOfBase: 15 },
      { id: "pl_b4", name: "casier 24", unitsOfBase: 24 },
    ],
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
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
  {
    id: "s4",
    name: "Boissons CI",
    email: "cmd@boissons.ci",
    phone: "+225 07 11 22 33",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
];

function pieceProduct(
  partial: Omit<Product, "barcode" | "baseUnitName" | "packLevels"> & {
    barcode?: string;
    baseUnitName?: string;
  },
): Product {
  const base = partial.baseUnitName ?? "piece";
  return {
    ...partial,
    barcode: partial.barcode ?? generateBarcode(partial.sku),
    baseUnitName: base,
    packLevels: [
      {
        id: createPackLevelId(),
        name: base,
        unitsOfBase: 1,
        salePrice: partial.salePrice,
      },
    ],
  };
}

const seedProducts: Product[] = [
  pieceProduct({
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
  }),
  pieceProduct({
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
  }),
  pieceProduct({
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
  }),
  pieceProduct({
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
  }),
  pieceProduct({
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
  }),
  pieceProduct({
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
  }),
  pieceProduct({
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
  }),
  {
    id: "p8",
    name: "Aspen Menthol",
    sku: "ASPEN-MENTHOL",
    barcode: generateBarcode("ASPEN"),
    quantity: 400,
    minStock: 40,
    purchasePrice: 400,
    salePrice: 500,
    baseUnitName: "paquet",
    packLevels: [
      { id: "pl_p8a", name: "paquet", unitsOfBase: 1, salePrice: 500 },
      { id: "pl_p8b", name: "cartouche", unitsOfBase: 20, salePrice: 9_500 },
      { id: "pl_p8c", name: "carton", unitsOfBase: 200, salePrice: 90_000 },
    ],
    isActive: true,
    categoryId: "c4",
    supplierId: "s4",
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
  },
  {
    id: "p9",
    name: "Beaufort Blonde",
    sku: "BEAUFORT-33CL",
    barcode: generateBarcode("BEAUFORT"),
    quantity: 120,
    minStock: 24,
    purchasePrice: 500,
    salePrice: 700,
    baseUnitName: "bouteille",
    packLevels: [
      { id: "pl_p9a", name: "bouteille", unitsOfBase: 1, salePrice: 700 },
      { id: "pl_p9b", name: "casier 12", unitsOfBase: 12, salePrice: 8_000 },
      { id: "pl_p9c", name: "casier 24", unitsOfBase: 24, salePrice: 15_500 },
    ],
    isActive: true,
    categoryId: "c5",
    supplierId: "s4",
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
  },
];

const seedOffers: ProductSupplierOffer[] = [
  {
    id: "off1",
    productId: "p8",
    supplierId: "s4",
    supplierName: "Boissons CI",
    packPurchasePrice: 80_000,
    purchasePackName: "carton",
    unitsPerPurchasePack: 200,
    costPerBaseUnit: 400,
    lastPurchaseAt: new Date("2026-06-01"),
  },
  {
    id: "off2",
    productId: "p9",
    supplierId: "s4",
    supplierName: "Boissons CI",
    packPurchasePrice: 6_000,
    purchasePackName: "casier 12",
    unitsPerPurchasePack: 12,
    costPerBaseUnit: 500,
    lastPurchaseAt: new Date("2026-06-01"),
  },
  {
    id: "off3",
    productId: "p9",
    supplierId: "s2",
    supplierName: "Access Plus",
    packPurchasePrice: 6_600,
    purchasePackName: "casier 12",
    unitsPerPurchasePack: 12,
    costPerBaseUnit: 550,
    lastPurchaseAt: new Date("2026-06-10"),
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
    productId: "p8",
    productName: "Aspen Menthol",
    type: "IN",
    quantity: 400,
    unitPrice: 400,
    reference: "ACH-20260601-CIG",
    notes: "2 cartons",
    createdById: "u1",
    createdAt: new Date("2026-06-01"),
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
        purchasePackName: "piece",
        unitsPerPurchasePack: 1,
      },
      {
        id: "pui2",
        purchaseId: "pu1",
        productId: "p7",
        productName: "Cable USB-C 2m",
        productSku: "CBL-UC-2M",
        quantity: 20,
        unitPrice: 1_500,
        purchasePackName: "piece",
        unitsPerPurchasePack: 1,
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
        purchasePackName: "piece",
        unitsPerPurchasePack: 1,
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
        unitsOfBase: 1,
        packName: "piece",
      },
    ],
    createdAt: new Date("2026-07-20T10:00:00"),
    updatedAt: new Date("2026-07-20T10:00:00"),
  },
  {
    id: "inv2",
    number: "FV-20260728-1800",
    customerName: "Client N~2",
    status: "PAID",
    paymentMethod: "CASH",
    subtotal: 10_000,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 10_000,
    amountReceived: 10_000,
    changeDue: 0,
    issuedAt: new Date(),
    issuedById: "u1",
    issuedByName: CURRENT_USER.name,
    items: [
      {
        id: "ii2",
        invoiceId: "inv2",
        productId: "p8",
        productName: "Aspen Menthol",
        productSku: "ASPEN-MENTHOL",
        quantity: 20,
        unitPrice: 500,
        unitsOfBase: 20,
        packName: "paquet",
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export type MockStore = {
  users: User[];
  categories: Category[];
  suppliers: Supplier[];
  products: Product[];
  supplierOffers: ProductSupplierOffer[];
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
    supplierOffers: structuredClone(seedOffers),
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
  // Migration douce si ancien store sans nouveaux champs
  const store = globalStore.__bcfMockStore;
  if (!store.supplierOffers) store.supplierOffers = [];
  return store;
}

export function resetStore() {
  globalStore.__bcfMockStore = createSeedStore();
}

export function touch() {
  return touchDate();
}
