/**
 * Smoke: vente → stock OUT → annulation → stock IN + remboursement caisse.
 */
import { listCashLedger } from "../lib/repositories/cash-ledger";
import {
  cancelInvoice,
  countInvoicesByStatus,
} from "../lib/repositories/invoices";
import { getProduct, listProducts } from "../lib/repositories/products";
import { createSale } from "../lib/repositories/sales";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const products = listProducts();
const p = products.find((x) => x.quantity >= 2) ?? products[0];
assert(p, "Aucun produit");

const beforeQty = p.quantity;
const unitPrice = p.salePrice;

const sale = createSale({
  lines: [
    {
      productId: p.id,
      name: p.name,
      sku: p.sku,
      quantity: 1,
      unitPrice,
      maxQuantity: p.quantity,
      unitsOfBase: 1,
    },
  ],
  customerName: "Test Cancel",
  paymentMethod: "CASH",
  discount: 0,
  discountMode: "amount",
  amountReceived: unitPrice,
});
assert(sale.ok, `createSale: ${!sale.ok ? sale.error : ""}`);

const afterSale = getProduct(p.id);
assert(afterSale, "Produit introuvable apres vente");
assert(
  afterSale.quantity === beforeQty - 1,
  `Stock apres vente: ${afterSale.quantity} (attendu ${beforeQty - 1})`,
);

const inv = sale.data.invoice;
const cancel = cancelInvoice(inv.id);
assert(cancel.ok, `cancelInvoice: ${!cancel.ok ? cancel.error : ""}`);
assert(cancel.data.status === "CANCELLED", "Statut non CANCELLED");
assert(cancel.data.cancelledByName, "cancelledByName manquant");

const afterCancel = getProduct(p.id);
assert(afterCancel, "Produit introuvable apres annulation");
assert(
  afterCancel.quantity === beforeQty,
  `Stock apres annulation: ${afterCancel.quantity} (attendu ${beforeQty})`,
);

const refunds = listCashLedger().filter(
  (e) => e.sourceType === "REFUND" && e.sourceId === inv.id,
);
assert(refunds.length === 1, `Remboursements: ${refunds.length}`);

const stats = countInvoicesByStatus();
console.log(
  JSON.stringify(
    {
      ok: true,
      invoice: inv.number,
      beforeQty,
      afterSaleQty: afterSale.quantity,
      afterCancelQty: afterCancel.quantity,
      refundAmount: refunds[0]?.amount,
      stats: { paid: stats.paid, cancelled: stats.cancelled },
    },
    null,
    2,
  ),
);
