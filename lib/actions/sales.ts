"use server";

import { CURRENT_USER } from "@/lib/auth/current-user";
import type { CartLine, PaymentMethod } from "@/lib/types";
import {
  getCartSubtotal,
  getCartTotal,
  getChangeDue,
  resolveDiscountAmount,
  type DiscountMode,
} from "@/lib/sales/cart";
import { addInvoice } from "@/lib/repositories/invoices";
import { createMovement } from "@/lib/repositories/movements";
import { findProductByBarcode, getProduct } from "@/lib/repositories/products";
import { getActor } from "@/lib/repositories/audit";

export type CreateSaleInvoiceInput = {
  lines: CartLine[];
  customerName: string;
  paymentMethod: PaymentMethod;
  discount: number;
  discountMode: DiscountMode;
  amountReceived: number;
  notes?: string;
};

export type CreateSaleInvoiceResult =
  | {
      ok: true;
      invoiceId: string;
      invoiceNumber: string;
      issuedBy: { id: string; name: string; email: string };
    }
  | { ok: false; error: string };

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
 * Enregistre une vente via le store mock (journal caisse + stock).
 * Prisma reste optionnel tant que la BD n'est pas configuree.
 */
export async function createSaleInvoice(
  input: CreateSaleInvoiceInput,
): Promise<CreateSaleInvoiceResult> {
  try {
    if (input.lines.length === 0) {
      return { ok: false, error: "Panier vide" };
    }

    const actor = getActor();
    const issuer = {
      id: actor.id,
      name: actor.name,
      email: CURRENT_USER.email,
    };

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

    const invoice = addInvoice({
      number: invoiceNumber,
      customerName: input.customerName,
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

    // Corrige invoiceId sur les lignes (addInvoice regenere l'objet)
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

    // Tentative Prisma en arriere-plan (ignoree si BD indisponible)
    void persistSaleToPrisma({
      invoiceNumber: invoice.number,
      customerName: input.customerName,
      paymentMethod: input.paymentMethod,
      subtotal,
      discountAmount,
      totalAmount,
      amountReceived,
      changeDue,
      notes: input.notes,
      issuedByEmail: issuer.email,
      issuedByName: issuer.name,
      lines: input.lines,
    }).catch(() => undefined);

    return {
      ok: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      issuedBy: issuer,
    };
  } catch (error) {
    console.error("createSaleInvoice failed", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer la facture",
    };
  }
}

async function persistSaleToPrisma(payload: {
  invoiceNumber: string;
  customerName: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  amountReceived: number;
  changeDue: number;
  notes?: string;
  issuedByEmail: string;
  issuedByName: string;
  lines: CartLine[];
}) {
  const { prisma } = await import("@/lib/db/prisma");
  const issuer = await prisma.user.upsert({
    where: { email: payload.issuedByEmail },
    update: { name: payload.issuedByName },
    create: {
      email: payload.issuedByEmail,
      name: payload.issuedByName,
    },
    select: { id: true },
  });

  const productsBySku = await prisma.product.findMany({
    where: { sku: { in: payload.lines.map((line) => line.sku) } },
    select: { id: true, sku: true },
  });
  const productIdBySku = new Map(
    productsBySku.map((product) => [product.sku, product.id]),
  );

  await prisma.invoice.create({
    data: {
      number: payload.invoiceNumber,
      customerName: payload.customerName,
      status: "PAID",
      paymentMethod: payload.paymentMethod,
      subtotal: payload.subtotal,
      discountAmount: payload.discountAmount,
      taxAmount: 0,
      totalAmount: payload.totalAmount,
      amountReceived: payload.amountReceived,
      changeDue: payload.changeDue,
      notes: payload.notes?.trim() || null,
      issuedById: issuer.id,
      items: {
        create: payload.lines.map((line) => ({
          productId: productIdBySku.get(line.sku) ?? null,
          productName: line.name,
          productSku: line.sku,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          unitsOfBase: (line.unitsOfBase ?? 1) * line.quantity,
          packName: line.packName ?? null,
        })),
      },
    },
  });
}

/** Expose pour typage client / aperçu sans appeler la DB. */
export type SaleIssuerPreview = {
  name: string;
  email: string;
};
