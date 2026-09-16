import { getStore } from "@/lib/mock/store";
import { sumOperationalCash } from "@/lib/cash/pnl";
import { listCashLedgerForDay } from "@/lib/repositories/cash-ledger";
import {
  ensureTodayCashSession,
  getCashSessionForDate,
  getExpectedDrawerBalance,
  getPeriodStats,
  toBusinessDate,
} from "@/lib/repositories/cash-sessions";
import { countExpiryAlerts } from "@/lib/repositories/expiry-alerts";
import { listOffersForProduct } from "@/lib/repositories/offers";
import { listProducts } from "@/lib/repositories/products";
import type { CashLedgerEntry, CashSession } from "@/lib/types";

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export type DailyAccounting = {
  date: Date;
  /** Encaissements metier (hors float). */
  cashIn: number;
  /** Decaissements metier (hors float). */
  cashOut: number;
  /** Net metier = cashIn − cashOut (base des taux). */
  netCash: number;
  /** Fonds d'ouverture (monnaie) — hors CA. */
  openingFloat: number;
  /** Solde theorique du tiroir (float + net metier). */
  expectedDrawer: number;
  session: CashSession | null;
  salesTotal: number;
  salesCount: number;
  purchasesTotal: number;
  purchasesCount: number;
  estimatedMargin: number;
  dailyResult: number;
  lowStockAlerts: number;
  outOfStockAlerts: number;
  expiryAlerts: number;
  ledger: CashLedgerEntry[];
  /** Ledger filtre : seulement operationnel (pour rapports CA). */
  operationalLedger: CashLedgerEntry[];
  salesByUser: Array<{
    userId: string;
    userName: string;
    salesCount: number;
    salesTotal: number;
    cashIn: number;
    firstSaleAt?: Date;
    lastSaleAt?: Date;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    qtySold: number;
    revenue: number;
    estimatedCost: number;
    estimatedGain: number;
  }>;
  supplierComparisons: Array<{
    productId: string;
    productName: string;
    offers: Array<{
      supplierName: string;
      costPerBaseUnit: number;
      purchasePackName: string;
      packPurchasePrice: number;
    }>;
    bestCost: number;
    worstCost: number;
    potentialSavingPerBase: number;
  }>;
  periods: {
    week: ReturnType<typeof getPeriodStats>;
    month: ReturnType<typeof getPeriodStats>;
    quarter: ReturnType<typeof getPeriodStats>;
    year: ReturnType<typeof getPeriodStats>;
  };
};

/**
 * Compte du jour : CA et taux bases UNIQUEMENT sur mouvements operationnels.
 * Le fonds de caisse (float) est isole et n'entre pas dans les taux.
 */
export function getDailyAccounting(date = new Date()): DailyAccounting {
  // Aligne la session du jour (bascule minuit / report fonds) avant les KPIs
  if (toBusinessDate(date) === toBusinessDate(new Date())) {
    ensureTodayCashSession(date);
  }
  const day = startOfDay(date);
  const { invoices, purchases } = getStore();
  const products = listProducts();
  const ledger = listCashLedgerForDay(day);
  const ops = sumOperationalCash(ledger);
  const session = getCashSessionForDate(day);
  const openingFloat = session?.openingFloat ?? 0;
  const expectedDrawer = session
    ? getExpectedDrawerBalance(session)
    : ops.operationalNet;

  const cashIn = ops.operationalIn;
  const cashOut = ops.operationalOut;
  const netCash = ops.operationalNet;
  const operationalLedger = ledger.filter(
    (e) => e.sourceType !== "FLOAT_IN" && e.sourceType !== "FLOAT_OUT",
  );

  const dayInvoices = invoices.filter(
    (inv) =>
      (inv.status === "PAID" || inv.status === "PARTIALLY_PAID") &&
      isSameDay(new Date(inv.issuedAt), day) &&
      (inv.amountPaid ?? 0) > 0,
  );
  const dayPurchasesReceived = purchases.filter(
    (pu) =>
      pu.status === "RECEIVED" &&
      isSameDay(new Date(pu.updatedAt), day),
  );

  const salesTotal = dayInvoices.reduce(
    (sum, inv) => sum + (inv.amountPaid ?? inv.totalAmount),
    0,
  );
  const purchasesTotal = dayPurchasesReceived.reduce(
    (sum, pu) => sum + pu.totalAmount,
    0,
  );

  const byProduct = new Map<
    string,
    { name: string; qtySold: number; revenue: number; estimatedCost: number }
  >();

  for (const inv of dayInvoices) {
    for (const item of inv.items) {
      if (!item.productId) continue;
      const product = products.find((p) => p.id === item.productId);
      const units = item.unitsOfBase ?? item.quantity;
      const cost = (product?.purchasePrice ?? 0) * units;
      const current = byProduct.get(item.productId) ?? {
        name: item.productName,
        qtySold: 0,
        revenue: 0,
        estimatedCost: 0,
      };
      current.qtySold += units;
      current.revenue += item.quantity * item.unitPrice;
      current.estimatedCost += cost;
      byProduct.set(item.productId, current);
    }
  }

  const topProducts = [...byProduct.entries()]
    .map(([productId, value]) => ({
      productId,
      name: value.name,
      qtySold: value.qtySold,
      revenue: value.revenue,
      estimatedCost: value.estimatedCost,
      estimatedGain: value.revenue - value.estimatedCost,
    }))
    .sort((a, b) => b.estimatedGain - a.estimatedGain)
    .slice(0, 8);

  const estimatedMargin = [...byProduct.values()].reduce(
    (sum, item) => sum + (item.revenue - item.estimatedCost),
    0,
  );

  // Resultat jour : marge sur ventes − sorties achats (tresorerie / resultat simplifie)
  const dailyResult = estimatedMargin - purchasesTotal;

  const supplierComparisons = products
    .map((product) => {
      const offers = listOffersForProduct(product.id);
      if (offers.length < 2) return null;
      const costs = offers.map((o) => o.costPerBaseUnit);
      const bestCost = Math.min(...costs);
      const worstCost = Math.max(...costs);
      return {
        productId: product.id,
        productName: product.name,
        offers: offers.map((o) => ({
          supplierName: o.supplierName,
          costPerBaseUnit: o.costPerBaseUnit,
          purchasePackName: o.purchasePackName,
          packPurchasePrice: o.packPurchasePrice,
        })),
        bestCost,
        worstCost,
        potentialSavingPerBase: worstCost - bestCost,
      };
    })
    .filter(Boolean) as DailyAccounting["supplierComparisons"];

  const byUser = new Map<
    string,
    {
      userId: string;
      userName: string;
      salesCount: number;
      salesTotal: number;
      cashIn: number;
      firstSaleAt?: Date;
      lastSaleAt?: Date;
    }
  >();

  for (const inv of dayInvoices) {
    const key = inv.issuedById || inv.issuedByName;
    const current = byUser.get(key) ?? {
      userId: inv.issuedById,
      userName: inv.issuedByName,
      salesCount: 0,
      salesTotal: 0,
      cashIn: 0,
    };
    current.salesCount += 1;
    current.salesTotal += inv.totalAmount;
    const issued = new Date(inv.issuedAt);
    if (!current.firstSaleAt || issued < current.firstSaleAt) {
      current.firstSaleAt = issued;
    }
    if (!current.lastSaleAt || issued > current.lastSaleAt) {
      current.lastSaleAt = issued;
    }
    byUser.set(key, current);
  }

  for (const entry of ledger) {
    if (entry.direction !== "IN" || entry.sourceType !== "SALE") continue;
    const key = entry.createdById || entry.createdByName;
    const current = byUser.get(key) ?? {
      userId: entry.createdById,
      userName: entry.createdByName,
      salesCount: 0,
      salesTotal: 0,
      cashIn: 0,
    };
    current.cashIn += entry.amount;
    if (!current.userName) current.userName = entry.createdByName;
    byUser.set(key, current);
  }

  // Si un vendeur a du CA facture mais pas encore cashIn aligne, egalise
  for (const row of byUser.values()) {
    if (row.cashIn === 0 && row.salesTotal > 0) {
      row.cashIn = row.salesTotal;
    }
  }

  const salesByUser = [...byUser.values()].sort(
    (a, b) => b.salesTotal - a.salesTotal,
  );

  const active = products.filter((p) => p.isActive);

  return {
    date: day,
    cashIn,
    cashOut,
    netCash,
    openingFloat,
    expectedDrawer,
    session,
    salesTotal,
    salesCount: dayInvoices.length,
    purchasesTotal,
    purchasesCount: dayPurchasesReceived.length,
    estimatedMargin,
    dailyResult,
    lowStockAlerts: active.filter(
      (p) => p.quantity > 0 && p.quantity <= p.minStock,
    ).length,
    outOfStockAlerts: active.filter((p) => p.quantity <= 0).length,
    expiryAlerts: countExpiryAlerts(day).total,
    ledger,
    operationalLedger,
    salesByUser,
    topProducts,
    supplierComparisons,
    periods: {
      week: getPeriodStats("week", day),
      month: getPeriodStats("month", day),
      quarter: getPeriodStats("quarter", day),
      year: getPeriodStats("year", day),
    },
  };
}
