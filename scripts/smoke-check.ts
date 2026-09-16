import { resetStore, getStore } from "../lib/mock/store";
import { getPeriodInsights } from "../lib/repositories/insights";
import { createSale } from "../lib/repositories/sales";
import { listProducts } from "../lib/repositories/products";
import { buildRichSeedStore } from "../lib/mock/rich-seed";
import { buildPeriodReportHtml } from "../lib/accounting/period-report";

function main() {
  const seed = buildRichSeedStore();
  const items = seed.invoices.flatMap((i) => i.items);
  const withCost = items.filter((it) => it.unitCost != null).length;

  resetStore();
  const store = getStore();
  const day = getPeriodInsights("day");
  const html = buildPeriodReportHtml(day);

  const p = listProducts().find(
    (x) => x.isActive && x.quantity > 0 && x.purchasePrice > 0,
  )!;
  const bad = createSale({
    lines: [
      {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        unitPrice: Math.max(1, p.purchasePrice - 1),
        quantity: 1,
        maxQuantity: p.quantity,
        unitsOfBase: 1,
        packName: p.baseUnitName,
      },
    ],
    customerName: "Test",
    paymentMethod: "CASH",
    discount: 0,
    discountMode: "amount",
    amountReceived: 1,
  });

  const okSaleProduct = listProducts().find(
    (x) =>
      x.isActive &&
      x.quantity > 0 &&
      x.salePrice > x.purchasePrice &&
      x.purchasePrice > 0,
  )!;
  const good = createSale({
    lines: [
      {
        productId: okSaleProduct.id,
        name: okSaleProduct.name,
        sku: okSaleProduct.sku,
        unitPrice: okSaleProduct.salePrice,
        quantity: 1,
        maxQuantity: okSaleProduct.quantity,
        unitsOfBase: 1,
        packName: okSaleProduct.baseUnitName,
      },
    ],
    customerName: "Client OK",
    paymentMethod: "CASH",
    discount: 0,
    discountMode: "amount",
    amountReceived: okSaleProduct.salePrice,
  });

  console.log(
    JSON.stringify(
      {
        seed: {
          products: seed.products.length,
          invoices: seed.invoices.length,
          itemsWithUnitCost: withCost,
          itemsTotal: items.length,
          openSession: seed.cashSessions.find((s) => s.status === "OPEN")
            ?.businessDate,
        },
        dayKpis: {
          salesTotal: day.salesTotal,
          cashOut: day.cashOut,
          net: day.operationalNet,
          realizedMargin: day.realizedMargin,
          marginPercent: day.marginPercent,
          avgTicket: day.avgTicket,
          topCategory: day.topCategories[0]?.name ?? null,
          topProduct: day.topProducts[0]?.name ?? null,
        },
        pdfHasSorties: html.includes("Sorties argent"),
        pdfHasMargeRealisee: html.includes("Marge realisee"),
        storeAllItemsHaveCost: store.invoices.every((inv) =>
          inv.items.every((it) => it.unitCost != null),
        ),
        belowCostBlocked: !bad.ok,
        goodSaleOk: good.ok,
        goodSaleUnitCost: good.ok
          ? good.data.invoice.items[0]?.unitCost
          : null,
      },
      null,
      2,
    ),
  );
}

main();
