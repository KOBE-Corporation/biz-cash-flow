import { generateBarcode } from "@/lib/sales/pricing";
import type {
  AuditLog,
  CashLedgerEntry,
  CashSession,
  Category,
  CreditNote,
  Invoice,
  Product,
  ProductSupplierOffer,
  Purchase,
  StockMovement,
  Supplier,
  User,
} from "@/lib/types";
import { buildRichSeedStore } from "@/lib/mock/rich-seed";

const ACTOR = {
  createdById: "u1",
  createdByName: "Ben Djibril",
} as const;

export function createId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

const touchDate = () => new Date();

export type MockStore = {
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

function createSeedStore(): MockStore {
  return buildRichSeedStore();
}

/** Invalide le store HMR obsolete (evite mismatch SSR/client). Bump pour recharger le seed. */
const STORE_VERSION = 12;

const globalStore = globalThis as unknown as {
  __bcfMockStore?: MockStore;
  __bcfMockStoreVersion?: number;
};

export function getStore(): MockStore {
  if (
    !globalStore.__bcfMockStore ||
    globalStore.__bcfMockStoreVersion !== STORE_VERSION
  ) {
    globalStore.__bcfMockStore = createSeedStore();
    globalStore.__bcfMockStoreVersion = STORE_VERSION;
  }
  const store = globalStore.__bcfMockStore;
  if (!store.supplierOffers) store.supplierOffers = [];
  if (!store.auditLogs) store.auditLogs = [];
  if (!store.cashLedger) store.cashLedger = [];
  if (!store.creditNotes) store.creditNotes = [];
  if (!store.cashSessions) store.cashSessions = [];

  const ensureActor = <T extends { createdById?: string; createdByName?: string }>(
    item: T,
  ) => {
    if (!item.createdById) item.createdById = ACTOR.createdById;
    if (!item.createdByName) item.createdByName = ACTOR.createdByName;
    return item;
  };

  for (const product of store.products) {
    ensureActor(product);
    if (!product.barcode) {
      product.barcode = generateBarcode(product.sku);
    }
    if (!product.baseUnitName) {
      product.baseUnitName = "piece";
    }
    if (!product.packLevels?.length) {
      product.packLevels = [
        {
          id: `pl_${product.id}`,
          name: product.baseUnitName,
          unitsOfBase: 1,
          salePrice: product.salePrice,
        },
      ];
    }
  }
  for (const category of store.categories) {
    ensureActor(category);
    if (!category.baseUnitName) category.baseUnitName = "piece";
    if (!category.packLevels?.length) {
      category.packLevels = [
        {
          id: `pl_cat_${category.id}`,
          name: category.baseUnitName,
          unitsOfBase: 1,
        },
      ];
    }
    if (!category.tracking) {
      category.tracking = {
        tracksManufacturedAt: false,
        tracksExpiry: false,
        tracksBatchNumber: false,
        tracksSerialNumber: false,
        expiryAlertDays: 30,
        expiryCriticalDays: 7,
      };
    } else {
      const t = category.tracking;
      category.tracking = {
        tracksManufacturedAt: t.tracksManufacturedAt ?? false,
        tracksExpiry: t.tracksExpiry ?? false,
        tracksBatchNumber: t.tracksBatchNumber ?? false,
        tracksSerialNumber: t.tracksSerialNumber ?? false,
        expiryAlertDays: t.expiryAlertDays ?? 30,
        expiryCriticalDays: t.expiryCriticalDays ?? 7,
        defaultShelfLifeDays: t.defaultShelfLifeDays,
        suggestedNearExpiryDiscountPercent:
          t.suggestedNearExpiryDiscountPercent,
      };
    }
  }
  for (const supplier of store.suppliers) ensureActor(supplier);
  for (const offer of store.supplierOffers) ensureActor(offer);
  for (const movement of store.movements) {
    ensureActor(movement);
    if (!movement.createdByName) movement.createdByName = ACTOR.createdByName;
  }
  for (const purchase of store.purchases) {
    ensureActor(purchase);
    for (const item of purchase.items) {
      if (!item.purchasePackName) item.purchasePackName = "piece";
      if (!item.unitsPerPurchasePack) item.unitsPerPurchasePack = 1;
    }
  }
  // Migration : figer le cout revient sur les lignes de facture historiques
  const productCost = new Map(
    store.products.map((p) => [p.id, p.purchasePrice] as const),
  );
  for (const invoice of store.invoices) {
    for (const item of invoice.items) {
      if (item.unitCost == null && item.productId) {
        item.unitCost = productCost.get(item.productId) ?? 0;
      }
    }
  }
  return store;
}

export function resetStore() {
  globalStore.__bcfMockStore = createSeedStore();
  globalStore.__bcfMockStoreVersion = STORE_VERSION;
}

export function touch() {
  return touchDate();
}
