import type { PackLevelTemplate, ProductPackPrice } from "@/lib/types";

/** Cout de revient par unite de base a partir d'un lot achete. */
export function costPerBaseUnit(
  packPurchasePrice: number,
  unitsPerPurchasePack: number,
) {
  if (unitsPerPurchasePack <= 0) return 0;
  return Math.round(packPurchasePrice / unitsPerPurchasePack);
}

/**
 * Prix de vente minimum suggere pour l'unite de base
 * (systeme propose, le vendeur decide).
 */
export function suggestBaseSalePrice(
  costPerBase: number,
  marginPercent = 0,
) {
  if (costPerBase <= 0) return 0;
  return Math.ceil(costPerBase * (1 + marginPercent / 100));
}

export function isSalePriceBelowCost(salePrice: number, costPerBase: number) {
  return costPerBase > 0 && salePrice < costPerBase;
}

export function createPackLevelId() {
  return `pl_${Math.random().toString(36).slice(2, 9)}`;
}

export function templatesToProductPrices(
  templates: PackLevelTemplate[],
  costPerBase: number,
  existing?: ProductPackPrice[],
): ProductPackPrice[] {
  return templates.map((level) => {
    const prev = existing?.find(
      (item) =>
        item.name === level.name && item.unitsOfBase === level.unitsOfBase,
    );
    const suggested = suggestBaseSalePrice(costPerBase) * level.unitsOfBase;
    return {
      ...level,
      salePrice: prev?.salePrice ?? suggested,
    };
  });
}

export function ensureBasePackLevel(
  baseUnitName: string,
  packLevels: PackLevelTemplate[],
): PackLevelTemplate[] {
  const hasBase = packLevels.some((level) => level.unitsOfBase === 1);
  if (hasBase) return packLevels;
  return [
    {
      id: createPackLevelId(),
      name: baseUnitName || "unite",
      unitsOfBase: 1,
    },
    ...packLevels,
  ];
}

/** Genere un code-barres numerique unique (EAN-like 13 digits). */
export function generateBarcode(seed?: string) {
  const raw = `${Date.now()}${seed ?? Math.floor(Math.random() * 1e6)}`.replace(
    /\D/g,
    "",
  );
  const body = raw.slice(-12).padStart(12, "0");
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(body[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return `${body}${check}`;
}
