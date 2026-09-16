import { getStore } from "@/lib/mock/store";
import { listCashLedgerForDay } from "@/lib/repositories/cash-ledger";
import { countExpiryAlerts } from "@/lib/repositories/expiry-alerts";
import { listOffersForProduct } from "@/lib/repositories/offers";
import { listProducts } from "@/lib/repositories/products";
import type { CashLedgerEntry } from "@/lib/types";

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
  /** Entrees d'argent du jour (journal de caisse). */
  cashIn: number;
  /** Sorties d'argent du jour (journal de caisse). */
  cashOut: number;
  /** Solde caisse du jour = cashIn − cashOut. */
  netCash: number;
  salesTotal: number;
  salesCount: number;
  purchasesTotal: number;
  purchasesCount: number;
  /** Marge estimee sur ventes (CA − cout revient des articles vendus). */
  estimatedMargin: number;
  /** Resultat journalier simplifie : marge − (achats caisse hors deja dans marge). */
  dailyResult: number;
  lowStockAlerts: number;
  outOfStockAlerts: number;
  /** Produits perimes / critiques / bientot (selon categorie). */
  expiryAlerts: number;
  ledger: CashLedgerEntry[];
  /** Resume des ventes / encaissements par vendeur pour la journee. */
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
};

/**
 * Compte du jour : basee sur le journal de caisse (entrees/sorties)
 * + marge estimee des ventes payees.
 */
export function getDailyAccounting(date = new Date()): DailyAccounting {
  const day = startOfDay(date);
  const { invoices, purchases } = getStore();
  const products = listProducts();
  const ledger = listCashLedgerForDay(day);

  const cashIn = ledger
    .filter((e) => e.direction === "IN")
    .reduce((sum, e) => sum + e.amount, 0);
  const cashOut = ledger
    .filter((e) => e.direction === "OUT")
    .reduce((sum, e) => sum + e.amount, 0);
  const netCash = cashIn - cashOut;

  const dayInvoices = invoices.filter(
    (inv) => inv.status === "PAID" && isSameDay(new Date(inv.issuedAt), day),
  );
  const dayPurchasesReceived = purchases.filter(
    (pu) =>
      pu.status === "RECEIVED" &&
      isSameDay(new Date(pu.updatedAt), day),
  );

  const salesTotal = dayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
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
    salesByUser,
    topProducts,
    supplierComparisons,
  };
}
