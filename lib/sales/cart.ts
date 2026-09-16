import type {
  CartLine,
  PaymentMethod,
  Product,
  ProductPackPrice,
} from "@/lib/types";

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Especes",
  MOBILE_MONEY: "OM / MoMo",
  CREDIT: "A credit",
};

export const paymentMethodShortcuts: PaymentMethod[] = [
  "CASH",
  "MOBILE_MONEY",
  "CREDIT",
];

export type StockFilter = "all" | "available" | "low" | "out";
export type DiscountMode = "amount" | "percent";

export function cartLineKey(
  line: Pick<CartLine, "productId" | "packId" | "packName">,
) {
  return `${line.productId}::${line.packId ?? line.packName ?? "base"}`;
}

export function getProductPacks(product: Product): ProductPackPrice[] {
  const packs = product.packLevels?.length
    ? product.packLevels
    : [
        {
          id: `${product.id}_base`,
          name: product.baseUnitName ?? "unite",
          unitsOfBase: 1,
          salePrice: product.salePrice,
        },
      ];
  return [...packs].sort((a, b) => a.unitsOfBase - b.unitsOfBase);
}

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

/** Unites de base deja reservees dans le panier pour un produit. */
export function getCartBaseUnits(lines: CartLine[], productId: string) {
  return lines
    .filter((line) => line.productId === productId)
    .reduce(
      (sum, line) => sum + (line.unitsOfBase ?? 1) * line.quantity,
      0,
    );
}

export function getCartQty(lines: CartLine[], productId: string) {
  return lines
    .filter((line) => line.productId === productId)
    .reduce((sum, line) => sum + line.quantity, 0);
}

export function getAvailableStock(product: Product, lines: CartLine[]) {
  return Math.max(0, product.quantity - getCartBaseUnits(lines, product.id));
}

export function getAvailablePackQty(
  product: Product,
  lines: CartLine[],
  pack: ProductPackPrice,
) {
  const availableBase = getAvailableStock(product, lines);
  const units = Math.max(1, pack.unitsOfBase);
  return Math.floor(availableBase / units);
}

export function getStockStatus(product: Product, reservedBase = 0) {
  const remaining = Math.max(0, product.quantity - reservedBase);
  if (product.quantity <= 0 || remaining <= 0) return "out" as const;
  if (remaining <= product.minStock) return "low" as const;
  return "ok" as const;
}

export function getStockFillPercent(product: Product, reservedBase = 0) {
  if (product.quantity <= 0) return 0;
  const remaining = Math.max(0, product.quantity - reservedBase);
  const baseline = Math.max(product.quantity, product.minStock * 3);
  return Math.round((remaining / baseline) * 100);
}

export function addProductToCart(
  lines: CartLine[],
  product: Product,
  quantity = 1,
  pack?: ProductPackPrice,
): CartLine[] {
  if (product.quantity <= 0) return lines;

  const packs = getProductPacks(product);
  const selected =
    pack ??
    packs.find((level) => level.unitsOfBase === 1) ??
    packs[0];
  if (!selected) return lines;

  const unitsPerPack = Math.max(1, selected.unitsOfBase);
  const maxPacks = Math.floor(product.quantity / unitsPerPack);
  if (maxPacks <= 0) return lines;

  const key = cartLineKey({
    productId: product.id,
    packId: selected.id,
    packName: selected.name,
  });
  const existing = lines.find((line) => cartLineKey(line) === key);

  // Stock restant en packs en tenant compte des autres lignes du meme produit
  const otherBase = lines
    .filter(
      (line) =>
        line.productId === product.id && cartLineKey(line) !== key,
    )
    .reduce(
      (sum, line) => sum + (line.unitsOfBase ?? 1) * line.quantity,
      0,
    );
  const maxForThis = Math.floor(
    Math.max(0, product.quantity - otherBase) / unitsPerPack,
  );

  if (!existing) {
    return [
      ...lines,
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice: selected.salePrice,
        quantity: Math.min(quantity, maxForThis),
        maxQuantity: maxForThis,
        packId: selected.id,
        packName: selected.name,
        unitsOfBase: unitsPerPack,
      },
    ];
  }

  const nextQty = Math.min(existing.quantity + quantity, maxForThis);
  return lines.map((line) =>
    cartLineKey(line) === key
      ? { ...line, quantity: nextQty, maxQuantity: maxForThis }
      : line,
  );
}

export function updateCartQuantity(
  lines: CartLine[],
  productId: string,
  quantity: number,
  packId?: string,
): CartLine[] {
  return lines
    .map((line) => {
      const matchPack = packId
        ? line.packId === packId || line.packName === packId
        : true;
      if (line.productId !== productId || !matchPack) return line;
      const next = Math.min(Math.max(1, quantity), line.maxQuantity);
      return { ...line, quantity: next };
    })
    .filter((line) => line.quantity > 0);
}

export function removeFromCart(
  lines: CartLine[],
  productId: string,
  packId?: string,
) {
  return lines.filter((line) => {
    if (line.productId !== productId) return true;
    if (!packId) return false;
    return !(line.packId === packId || line.packName === packId);
  });
}

export function filterProductsByStock(
  products: Product[],
  filter: StockFilter,
  lines: CartLine[] = [],
) {
  return products.filter((product) => {
    const reserved = getCartBaseUnits(lines, product.id);
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
