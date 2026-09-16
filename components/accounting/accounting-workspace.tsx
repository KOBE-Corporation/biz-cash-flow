"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { paymentMethodLabels } from "@/lib/sales/cart";
import { getDailyAccounting } from "@/lib/repositories/accounting";
import { formatCurrency } from "@/lib/utils";

/** Format HH:mm local, sans toLocale* (évite décalages SSR/client). */
function formatTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDayLabel(date: Date) {
  const weekdays = [
    "dimanche",
    "lundi",
    "mardi",
    "mercredi",
    "jeudi",
    "vendredi",
    "samedi",
  ];
  const months = [
    "janvier",
    "fevrier",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "aout",
    "septembre",
    "octobre",
    "novembre",
    "decembre",
  ];
  return `${weekdays[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function AccountingWorkspace() {
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const refresh = () => setTick((v) => v + 1);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("bcf:sale-completed", refresh);
    window.addEventListener("bcf:invoice-cancelled", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("bcf:sale-completed", refresh);
      window.removeEventListener("bcf:invoice-cancelled", refresh);
    };
  }, [mounted]);

  const data = useMemo(() => {
    if (!mounted) return null;
    void tick;
    return getDailyAccounting(new Date());
  }, [tick, mounted]);

  const handlePrint = () => {
    window.print();
  };

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Comptabilite"
          description="Chargement du compte du jour…"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl border border-border bg-surface-2"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        title="Comptabilite"
        description="Journal de caisse du jour : entrees, sorties, gains/pertes et tracabilite utilisateur."
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" onClick={() => setTick((v) => v + 1)}>
              Actualiser
            </Button>
            <Button variant="success" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Imprimer le jour
            </Button>
          </div>
        }
      />

      <p className="text-sm text-muted-foreground print:text-foreground">
        Journee du {formatDayLabel(data.date)}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/comptabilite/entrees"
          className="block rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        >
          <StatCard
            title="Entrees caisse"
            value={formatCurrency(data.cashIn)}
            subtitle={`${data.salesCount} vente(s) — cliquer`}
            variant="success"
            className="transition-colors hover:bg-surface-active/40"
          />
        </Link>
        <Link
          href="/comptabilite/sorties"
          className="block rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        >
          <StatCard
            title="Sorties caisse"
            value={formatCurrency(data.cashOut)}
            subtitle={`${data.purchasesCount} achat(s) — cliquer`}
            variant="danger"
            className="transition-colors hover:bg-surface-active/40"
          />
        </Link>
        <StatCard
          title="Solde caisse du jour"
          value={formatCurrency(data.netCash)}
          subtitle="Entrees − sorties"
          variant={data.netCash >= 0 ? "success" : "danger"}
        />
        <StatCard
          title="Marge / resultat"
          value={formatCurrency(data.estimatedMargin)}
          subtitle={`Resultat simplifie : ${formatCurrency(data.dailyResult)}`}
          variant={data.estimatedMargin >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          title="CA ventes"
          value={formatCurrency(data.salesTotal)}
          subtitle="Factures payees du jour"
        />
        <Link
          href="/comptabilite/sorties"
          className="block rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        >
          <StatCard
            title="Achats recus"
            value={formatCurrency(data.purchasesTotal)}
            subtitle="Sorties stock + caisse — cliquer"
            className="transition-colors hover:bg-surface-active/40"
          />
        </Link>
        <Link href="/comptabilite/stock" className="block rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
          <StatCard
            title="Alertes stock"
            value={data.lowStockAlerts + data.outOfStockAlerts}
            subtitle={`${data.outOfStockAlerts} rupture · ${data.lowStockAlerts} faible — cliquer`}
            variant={
              data.outOfStockAlerts > 0
                ? "danger"
                : data.lowStockAlerts > 0
                  ? "warning"
                  : "success"
            }
          />
        </Link>
      </div>

      {(data.lowStockAlerts > 0 ||
        data.outOfStockAlerts > 0 ||
        data.expiryAlerts > 0) && (
        <Link
          href="/comptabilite/stock"
          className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm transition-colors hover:bg-warning/15 print:border-border"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">Alertes stock & peremption</p>
            <p className="text-muted-foreground">
              {data.outOfStockAlerts} rupture, {data.lowStockAlerts} seuil bas
              {data.expiryAlerts > 0
                ? `, ${data.expiryAlerts} peremption proche`
                : ""}
              .
            </p>
          </div>
          <span className="shrink-0 self-center text-xs font-medium text-primary group-hover:underline">
            Voir le stock →
          </span>
        </Link>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Ventes par vendeur (jour)
        </h2>
        {data.salesByUser.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune vente enregistree aujourd&apos;hui.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Vendeur</th>
                  <th className="px-3 py-2 font-medium">Tickets</th>
                  <th className="px-3 py-2 font-medium">CA</th>
                  <th className="px-3 py-2 font-medium">Encaisse</th>
                  <th className="px-3 py-2 font-medium">Plage horaire</th>
                </tr>
              </thead>
              <tbody>
                {data.salesByUser.map((row) => (
                  <tr key={row.userId} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{row.userName}</td>
                    <td className="px-3 py-2 tabular-nums">{row.salesCount}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatCurrency(row.salesTotal)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-success">
                      {formatCurrency(row.cashIn)}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {row.firstSaleAt && row.lastSaleAt
                        ? `${formatTime(row.firstSaleAt)} → ${formatTime(row.lastSaleAt)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Journal de caisse (jour)
        </h2>
        {data.ledger.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun mouvement d&apos;argent aujourd&apos;hui. Les ventes payees et
            les achats recus s&apos;y enregistrent automatiquement.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Heure</th>
                  <th className="px-3 py-2 font-medium">Sens</th>
                  <th className="px-3 py-2 font-medium">Libelle</th>
                  <th className="px-3 py-2 font-medium">Par</th>
                  <th className="px-3 py-2 font-medium text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {data.ledger.map((entry) => (
                  <tr key={entry.id} className="border-t border-border">
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {formatTime(entry.occurredAt)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={entry.direction === "IN" ? "success" : "danger"}
                        className="gap-1"
                      >
                        {entry.direction === "IN" ? (
                          <ArrowDownLeft className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {entry.direction === "IN" ? "Entree" : "Sortie"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{entry.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.reference ?? entry.sourceType}
                        {entry.paymentMethod
                          ? ` · ${paymentMethodLabels[entry.paymentMethod]}`
                          : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {entry.createdByName}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums font-medium ${
                        entry.direction === "IN"
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {entry.direction === "IN" ? "+" : "−"}
                      {formatCurrency(entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Gains par produit (jour)
        </h2>
        {data.topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune vente payee aujourd&apos;hui.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Produit</th>
                  <th className="px-3 py-2 font-medium">Qte</th>
                  <th className="px-3 py-2 font-medium">CA</th>
                  <th className="px-3 py-2 font-medium">Cout</th>
                  <th className="px-3 py-2 font-medium">Gain</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((row) => (
                  <tr key={row.productId} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2 tabular-nums">{row.qtySold}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {formatCurrency(row.estimatedCost)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 tabular-nums ${
                          row.estimatedGain >= 0
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {row.estimatedGain >= 0 ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {formatCurrency(row.estimatedGain)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Comparaison fournisseurs — masquee tant que le module n'est pas finalise */}

      <p className="text-xs text-muted-foreground print:hidden">
        Chaque ligne de caisse est liee a l&apos;utilisateur courant (stub auth).
        La gestion multi-users arrivera plus tard.
      </p>
    </div>
  );
}
