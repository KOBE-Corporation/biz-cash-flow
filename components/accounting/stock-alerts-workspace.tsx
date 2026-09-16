"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DataTable, type DataColumn } from "@/components/crud/data-table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { listProducts } from "@/lib/repositories/products";
import type { Product } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

function stockTone(product: Product) {
  if (product.quantity <= 0) return "out" as const;
  if (product.quantity <= product.minStock) return "low" as const;
  return "ok" as const;
}

export function StockAlertsWorkspace() {
  const alerts = useMemo(() => {
    return listProducts()
      .filter((p) => p.isActive && stockTone(p) !== "ok")
      .sort((a, b) => a.quantity - b.quantity);
  }, []);

  const outCount = alerts.filter((p) => stockTone(p) === "out").length;
  const lowCount = alerts.filter((p) => stockTone(p) === "low").length;

  const columns: DataColumn<Product>[] = [
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock — alertes"
        description="Produits en rupture ou sous le seuil minimum (depuis Comptabilite)."
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

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Alertes" value={alerts.length} />
        <StatCard title="Ruptures" value={outCount} variant="danger" />
        <StatCard title="Stock faible" value={lowCount} variant="warning" />
      </div>

      <DataTable
        rows={alerts}
        columns={columns}
        rowKey={(row) => row.id}
        emptyTitle="Aucune alerte stock"
        emptyDescription="Tous les produits actifs sont au-dessus du seuil."
      />
    </div>
  );
}
