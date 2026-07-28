import { createId, getStore, touch } from "@/lib/mock/store";
import { getActor, recordAudit } from "@/lib/repositories/audit";
import { adjustProductQuantity, getProduct } from "@/lib/repositories/products";
import type { MovementType, RepoResult, StockMovement } from "@/lib/types";

export type MovementInput = {
  productId: string;
  type: MovementType;
  quantity: number;
  unitPrice?: number;
  reference?: string;
  notes?: string;
};

export function listMovements() {
  return [...getStore().movements].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export function createMovement(
  input: MovementInput,
): RepoResult<StockMovement> {
  const product = getProduct(input.productId);
  if (!product) return { ok: false, error: "Produit introuvable" };

  const quantity = Math.abs(Math.trunc(input.quantity));
  if (quantity <= 0) return { ok: false, error: "Quantite invalide" };

  let stockDelta = 0;
  if (input.type === "IN") stockDelta = quantity;
  if (input.type === "OUT") stockDelta = -quantity;
  if (input.type === "ADJUSTMENT") {
    stockDelta = Math.trunc(input.quantity);
  }

  if (input.type === "OUT" && product.quantity < quantity) {
    return { ok: false, error: "Stock insuffisant" };
  }
  if (input.type === "ADJUSTMENT" && product.quantity + stockDelta < 0) {
    return { ok: false, error: "Ajustement impossible : stock negatif" };
  }

  adjustProductQuantity(input.productId, stockDelta);

  const actor = getActor();
  const movement: StockMovement = {
    id: createId("m"),
    productId: product.id,
    productName: product.name,
    type: input.type,
    quantity: input.type === "ADJUSTMENT" ? stockDelta : quantity,
    unitPrice: input.unitPrice,
    reference: input.reference?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdById: actor.id,
    createdByName: actor.name,
    createdAt: touch(),
  };

  getStore().movements.unshift(movement);
  recordAudit({
    action: input.type === "ADJUSTMENT" ? "ADJUST" : "UPDATE",
    entityType: "StockMovement",
    entityId: movement.id,
    summary: `Mouvement ${movement.type} : ${product.name} × ${movement.quantity}`,
    metadata: { reference: movement.reference },
  });
  return { ok: true, data: movement };
}
