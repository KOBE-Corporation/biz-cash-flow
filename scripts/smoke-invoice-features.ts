/**
 * Smoke: credit → encaissement → avoir → annulation avec motif.
 */
import { listCashLedger } from "../lib/repositories/cash-ledger";
import {
  cancelInvoice,
  createCreditNote,
  getInvoiceBalance,
  recordInvoicePayment,
} from "../lib/repositories/invoices";
import { getProduct, listProducts } from "../lib/repositories/products";
import { createSale } from "../lib/repositories/sales";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const products = listProducts();
const p = products.find((x) => x.quantity >= 5) ?? products[0];
assert(p, "Aucun produit");

const beforeQty = getProduct(p.id)!.quantity;
const unitPrice = p.salePrice;

const creditSale = createSale({
  lines: [
    {
      productId: p.id,
      name: p.name,
      sku: p.sku,
      quantity: 2,
      unitPrice,
      maxQuantity: p.quantity,
      unitsOfBase: 1,
    },
  ],
  customerName: "Client Credit Test",
  customerPhone: "237600000000",
  paymentMethod: "CREDIT",
  discount: 0,
  discountMode: "amount",
  amountReceived: 0,
});
assert(creditSale.ok, `credit sale: ${!creditSale.ok ? creditSale.error : ""}`);
assert(creditSale.data.invoice.status === "SENT", "status SENT attendu");
assert(creditSale.data.invoice.amountPaid === 0, "amountPaid 0");
assert(
  getProduct(p.id)!.quantity === beforeQty - 2,
  "stock OUT credit",
);

const inv = creditSale.data.invoice;
const half = Math.round(inv.totalAmount / 2);
const pay = recordInvoicePayment(inv.id, half, "CASH");
assert(pay.ok, `payment: ${!pay.ok ? pay.error : ""}`);
assert(pay.data.status === "PARTIALLY_PAID", "PARTIALLY_PAID");
assert(getInvoiceBalance(pay.data) === inv.totalAmount - half, "balance");

const credit = createCreditNote({
  invoiceId: inv.id,
  amount: Math.round(getInvoiceBalance(pay.data) / 2) || 1,
  reason: "Retour partiel article",
});
assert(credit.ok, `avoir: ${!credit.ok ? credit.error : ""}`);

const cancelFail = cancelInvoice(inv.id, "ab");
assert(!cancelFail.ok, "motif trop court doit echouer");

const cancel = cancelInvoice(inv.id, "Erreur de test automatise");
assert(cancel.ok, `cancel: ${!cancel.ok ? cancel.error : ""}`);
assert(cancel.data.cancelReason, "cancelReason");

const refunds = listCashLedger().filter(
  (e) => e.sourceType === "REFUND" && e.sourceId === inv.id,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      invoice: inv.number,
      afterCancelStatus: cancel.data.status,
      refunds: refunds.length,
      finalStock: getProduct(p.id)!.quantity,
    },
    null,
    2,
  ),
);
