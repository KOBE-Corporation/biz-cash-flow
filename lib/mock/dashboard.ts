import type { DashboardStats, StockMovement } from "@/lib/types";

export const dashboardStats: DashboardStats = {
  totalProducts: 4,
  totalCategories: 2,
  totalSuppliers: 2,
  stockValue: 800_098_600_000,
  lowStockCount: 0,
  outOfStockCount: 1,
};

export const recentMovements: StockMovement[] = [
  {
    id: "1",
    productId: "p1",
    productName: "S24U",
    type: "OUT",
    quantity: 1,
    reference: undefined,
    createdAt: new Date("2025-08-30T14:19:00"),
  },
];
