/**
 * Smoke tests du workflow categorie → produit → achat → reception.
 * Lance : npx --yes tsx scripts/smoke-workflow.ts
 */
import { resetStore } from "../lib/mock/store";
import { createCategory, getCategory } from "../lib/repositories/categories";
import { createProduct, getProduct } from "../lib/repositories/products";
import {
  createPurchase,
  setPurchaseStatus,
} from "../lib/repositories/purchases";
import { getExpiryStatus } from "../lib/inventory/expiry";
import { listCashLedgerForDay } from "../lib/repositories/cash-ledger";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function run() {
  resetStore();

  const cat = createCategory({
    name: "Test Perissables",
    baseUnitName: "piece",
    packLevels: [
      { id: "pl1", name: "piece", unitsOfBase: 1 },
      { id: "pl2", name: "carton", unitsOfBase: 10 },
    ],
    tracking: {
      tracksManufacturedAt: true,
      tracksExpiry: true,
      tracksBatchNumber: true,
      tracksSerialNumber: false,
      expiryAlertDays: 30,
      expiryCriticalDays: 7,
      defaultShelfLifeDays: 90,
    },
  });
  assert(cat.ok, "createCategory");
  assert(getCategory(cat.data.id)?.tracking.tracksExpiry, "tracking expiry");

  const product = createProduct({
    name: "Produit Test",
    sku: "TEST-SMOKE-001",
    purchasePrice: 100,
    salePrice: 150,
    categoryId: cat.data.id,
    quantity: 0,
    minStock: 2,
  });
  assert(product.ok, "createProduct");
  assert(product.data.quantity === 0, "stock initial 0");

  const missingDates = createPurchase({
    items: [
      {
        productId: product.data.id,
        quantity: 1,
        unitPrice: 1000,
        purchasePackName: "carton",
        unitsPerPurchasePack: 10,
      },
    ],
  });
  assert(!missingDates.ok, "doit refuser sans dates/lot");

  const purchase = createPurchase({
    items: [
      {
        productId: product.data.id,
        quantity: 2,
        unitPrice: 1000,
        purchasePackName: "carton",
        unitsPerPurchasePack: 10,
        manufacturedAt: new Date(2026, 0, 1),
        expiresAt: new Date(2026, 8, 20),
        batchNumber: "LOT-A",
      },
    ],
  });
  assert(purchase.ok, "createPurchase avec lot");

  const received = setPurchaseStatus(purchase.data.id, "RECEIVED");
  assert(received.ok, "receive purchase");

  const after = getProduct(product.data.id);
  assert(after, "product exists");
  assert(after.quantity === 20, `stock=20 got ${after.quantity}`);
  assert(after.batchNumber === "LOT-A", "batch applied");
  assert(after.expiresAt?.getTime() === new Date(2026, 8, 20).getTime(), "expiry");

  // Reassort avec peremption plus lointaine : garder le lot urgent
  const later = createPurchase({
    items: [
      {
        productId: product.data.id,
        quantity: 1,
        unitPrice: 1000,
        purchasePackName: "carton",
        unitsPerPurchasePack: 10,
        manufacturedAt: new Date(2026, 5, 1),
        expiresAt: new Date(2027, 0, 1),
        batchNumber: "LOT-B",
      },
    ],
  });
  assert(later.ok, "second purchase");
  assert(setPurchaseStatus(later.data.id, "RECEIVED").ok, "receive 2");
  const after2 = getProduct(product.data.id)!;
  assert(after2.quantity === 30, "stock 30");
  assert(after2.batchNumber === "LOT-A", "garde lot le plus urgent");

  // Reassort plus urgent : remplace
  const sooner = createPurchase({
    items: [
      {
        productId: product.data.id,
        quantity: 1,
        unitPrice: 1000,
        purchasePackName: "carton",
        unitsPerPurchasePack: 10,
        manufacturedAt: new Date(2026, 0, 1),
        expiresAt: new Date(2026, 8, 1),
        batchNumber: "LOT-C",
      },
    ],
  });
  assert(sooner.ok && setPurchaseStatus(sooner.data.id, "RECEIVED").ok, "urgent");
  const after3 = getProduct(product.data.id)!;
  assert(after3.batchNumber === "LOT-C", "lot plus urgent applique");

  const status = getExpiryStatus(after3, getCategory(cat.data.id), new Date(2026, 8, 16));
  assert(status === "critical" || status === "soon" || status === "expired", `status=${status}`);

  const outs = listCashLedgerForDay(new Date()).filter((e) => e.direction === "OUT");
  assert(outs.length >= 3, "sorties caisse postees");

  console.log("OK — smoke workflow categorie/produit/achat/reception");
}

run();
