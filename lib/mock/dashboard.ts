import { getStore } from "@/lib/mock/store";
import type { DashboardStats } from "@/lib/types";
import { listMovements } from "@/lib/repositories/movements";

export function getDashboardStats(): DashboardStats {
  const { products, categories, suppliers } = getStore();
  const active = products.filter((p) => p.isActive);
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
  };
}

export function getRecentMovements(limit = 5) {
  return listMovements().slice(0, limit);
}

/** @deprecated use getDashboardStats() / getRecentMovements() */
export const dashboardStats = getDashboardStats();
export const recentMovements = getRecentMovements();
