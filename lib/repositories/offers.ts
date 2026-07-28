import { createId, getStore, touch } from "@/lib/mock/store";
import { costPerBaseUnit } from "@/lib/sales/pricing";
import type { ProductSupplierOffer } from "@/lib/types";

export function listOffersForProduct(productId: string) {
  return getStore()
    .supplierOffers.filter((offer) => offer.productId === productId)
    .sort((a, b) => a.costPerBaseUnit - b.costPerBaseUnit);
}

export function upsertSupplierOffer(input: {
  productId: string;
  supplierId: string;
  supplierName: string;
  packPurchasePrice: number;
  purchasePackName: string;
  unitsPerPurchasePack: number;
}): ProductSupplierOffer {
  const store = getStore();
  const cost = costPerBaseUnit(
    input.packPurchasePrice,
    input.unitsPerPurchasePack,
  );
  const existingIndex = store.supplierOffers.findIndex(
    (offer) =>
      offer.productId === input.productId &&
      offer.supplierId === input.supplierId &&
      offer.purchasePackName === input.purchasePackName,
  );

  if (existingIndex >= 0) {
    const updated: ProductSupplierOffer = {
      ...store.supplierOffers[existingIndex],
      packPurchasePrice: input.packPurchasePrice,
      unitsPerPurchasePack: input.unitsPerPurchasePack,
      costPerBaseUnit: cost,
      supplierName: input.supplierName,
      lastPurchaseAt: touch(),
    };
    store.supplierOffers[existingIndex] = updated;
    return updated;
  }

  const offer: ProductSupplierOffer = {
    id: createId("off"),
    productId: input.productId,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    packPurchasePrice: input.packPurchasePrice,
    purchasePackName: input.purchasePackName,
    unitsPerPurchasePack: input.unitsPerPurchasePack,
    costPerBaseUnit: cost,
    lastPurchaseAt: touch(),
  };
  store.supplierOffers.push(offer);
  return offer;
}
