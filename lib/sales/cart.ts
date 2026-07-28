import type { CartLine, PaymentMethod, Product } from "@/lib/types";

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Especes",
  MOBILE_MONEY: "OM / MoMo",
};

export const paymentMethodShortcuts: PaymentMethod[] = [
  "CASH",
  "MOBILE_MONEY",
];

export type StockFilter = "all" | "available" | "low" | "out";
export type DiscountMode = "amount" | "percent";

export function getLineTotal(line: CartLine) {
  return line.unitPrice * line.quantity;
}

export function getCartSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + getLineTotal(line), 0);
}

export function resolveDiscountAmount(
  subtotal: number,
  discount: number,
  mode: DiscountMode,
) {
  if (mode === "percent") {
    return Math.min(subtotal, Math.round((subtotal * discount) / 100));
  }
  return Math.min(subtotal, Math.max(0, discount));
}

export function getCartTotal(
  lines: CartLine[],
  discount = 0,
  mode: DiscountMode = "amount",
) {
  const subtotal = getCartSubtotal(lines);
  return Math.max(0, subtotal - resolveDiscountAmount(subtotal, discount, mode));
}

export function getCartItemCount(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function getCartQty(lines: CartLine[], productId: string) {
  return lines.find((line) => line.productId === productId)?.quantity ?? 0;
}

export function getAvailableStock(product: Product, lines: CartLine[]) {
  return Math.max(0, product.quantity - getCartQty(lines, product.id));
}

export function getStockStatus(product: Product, reserved = 0) {
  const remaining = Math.max(0, product.quantity - reserved);
  if (product.quantity <= 0 || remaining <= 0) return "out" as const;
  if (remaining <= product.minStock) return "low" as const;
  return "ok" as const;
}

export function getStockFillPercent(product: Product, reserved = 0) {
  if (product.quantity <= 0) return 0;
  const remaining = Math.max(0, product.quantity - reserved);
  const baseline = Math.max(product.quantity, product.minStock * 3);
  return Math.round((remaining / baseline) * 100);
}

export function addProductToCart(
  lines: CartLine[],
  product: Product,
  quantity = 1,
): CartLine[] {
  if (product.quantity <= 0) return lines;

  const existing = lines.find((line) => line.productId === product.id);
  if (!existing) {
    const basePack =
      product.packLevels?.find((level) => level.unitsOfBase === 1) ??
      product.packLevels?.[0];
    return [
      ...lines,
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice: basePack?.salePrice ?? product.salePrice,
        quantity: Math.min(quantity, product.quantity),
        maxQuantity: product.quantity,
        packName: basePack?.name ?? product.baseUnitName,
        unitsOfBase: basePack?.unitsOfBase ?? 1,
      },
    ];
  }

  const nextQty = Math.min(
    existing.quantity + quantity,
    existing.maxQuantity,
  );

  return lines.map((line) =>
    line.productId === product.id ? { ...line, quantity: nextQty } : line,
  );
}

export function updateCartQuantity(
  lines: CartLine[],
  productId: string,
  quantity: number,
): CartLine[] {
  return lines
    .map((line) => {
      if (line.productId !== productId) return line;
      const next = Math.min(Math.max(1, quantity), line.maxQuantity);
      return { ...line, quantity: next };
    })
    .filter((line) => line.quantity > 0);
}

export function removeFromCart(lines: CartLine[], productId: string) {
  return lines.filter((line) => line.productId !== productId);
}

export function filterProductsByStock(
  products: Product[],
  filter: StockFilter,
  lines: CartLine[] = [],
) {
  return products.filter((product) => {
    const reserved = getCartQty(lines, product.id);
    const status = getStockStatus(product, reserved);
    if (filter === "all") return true;
    if (filter === "available") return status !== "out";
    if (filter === "low") return status === "low";
    return status === "out";
  });
}

export function getChangeDue(total: number, amountReceived: number) {
  if (amountReceived <= 0) return 0;
  return Math.max(0, amountReceived - total);
}
