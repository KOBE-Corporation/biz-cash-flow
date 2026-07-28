import { getStore } from "@/lib/mock/store";
import { listOffersForProduct } from "@/lib/repositories/offers";
import { listProducts } from "@/lib/repositories/products";

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
  salesTotal: number;
  salesCount: number;
  purchasesTotal: number;
  purchasesCount: number;
  estimatedMargin: number;
  lowStockAlerts: number;
  outOfStockAlerts: number;
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

export function getDailyAccounting(date = new Date()): DailyAccounting {
  const day = startOfDay(date);
  const { invoices, purchases } = getStore();
  const products = listProducts();

  const dayInvoices = invoices.filter(
    (inv) => inv.status === "PAID" && isSameDay(new Date(inv.issuedAt), day),
  );
  const dayPurchases = purchases.filter(
    (pu) =>
      (pu.status === "RECEIVED" || pu.status === "PENDING") &&
      isSameDay(new Date(pu.purchasedAt), day),
  );

  const salesTotal = dayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const purchasesTotal = dayPurchases.reduce(
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

  const estimatedMargin = topProducts.reduce(
    (sum, item) => sum + item.estimatedGain,
    0,
  );

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

  const active = products.filter((p) => p.isActive);

  return {
    date: day,
    salesTotal,
    salesCount: dayInvoices.length,
    purchasesTotal,
    purchasesCount: dayPurchases.length,
    estimatedMargin,
    lowStockAlerts: active.filter(
      (p) => p.quantity > 0 && p.quantity <= p.minStock,
    ).length,
    outOfStockAlerts: active.filter((p) => p.quantity <= 0).length,
    topProducts,
    supplierComparisons,
  };
}
