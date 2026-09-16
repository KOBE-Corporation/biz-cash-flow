import type { CartLine, Product, ProductPackPrice } from "@/lib/types";
import {
  getCartSubtotal,
  getLineTotal,
  resolveDiscountAmount,
  type DiscountMode,
} from "@/lib/sales/cart";
import { isSalePriceBelowCost } from "@/lib/sales/pricing";

/** Prix de vente minimum / unite de base = cout de revient. */
export function minSalePricePerBase(costPerBase: number) {
  return Math.max(0, Math.round(costPerBase));
}

export type LinePricingCheck = {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitsOfBase: number;
  unitPrice: number;
  lineTotal: number;
  allocatedDiscount: number;
  effectiveRevenue: number;
  unitCost: number;
  costTotal: number;
  effectivePerBase: number;
  belowCost: boolean;
  shortfall: number;
};

export type CartPricingAnalysis = {
  subtotal: number;
  discountAmount: number;
  total: number;
  totalCost: number;
  realizedGain: number;
  lines: LinePricingCheck[];
  breaches: LinePricingCheck[];
  ok: boolean;
};

export function allocateDiscountProRata(
  lineTotals: number[],
  discountAmount: number,
): number[] {
  const subtotal = lineTotals.reduce((s, n) => s + n, 0);
  if (subtotal <= 0 || discountAmount <= 0) {
    return lineTotals.map(() => 0);
  }
  const capped = Math.min(discountAmount, subtotal);
  const raw = lineTotals.map((t) => (t / subtotal) * capped);
  const floored = raw.map((n) => Math.floor(n));
  let remainder = capped - floored.reduce((s, n) => s + n, 0);
  const order = raw
    .map((n, i) => ({ i, frac: n - Math.floor(n) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floored[i] += 1;
    remainder -= 1;
  }
  return floored;
}

export function analyzeCartPricing(
  lines: CartLine[],
  resolveCost: (line: CartLine) => number,
  discount = 0,
  discountMode: DiscountMode = "amount",
): CartPricingAnalysis {
  const subtotal = getCartSubtotal(lines);
  const discountAmount = resolveDiscountAmount(subtotal, discount, discountMode);
  const totals = lines.map(getLineTotal);
  const allocated = allocateDiscountProRata(totals, discountAmount);

  const checked: LinePricingCheck[] = lines.map((line, index) => {
    const unitsOfBase = (line.unitsOfBase ?? 1) * line.quantity;
    const lineTotal = totals[index] ?? 0;
    const allocatedDiscount = allocated[index] ?? 0;
    const effectiveRevenue = Math.max(0, lineTotal - allocatedDiscount);
    const unitCost = Math.max(0, Math.round(resolveCost(line)));
    const costTotal = Math.round(unitsOfBase * unitCost);
    const effectivePerBase =
      unitsOfBase > 0 ? effectiveRevenue / unitsOfBase : 0;
    const belowCost =
      unitCost > 0 && unitsOfBase > 0 && effectiveRevenue < costTotal;
    const shortfall = belowCost ? costTotal - effectiveRevenue : 0;
    return {
      productId: line.productId,
      productName: line.name,
      sku: line.sku,
      quantity: line.quantity,
      unitsOfBase,
      unitPrice: line.unitPrice,
      lineTotal,
      allocatedDiscount,
      effectiveRevenue,
      unitCost,
      costTotal,
      effectivePerBase: Math.round(effectivePerBase * 100) / 100,
      belowCost,
      shortfall,
    };
  });

  const breaches = checked.filter((l) => l.belowCost);
  const totalCost = checked.reduce((s, l) => s + l.costTotal, 0);
  const total = Math.max(0, subtotal - discountAmount);
  const realizedGain = total - totalCost;

  return {
    subtotal,
    discountAmount,
    total,
    totalCost,
    realizedGain,
    lines: checked,
    breaches,
    ok: breaches.length === 0,
  };
}

export function formatBelowCostError(breaches: LinePricingCheck[]): string {
  if (breaches.length === 0) return "";
  const first = breaches[0];
  const detail = `« ${first.productName} » : recette ${first.effectiveRevenue} F < cout ${first.costTotal} F (plancher ${minSalePricePerBase(first.unitCost)} F / u.)`;
  if (breaches.length === 1) {
    return `Vente a perte interdite — ${detail}. Remise ou prix a corriger (responsabilite caissier).`;
  }
  return `Vente a perte interdite sur ${breaches.length} lignes — ${detail} (+${breaches.length - 1} autre${breaches.length > 2 ? "s" : ""}).`;
}

export type CatalogPriceBreach = {
  scope: "base" | "pack";
  packName?: string;
  salePrice: number;
  minPrice: number;
  costPerBase: number;
  unitsOfBase: number;
};

export function analyzeCatalogPricing(
  salePrice: number,
  costPerBase: number,
  packLevels: ProductPackPrice[] = [],
): { ok: boolean; breaches: CatalogPriceBreach[] } {
  const breaches: CatalogPriceBreach[] = [];
  const cost = Math.max(0, Math.round(costPerBase));
  if (isSalePriceBelowCost(salePrice, cost)) {
    breaches.push({
      scope: "base",
      salePrice,
      minPrice: minSalePricePerBase(cost),
      costPerBase: cost,
      unitsOfBase: 1,
    });
  }
  for (const pack of packLevels) {
    const minPack = minSalePricePerBase(cost) * pack.unitsOfBase;
    if (cost > 0 && pack.salePrice < minPack) {
      breaches.push({
        scope: "pack",
        packName: pack.name,
        salePrice: pack.salePrice,
        minPrice: minPack,
        costPerBase: cost,
        unitsOfBase: pack.unitsOfBase,
      });
    }
  }
  return { ok: breaches.length === 0, breaches };
}

export function formatCatalogBelowCostError(
  productName: string,
  breaches: CatalogPriceBreach[],
): string {
  const first = breaches[0];
  if (!first) return `Prix sous le cout pour « ${productName} »`;
  if (first.scope === "base") {
    return `Prix de vente (${first.salePrice} F) sous le cout revient (${first.minPrice} F). Catalogue a perte interdit — responsabilite de l'operateur.`;
  }
  return `Prix pack « ${first.packName} » (${first.salePrice} F) sous le plancher (${first.minPrice} F).`;
}

export function cartPricingAuditMetadata(
  analysis: CartPricingAnalysis,
  extra?: Record<string, unknown>,
) {
  return {
    subtotal: analysis.subtotal,
    discountAmount: analysis.discountAmount,
    total: analysis.total,
    totalCost: analysis.totalCost,
    realizedGain: analysis.realizedGain,
    belowCost: !analysis.ok,
    breachCount: analysis.breaches.length,
    breaches: analysis.breaches.map((b) => ({
      productId: b.productId,
      productName: b.productName,
      effectiveRevenue: b.effectiveRevenue,
      costTotal: b.costTotal,
      shortfall: b.shortfall,
      unitCost: b.unitCost,
    })),
    lines: analysis.lines.map((l) => ({
      productId: l.productId,
      unitPrice: l.unitPrice,
      unitCost: l.unitCost,
      allocatedDiscount: l.allocatedDiscount,
      effectiveRevenue: l.effectiveRevenue,
      costTotal: l.costTotal,
      belowCost: l.belowCost,
    })),
    ...extra,
  };
}

export function productPricingDiff(
  before: Pick<Product, "purchasePrice" | "salePrice" | "packLevels" | "name">,
  after: Pick<Product, "purchasePrice" | "salePrice" | "packLevels">,
) {
  const purchaseChanged = before.purchasePrice !== after.purchasePrice;
  const saleChanged = before.salePrice !== after.salePrice;
  const packsBefore = JSON.stringify(
    (before.packLevels ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      units: p.unitsOfBase,
      sale: p.salePrice,
    })),
  );
  const packsAfter = JSON.stringify(
    (after.packLevels ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      units: p.unitsOfBase,
      sale: p.salePrice,
    })),
  );
  const packsChanged = packsBefore !== packsAfter;
  return {
    purchaseChanged,
    saleChanged,
    packsChanged,
    anyPriceChange: purchaseChanged || saleChanged || packsChanged,
    before: {
      purchasePrice: before.purchasePrice,
      salePrice: before.salePrice,
      packLevels: before.packLevels,
    },
    after: {
      purchasePrice: after.purchasePrice,
      salePrice: after.salePrice,
      packLevels: after.packLevels,
    },
  };
}
