"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CircleDollarSign,
  FileText,
  PackageX,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { InsightsHighlights } from "@/components/shared/insights-highlights";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { useBcfRefresh } from "@/hooks/use-bcf-refresh";
import {
  getDashboardStats,
  getLowStockProducts,
  getRecentInvoices,
  getRecentMovements,
} from "@/lib/mock/dashboard";
import { getDashboardHighlights } from "@/lib/repositories/insights";
import { statusLabel } from "@/lib/repositories/invoices";
import { cn, formatCurrency } from "@/lib/utils";

function formatShortDate(date: Date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${hours}:${minutes}`;
}

export function DashboardWorkspace() {
  const { version, mounted } = useBcfRefresh();

  if (!mounted) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Tableau de bord"
          description="Chargement…"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[106px] animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      </div>
    );
  }

  void version;
  const stats = getDashboardStats();
  const movements = getRecentMovements(6);
  const invoices = getRecentInvoices(5);
  const lowStock = getLowStockProducts(6);
  const highlights = getDashboardHighlights();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble : produits phares, vendeurs, caisse, stock et alertes."
        actions={
          <>
            <Link
              href="/factures"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <FileText className="h-4 w-4" />
              Factures
            </Link>
            <Link
              href="/achats"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <ShoppingCart className="h-4 w-4" />
              Achats
            </Link>
            <Link
              href="/sales"
              className={cn(buttonVariants({ variant: "success" }))}
            >
              <CircleDollarSign className="h-4 w-4" />
              Nouvelle vente
            </Link>
          </>
        }
      />

      <InsightsHighlights
        insights={highlights.day}
        title="Highlights du jour"
        compact
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/comptabilite" className="block">
          <StatCard
            title="CA du jour"
            value={formatCurrency(stats.todaySalesTotal)}
            subtitle={`${stats.todaySalesCount} vente(s) payee(s)`}
            variant="success"
            icon={<CircleDollarSign className="h-5 w-5 text-success" />}
          />
        </Link>
        <Link href="/comptabilite" className="block">
          <StatCard
            title="Solde caisse"
            value={formatCurrency(stats.todayNetCash)}
            subtitle="Entrees − sorties du jour"
            variant={stats.todayNetCash >= 0 ? "success" : "danger"}
            icon={<Wallet className="h-5 w-5" />}
          />
        </Link>
        <Link href="/factures" className="block">
          <StatCard
            title="Impayees"
            value={stats.unpaidCount}
            subtitle={
              stats.unpaidTotal > 0
                ? formatCurrency(stats.unpaidTotal)
                : "Aucun solde client"
            }
            variant={stats.unpaidCount > 0 ? "warning" : "default"}
            icon={<FileText className="h-5 w-5 text-warning" />}
          />
        </Link>
        <Link href="/produits?filter=low" className="block">
          <StatCard
            title="Stock faible"
            value={stats.lowStockCount}
            subtitle="Sous le seuil min"
            variant="warning"
            icon={<AlertTriangle className="h-5 w-5 text-warning" />}
          />
        </Link>
        <Link href="/produits?filter=out" className="block">
          <StatCard
            title="Stock epuise"
            value={stats.outOfStockCount}
            subtitle="A reapprovisionner"
            variant="danger"
            icon={<PackageX className="h-5 w-5 text-destructive" />}
          />
        </Link>
        <Link href="/comptabilite/stock" className="block">
          <StatCard
            title="Peremption"
            value={stats.expiryAlertCount}
            subtitle="Lots a surveiller"
            variant={stats.expiryAlertCount > 0 ? "warning" : "default"}
            icon={<AlertTriangle className="h-5 w-5 text-warning" />}
          />
        </Link>
      </div>

      <InsightsHighlights
        insights={highlights.week}
        title="Tendance de la semaine"
        showStock={false}
        compact
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Produits actifs"
          value={stats.totalProducts}
          subtitle={`Valeur stock ${formatCurrency(stats.stockValue)}`}
        />
        <StatCard
          title="Categories"
          value={stats.totalCategories}
          subtitle="Familles actives"
        />
        <StatCard
          title="Fournisseurs"
          value={stats.totalSuppliers}
          subtitle="Actifs"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Factures recentes</CardTitle>
            <Link
              href="/factures"
              className="text-sm font-medium text-primary hover:underline"
            >
              Voir toutes
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoices.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucune facture. Lancez une vente.
              </p>
            ) : (
              invoices.map((inv) => (
                <Link
                  key={inv.id}
                  href="/factures"
                  className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3 transition-colors hover:bg-surface-active"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {inv.number}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {inv.customerName} · {formatShortDate(inv.issuedAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(inv.totalAmount)}
                    </p>
                    <Badge
                      variant={
                        inv.status === "PAID"
                          ? "success"
                          : inv.status === "CANCELLED"
                            ? "danger"
                            : "warning"
                      }
                      className="mt-0.5"
                    >
                      {statusLabel(inv.status)}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <CardTitle>Alertes stock</CardTitle>
            </div>
            <Link
              href="/produits?filter=low"
              className="text-sm font-medium text-primary hover:underline"
            >
              Voir produits
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStock.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface-2 px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucune alerte stock. Bien !
                </p>
              </div>
            ) : (
              lowStock.map((p) => (
                <Link
                  key={p.id}
                  href="/produits?filter=low"
                  className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3 transition-colors hover:bg-surface-active"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Min {p.minStock} · {p.sku}
                    </p>
                  </div>
                  <Badge
                    variant={p.quantity <= 0 ? "danger" : "warning"}
                    className="tabular-nums"
                  >
                    {p.quantity <= 0 ? "Epuise" : `${p.quantity} u.`}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Mouvements recents</CardTitle>
          <Link
            href="/mouvements"
            className="text-sm font-medium text-primary hover:underline"
          >
            Voir tous
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun mouvement recent.
            </p>
          ) : (
            movements.map((movement) => {
              const isOut = movement.type === "OUT";
              return (
                <div
                  key={movement.id}
                  className="flex items-center justify-between gap-4 rounded-xl bg-surface-2 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        isOut
                          ? "bg-destructive/15 text-destructive"
                          : "bg-success/15 text-success",
                      )}
                    >
                      {isOut ? (
                        <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUp className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {movement.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatShortDate(movement.createdAt)}
                        {movement.reference ? ` · ${movement.reference}` : ""}
                      </p>
                    </div>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      isOut ? "text-destructive" : "text-success",
                    )}
                  >
                    {isOut ? "−" : "+"}
                    {movement.quantity}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
