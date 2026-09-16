import { buildExpiryAlerts } from "@/lib/inventory/expiry";
import { listCategories } from "@/lib/repositories/categories";
import { listProducts } from "@/lib/repositories/products";

function categoriesMap() {
  return new Map(listCategories().map((c) => [c.id, c]));
}

export function listExpiryAlerts(now = new Date()) {
  return buildExpiryAlerts(listProducts(), categoriesMap(), now);
}

export function countExpiryAlerts(now = new Date()) {
  const rows = listExpiryAlerts(now);
  return {
    total: rows.length,
    expired: rows.filter((r) => r.status === "expired").length,
    critical: rows.filter((r) => r.status === "critical").length,
    soon: rows.filter((r) => r.status === "soon").length,
  };
}
