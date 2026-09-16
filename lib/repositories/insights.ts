import { getStore } from "@/lib/mock/store";
import {
  getPeriodRange,
  type PeriodKey,
} from "@/lib/repositories/cash-sessions";
import { listProducts } from "@/lib/repositories/products";
import { sumOperationalCash } from "@/lib/cash/pnl";

export type ProductSalesRank = {
  productId: string;
  name: string;
  sku: string;
  qtySold: number;
  revenue: number;
  estimatedCost: number;
  estimatedGain: number;
  stockQty: number;
};

export type SellerRank = {
  userId: string;
  userName: string;
  salesCount: number;
  salesTotal: number;
};

export type StockHighlight = {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  minStock: number;
};

export type PeriodInsights = {
  period: PeriodKey;
  label: string;
  start: Date;
  end: Date;
  salesTotal: number;
  salesCount: number;
  operationalIn: number;
  operationalOut: number;
  operationalNet: number;
  estimatedMargin: number;
  avgDailySales: number;
  topProducts: ProductSalesRank[];
  bottomProducts: ProductSalesRank[];
  /** Produits actifs jamais vendus sur la periode (candidats "moins vendus"). */
  unsoldProducts: StockHighlight[];
  topSellers: SellerRank[];
  mostInStock: StockHighlight | null;
  leastInStock: StockHighlight | null;
  flagshipProductIds: string[];
};

function isPaidInvoiceStatus(status: string) {
  return status === "PAID" || status === "PARTIALLY_PAID";
}

/**
 * Analyse ventes / stock / vendeurs pour une periode.
 * Float exclu des totaux caisse.
 */
export function getPeriodInsights(
  period: PeriodKey,
  anchor = new Date(),
  limits = { top: 8, bottom: 5, sellers: 5 },
): PeriodInsights {
  const { start, end, label } = getPeriodRange(period, anchor);
  const store = getStore();
  const products = listProducts();
  const productMap = new Map(products.map((p) => [p.id, p]));

  const ledger = store.cashLedger.filter(
    (e) => e.occurredAt >= start && e.occurredAt < end,
  );
  const ops = sumOperationalCash(ledger);

  const invoices = store.invoices.filter((inv) => {
    if (inv.status === "CANCELLED") return false;
    if (!isPaidInvoiceStatus(inv.status) && (inv.amountPaid ?? 0) <= 0) {
      return false;
    }
    const t = new Date(inv.issuedAt);
    return t >= start && t < end;
  });

  const salesTotal = invoices.reduce(
    (s, i) => s + (i.amountPaid ?? i.totalAmount),
    0,
  );
  const salesCount = invoices.length;

  const byProduct = new Map<
    string,
    { name: string; sku: string; qtySold: number; revenue: number; cost: number }
  >();

  const bySeller = new Map<string, SellerRank>();

  for (const inv of invoices) {
    const paidRatio =
      inv.totalAmount > 0
        ? Math.min(1, (inv.amountPaid ?? inv.totalAmount) / inv.totalAmount)
        : 1;

    const seller = bySeller.get(inv.issuedById) ?? {
      userId: inv.issuedById,
      userName: inv.issuedByName,
      salesCount: 0,
      salesTotal: 0,
    };
    seller.salesCount += 1;
    seller.salesTotal += inv.amountPaid ?? inv.totalAmount;
    bySeller.set(inv.issuedById, seller);

    for (const item of inv.items) {
      if (!item.productId) continue;
      const product = productMap.get(item.productId);
      const units = item.unitsOfBase ?? item.quantity;
      const revenue = item.quantity * item.unitPrice * paidRatio;
      const cost = (product?.purchasePrice ?? 0) * units * paidRatio;
      const current = byProduct.get(item.productId) ?? {
        name: item.productName,
        sku: item.productSku,
        qtySold: 0,
        revenue: 0,
        cost: 0,
      };
      current.qtySold += units;
      current.revenue += revenue;
      current.cost += cost;
      byProduct.set(item.productId, current);
    }
  }

  const ranked: ProductSalesRank[] = [...byProduct.entries()]
    .map(([productId, v]) => ({
      productId,
      name: v.name,
      sku: v.sku,
      qtySold: Math.round(v.qtySold),
      revenue: Math.round(v.revenue),
      estimatedCost: Math.round(v.cost),
      estimatedGain: Math.round(v.revenue - v.cost),
      stockQty: productMap.get(productId)?.quantity ?? 0,
    }))
    .sort((a, b) => b.qtySold - a.qtySold || b.revenue - a.revenue);

  const topProducts = ranked.slice(0, limits.top);
  const bottomProducts = [...ranked]
    .filter((p) => p.qtySold > 0)
    .sort((a, b) => a.qtySold - b.qtySold || a.revenue - b.revenue)
    .slice(0, limits.bottom);

  const soldIds = new Set(ranked.map((r) => r.productId));
  const unsoldProducts = products
    .filter((p) => p.isActive && !soldIds.has(p.id))
    .map((p) => ({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      quantity: p.quantity,
      minStock: p.minStock,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limits.bottom);

  const activeStock = products
    .filter((p) => p.isActive)
    .map((p) => ({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      quantity: p.quantity,
      minStock: p.minStock,
    }));

  const mostInStock =
    [...activeStock].sort((a, b) => b.quantity - a.quantity)[0] ?? null;
  const leastInStock =
    [...activeStock]
      .filter((p) => p.quantity >= 0)
      .sort((a, b) => a.quantity - b.quantity)[0] ?? null;

  const topSellers = [...bySeller.values()]
    .sort((a, b) => b.salesTotal - a.salesTotal)
    .slice(0, limits.sellers);

  const daySpan = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (24 * 3600 * 1000)),
  );
  const estimatedMargin = ranked.reduce((s, p) => s + p.estimatedGain, 0);

  return {
    period,
    label,
    start,
    end,
    salesTotal: Math.round(salesTotal),
    salesCount,
    operationalIn: ops.operationalIn,
    operationalOut: ops.operationalOut,
    operationalNet: ops.operationalNet,
    estimatedMargin: Math.round(estimatedMargin),
    avgDailySales: Math.round(salesTotal / daySpan),
    topProducts,
    bottomProducts,
    unsoldProducts,
    topSellers,
    mostInStock,
    leastInStock,
    flagshipProductIds: topProducts.slice(0, 3).map((p) => p.productId),
  };
}

/** Produits phares du jour (ids) — pour badges recus / caisse. */
export function getTodayFlagshipProductIds(limit = 3) {
  return getPeriodInsights("day", new Date(), {
    top: limit,
    bottom: 0,
    sellers: 0,
  }).flagshipProductIds;
}

export function getDashboardHighlights(now = new Date()) {
  const day = getPeriodInsights("day", now);
  const week = getPeriodInsights("week", now, {
    top: 5,
    bottom: 3,
    sellers: 3,
  });
  return { day, week };
}
