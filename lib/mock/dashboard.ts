import { getDailyAccounting } from "@/lib/repositories/accounting";
import { countExpiryAlerts } from "@/lib/repositories/expiry-alerts";
import {
  countInvoicesByStatus,
  listInvoices,
} from "@/lib/repositories/invoices";
import { listMovements } from "@/lib/repositories/movements";
import { listProducts } from "@/lib/repositories/products";
import { getStore } from "@/lib/mock/store";
import type { DashboardStats, Invoice, Product } from "@/lib/types";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getDashboardStats(now = new Date()): DashboardStats {
  const { products, categories, suppliers } = getStore();
  const active = products.filter((p) => p.isActive);
  const day = getDailyAccounting(now);
  const invoiceStats = countInvoicesByStatus();
  const expiry = countExpiryAlerts(now);

  const todayPaid = listInvoices().filter(
    (i) => i.status === "PAID" && isSameDay(new Date(i.issuedAt), now),
  );

  return {
    totalProducts: active.length,
    totalCategories: categories.filter((c) => c.isActive).length,
    totalSuppliers: suppliers.filter((s) => s.isActive).length,
    stockValue: active.reduce(
      (sum, p) => sum + p.quantity * p.purchasePrice,
      0,
    ),
    lowStockCount: active.filter(
      (p) => p.quantity > 0 && p.quantity <= p.minStock,
    ).length,
    outOfStockCount: active.filter((p) => p.quantity <= 0).length,
    todaySalesTotal: todayPaid.reduce((s, i) => s + i.totalAmount, 0),
    todaySalesCount: todayPaid.length,
    todayNetCash: day.netCash,
    unpaidCount: invoiceStats.unpaid,
    unpaidTotal: invoiceStats.unpaidTotal,
    expiryAlertCount: expiry.total,
  };
}

export function getRecentMovements(limit = 6) {
  return listMovements().slice(0, limit);
}

export function getRecentInvoices(limit = 5): Invoice[] {
  return listInvoices().slice(0, limit);
}

export function getLowStockProducts(limit = 6): Product[] {
  return listProducts()
    .filter(
      (p) =>
        p.isActive &&
        (p.quantity <= 0 || (p.quantity > 0 && p.quantity <= p.minStock)),
    )
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, limit);
}

/** @deprecated use getDashboardStats() / getRecentMovements() */
export const dashboardStats = getDashboardStats();
export const recentMovements = getRecentMovements();
