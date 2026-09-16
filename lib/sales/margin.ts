import type { CartLine, InvoiceItem, Product } from "@/lib/types";

/** Gain potentiel theorique sur l'unite de base (prix vente − cout revient). */
export function potentialGainPerBase(salePrice: number, costPerBase: number) {
  return Math.round(salePrice - costPerBase);
}

/** Gain potentiel sur un pack (prix pack − cout × unites). */
export function potentialGainOnPack(
  packSalePrice: number,
  costPerBase: number,
  unitsOfBase: number,
) {
  return Math.round(packSalePrice - costPerBase * unitsOfBase);
}

export function marginPercent(gain: number, revenue: number) {
  if (revenue <= 0) return 0;
  return Math.round((gain / revenue) * 1000) / 10;
}

/**
 * Cout total d'une ligne de facture.
 * Preferer unitCost fige a la vente ; sinon fallback produit.
 */
export function lineCostTotal(
  item: Pick<InvoiceItem, "unitsOfBase" | "quantity" | "unitCost">,
  fallbackCostPerBase = 0,
) {
  const units = item.unitsOfBase ?? item.quantity;
  const costPerBase = item.unitCost ?? fallbackCostPerBase;
  return Math.round(units * costPerBase);
}

export function lineRevenueTotal(
  item: Pick<InvoiceItem, "quantity" | "unitPrice">,
) {
  return Math.round(item.quantity * item.unitPrice);
}

export function lineRealizedGain(
  item: Pick<
    InvoiceItem,
    "quantity" | "unitPrice" | "unitsOfBase" | "unitCost"
  >,
  fallbackCostPerBase = 0,
  paidRatio = 1,
) {
  const revenue = lineRevenueTotal(item) * paidRatio;
  const cost = lineCostTotal(item, fallbackCostPerBase) * paidRatio;
  return Math.round(revenue - cost);
}

/** Snapshot cout revient / unite de base au moment de la vente. */
export function resolveUnitCostAtSale(product: Product | null | undefined) {
  return Math.max(0, Math.round(product?.purchasePrice ?? 0));
}

export function cartLineRealizedGain(
  line: CartLine,
  costPerBase: number,
) {
  const units = (line.unitsOfBase ?? 1) * line.quantity;
  const revenue = line.quantity * line.unitPrice;
  const cost = units * costPerBase;
  return {
    revenue: Math.round(revenue),
    cost: Math.round(cost),
    gain: Math.round(revenue - cost),
    marginPercent: marginPercent(revenue - cost, revenue),
    belowCost: costPerBase > 0 && line.unitPrice / (line.unitsOfBase ?? 1) < costPerBase,
  };
}

/** Potentiel catalogue : gain si tout le stock etait vendu au prix actuel. */
export function catalogPotentialGain(products: Product[]) {
  let potentialGain = 0;
  let potentialRevenue = 0;
  let belowCostCount = 0;
  for (const p of products.filter((x) => x.isActive)) {
    const gainUnit = potentialGainPerBase(p.salePrice, p.purchasePrice);
    if (gainUnit < 0) belowCostCount += 1;
    potentialGain += gainUnit * Math.max(0, p.quantity);
    potentialRevenue += p.salePrice * Math.max(0, p.quantity);
  }
  return {
    potentialGain: Math.round(potentialGain),
    potentialRevenue: Math.round(potentialRevenue),
    belowCostCount,
    marginPercent: marginPercent(potentialGain, potentialRevenue),
  };
}
