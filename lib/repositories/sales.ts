import { getActor } from "@/lib/repositories/audit";
import { addInvoice } from "@/lib/repositories/invoices";
import { createMovement } from "@/lib/repositories/movements";
import { findProductByBarcode, getProduct } from "@/lib/repositories/products";
import {
  getCartSubtotal,
  getCartTotal,
  getChangeDue,
  resolveDiscountAmount,
  type DiscountMode,
} from "@/lib/sales/cart";
import type { CartLine, Invoice, PaymentMethod, RepoResult } from "@/lib/types";
import { CURRENT_USER } from "@/lib/auth/current-user";

export type CreateSaleInput = {
  lines: CartLine[];
  customerName: string;
  paymentMethod: PaymentMethod;
  discount: number;
  discountMode: DiscountMode;
  amountReceived: number;
  notes?: string;
};

export type CreateSaleResult = RepoResult<{
  invoice: Invoice;
  invoiceId: string;
  invoiceNumber: string;
  issuedBy: { id: string; name: string; email: string };
}>;

function buildInvoiceNumber(date = new Date()) {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join("");
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `FV-${stamp}-${suffix}`;
}

/**
 * Enregistre une vente dans le store mock partage :
 * facture PAID → journal de caisse (entree) → mouvements stock OUT.
 * Utilise par la page Vente (client) pour synchroniser Comptabilite / Factures / Stock.
 */
export function createSale(input: CreateSaleInput): CreateSaleResult {
  if (input.lines.length === 0) {
    return { ok: false, error: "Panier vide" };
  }

  const actor = getActor();
  const issuer = {
    id: actor.id,
    name: actor.name,
    email: CURRENT_USER.email,
  };

  for (const line of input.lines) {
    const product =
      getProduct(line.productId) ?? findProductByBarcode(line.sku);
    if (!product) {
      return { ok: false, error: `Produit introuvable : ${line.name}` };
    }
    const units = (line.unitsOfBase ?? 1) * line.quantity;
    if (product.quantity < units) {
      return {
        ok: false,
        error: `Stock insuffisant pour « ${product.name} »`,
      };
    }
  }

  const subtotal = getCartSubtotal(input.lines);
  const discountAmount = resolveDiscountAmount(
    subtotal,
    input.discount,
    input.discountMode,
  );
  const totalAmount = getCartTotal(
    input.lines,
    input.discount,
    input.discountMode,
  );
  const isCash = input.paymentMethod === "CASH";
  const amountReceived = isCash
    ? input.amountReceived > 0
      ? input.amountReceived
      : totalAmount
    : totalAmount;
  const changeDue = isCash ? getChangeDue(totalAmount, amountReceived) : 0;
  const invoiceNumber = buildInvoiceNumber();
  const issuedAt = new Date();

  const invoice = addInvoice({
    number: invoiceNumber,
    customerName: input.customerName.trim() || "Client",
    status: "PAID",
    paymentMethod: input.paymentMethod,
    subtotal,
    discountAmount,
    taxAmount: 0,
    totalAmount,
    amountReceived,
    changeDue,
    notes: input.notes?.trim() || undefined,
    issuedAt,
    issuedById: issuer.id,
    issuedByName: issuer.name,
    items: input.lines.map((line, index) => {
      const product =
        getProduct(line.productId) ?? findProductByBarcode(line.sku);
      return {
        id: `ii_sale_${Date.now()}_${index}`,
        invoiceId: "",
        productId: product?.id ?? line.productId,
        productName: line.name,
        productSku: line.sku,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        unitsOfBase: (line.unitsOfBase ?? 1) * line.quantity,
        packName: line.packName,
      };
    }),
  });

  for (const item of invoice.items) {
    item.invoiceId = invoice.id;
  }

  for (const line of input.lines) {
    const product =
      getProduct(line.productId) ?? findProductByBarcode(line.sku);
    if (!product) continue;
    const units = (line.unitsOfBase ?? 1) * line.quantity;
    const movement = createMovement({
      productId: product.id,
      type: "OUT",
      quantity: units,
      unitPrice: line.unitPrice,
      reference: invoice.number,
      notes: line.packName
        ? `Vente ${line.quantity} × ${line.packName}`
        : `Vente ${line.quantity}`,
    });
    if (!movement.ok) {
      return { ok: false, error: movement.error };
    }
  }

  return {
    ok: true,
    data: {
      invoice,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      issuedBy: issuer,
    },
  };
}
