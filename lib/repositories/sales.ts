import { getActor, recordAudit } from "@/lib/repositories/audit";
import { addInvoice } from "@/lib/repositories/invoices";
import { requireOpenSessionForSale } from "@/lib/repositories/cash-sessions";
import { createMovement } from "@/lib/repositories/movements";
import { findProductByBarcode, getProduct } from "@/lib/repositories/products";
import {
  getCartTotal,
  type DiscountMode,
} from "@/lib/sales/cart";
import { resolveUnitCostAtSale } from "@/lib/sales/margin";
import {
  analyzeCartPricing,
  cartPricingAuditMetadata,
  formatBelowCostError,
} from "@/lib/sales/pricing-guard";
import type { CartLine, Invoice, PaymentMethod, RepoResult } from "@/lib/types";
import { CURRENT_USER } from "@/lib/auth/current-user";

export type CreateSaleInput = {
  lines: CartLine[];
  customerName: string;
  customerPhone?: string;
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

function resolveLineCost(line: CartLine) {
  const product = getProduct(line.productId) ?? findProductByBarcode(line.sku);
  return resolveUnitCostAtSale(product);
}

/**
 * Enregistre une vente dans le store mock partage.
 * Plancher = cout revient fige a la vente ; remise incluse dans le controle.
 * Toute tentative a perte est tracee (responsabilite caissier).
 */
export function createSale(input: CreateSaleInput): CreateSaleResult {
  if (input.lines.length === 0) {
    return { ok: false, error: "Panier vide" };
  }

  const sessionGate = requireOpenSessionForSale();
  if (!sessionGate.ok) return sessionGate;

  const isCredit = input.paymentMethod === "CREDIT";
  const customerName = input.customerName.trim() || "Client";
  if (isCredit) {
    if (!customerName || /^Client N~/i.test(customerName)) {
      return {
        ok: false,
        error: "Nom du client obligatoire pour une vente a credit",
      };
    }
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

  const pricing = analyzeCartPricing(
    input.lines,
    resolveLineCost,
    input.discount,
    input.discountMode,
  );

  if (!pricing.ok) {
    const error = formatBelowCostError(pricing.breaches);
    recordAudit({
      action: "BELOW_COST",
      entityType: "SaleAttempt",
      summary: `Tentative vente a perte bloquee — ${actor.name}`,
      metadata: cartPricingAuditMetadata(pricing, {
        blocked: true,
        cashierId: actor.id,
        cashierName: actor.name,
        paymentMethod: input.paymentMethod,
        discountMode: input.discountMode,
        discountValue: input.discount,
        customerName,
      }),
    });
    return { ok: false, error };
  }

  const totalAmount = getCartTotal(
    input.lines,
    input.discount,
    input.discountMode,
  );
  const isCash = input.paymentMethod === "CASH";
  const amountReceived = isCredit
    ? 0
    : isCash
      ? input.amountReceived > 0
        ? input.amountReceived
        : totalAmount
      : totalAmount;
  const changeDue = isCash
    ? Math.max(0, amountReceived - totalAmount)
    : 0;
  const invoiceNumber = buildInvoiceNumber();
  const issuedAt = new Date();

  const invoice = addInvoice({
    number: invoiceNumber,
    customerName,
    customerPhone: input.customerPhone?.trim() || undefined,
    status: isCredit ? "SENT" : "PAID",
    paymentMethod: input.paymentMethod,
    subtotal: pricing.subtotal,
    discountAmount: pricing.discountAmount,
    discountMode: input.discountMode,
    discountValue: input.discount,
    taxAmount: 0,
    totalAmount,
    totalCostAmount: pricing.totalCost,
    realizedGainAmount: pricing.realizedGain,
    amountPaid: isCredit ? 0 : totalAmount,
    creditedAmount: 0,
    amountReceived: isCredit ? undefined : amountReceived,
    changeDue: isCredit ? undefined : changeDue,
    notes: input.notes?.trim() || undefined,
    issuedAt,
    issuedById: issuer.id,
    issuedByName: issuer.name,
    items: input.lines.map((line, index) => {
      const product =
        getProduct(line.productId) ?? findProductByBarcode(line.sku);
      const check = pricing.lines[index];
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
        unitCost: check?.unitCost ?? resolveUnitCostAtSale(product),
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

  recordAudit({
    action: "SALE",
    entityType: "Invoice",
    entityId: invoice.id,
    summary: isCredit
      ? `Vente a credit : ${invoice.number} — marge ${pricing.realizedGain} F — ${actor.name}`
      : `Vente : ${invoice.number} — marge ${pricing.realizedGain} F — ${actor.name}`,
    metadata: cartPricingAuditMetadata(pricing, {
      cashierId: actor.id,
      cashierName: actor.name,
      paymentMethod: input.paymentMethod,
      discountMode: input.discountMode,
      discountValue: input.discount,
      invoiceNumber: invoice.number,
      customerName,
    }),
  });

  if (pricing.discountAmount > 0) {
    recordAudit({
      action: "DISCOUNT",
      entityType: "Invoice",
      entityId: invoice.id,
      summary: `Remise ${input.discountMode === "percent" ? `${input.discount} %` : `${pricing.discountAmount} F`} sur ${invoice.number} — ${actor.name}`,
      metadata: {
        cashierId: actor.id,
        cashierName: actor.name,
        discountMode: input.discountMode,
        discountValue: input.discount,
        discountAmount: pricing.discountAmount,
        subtotal: pricing.subtotal,
        total: pricing.total,
        totalCost: pricing.totalCost,
        realizedGain: pricing.realizedGain,
        invoiceNumber: invoice.number,
      },
    });
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
