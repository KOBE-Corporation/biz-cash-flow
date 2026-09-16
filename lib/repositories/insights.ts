import { getStore } from "@/lib/mock/store";
import {
  getPeriodRange,
  type PeriodKey,
} from "@/lib/repositories/cash-sessions";
import { listCategories } from "@/lib/repositories/categories";
import { listProducts } from "@/lib/repositories/products";
import { sumOperationalCash } from "@/lib/cash/pnl";
import type { PaymentMethod } from "@/lib/types";

export type ProductSalesRank = {
  productId: string;
  name: string;
  sku: string;
  categoryId?: string;
  categoryName?: string;
  qtySold: number;
  revenue: number;
  estimatedCost: number;
  estimatedGain: number;
  stockQty: number;
};

export type CategorySalesRank = {
  categoryId: string;
  name: string;
  qtySold: number;
  revenue: number;
  estimatedCost: number;
  estimatedGain: number;
  productCount: number;
  activeProductCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  sharePercent: number;
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

export type PaymentMixItem = {
  method: PaymentMethod;
  count: number;
  total: number;
  sharePercent: number;
};

export type PeriodInsights = {
  period: PeriodKey;
  label: string;
  start: Date;
  end: Date;
  salesTotal: number;
  salesCount: number;
  avgTicket: number;
  operationalIn: number;
  operationalOut: number;
  operationalNet: number;
  estimatedMargin: number;
  marginPercent: number;
  avgDailySales: number;
  topProducts: ProductSalesRank[];
  bottomProducts: ProductSalesRank[];
  /** Produits actifs jamais vendus sur la periode (candidats "moins vendus"). */
  unsoldProducts: StockHighlight[];
  topCategories: CategorySalesRank[];
  bottomCategories: CategorySalesRank[];
  topSellers: SellerRank[];
  paymentMix: PaymentMixItem[];
  mostInStock: StockHighlight | null;
  leastInStock: StockHighlight | null;
  lowStockCount: number;
  outOfStockCount: number;
  inactiveProductCount: number;
  unpaidCount: number;
  unpaidTotal: number;
  flagshipProductIds: string[];
  flagshipCategoryIds: string[];
};

function isPaidInvoiceStatus(status: string) {
  return status === "PAID" || status === "PARTIALLY_PAID";
}

/**
 * Analyse ventes / stock / vendeurs / categories pour une periode.
 * Float exclu des totaux caisse.
 */
export function getPeriodInsights(
  period: PeriodKey,
  anchor = new Date(),
  limits: {
    top?: number;
    bottom?: number;
    sellers?: number;
    categories?: number;
  } = {},
): PeriodInsights {
  const topLimit = limits.top ?? 8;
  const bottomLimit = limits.bottom ?? 5;
  const sellersLimit = limits.sellers ?? 5;
  const categoriesLimit = limits.categories ?? 6;
  const { start, end, label } = getPeriodRange(period, anchor);
  const store = getStore();
  const products = listProducts();
  const categories = listCategories();
  const productMap = new Map(products.map((p) => [p.id, p]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

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
  const avgTicket =
    salesCount > 0 ? Math.round(salesTotal / salesCount) : 0;

  const byProduct = new Map<
    string,
    { name: string; sku: string; qtySold: number; revenue: number; cost: number }
  >();

  const bySeller = new Map<string, SellerRank>();
  const byPayment = new Map<PaymentMethod, { count: number; total: number }>();

  for (const inv of invoices) {
    const paid = inv.amountPaid ?? inv.totalAmount;
    const paidRatio =
      inv.totalAmount > 0 ? Math.min(1, paid / inv.totalAmount) : 1;

    const seller = bySeller.get(inv.issuedById) ?? {
      userId: inv.issuedById,
      userName: inv.issuedByName,
      salesCount: 0,
      salesTotal: 0,
    };
    seller.salesCount += 1;
    seller.salesTotal += paid;
    bySeller.set(inv.issuedById, seller);

    const pay = byPayment.get(inv.paymentMethod) ?? { count: 0, total: 0 };
    pay.count += 1;
    pay.total += paid;
    byPayment.set(inv.paymentMethod, pay);

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
    .map(([productId, v]) => {
      const product = productMap.get(productId);
      const categoryId = product?.categoryId;
      return {
        productId,
        name: v.name,
        sku: v.sku,
        categoryId,
        categoryName: categoryId
          ? categoryMap.get(categoryId)?.name
          : undefined,
        qtySold: Math.round(v.qtySold),
        revenue: Math.round(v.revenue),
        estimatedCost: Math.round(v.cost),
        estimatedGain: Math.round(v.revenue - v.cost),
        stockQty: product?.quantity ?? 0,
      };
    })
    .sort((a, b) => b.qtySold - a.qtySold || b.revenue - a.revenue);

  const topProducts = ranked.slice(0, topLimit);
  const bottomProducts = [...ranked]
    .filter((p) => p.qtySold > 0)
    .sort((a, b) => a.qtySold - b.qtySold || a.revenue - b.revenue)
    .slice(0, bottomLimit);

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
    .slice(0, bottomLimit);

  const byCategory = new Map<
    string,
    { qtySold: number; revenue: number; cost: number }
  >();

  for (const row of ranked) {
    const categoryId = row.categoryId ?? "__none__";
    const current = byCategory.get(categoryId) ?? {
      qtySold: 0,
      revenue: 0,
      cost: 0,
    };
    current.qtySold += row.qtySold;
    current.revenue += row.revenue;
    current.cost += row.estimatedCost;
    byCategory.set(categoryId, current);
  }

  const categoryRanks: CategorySalesRank[] = [...byCategory.entries()]
    .map(([categoryId, v]) => {
      const category =
        categoryId === "__none__" ? null : categoryMap.get(categoryId);
      const catProducts = products.filter(
        (p) => (p.categoryId ?? "__none__") === categoryId,
      );
      const active = catProducts.filter((p) => p.isActive);
      return {
        categoryId,
        name: category?.name ?? "Sans categorie",
        qtySold: Math.round(v.qtySold),
        revenue: Math.round(v.revenue),
        estimatedCost: Math.round(v.cost),
        estimatedGain: Math.round(v.revenue - v.cost),
        productCount: catProducts.length,
        activeProductCount: active.length,
        lowStockCount: active.filter(
          (p) => p.quantity > 0 && p.quantity <= p.minStock,
        ).length,
        outOfStockCount: active.filter((p) => p.quantity <= 0).length,
        sharePercent:
          salesTotal > 0
            ? Math.round((v.revenue / salesTotal) * 1000) / 10
            : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.qtySold - a.qtySold);

  // Categories actives sans vente sur la periode
  for (const category of categories.filter((c) => c.isActive)) {
    if (categoryRanks.some((r) => r.categoryId === category.id)) continue;
    const catProducts = products.filter((p) => p.categoryId === category.id);
    const active = catProducts.filter((p) => p.isActive);
    categoryRanks.push({
      categoryId: category.id,
      name: category.name,
      qtySold: 0,
      revenue: 0,
      estimatedCost: 0,
      estimatedGain: 0,
      productCount: catProducts.length,
      activeProductCount: active.length,
      lowStockCount: active.filter(
        (p) => p.quantity > 0 && p.quantity <= p.minStock,
      ).length,
      outOfStockCount: active.filter((p) => p.quantity <= 0).length,
      sharePercent: 0,
    });
  }

  const topCategories = categoryRanks
    .filter((c) => c.revenue > 0)
    .slice(0, categoriesLimit);
  const bottomCategories = [...categoryRanks]
    .filter((c) => c.categoryId !== "__none__")
    .sort((a, b) => a.revenue - b.revenue || a.qtySold - b.qtySold)
    .slice(0, Math.min(bottomLimit, 5));

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

  const lowStockCount = activeStock.filter(
    (p) => p.quantity > 0 && p.quantity <= p.minStock,
  ).length;
  const outOfStockCount = activeStock.filter((p) => p.quantity <= 0).length;
  const inactiveProductCount = products.filter((p) => !p.isActive).length;

  const unpaidInvoices = store.invoices.filter((inv) => {
    if (inv.status === "CANCELLED" || inv.status === "PAID") return false;
    const balance =
      inv.totalAmount - (inv.amountPaid ?? 0) - (inv.creditedAmount ?? 0);
    return balance > 0;
  });
  const unpaidTotal = unpaidInvoices.reduce((s, inv) => {
    return (
      s +
      Math.max(
        0,
        inv.totalAmount - (inv.amountPaid ?? 0) - (inv.creditedAmount ?? 0),
      )
    );
  }, 0);

  const topSellers = [...bySeller.values()]
    .sort((a, b) => b.salesTotal - a.salesTotal)
    .slice(0, sellersLimit);

  const paymentMix: PaymentMixItem[] = (
    ["CASH", "MOBILE_MONEY", "CREDIT"] as PaymentMethod[]
  )
    .map((method) => {
      const row = byPayment.get(method) ?? { count: 0, total: 0 };
      return {
        method,
        count: row.count,
        total: Math.round(row.total),
        sharePercent:
          salesTotal > 0
            ? Math.round((row.total / salesTotal) * 1000) / 10
            : 0,
      };
    })
    .filter((row) => row.count > 0 || row.total > 0);

  const daySpan = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (24 * 3600 * 1000)),
  );
  const estimatedMargin = ranked.reduce((s, p) => s + p.estimatedGain, 0);
  const marginPercent =
    salesTotal > 0
      ? Math.round((estimatedMargin / salesTotal) * 1000) / 10
      : 0;

  return {
    period,
    label,
    start,
    end,
    salesTotal: Math.round(salesTotal),
    salesCount,
    avgTicket,
    operationalIn: ops.operationalIn,
    operationalOut: ops.operationalOut,
    operationalNet: ops.operationalNet,
    estimatedMargin: Math.round(estimatedMargin),
    marginPercent,
    avgDailySales: Math.round(salesTotal / daySpan),
    topProducts,
    bottomProducts,
    unsoldProducts,
    topCategories,
    bottomCategories,
    topSellers,
    paymentMix,
    mostInStock,
    leastInStock,
    lowStockCount,
    outOfStockCount,
    inactiveProductCount,
    unpaidCount: unpaidInvoices.length,
    unpaidTotal: Math.round(unpaidTotal),
    flagshipProductIds: topProducts.slice(0, 3).map((p) => p.productId),
    flagshipCategoryIds: topCategories.slice(0, 3).map((c) => c.categoryId),
  };
}

/** Produits phares du jour (ids) — pour badges recus / caisse. */
export function getTodayFlagshipProductIds(limit = 3) {
  return getPeriodInsights("day", new Date(), {
    top: limit,
    bottom: 0,
    sellers: 0,
    categories: 0,
  }).flagshipProductIds;
}

/** Categories phares du jour (ids). */
export function getTodayFlagshipCategoryIds(limit = 3) {
  return getPeriodInsights("day", new Date(), {
    top: 0,
    bottom: 0,
    sellers: 0,
    categories: limit,
  }).flagshipCategoryIds;
}

export function getDashboardHighlights(now = new Date()) {
  const day = getPeriodInsights("day", now);
  const week = getPeriodInsights("week", now, {
    top: 5,
    bottom: 3,
    sellers: 3,
    categories: 5,
  });
  return { day, week };
}

/** Stats categories pour la page Categories (periode jour + stock). */
export function getCategoryInsights(now = new Date()) {
  return getPeriodInsights("day", now, {
    top: 5,
    bottom: 5,
    sellers: 3,
    categories: 12,
  });
}
