import type {
  Category,
  CategoryTracking,
  ExpiryStatus,
  Product,
} from "@/lib/types";

export const DEFAULT_CATEGORY_TRACKING: CategoryTracking = {
  tracksManufacturedAt: false,
  tracksExpiry: false,
  tracksBatchNumber: false,
  tracksSerialNumber: false,
  expiryAlertDays: 30,
  expiryCriticalDays: 7,
};

export function normalizeCategoryTracking(
  partial?: Partial<CategoryTracking> | null,
): CategoryTracking {
  const merged: CategoryTracking = {
    ...DEFAULT_CATEGORY_TRACKING,
    ...partial,
  };
  const alertDays = Math.max(0, Math.trunc(merged.expiryAlertDays || 0));
  const criticalDays = Math.max(
    0,
    Math.trunc(merged.expiryCriticalDays || 0),
  );
  return {
    ...merged,
    expiryAlertDays: Math.max(alertDays, criticalDays),
    expiryCriticalDays: Math.min(criticalDays, alertDays || criticalDays),
    defaultShelfLifeDays:
      merged.defaultShelfLifeDays !== undefined &&
      merged.defaultShelfLifeDays !== null
        ? Math.max(1, Math.trunc(merged.defaultShelfLifeDays))
        : undefined,
    suggestedNearExpiryDiscountPercent:
      merged.suggestedNearExpiryDiscountPercent !== undefined &&
      merged.suggestedNearExpiryDiscountPercent !== null
        ? Math.min(
            90,
            Math.max(0, Math.trunc(merged.suggestedNearExpiryDiscountPercent)),
          )
        : undefined,
  };
}

export function categoryNeedsLotFields(tracking: CategoryTracking) {
  return (
    tracking.tracksManufacturedAt ||
    tracking.tracksExpiry ||
    tracking.tracksBatchNumber ||
    tracking.tracksSerialNumber
  );
}

/** Jours restants avant peremption (negatif = deja perime). */
export function daysUntilExpiry(expiresAt: Date, now = new Date()) {
  const end = new Date(expiresAt);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
}

export function suggestExpiryFromManufactured(
  manufacturedAt: Date,
  shelfLifeDays: number,
) {
  const expires = new Date(manufacturedAt);
  expires.setDate(expires.getDate() + Math.max(1, shelfLifeDays));
  return expires;
}

export function getExpiryStatus(
  product: Product,
  category: Category | null | undefined,
  now = new Date(),
): ExpiryStatus {
  const tracking = normalizeCategoryTracking(category?.tracking);
  if (!tracking.tracksExpiry || !product.expiresAt || product.quantity <= 0) {
    return "none";
  }
  const days = daysUntilExpiry(product.expiresAt, now);
  if (days < 0) return "expired";
  if (days <= tracking.expiryCriticalDays) return "critical";
  if (days <= tracking.expiryAlertDays) return "soon";
  return "ok";
}

export function suggestedDiscountForProduct(
  product: Product,
  category: Category | null | undefined,
) {
  const tracking = normalizeCategoryTracking(category?.tracking);
  const status = getExpiryStatus(product, category);
  if (status !== "soon" && status !== "critical" && status !== "expired") {
    return 0;
  }
  const base = tracking.suggestedNearExpiryDiscountPercent ?? 0;
  if (status === "expired") return Math.min(90, Math.max(base, 50));
  if (status === "critical") {
    return Math.min(90, Math.max(base, Math.round(base * 1.5) || 20));
  }
  return base;
}

export type ExpiryAlertRow = {
  product: Product;
  category: Category | null;
  status: Exclude<ExpiryStatus, "none" | "ok">;
  daysLeft: number;
  suggestedDiscountPercent: number;
};

export function buildExpiryAlerts(
  products: Product[],
  categoriesById: Map<string, Category>,
  now = new Date(),
): ExpiryAlertRow[] {
  const rows: ExpiryAlertRow[] = [];
  for (const product of products) {
    if (!product.isActive || product.quantity <= 0) continue;
    const category = categoriesById.get(product.categoryId) ?? null;
    const status = getExpiryStatus(product, category, now);
    if (status !== "soon" && status !== "critical" && status !== "expired") {
      continue;
    }
    rows.push({
      product,
      category,
      status,
      daysLeft: product.expiresAt
        ? daysUntilExpiry(product.expiresAt, now)
        : 0,
      suggestedDiscountPercent: suggestedDiscountForProduct(product, category),
    });
  }
  return rows.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function formatDateInput(value?: Date | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateInput(value: string): Date | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return undefined;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12,
    0,
    0,
    0,
  );
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatDisplayDate(value?: Date | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
