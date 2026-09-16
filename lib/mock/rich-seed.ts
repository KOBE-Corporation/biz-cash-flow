import { CURRENT_USER } from "@/lib/auth/current-user";
import { generateBarcode } from "@/lib/sales/pricing";
import type {
  AuditLog,
  CashLedgerEntry,
  CashSession,
  Category,
  CreditNote,
  Invoice,
  InvoiceItem,
  PaymentMethod,
  Product,
  ProductSupplierOffer,
  Purchase,
  StockMovement,
  Supplier,
  User,
} from "@/lib/types";

const ACTOR = {
  createdById: "u1",
  createdByName: CURRENT_USER.name,
} as const;

/** Ancre des mocks — alignee sur « aujourd'hui » de test (16 sept. 2026). */
export const MOCK_TODAY = new Date(2026, 8, 16, 12, 0, 0);

function at(
  y: number,
  m: number,
  d: number,
  h = 10,
  min = 0,
  s = 0,
) {
  return new Date(y, m, d, h, min, s);
}

function businessDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function pieceProduct(
  partial: Omit<
    Product,
    "barcode" | "baseUnitName" | "packLevels" | "createdById" | "createdByName"
  > & {
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
        id: `pl_${partial.id}`,
        name: base,
        unitsOfBase: 1,
        salePrice: partial.salePrice,
      },
    ],
    ...ACTOR,
  };
}

export const seedUsers: User[] = [
  {
    id: "u1",
    email: CURRENT_USER.email,
    name: CURRENT_USER.name,
    createdAt: at(2026, 0, 1),
    updatedAt: at(2026, 0, 1),
  },
  {
    id: "u2",
    email: "amina.kone@bizcash.ci",
    name: "Amina Kone",
    createdAt: at(2026, 1, 1),
    updatedAt: at(2026, 1, 1),
  },
  {
    id: "u3",
    email: "koffi.yao@bizcash.ci",
    name: "Koffi Yao",
    createdAt: at(2026, 2, 1),
    updatedAt: at(2026, 2, 1),
  },
  {
    id: "u4",
    email: "fatou.diallo@bizcash.ci",
    name: "Fatou Diallo",
    createdAt: at(2026, 3, 1),
    updatedAt: at(2026, 3, 1),
  },
];

export const seedCategories: Category[] = [
  {
    id: "c1",
    name: "Smartphones",
    description: "Telephones",
    baseUnitName: "piece",
    packLevels: [{ id: "pl_s1", name: "piece", unitsOfBase: 1 }],
    tracking: {
      tracksManufacturedAt: false,
      tracksExpiry: false,
      tracksBatchNumber: false,
      tracksSerialNumber: true,
      expiryAlertDays: 30,
      expiryCriticalDays: 7,
    },
    isActive: true,
    ...ACTOR,
    createdAt: at(2026, 0, 1),
    updatedAt: at(2026, 0, 1),
  },
  {
    id: "c2",
    name: "Accessoires",
    description: "Cables, coques, energie",
    baseUnitName: "piece",
    packLevels: [{ id: "pl_a1", name: "piece", unitsOfBase: 1 }],
    tracking: {
      tracksManufacturedAt: false,
      tracksExpiry: false,
      tracksBatchNumber: false,
      tracksSerialNumber: false,
      expiryAlertDays: 30,
      expiryCriticalDays: 7,
    },
    isActive: true,
    ...ACTOR,
    createdAt: at(2026, 0, 1),
    updatedAt: at(2026, 0, 1),
  },
  {
    id: "c3",
    name: "Tablettes",
    description: "Tablettes et e-readers",
    baseUnitName: "piece",
    packLevels: [{ id: "pl_t1", name: "piece", unitsOfBase: 1 }],
    tracking: {
      tracksManufacturedAt: false,
      tracksExpiry: false,
      tracksBatchNumber: false,
      tracksSerialNumber: true,
      expiryAlertDays: 30,
      expiryCriticalDays: 7,
    },
    isActive: true,
    ...ACTOR,
    createdAt: at(2026, 0, 1),
    updatedAt: at(2026, 0, 1),
  },
  {
    id: "c4",
    name: "Cigarettes",
    description: "Paquet / cartouche / carton — suivi lot & peremption",
    baseUnitName: "paquet",
    packLevels: [
      { id: "pl_cig1", name: "paquet", unitsOfBase: 1 },
      { id: "pl_cig2", name: "cartouche", unitsOfBase: 20 },
      { id: "pl_cig3", name: "carton", unitsOfBase: 200 },
    ],
    tracking: {
      tracksManufacturedAt: true,
      tracksExpiry: true,
      tracksBatchNumber: true,
      tracksSerialNumber: false,
      expiryAlertDays: 60,
      expiryCriticalDays: 14,
      defaultShelfLifeDays: 365,
      suggestedNearExpiryDiscountPercent: 15,
    },
    isActive: true,
    ...ACTOR,
    createdAt: at(2026, 0, 1),
    updatedAt: at(2026, 0, 1),
  },
  {
    id: "c5",
    name: "Bieres",
    description: "Bouteille / casiers — dates obligatoires",
    baseUnitName: "bouteille",
    packLevels: [
      { id: "pl_b1", name: "bouteille", unitsOfBase: 1 },
      { id: "pl_b2", name: "casier 12", unitsOfBase: 12 },
      { id: "pl_b3", name: "casier 15", unitsOfBase: 15 },
      { id: "pl_b4", name: "casier 24", unitsOfBase: 24 },
    ],
    tracking: {
      tracksManufacturedAt: true,
      tracksExpiry: true,
      tracksBatchNumber: true,
      tracksSerialNumber: false,
      expiryAlertDays: 45,
      expiryCriticalDays: 10,
      defaultShelfLifeDays: 180,
      suggestedNearExpiryDiscountPercent: 20,
    },
    isActive: true,
    ...ACTOR,
    createdAt: at(2026, 0, 1),
    updatedAt: at(2026, 0, 1),
  },
  {
    id: "c6",
    name: "Boissons soft",
    description: "Sodas et eaux",
    baseUnitName: "bouteille",
    packLevels: [
      { id: "pl_soft1", name: "bouteille", unitsOfBase: 1 },
      { id: "pl_soft2", name: "pack 6", unitsOfBase: 6 },
      { id: "pl_soft3", name: "caisse 24", unitsOfBase: 24 },
    ],
    tracking: {
      tracksManufacturedAt: true,
      tracksExpiry: true,
      tracksBatchNumber: true,
      tracksSerialNumber: false,
      expiryAlertDays: 30,
      expiryCriticalDays: 7,
      defaultShelfLifeDays: 270,
      suggestedNearExpiryDiscountPercent: 25,
    },
    isActive: true,
    ...ACTOR,
    createdAt: at(2026, 0, 1),
    updatedAt: at(2026, 0, 1),
  },
  {
    id: "c7",
    name: "Audio",
    description: "Casques et enceintes",
    baseUnitName: "piece",
    packLevels: [{ id: "pl_au1", name: "piece", unitsOfBase: 1 }],
    tracking: {
      tracksManufacturedAt: false,
      tracksExpiry: false,
      tracksBatchNumber: false,
      tracksSerialNumber: false,
      expiryAlertDays: 30,
      expiryCriticalDays: 7,
    },
    isActive: true,
    ...ACTOR,
    createdAt: at(2026, 1, 1),
    updatedAt: at(2026, 1, 1),
  },
];

export const seedSuppliers: Supplier[] = [
  {
    id: "s1",
    name: "Tech Distrib SA",
    email: "commandes@techdistrib.ci",
    phone: "+225 07 00 00 01",
    address: "Abidjan, Plateau",
    notes: "Delai 48h",
    isActive: true,
    ...ACTOR,
    createdAt: at(2026, 0, 1),
    updatedAt: at(2026, 0, 1),
  },
  {
    id: "s2",
    name: "Access Plus",
    email: "ventes@accessplus.ci",
    phone: "+225 05 00 00 02",
    address: "Abidjan, Cocody",
    isActive: true,
    ...ACTOR,
    createdAt: at(2026, 0, 1),
    updatedAt: at(2026, 0, 1),
  },
  {
    id: "s3",
    name: "Global Gadgets",
    email: "hello@globalgadgets.com",
    phone: "+225 01 00 00 03",
    isActive: true,
    ...ACTOR,
    createdAt: at(2026, 2, 1),
    updatedAt: at(2026, 2, 1),
  },
  {
    id: "s4",
    name: "Boissons CI",
    email: "cmd@boissons.ci",
    phone: "+225 07 11 22 33",
    isActive: true,
    ...ACTOR,
    createdAt: at(2026, 0, 1),
    updatedAt: at(2026, 0, 1),
  },
  {
    id: "s5",
    name: "Tabacs Express",
    email: "ops@tabacsexpress.ci",
    phone: "+225 05 44 55 66",
    address: "Abidjan, Marcory",
    isActive: true,
    ...ACTOR,
    createdAt: at(2026, 3, 1),
    updatedAt: at(2026, 3, 1),
  },
  {
    id: "s6",
    name: "Audio World",
    email: "b2b@audioworld.ci",
    phone: "+225 01 77 88 99",
    isActive: true,
    ...ACTOR,
    createdAt: at(2026, 4, 1),
    updatedAt: at(2026, 4, 1),
  },
];

export const seedProducts: Product[] = [
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
    serialNumber: "SN-S24U-001",
    createdAt: at(2026, 0, 10),
    updatedAt: at(2026, 8, 1),
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
    createdAt: at(2026, 0, 10),
    updatedAt: at(2026, 8, 1),
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
    createdAt: at(2026, 0, 12),
    updatedAt: at(2026, 8, 10),
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
    createdAt: at(2026, 0, 12),
    updatedAt: at(2026, 8, 10),
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
    createdAt: at(2026, 0, 15),
    updatedAt: at(2026, 8, 12),
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
    createdAt: at(2026, 0, 15),
    updatedAt: at(2026, 8, 10),
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
    supplierId: "s2",
    createdAt: at(2026, 0, 20),
    updatedAt: at(2026, 8, 15),
  }),
  {
    id: "p8",
    name: "Aspen Menthol",
    sku: "ASPEN-MENTHOL",
    barcode: generateBarcode("ASPEN"),
    quantity: 380,
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
    manufacturedAt: at(2026, 2, 1),
    expiresAt: at(2026, 9, 5),
    batchNumber: "LOT-ASP-0326",
    ...ACTOR,
    createdAt: at(2026, 5, 1),
    updatedAt: at(2026, 8, 16),
  },
  {
    id: "p9",
    name: "Beaufort Blonde",
    sku: "BEAUFORT-33CL",
    barcode: generateBarcode("BEAUFORT"),
    quantity: 96,
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
    manufacturedAt: at(2026, 5, 1),
    expiresAt: at(2026, 8, 25),
    batchNumber: "LOT-BF-0626",
    ...ACTOR,
    createdAt: at(2026, 5, 1),
    updatedAt: at(2026, 8, 16),
  },
  pieceProduct({
    id: "p10",
    name: "Xiaomi Redmi Note 13",
    sku: "RN13-128-BLU",
    quantity: 22,
    minStock: 5,
    purchasePrice: 95_000,
    salePrice: 145_000,
    isActive: true,
    categoryId: "c1",
    supplierId: "s3",
    createdAt: at(2026, 2, 1),
    updatedAt: at(2026, 8, 5),
  }),
  pieceProduct({
    id: "p11",
    name: "Tecno Spark 20",
    sku: "TSP20-128-BLK",
    quantity: 30,
    minStock: 6,
    purchasePrice: 55_000,
    salePrice: 85_000,
    isActive: true,
    categoryId: "c1",
    supplierId: "s3",
    createdAt: at(2026, 2, 5),
    updatedAt: at(2026, 8, 5),
  }),
  pieceProduct({
    id: "p12",
    name: "iPad 10e gen",
    sku: "IPAD10-64-SLV",
    quantity: 5,
    minStock: 2,
    purchasePrice: 280_000,
    salePrice: 380_000,
    isActive: true,
    categoryId: "c3",
    supplierId: "s1",
    createdAt: at(2026, 3, 1),
    updatedAt: at(2026, 7, 20),
  }),
  pieceProduct({
    id: "p13",
    name: "Samsung Galaxy Tab A9",
    sku: "TABA9-64-GRY",
    quantity: 1,
    minStock: 3,
    purchasePrice: 90_000,
    salePrice: 135_000,
    isActive: true,
    categoryId: "c3",
    supplierId: "s1",
    createdAt: at(2026, 3, 10),
    updatedAt: at(2026, 8, 14),
  }),
  pieceProduct({
    id: "p14",
    name: "Sony WH-1000XM5",
    sku: "SONY-XM5-BLK",
    quantity: 7,
    minStock: 2,
    purchasePrice: 180_000,
    salePrice: 260_000,
    isActive: true,
    categoryId: "c7",
    supplierId: "s6",
    createdAt: at(2026, 4, 1),
    updatedAt: at(2026, 8, 1),
  }),
  pieceProduct({
    id: "p15",
    name: "JBL Flip 6",
    sku: "JBL-FLIP6-BLU",
    quantity: 14,
    minStock: 3,
    purchasePrice: 45_000,
    salePrice: 72_000,
    isActive: true,
    categoryId: "c7",
    supplierId: "s6",
    createdAt: at(2026, 4, 5),
    updatedAt: at(2026, 8, 8),
  }),
  pieceProduct({
    id: "p16",
    name: "Support voiture magnetique",
    sku: "MNT-MAG-CAR",
    quantity: 55,
    minStock: 10,
    purchasePrice: 2_000,
    salePrice: 5_500,
    isActive: true,
    categoryId: "c2",
    supplierId: "s2",
    createdAt: at(2026, 1, 10),
    updatedAt: at(2026, 8, 1),
  }),
  pieceProduct({
    id: "p17",
    name: "Verre trempe universel",
    sku: "GLASS-UNI-9H",
    quantity: 3,
    minStock: 15,
    purchasePrice: 800,
    salePrice: 2_500,
    isActive: true,
    categoryId: "c2",
    supplierId: "s2",
    createdAt: at(2026, 1, 12),
    updatedAt: at(2026, 8, 15),
  }),
  pieceProduct({
    id: "p18",
    name: "Carte memoire 128Go",
    sku: "SD-128-U3",
    quantity: 0,
    minStock: 8,
    purchasePrice: 6_000,
    salePrice: 12_000,
    isActive: true,
    categoryId: "c2",
    supplierId: "s3",
    createdAt: at(2026, 2, 20),
    updatedAt: at(2026, 8, 10),
  }),
  {
    id: "p19",
    name: "Excellence Menthol",
    sku: "EXC-MENTHOL",
    barcode: generateBarcode("EXC"),
    quantity: 220,
    minStock: 30,
    purchasePrice: 380,
    salePrice: 480,
    baseUnitName: "paquet",
    packLevels: [
      { id: "pl_p19a", name: "paquet", unitsOfBase: 1, salePrice: 480 },
      { id: "pl_p19b", name: "cartouche", unitsOfBase: 20, salePrice: 9_000 },
    ],
    isActive: true,
    categoryId: "c4",
    supplierId: "s5",
    manufacturedAt: at(2026, 1, 15),
    expiresAt: at(2026, 8, 20),
    batchNumber: "LOT-EXC-0226",
    ...ACTOR,
    createdAt: at(2026, 4, 1),
    updatedAt: at(2026, 8, 16),
  },
  {
    id: "p20",
    name: "Castel Beer",
    sku: "CASTEL-65CL",
    barcode: generateBarcode("CASTEL"),
    quantity: 180,
    minStock: 36,
    purchasePrice: 600,
    salePrice: 900,
    baseUnitName: "bouteille",
    packLevels: [
      { id: "pl_p20a", name: "bouteille", unitsOfBase: 1, salePrice: 900 },
      { id: "pl_p20b", name: "casier 12", unitsOfBase: 12, salePrice: 10_000 },
      { id: "pl_p20c", name: "casier 24", unitsOfBase: 24, salePrice: 19_500 },
    ],
    isActive: true,
    categoryId: "c5",
    supplierId: "s4",
    manufacturedAt: at(2026, 6, 1),
    expiresAt: at(2026, 11, 15),
    batchNumber: "LOT-CAS-0726",
    ...ACTOR,
    createdAt: at(2026, 6, 5),
    updatedAt: at(2026, 8, 16),
  },
  {
    id: "p21",
    name: "Coca-Cola 50cl",
    sku: "COCA-50CL",
    barcode: generateBarcode("COCA50"),
    quantity: 240,
    minStock: 48,
    purchasePrice: 250,
    salePrice: 400,
    baseUnitName: "bouteille",
    packLevels: [
      { id: "pl_p21a", name: "bouteille", unitsOfBase: 1, salePrice: 400 },
      { id: "pl_p21b", name: "pack 6", unitsOfBase: 6, salePrice: 2_200 },
      { id: "pl_p21c", name: "caisse 24", unitsOfBase: 24, salePrice: 8_500 },
    ],
    isActive: true,
    categoryId: "c6",
    supplierId: "s4",
    manufacturedAt: at(2026, 5, 10),
    expiresAt: at(2026, 8, 22),
    batchNumber: "LOT-COCA-0626",
    ...ACTOR,
    createdAt: at(2026, 5, 15),
    updatedAt: at(2026, 8, 16),
  },
  {
    id: "p22",
    name: "Eau Celeste 1.5L",
    sku: "EAU-CEL-15L",
    barcode: generateBarcode("EAU15"),
    quantity: 60,
    minStock: 24,
    purchasePrice: 200,
    salePrice: 350,
    baseUnitName: "bouteille",
    packLevels: [
      { id: "pl_p22a", name: "bouteille", unitsOfBase: 1, salePrice: 350 },
      { id: "pl_p22b", name: "pack 6", unitsOfBase: 6, salePrice: 1_900 },
    ],
    isActive: true,
    categoryId: "c6",
    supplierId: "s4",
    manufacturedAt: at(2025, 11, 1),
    expiresAt: at(2026, 8, 10),
    batchNumber: "LOT-EAU-1225",
    ...ACTOR,
    createdAt: at(2026, 0, 5),
    updatedAt: at(2026, 8, 10),
  },
  pieceProduct({
    id: "p23",
    name: "Ecouteurs filaires basiques",
    sku: "EAR-WIRE-BASIC",
    quantity: 90,
    minStock: 20,
    purchasePrice: 1_200,
    salePrice: 3_500,
    isActive: true,
    categoryId: "c7",
    supplierId: "s6",
    createdAt: at(2026, 4, 10),
    updatedAt: at(2026, 8, 1),
  }),
  pieceProduct({
    id: "p24",
    name: "Dock USB-C multiport",
    sku: "DOCK-UC-7IN1",
    quantity: 11,
    minStock: 2,
    purchasePrice: 18_000,
    salePrice: 32_000,
    isActive: true,
    categoryId: "c2",
    supplierId: "s3",
    createdAt: at(2026, 5, 1),
    updatedAt: at(2026, 8, 1),
  }),
  pieceProduct({
    id: "p25",
    name: "Clavier Bluetooth compact",
    sku: "KB-BT-COMP",
    quantity: 9,
    minStock: 2,
    purchasePrice: 15_000,
    salePrice: 28_000,
    isActive: true,
    categoryId: "c2",
    supplierId: "s3",
    createdAt: at(2026, 5, 5),
    updatedAt: at(2026, 7, 1),
  }),
  pieceProduct({
    id: "p26",
    name: "Housse iPad 10",
    sku: "CASE-IPAD10",
    quantity: 16,
    minStock: 4,
    purchasePrice: 5_000,
    salePrice: 12_000,
    isActive: true,
    categoryId: "c3",
    supplierId: "s2",
    createdAt: at(2026, 3, 15),
    updatedAt: at(2026, 8, 1),
  }),
  pieceProduct({
    id: "p27",
    name: "Demo produit inactif",
    sku: "DEMO-OFF",
    quantity: 0,
    minStock: 1,
    purchasePrice: 1_000,
    salePrice: 2_000,
    isActive: false,
    categoryId: "c2",
    supplierId: "s2",
    createdAt: at(2026, 0, 1),
    updatedAt: at(2026, 6, 1),
  }),
  pieceProduct({
    id: "p28",
    name: "Adaptateur Lightning → USB-C",
    sku: "ADP-LTG-UC",
    quantity: 4,
    minStock: 6,
    purchasePrice: 3_500,
    salePrice: 8_000,
    isActive: true,
    categoryId: "c2",
    supplierId: "s2",
    createdAt: at(2026, 2, 1),
    updatedAt: at(2026, 8, 14),
  }),
];

const productById = new Map(seedProducts.map((p) => [p.id, p]));

type SaleLineSpec = {
  productId: string;
  quantity: number;
  packName?: string;
  unitsOfBase?: number;
  unitPrice?: number;
};

type SaleSpec = {
  id: string;
  number: string;
  customerName: string;
  customerPhone?: string;
  status: Invoice["status"];
  paymentMethod: PaymentMethod;
  issuedAt: Date;
  issuedById: string;
  issuedByName: string;
  lines: SaleLineSpec[];
  discountAmount?: number;
  amountPaid?: number;
  amountReceived?: number;
  changeDue?: number;
  notes?: string;
  cancelReason?: string;
  cancelledAt?: Date;
  lastReminderAt?: Date;
};

function buildInvoice(spec: SaleSpec): {
  invoice: Invoice;
  cash?: CashLedgerEntry;
  movement: StockMovement[];
} {
  const items: InvoiceItem[] = spec.lines.map((line, idx) => {
    const product = productById.get(line.productId)!;
    const unitPrice = line.unitPrice ?? product.salePrice;
    const unitsOfBase = line.unitsOfBase ?? line.quantity;
    return {
      id: `ii_${spec.id}_${idx}`,
      invoiceId: spec.id,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      quantity: line.quantity,
      unitPrice,
      unitsOfBase,
      packName: line.packName ?? product.baseUnitName,
      unitCost: product.purchasePrice,
    };
  });

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountAmount = spec.discountAmount ?? 0;
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const isCancelled = spec.status === "CANCELLED";
  const amountPaid =
    spec.amountPaid ??
    (isCancelled
      ? 0
      : spec.paymentMethod === "CREDIT" && spec.status !== "PAID"
        ? 0
        : spec.status === "PARTIALLY_PAID"
          ? Math.round(totalAmount * 0.4)
          : totalAmount);

  const invoice: Invoice = {
    id: spec.id,
    number: spec.number,
    customerName: spec.customerName,
    customerPhone: spec.customerPhone,
    status: spec.status,
    paymentMethod: spec.paymentMethod,
    subtotal,
    discountAmount,
    taxAmount: 0,
    totalAmount,
    amountPaid,
    creditedAmount: 0,
    amountReceived: spec.amountReceived,
    changeDue: spec.changeDue,
    notes: spec.notes,
    issuedAt: spec.issuedAt,
    issuedById: spec.issuedById,
    issuedByName: spec.issuedByName,
    lastReminderAt: spec.lastReminderAt,
    cancelledAt: spec.cancelledAt,
    cancelledById: isCancelled ? spec.issuedById : undefined,
    cancelledByName: isCancelled ? spec.issuedByName : undefined,
    cancelReason: spec.cancelReason,
    items,
    createdAt: spec.issuedAt,
    updatedAt: spec.cancelledAt ?? spec.issuedAt,
  };

  const movements: StockMovement[] = isCancelled
    ? []
    : items
        .filter((i) => i.productId)
        .map((i, idx) => ({
          id: `mv_${spec.id}_${idx}`,
          productId: i.productId!,
          productName: i.productName,
          type: "OUT" as const,
          quantity: i.unitsOfBase ?? i.quantity,
          unitPrice: i.unitPrice,
          reference: spec.number,
          createdById: spec.issuedById,
          createdByName: spec.issuedByName,
          createdAt: spec.issuedAt,
        }));

  let cash: CashLedgerEntry | undefined;
  if (amountPaid > 0 && !isCancelled) {
    cash = {
      id: `cash_${spec.id}`,
      direction: "IN",
      amount: amountPaid,
      paymentMethod: spec.paymentMethod === "CREDIT" ? "CASH" : spec.paymentMethod,
      label: `Vente ${spec.number}`,
      description: `Encaissement ${spec.customerName}`,
      reference: spec.number,
      sourceType: "SALE",
      sourceId: spec.id,
      occurredAt: spec.issuedAt,
      createdById: spec.issuedById,
      createdByName: spec.issuedByName,
      createdAt: spec.issuedAt,
    };
  }

  return { invoice, cash, movement: movements };
}

const cashiers = [
  { id: "u1", name: CURRENT_USER.name },
  { id: "u2", name: "Amina Kone" },
  { id: "u3", name: "Koffi Yao" },
  { id: "u4", name: "Fatou Diallo" },
] as const;

const customers = [
  { name: "Client Comptoir", phone: undefined },
  { name: "Marie Kouassi", phone: "+2250700112233" },
  { name: "Ibrahim Traore", phone: "+2250500223344" },
  { name: "Boutique du Plateau", phone: "+2250100334455" },
  { name: "Hotel Ivoire", phone: "+2250700445566" },
  { name: "Cyber Café Zone 4", phone: "+2250500556677" },
  { name: "Mme Adjoua", phone: "+2250700667788" },
  { name: "M. Bamba", phone: undefined },
  { name: "Pharmacie Soleil", phone: "+2250100778899" },
  { name: "Restaurant Le Baobab", phone: "+2250500889900" },
];

/** Catalogue de paniers types pour generer des ventes variees. */
const baskets: SaleLineSpec[][] = [
  [{ productId: "p8", quantity: 10, packName: "paquet", unitsOfBase: 10 }],
  [{ productId: "p8", quantity: 1, packName: "cartouche", unitsOfBase: 20, unitPrice: 9_500 }],
  [{ productId: "p21", quantity: 6, packName: "pack 6", unitsOfBase: 6, unitPrice: 2_200 }],
  [{ productId: "p21", quantity: 3, packName: "bouteille", unitsOfBase: 3 }],
  [{ productId: "p9", quantity: 12, packName: "casier 12", unitsOfBase: 12, unitPrice: 8_000 }],
  [{ productId: "p20", quantity: 2, packName: "bouteille", unitsOfBase: 2 }],
  [{ productId: "p4", quantity: 2 }, { productId: "p7", quantity: 1 }],
  [{ productId: "p6", quantity: 1 }],
  [{ productId: "p3", quantity: 1 }],
  [{ productId: "p16", quantity: 2 }, { productId: "p17", quantity: 1 }],
  [{ productId: "p10", quantity: 1 }],
  [{ productId: "p11", quantity: 1 }, { productId: "p4", quantity: 1 }],
  [{ productId: "p15", quantity: 1 }],
  [{ productId: "p23", quantity: 3 }],
  [{ productId: "p19", quantity: 20, packName: "paquet", unitsOfBase: 20 }],
  [{ productId: "p22", quantity: 6, packName: "pack 6", unitsOfBase: 6, unitPrice: 1_900 }],
  [{ productId: "p24", quantity: 1 }],
  [{ productId: "p14", quantity: 1 }],
  [{ productId: "p1", quantity: 1 }],
  [{ productId: "p2", quantity: 1 }, { productId: "p28", quantity: 1 }],
];

function makeSaleNumber(d: Date, seq: number) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `FV-${y}${m}${day}-${hh}${mm}${String(seq).padStart(2, "0")}`;
}

function buildGeneratedSales(): {
  invoices: Invoice[];
  cash: CashLedgerEntry[];
  movements: StockMovement[];
} {
  const specs: SaleSpec[] = [];
  let seq = 1;

  const pushDaySales = (
    y: number,
    m: number,
    d: number,
    count: number,
    options?: { creditEvery?: number; cancelOne?: boolean; partialOne?: boolean },
  ) => {
    for (let i = 0; i < count; i++) {
      const hour = 8 + Math.floor((i * 9) / Math.max(1, count - 1));
      const minute = (i * 7) % 60;
      const issuedAt = at(y, m, d, hour, minute, (i * 3) % 60);
      const cashier = cashiers[i % cashiers.length];
      const customer = customers[(seq + i) % customers.length];
      const basket = baskets[(seq + i) % baskets.length];
      const methods: PaymentMethod[] = ["CASH", "CASH", "MOBILE_MONEY", "CASH", "CREDIT"];
      let paymentMethod = methods[i % methods.length];
      let status: Invoice["status"] = paymentMethod === "CREDIT" ? "SENT" : "PAID";
      let amountPaid: number | undefined;
      let amountReceived: number | undefined;
      let changeDue: number | undefined;
      let cancelReason: string | undefined;
      let cancelledAt: Date | undefined;
      let lastReminderAt: Date | undefined;

      if (options?.cancelOne && i === count - 1) {
        status = "CANCELLED";
        paymentMethod = "CASH";
        cancelReason = "Erreur de saisie — client a change d'avis";
        cancelledAt = new Date(issuedAt.getTime() + 15 * 60_000);
        amountPaid = 0;
      } else if (options?.partialOne && i === Math.floor(count / 2)) {
        status = "PARTIALLY_PAID";
        paymentMethod = "CREDIT";
        lastReminderAt = new Date(issuedAt.getTime() + 2 * 24 * 3600_000);
      } else if (paymentMethod === "CREDIT" && options?.creditEvery && i % options.creditEvery === 0) {
        status = "SENT";
        lastReminderAt = at(y, m, Math.min(d + 1, 28), 11, 0);
      } else if (paymentMethod === "CASH") {
        // Change fictif sur quelques ventes
        const rough = basket.reduce((s, line) => {
          const p = productById.get(line.productId)!;
          return s + line.quantity * (line.unitPrice ?? p.salePrice);
        }, 0);
        amountReceived = rough + (i % 3 === 0 ? 5_000 : 0);
        changeDue = amountReceived - rough;
      }

      specs.push({
        id: `inv_gen_${seq}`,
        number: makeSaleNumber(issuedAt, seq),
        customerName: customer.name,
        customerPhone: customer.phone,
        status,
        paymentMethod,
        issuedAt,
        issuedById: cashier.id,
        issuedByName: cashier.name,
        lines: basket,
        amountPaid,
        amountReceived,
        changeDue,
        cancelReason,
        cancelledAt,
        lastReminderAt,
        notes: i % 5 === 0 ? "Vente demo seed" : undefined,
      });
      seq += 1;
    }
  };

  // Aujourd'hui (16 sept) — dense pour dashboard / compta / phares
  pushDaySales(2026, 8, 16, 14, { creditEvery: 5, cancelOne: true, partialOne: true });
  // Hier & lundi (semaine)
  pushDaySales(2026, 8, 15, 10, { creditEvery: 4 });
  pushDaySales(2026, 8, 14, 8);
  // Debut septembre (mois)
  pushDaySales(2026, 8, 5, 7);
  pushDaySales(2026, 8, 8, 6);
  pushDaySales(2026, 8, 10, 8);
  pushDaySales(2026, 8, 12, 7);
  // Aout (trimestre)
  pushDaySales(2026, 7, 4, 6);
  pushDaySales(2026, 7, 12, 7);
  pushDaySales(2026, 7, 20, 8);
  pushDaySales(2026, 7, 28, 6);
  // Juillet (trimestre)
  pushDaySales(2026, 6, 8, 5);
  pushDaySales(2026, 6, 18, 6);
  pushDaySales(2026, 6, 25, 5);
  // Debut d'annee (annuel)
  pushDaySales(2026, 1, 10, 4);
  pushDaySales(2026, 2, 15, 5);
  pushDaySales(2026, 3, 20, 5);
  pushDaySales(2026, 4, 12, 4);
  pushDaySales(2026, 5, 8, 6);

  // Ventes manuelles marquees (gros tickets)
  specs.push(
    {
      id: "inv_big_1",
      number: "FV-20260916-110001",
      customerName: "Entreprise KOBE",
      customerPhone: "+2250700990011",
      status: "PAID",
      paymentMethod: "MOBILE_MONEY",
      issuedAt: at(2026, 8, 16, 11, 5),
      issuedById: "u2",
      issuedByName: "Amina Kone",
      lines: [
        { productId: "p1", quantity: 1 },
        { productId: "p3", quantity: 1 },
        { productId: "p4", quantity: 2 },
      ],
      discountAmount: 20_000,
    },
    {
      id: "inv_credit_open",
      number: "FV-20260910-160001",
      customerName: "Boutique du Plateau",
      customerPhone: "+2250100334455",
      status: "SENT",
      paymentMethod: "CREDIT",
      issuedAt: at(2026, 8, 10, 16, 20),
      issuedById: "u3",
      issuedByName: "Koffi Yao",
      lines: [{ productId: "p12", quantity: 1 }],
      amountPaid: 0,
      lastReminderAt: at(2026, 8, 14, 9, 0),
      notes: "Credit 7 jours",
    },
    {
      id: "inv_partial",
      number: "FV-20260908-140001",
      customerName: "Hotel Ivoire",
      customerPhone: "+2250700445566",
      status: "PARTIALLY_PAID",
      paymentMethod: "CREDIT",
      issuedAt: at(2026, 8, 8, 14, 10),
      issuedById: "u1",
      issuedByName: CURRENT_USER.name,
      lines: [
        { productId: "p14", quantity: 1 },
        { productId: "p15", quantity: 2 },
      ],
      amountPaid: 150_000,
      lastReminderAt: at(2026, 8, 13, 10, 0),
    },
  );

  const invoices: Invoice[] = [];
  const cash: CashLedgerEntry[] = [];
  const movements: StockMovement[] = [];

  for (const spec of specs) {
    const built = buildInvoice(spec);
    invoices.push(built.invoice);
    if (built.cash) cash.push(built.cash);
    movements.push(...built.movement);
  }

  return { invoices, cash, movements };
}

export const seedOffers: ProductSupplierOffer[] = [
  {
    id: "off1",
    productId: "p8",
    supplierId: "s4",
    supplierName: "Boissons CI",
    packPurchasePrice: 80_000,
    purchasePackName: "carton",
    unitsPerPurchasePack: 200,
    costPerBaseUnit: 400,
    lastPurchaseAt: at(2026, 5, 1),
    ...ACTOR,
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
    lastPurchaseAt: at(2026, 5, 1),
    ...ACTOR,
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
    lastPurchaseAt: at(2026, 5, 10),
    ...ACTOR,
  },
  {
    id: "off4",
    productId: "p19",
    supplierId: "s5",
    supplierName: "Tabacs Express",
    packPurchasePrice: 7_600,
    purchasePackName: "cartouche",
    unitsPerPurchasePack: 20,
    costPerBaseUnit: 380,
    lastPurchaseAt: at(2026, 7, 1),
    ...ACTOR,
  },
  {
    id: "off5",
    productId: "p21",
    supplierId: "s4",
    supplierName: "Boissons CI",
    packPurchasePrice: 5_500,
    purchasePackName: "caisse 24",
    unitsPerPurchasePack: 24,
    costPerBaseUnit: 250,
    lastPurchaseAt: at(2026, 7, 15),
    ...ACTOR,
  },
  {
    id: "off6",
    productId: "p1",
    supplierId: "s1",
    supplierName: "Tech Distrib SA",
    packPurchasePrice: 650_000,
    purchasePackName: "piece",
    unitsPerPurchasePack: 1,
    costPerBaseUnit: 650_000,
    lastPurchaseAt: at(2026, 7, 20),
    ...ACTOR,
  },
  {
    id: "off7",
    productId: "p14",
    supplierId: "s6",
    supplierName: "Audio World",
    packPurchasePrice: 180_000,
    purchasePackName: "piece",
    unitsPerPurchasePack: 1,
    costPerBaseUnit: 180_000,
    lastPurchaseAt: at(2026, 6, 10),
    ...ACTOR,
  },
];

export const seedPurchases: Purchase[] = [
  {
    id: "pu1",
    reference: "ACH-20260701-001",
    supplierId: "s2",
    supplierName: "Access Plus",
    status: "PENDING",
    totalAmount: 160_000,
    notes: "Reassort accessoires",
    purchasedAt: at(2026, 6, 1),
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
    ...ACTOR,
    createdAt: at(2026, 6, 1),
    updatedAt: at(2026, 6, 1),
  },
  {
    id: "pu2",
    reference: "ACH-20260615-002",
    supplierId: "s1",
    supplierName: "Tech Distrib SA",
    status: "RECEIVED",
    totalAmount: 1_300_000,
    purchasedAt: at(2026, 5, 15),
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
    ...ACTOR,
    receivedById: "u1",
    receivedByName: CURRENT_USER.name,
    createdAt: at(2026, 5, 15),
    updatedAt: at(2026, 5, 20),
  },
  {
    id: "pu3",
    reference: "ACH-20260901-003",
    supplierId: "s4",
    supplierName: "Boissons CI",
    status: "RECEIVED",
    totalAmount: 180_000,
    purchasedAt: at(2026, 8, 1),
    notes: "Reassort soft + bieres",
    items: [
      {
        id: "pui4",
        purchaseId: "pu3",
        productId: "p21",
        productName: "Coca-Cola 50cl",
        productSku: "COCA-50CL",
        quantity: 10,
        unitPrice: 5_500,
        purchasePackName: "caisse 24",
        unitsPerPurchasePack: 24,
      },
      {
        id: "pui5",
        purchaseId: "pu3",
        productId: "p20",
        productName: "Castel Beer",
        productSku: "CASTEL-65CL",
        quantity: 5,
        unitPrice: 10_000,
        purchasePackName: "casier 12",
        unitsPerPurchasePack: 12,
      },
      {
        id: "pui6",
        purchaseId: "pu3",
        productId: "p9",
        productName: "Beaufort Blonde",
        productSku: "BEAUFORT-33CL",
        quantity: 5,
        unitPrice: 6_000,
        purchasePackName: "casier 12",
        unitsPerPurchasePack: 12,
      },
    ],
    ...ACTOR,
    receivedById: "u2",
    receivedByName: "Amina Kone",
    createdAt: at(2026, 8, 1),
    updatedAt: at(2026, 8, 2),
  },
  {
    id: "pu4",
    reference: "ACH-20260910-004",
    supplierId: "s5",
    supplierName: "Tabacs Express",
    status: "PENDING",
    totalAmount: 152_000,
    purchasedAt: at(2026, 8, 10),
    notes: "Commande cartouches",
    items: [
      {
        id: "pui7",
        purchaseId: "pu4",
        productId: "p8",
        productName: "Aspen Menthol",
        productSku: "ASPEN-MENTHOL",
        quantity: 1,
        unitPrice: 80_000,
        purchasePackName: "carton",
        unitsPerPurchasePack: 200,
      },
      {
        id: "pui8",
        purchaseId: "pu4",
        productId: "p19",
        productName: "Excellence Menthol",
        productSku: "EXC-MENTHOL",
        quantity: 4,
        unitPrice: 7_600,
        purchasePackName: "cartouche",
        unitsPerPurchasePack: 20,
        manufacturedAt: at(2026, 7, 1),
        expiresAt: at(2027, 6, 1),
        batchNumber: "LOT-EXC-0826",
      },
    ],
    ...ACTOR,
    createdAt: at(2026, 8, 10),
    updatedAt: at(2026, 8, 10),
  },
  {
    id: "pu5",
    reference: "ACH-20260820-005",
    supplierId: "s6",
    supplierName: "Audio World",
    status: "CANCELLED",
    totalAmount: 360_000,
    purchasedAt: at(2026, 7, 20),
    notes: "Annule — rupture fournisseur",
    items: [
      {
        id: "pui9",
        purchaseId: "pu5",
        productId: "p14",
        productName: "Sony WH-1000XM5",
        productSku: "SONY-XM5-BLK",
        quantity: 2,
        unitPrice: 180_000,
        purchasePackName: "piece",
        unitsPerPurchasePack: 1,
      },
    ],
    ...ACTOR,
    cancelledById: "u1",
    cancelledByName: CURRENT_USER.name,
    createdAt: at(2026, 7, 20),
    updatedAt: at(2026, 7, 22),
  },
  {
    id: "pu6",
    reference: "ACH-20260914-006",
    supplierId: "s3",
    supplierName: "Global Gadgets",
    status: "RECEIVED",
    totalAmount: 475_000,
    purchasedAt: at(2026, 8, 14),
    items: [
      {
        id: "pui10",
        purchaseId: "pu6",
        productId: "p10",
        productName: "Xiaomi Redmi Note 13",
        productSku: "RN13-128-BLU",
        quantity: 5,
        unitPrice: 95_000,
        purchasePackName: "piece",
        unitsPerPurchasePack: 1,
      },
    ],
    ...ACTOR,
    receivedById: "u3",
    receivedByName: "Koffi Yao",
    createdAt: at(2026, 8, 14),
    updatedAt: at(2026, 8, 14, 16, 0),
  },
];

const purchaseCash: CashLedgerEntry[] = [
  {
    id: "cash_pu2",
    direction: "OUT",
    amount: 1_300_000,
    label: "Achat ACH-20260615-002",
    description: "Paiement fournisseur Tech Distrib SA",
    reference: "ACH-20260615-002",
    sourceType: "PURCHASE",
    sourceId: "pu2",
    occurredAt: at(2026, 5, 20, 12, 0),
    createdById: "u1",
    createdByName: CURRENT_USER.name,
    createdAt: at(2026, 5, 20, 12, 0),
  },
  {
    id: "cash_pu3",
    direction: "OUT",
    amount: 180_000,
    label: "Achat ACH-20260901-003",
    description: "Paiement Boissons CI",
    reference: "ACH-20260901-003",
    sourceType: "PURCHASE",
    sourceId: "pu3",
    occurredAt: at(2026, 8, 2, 11, 0),
    createdById: "u2",
    createdByName: "Amina Kone",
    createdAt: at(2026, 8, 2, 11, 0),
  },
  {
    id: "cash_pu6",
    direction: "OUT",
    amount: 475_000,
    label: "Achat ACH-20260914-006",
    description: "Paiement Global Gadgets",
    reference: "ACH-20260914-006",
    sourceType: "PURCHASE",
    sourceId: "pu6",
    occurredAt: at(2026, 8, 14, 16, 30),
    createdById: "u3",
    createdByName: "Koffi Yao",
    createdAt: at(2026, 8, 14, 16, 30),
  },
  {
    id: "cash_manual_1",
    direction: "OUT",
    amount: 5_000,
    label: "Petite caisse — courses",
    description: "Eau / sacs",
    sourceType: "MANUAL",
    occurredAt: at(2026, 8, 16, 8, 45),
    createdById: "u1",
    createdByName: CURRENT_USER.name,
    createdAt: at(2026, 8, 16, 8, 45),
  },
  {
    id: "cash_manual_2",
    direction: "IN",
    amount: 2_000,
    label: "Ajustement caisse",
    description: "Fond retrouve",
    sourceType: "ADJUSTMENT",
    occurredAt: at(2026, 8, 15, 18, 10),
    createdById: "u2",
    createdByName: "Amina Kone",
    createdAt: at(2026, 8, 15, 18, 10),
  },
];

const floatCash: CashLedgerEntry[] = [
  {
    id: "cash_float_open_15",
    direction: "IN",
    amount: 50_000,
    label: "Fonds d'ouverture",
    description: "Monnaie du 15/09",
    sourceType: "FLOAT_IN",
    sourceId: "cs_2026-09-15",
    occurredAt: at(2026, 8, 15, 7, 55),
    createdById: "u1",
    createdByName: CURRENT_USER.name,
    createdAt: at(2026, 8, 15, 7, 55),
  },
  {
    id: "cash_float_open_16",
    direction: "IN",
    amount: 75_000,
    label: "Fonds d'ouverture",
    description: "Report + monnaie 16/09",
    sourceType: "FLOAT_IN",
    sourceId: "cs_2026-09-16",
    occurredAt: at(2026, 8, 16, 7, 50),
    createdById: "u1",
    createdByName: CURRENT_USER.name,
    createdAt: at(2026, 8, 16, 7, 50),
  },
];

export const seedCashSessions: CashSession[] = [
  {
    id: "cs_2026-09-14",
    businessDate: "2026-09-14",
    status: "CLOSED",
    openingFloat: 40_000,
    closingCounted: 185_000,
    expectedAtClose: 182_500,
    variance: 2_500,
    openedAt: at(2026, 8, 14, 7, 45),
    closedAt: at(2026, 8, 14, 23, 55),
    openedById: "u1",
    openedByName: CURRENT_USER.name,
    closedById: "u2",
    closedByName: "Amina Kone",
    closingNotes: "Ecart mineur OK",
  },
  {
    id: "cs_2026-09-15",
    businessDate: "2026-09-15",
    status: "CLOSED",
    openingFloat: 50_000,
    closingCounted: 210_000,
    expectedAtClose: 208_000,
    variance: 2_000,
    openedAt: at(2026, 8, 15, 7, 55),
    closedAt: at(2026, 8, 15, 23, 58),
    openedById: "u1",
    openedByName: CURRENT_USER.name,
    closedById: "u1",
    closedByName: CURRENT_USER.name,
    carriedFromSessionId: "cs_2026-09-14",
  },
  {
    id: "cs_2026-09-16",
    businessDate: "2026-09-16",
    status: "OPEN",
    openingFloat: 75_000,
    openedAt: at(2026, 8, 16, 7, 50),
    openedById: "u1",
    openedByName: CURRENT_USER.name,
    openingNotes: "Session du jour (seed)",
    carriedFromSessionId: "cs_2026-09-15",
  },
];

export const seedCreditNotes: CreditNote[] = [
  {
    id: "cn1",
    number: "AV-20260912-001",
    invoiceId: "inv_partial",
    invoiceNumber: "FV-20260908-140001",
    amount: 72_000,
    reason: "Retour JBL Flip 6 defectueux",
    items: [
      {
        id: "cni1",
        productId: "p15",
        productName: "JBL Flip 6",
        productSku: "JBL-FLIP6-BLU",
        quantity: 1,
        unitPrice: 72_000,
        unitsOfBase: 1,
        packName: "piece",
      },
    ],
    createdAt: at(2026, 8, 12, 15, 30),
    createdById: "u1",
    createdByName: CURRENT_USER.name,
  },
  {
    id: "cn2",
    number: "AV-20260916-002",
    invoiceId: "inv_big_1",
    invoiceNumber: "FV-20260916-110001",
    amount: 15_000,
    reason: "Remise commerciale apres-vente",
    items: [
      {
        id: "cni2",
        productId: "p4",
        productName: "Chargeur USB-C 45W",
        productSku: "CHG-45W-UC",
        quantity: 1,
        unitPrice: 15_000,
        unitsOfBase: 1,
        packName: "piece",
      },
    ],
    createdAt: at(2026, 8, 16, 12, 20),
    createdById: "u2",
    createdByName: "Amina Kone",
  },
];

const baseInMovements: StockMovement[] = [
  {
    id: "m_in_p1",
    productId: "p1",
    productName: "Samsung Galaxy S24 Ultra",
    type: "IN",
    quantity: 12,
    unitPrice: 650_000,
    reference: "ACH-SEED-001",
    createdById: "u1",
    createdByName: CURRENT_USER.name,
    createdAt: at(2026, 0, 10),
  },
  {
    id: "m_in_p8",
    productId: "p8",
    productName: "Aspen Menthol",
    type: "IN",
    quantity: 400,
    unitPrice: 400,
    reference: "ACH-20260601-CIG",
    notes: "2 cartons",
    createdById: "u1",
    createdByName: CURRENT_USER.name,
    createdAt: at(2026, 5, 1),
  },
  {
    id: "m_in_pu3",
    productId: "p21",
    productName: "Coca-Cola 50cl",
    type: "IN",
    quantity: 240,
    unitPrice: 250,
    reference: "ACH-20260901-003",
    createdById: "u2",
    createdByName: "Amina Kone",
    createdAt: at(2026, 8, 2),
  },
  {
    id: "m_in_pu6",
    productId: "p10",
    productName: "Xiaomi Redmi Note 13",
    type: "IN",
    quantity: 5,
    unitPrice: 95_000,
    reference: "ACH-20260914-006",
    createdById: "u3",
    createdByName: "Koffi Yao",
    createdAt: at(2026, 8, 14, 16, 0),
  },
  {
    id: "m_adj_1",
    productId: "p17",
    productName: "Verre trempe universel",
    type: "ADJUSTMENT",
    quantity: -2,
    reference: "INV-PHY-0901",
    notes: "Casse inventaire",
    createdById: "u1",
    createdByName: CURRENT_USER.name,
    createdAt: at(2026, 8, 1, 18, 0),
  },
];

export const seedAuditLogs: AuditLog[] = [
  {
    id: "aud1",
    action: "OPEN_SESSION",
    entityType: "CashSession",
    entityId: "cs_2026-09-16",
    summary: "Ouverture caisse du 2026-09-16 (fonds 75 000)",
    userId: "u1",
    userName: CURRENT_USER.name,
    createdAt: at(2026, 8, 16, 7, 50),
  },
  {
    id: "aud2",
    action: "CLOSE_SESSION",
    entityType: "CashSession",
    entityId: "cs_2026-09-15",
    summary: "Cloture caisse du 2026-09-15",
    userId: "u1",
    userName: CURRENT_USER.name,
    createdAt: at(2026, 8, 15, 23, 58),
  },
  {
    id: "aud3",
    action: "SALE",
    entityType: "Invoice",
    entityId: "inv_big_1",
    summary: "Vente FV-20260916-110001 — Entreprise KOBE",
    userId: "u2",
    userName: "Amina Kone",
    createdAt: at(2026, 8, 16, 11, 5),
  },
  {
    id: "aud4",
    action: "RECEIVE",
    entityType: "Purchase",
    entityId: "pu6",
    summary: "Reception ACH-20260914-006",
    userId: "u3",
    userName: "Koffi Yao",
    createdAt: at(2026, 8, 14, 16, 0),
  },
  {
    id: "aud5",
    action: "CANCEL",
    entityType: "Purchase",
    entityId: "pu5",
    summary: "Annulation ACH-20260820-005",
    userId: "u1",
    userName: CURRENT_USER.name,
    createdAt: at(2026, 7, 22, 10, 0),
  },
  {
    id: "aud6",
    action: "CREATE",
    entityType: "CreditNote",
    entityId: "cn1",
    summary: "Avoir AV-20260912-001 sur FV-20260908-140001",
    userId: "u1",
    userName: CURRENT_USER.name,
    createdAt: at(2026, 8, 12, 15, 30),
  },
  {
    id: "aud7",
    action: "UPDATE",
    entityType: "Product",
    entityId: "p7",
    summary: "Seuil stock Cable USB-C ajuste",
    userId: "u4",
    userName: "Fatou Diallo",
    createdAt: at(2026, 8, 15, 9, 20),
  },
  {
    id: "aud8",
    action: "ADJUST",
    entityType: "StockMovement",
    entityId: "m_adj_1",
    summary: "Ajustement inventaire verre trempe (−2)",
    userId: "u1",
    userName: CURRENT_USER.name,
    createdAt: at(2026, 8, 1, 18, 0),
  },
  {
    id: "aud9",
    action: "LOGIN",
    entityType: "User",
    entityId: "u2",
    summary: "Connexion Amina Kone",
    userId: "u2",
    userName: "Amina Kone",
    createdAt: at(2026, 8, 16, 7, 40),
  },
  {
    id: "aud10",
    action: "OTHER",
    entityType: "System",
    summary: "Seed mock data v10 charge",
    userId: "u1",
    userName: CURRENT_USER.name,
    createdAt: at(2026, 8, 16, 0, 1),
  },
];

export type RichSeedStore = {
  users: User[];
  categories: Category[];
  suppliers: Supplier[];
  products: Product[];
  supplierOffers: ProductSupplierOffer[];
  movements: StockMovement[];
  purchases: Purchase[];
  invoices: Invoice[];
  creditNotes: CreditNote[];
  cashLedger: CashLedgerEntry[];
  cashSessions: CashSession[];
  auditLogs: AuditLog[];
};

function shiftDate(value: Date | undefined, deltaMs: number) {
  if (!value) return value;
  return new Date(value.getTime() + deltaMs);
}

/** Decale toutes les dates du seed pour coller a « aujourd'hui » reel. */
function alignSeedToToday<T>(value: T, deltaMs: number): T {
  if (value instanceof Date) {
    return new Date(value.getTime() + deltaMs) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => alignSeedToToday(item, deltaMs)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key === "businessDate" && typeof nested === "string") {
        const [y, m, d] = nested.split("-").map(Number);
        const shifted = shiftDate(at(y, m - 1, d, 12), deltaMs)!;
        out[key] = businessDate(shifted);
      } else if (
        (key === "number" || key === "reference" || key === "summary") &&
        typeof nested === "string"
      ) {
        // laisse les refs textuelles ; les dates ISO dans les ids restent lisibles
        out[key] = nested;
      } else {
        out[key] = alignSeedToToday(nested, deltaMs);
      }
    }
    return out as T;
  }
  return value;
}

export function buildRichSeedStore(now = new Date()): RichSeedStore {
  const generated = buildGeneratedSales();

  // Appliquer les avoirs sur les factures ciblees
  const invoices = generated.invoices.map((inv) => {
    if (inv.id === "inv_partial") {
      return { ...inv, creditedAmount: 72_000 };
    }
    if (inv.id === "inv_big_1") {
      return { ...inv, creditedAmount: 15_000 };
    }
    return inv;
  });

  const refundCash: CashLedgerEntry[] = [
    {
      id: "cash_cn1",
      direction: "OUT",
      amount: 72_000,
      paymentMethod: "CASH",
      label: "Avoir AV-20260912-001",
      description: "Remboursement JBL Flip 6",
      reference: "AV-20260912-001",
      sourceType: "REFUND",
      sourceId: "cn1",
      occurredAt: at(2026, 8, 12, 15, 35),
      createdById: "u1",
      createdByName: CURRENT_USER.name,
      createdAt: at(2026, 8, 12, 15, 35),
    },
  ];

  const cashLedger = [
    ...floatCash,
    ...purchaseCash,
    ...generated.cash,
    ...refundCash,
  ].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  const movements = [...baseInMovements, ...generated.movements].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const raw: RichSeedStore = {
    users: structuredClone(seedUsers),
    categories: structuredClone(seedCategories),
    suppliers: structuredClone(seedSuppliers),
    products: structuredClone(seedProducts),
    supplierOffers: structuredClone(seedOffers),
    movements: structuredClone(movements),
    purchases: structuredClone(seedPurchases),
    invoices: structuredClone(invoices).sort(
      (a, b) => b.issuedAt.getTime() - a.issuedAt.getTime(),
    ),
    creditNotes: structuredClone(seedCreditNotes),
    cashLedger: structuredClone(cashLedger),
    cashSessions: structuredClone(seedCashSessions),
    auditLogs: structuredClone(seedAuditLogs).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    ),
  };

  // Ancre seed = 16/09/2026 → aligne sur le jour courant (dashboard / PDF du jour pleins)
  const todayNoon = new Date(now);
  todayNoon.setHours(12, 0, 0, 0);
  const deltaMs = todayNoon.getTime() - MOCK_TODAY.getTime();

  const aligned = alignSeedToToday(raw, deltaMs);

  // Corriger les ids de session apres decalage de businessDate
  aligned.cashSessions = aligned.cashSessions.map((s) => {
    const id = `cs_${s.businessDate}`;
    let carriedFromSessionId = s.carriedFromSessionId;
    if (carriedFromSessionId) {
      const prev = new Date(s.openedAt);
      prev.setDate(prev.getDate() - 1);
      carriedFromSessionId = `cs_${businessDate(prev)}`;
    }
    return { ...s, id, carriedFromSessionId };
  });
  for (const entry of aligned.cashLedger) {
    if (entry.sourceType === "FLOAT_IN" && entry.sourceId?.startsWith("cs_")) {
      const session = aligned.cashSessions.find(
        (s) => businessDate(s.openedAt) === s.businessDate,
      );
      // rattache au float du meme jour
      const sameDay = aligned.cashSessions.find(
        (s) =>
          businessDate(entry.occurredAt) === s.businessDate,
      );
      if (sameDay) entry.sourceId = sameDay.id;
      else if (session) entry.sourceId = session.id;
    }
  }

  return aligned;
}
