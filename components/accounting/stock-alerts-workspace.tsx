"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DataTable, type DataColumn } from "@/components/crud/data-table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { useBcfRefresh } from "@/hooks/use-bcf-refresh";
import {
  formatDisplayDate,
  type ExpiryAlertRow,
} from "@/lib/inventory/expiry";
import { listExpiryAlerts } from "@/lib/repositories/expiry-alerts";
import { listProducts } from "@/lib/repositories/products";
import type { Product } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

function stockTone(product: Product) {
  if (product.quantity <= 0) return "out" as const;
  if (product.quantity <= product.minStock) return "low" as const;
  return "ok" as const;
}

export function StockAlertsWorkspace() {
  const { version } = useBcfRefresh();

  const stockAlerts = useMemo(() => {
    void version;
    return listProducts()
      .filter((p) => p.isActive && stockTone(p) !== "ok")
      .sort((a, b) => a.quantity - b.quantity);
  }, [version]);

  const expiryAlerts = useMemo(() => {
    void version;
    return listExpiryAlerts();
  }, [version]);

  const outCount = stockAlerts.filter((p) => stockTone(p) === "out").length;
  const lowCount = stockAlerts.filter((p) => stockTone(p) === "low").length;

  const stockColumns: DataColumn<Product>[] = [
    {
      key: "product",
      header: "Produit",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.sku} · {row.barcode}
          </p>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      cell: (row) => {
        const tone = stockTone(row);
        return (
          <Badge
            variant={tone === "out" ? "danger" : "warning"}
            className="tabular-nums"
          >
            {row.quantity} {row.baseUnitName}
          </Badge>
        );
      },
    },
    {
      key: "min",
      header: "Seuil min",
      cell: (row) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {row.minStock} {row.baseUnitName}
        </span>
      ),
    },
    {
      key: "price",
      header: "Prix vente",
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {formatCurrency(row.salePrice)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Alerte",
      cell: (row) =>
        stockTone(row) === "out" ? (
          <Badge variant="danger">Rupture</Badge>
        ) : (
          <Badge variant="warning">Stock faible</Badge>
        ),
    },
  ];

  const expiryColumns: DataColumn<ExpiryAlertRow>[] = [
    {
      key: "product",
      header: "Produit",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.product.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.product.sku}
            {row.product.batchNumber ? ` · Lot ${row.product.batchNumber}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "expiry",
      header: "Peremption",
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {formatDisplayDate(row.product.expiresAt)}
        </span>
      ),
    },
    {
      key: "days",
      header: "Jours",
      cell: (row) => (
        <span className="tabular-nums text-xs">
          {row.daysLeft < 0 ? `${row.daysLeft} j` : `${row.daysLeft} j`}
        </span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      cell: (row) =>
        row.status === "expired" ? (
          <Badge variant="danger">Perime</Badge>
        ) : row.status === "critical" ? (
          <Badge variant="danger">Critique</Badge>
        ) : (
          <Badge variant="warning">Bientot</Badge>
        ),
    },
    {
      key: "discount",
      header: "Remise suggeree",
      cell: (row) => (
        <span className="text-xs font-medium tabular-nums text-primary">
          {row.suggestedDiscountPercent > 0
            ? `−${row.suggestedDiscountPercent} %`
            : "—"}
        </span>
      ),
    },
    {
      key: "qty",
      header: "Stock",
      cell: (row) => (
        <span className="tabular-nums text-xs">
          {row.product.quantity} {row.product.baseUnitName}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock — alertes"
        description="Ruptures, seuils bas et produits proches de la peremption (pour ecouler avec remise)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/comptabilite"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <ArrowLeft className="h-4 w-4" />
              Comptabilite
            </Link>
            <Link
              href="/achats"
              className={cn(buttonVariants({ variant: "success" }))}
            >
              Reapprovisionner
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Alertes stock" value={stockAlerts.length} />
        <StatCard title="Ruptures" value={outCount} variant="danger" />
        <StatCard title="Stock faible" value={lowCount} variant="warning" />
        <StatCard
          title="Peremption"
          value={expiryAlerts.length}
          variant={expiryAlerts.length > 0 ? "warning" : "success"}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Stock faible / rupture</h2>
        <DataTable
          rows={stockAlerts}
          columns={stockColumns}
          rowKey={(row) => row.id}
          emptyTitle="Aucune alerte stock"
          emptyDescription="Tous les produits actifs sont au-dessus du seuil."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Peremption proche</h2>
        <p className="text-sm text-muted-foreground">
          Seuils et remise definis sur la categorie. Idees pour limiter les
          pertes : promo, pack promo, priorite de vente.
        </p>
        <DataTable
          rows={expiryAlerts}
          columns={expiryColumns}
          rowKey={(row) => row.product.id}
          emptyTitle="Aucune alerte peremption"
          emptyDescription="Aucun produit suivi n'approche de sa date limite."
        />
      </section>
    </div>
  );
}
