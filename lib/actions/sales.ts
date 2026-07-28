"use server";

import { prisma } from "@/lib/db/prisma";
import { CURRENT_USER } from "@/lib/auth/current-user";
import type { CartLine, PaymentMethod } from "@/lib/types";
import {
  getCartSubtotal,
  getCartTotal,
  getChangeDue,
  resolveDiscountAmount,
  type DiscountMode,
} from "@/lib/sales/cart";

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

async function resolveIssuer() {
  return prisma.user.upsert({
    where: { email: CURRENT_USER.email },
    update: { name: CURRENT_USER.name },
    create: {
      email: CURRENT_USER.email,
      name: CURRENT_USER.name,
    },
    select: { id: true, name: true, email: true },
  });
}

export async function createSaleInvoice(
  input: CreateSaleInvoiceInput,
): Promise<CreateSaleInvoiceResult> {
  try {
    if (input.lines.length === 0) {
      return { ok: false, error: "Panier vide" };
    }

    const issuer = await resolveIssuer();
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

    const productsBySku = await prisma.product.findMany({
      where: {
        sku: { in: input.lines.map((line) => line.sku) },
      },
      select: { id: true, sku: true },
    });
    const productIdBySku = new Map(
      productsBySku.map((product) => [product.sku, product.id]),
    );

    const invoice = await prisma.invoice.create({
      data: {
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
        notes: input.notes?.trim() || null,
        issuedById: issuer.id,
        items: {
          create: input.lines.map((line) => ({
            productId: productIdBySku.get(line.sku) ?? null,
            productName: line.name,
            productSku: line.sku,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
        },
      },
      select: { id: true, number: true },
    });

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

/** Expose pour typage client / aperçu sans appeler la DB. */
export type SaleIssuerPreview = {
  name: string;
  email: string;
};
