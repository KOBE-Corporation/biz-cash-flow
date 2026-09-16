"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Printer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { InsightsHighlights } from "@/components/shared/insights-highlights";
import { CashSessionBar } from "@/components/accounting/cash-session-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { useBcfRefresh } from "@/hooks/use-bcf-refresh";
import { downloadPeriodReportPdf } from "@/lib/accounting/period-report";
import { paymentMethodLabels } from "@/lib/sales/cart";
import { getDailyAccounting } from "@/lib/repositories/accounting";
import {
  getPeriodInsights,
  type PeriodInsights,
} from "@/lib/repositories/insights";
import type { PeriodKey } from "@/lib/repositories/cash-sessions";
import { formatCurrency } from "@/lib/utils";

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

const PDF_PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "day", label: "Journalier" },
  { key: "week", label: "Hebdo" },
  { key: "month", label: "Mensuel" },
  { key: "quarter", label: "Trimestriel" },
  { key: "year", label: "Annuel" },
];

export function AccountingWorkspace() {
  const { version, mounted, bump } = useBcfRefresh();

  const data = useMemo(() => {
    if (!mounted) return null;
    void version;
    return getDailyAccounting(new Date());
  }, [version, mounted]);

  const dayInsights = useMemo(() => {
    if (!mounted) return null;
    void version;
    return getPeriodInsights("day");
  }, [version, mounted]);

  const handlePrint = () => window.print();

  const handlePdf = (period: PeriodKey) => {
    downloadPeriodReportPdf(period);
  };

  if (!data || !dayInsights) {
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
        description="Caisse du jour, produits phares, vendeurs et rapports PDF (J/H/M/T/A)."
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" onClick={bump}>
              Actualiser
            </Button>
            <Button variant="success" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Imprimer l'ecran
            </Button>
          </div>
        }
      />

      <CashSessionBar variant="accounting" onChanged={bump} />

      <section className="space-y-2 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Telechargement rapports PDF</h2>
          <p className="text-xs text-muted-foreground">
            Fichier HTML + boite d&apos;impression → Enregistrer en PDF
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PDF_PERIODS.map((p) => (
            <Button
              key={p.key}
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => handlePdf(p.key)}
            >
              <Download className="h-4 w-4" />
              {p.label}
            </Button>
          ))}
        </div>
      </section>

      <p className="text-sm text-muted-foreground print:text-foreground">
        Journee du {formatDayLabel(data.date)}
        {data.session
          ? ` · Session ${data.session.status} · Fonds ${formatCurrency(data.openingFloat)} (hors CA)`
          : " · Aucune session ouverte"}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/comptabilite/entrees"
          className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <StatCard
            title="Entrees metier"
            value={formatCurrency(data.cashIn)}
            subtitle={`${data.salesCount} vente(s) — hors float`}
            variant="success"
            className="transition-colors hover:bg-surface-active/40"
          />
        </Link>
        <Link
          href="/comptabilite/sorties"
          className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <StatCard
            title="Sorties metier"
            value={formatCurrency(data.cashOut)}
            subtitle={`${data.purchasesCount} achat(s) — hors float`}
            variant="danger"
            className="transition-colors hover:bg-surface-active/40"
          />
        </Link>
        <StatCard
          title="Net metier"
          value={formatCurrency(data.netCash)}
          subtitle="Base des taux (float exclu)"
          variant={data.netCash >= 0 ? "success" : "danger"}
        />
        <StatCard
          title="Tiroir theorique"
          value={formatCurrency(data.expectedDrawer)}
          subtitle={`Float ${formatCurrency(data.openingFloat)} + net`}
          variant="success"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="CA du jour"
          value={formatCurrency(data.salesTotal)}
          subtitle="Encaisse"
          variant="success"
        />
        <StatCard
          title="Marge estimee"
          value={formatCurrency(data.estimatedMargin)}
          subtitle={`Resultat ${formatCurrency(data.dailyResult)}`}
          variant={data.estimatedMargin >= 0 ? "success" : "danger"}
        />
        <StatCard
          title="Achats recus"
          value={formatCurrency(data.purchasesTotal)}
          subtitle="Du jour"
        />
        <Link href="/comptabilite/stock" className="block rounded-xl">
          <StatCard
            title="Alertes stock"
            value={data.lowStockAlerts + data.outOfStockAlerts}
            subtitle={`${data.outOfStockAlerts} rupture · ${data.lowStockAlerts} faible`}
            variant={
              data.outOfStockAlerts > 0
                ? "danger"
                : data.lowStockAlerts > 0
                  ? "warning"
                  : "success"
            }
            className="transition-colors hover:bg-surface-active/40"
          />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        {(
          [
            ["week", data.periods.week],
            ["month", data.periods.month],
            ["quarter", data.periods.quarter],
            ["year", data.periods.year],
          ] as const
        ).map(([key, period]) => (
          <button
            key={key}
            type="button"
            onClick={() => handlePdf(key)}
            className="text-left"
            title="Telecharger le PDF"
          >
            <StatCard
              title={`CA ${PDF_PERIODS.find((p) => p.key === key)?.label}`}
              value={formatCurrency(period.salesTotal)}
              subtitle={`Moy. ${formatCurrency(period.avgDailySales)}/j · PDF`}
              className="transition-colors hover:bg-surface-active/40"
            />
          </button>
        ))}
      </div>

      <InsightsHighlights
        insights={dayInsights as PeriodInsights}
        title="Highlights du jour"
      />

      {(data.lowStockAlerts > 0 ||
        data.outOfStockAlerts > 0 ||
        data.expiryAlerts > 0) && (
        <Link
          href="/comptabilite/stock"
          className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm transition-colors hover:bg-warning/15 print:border-border"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">
              Alertes stock & peremption
            </p>
            <p className="text-muted-foreground">
              {data.outOfStockAlerts} rupture, {data.lowStockAlerts} seuil bas
              {data.expiryAlerts > 0
                ? `, ${data.expiryAlerts} peremption proche`
                : ""}
              .
            </p>
          </div>
          <span className="shrink-0 self-center text-xs font-medium text-primary group-hover:underline">
            Voir →
          </span>
        </Link>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Ventes par caissier</h2>
        {data.salesByUser.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune vente aujourd&apos;hui.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Vendeur</th>
                  <th className="px-3 py-2 font-medium">Tickets</th>
                  <th className="px-3 py-2 font-medium">CA</th>
                  <th className="px-3 py-2 font-medium">Encaisse</th>
                  <th className="px-3 py-2 font-medium">Plage</th>
                </tr>
              </thead>
              <tbody>
                {data.salesByUser.map((row, i) => (
                  <tr key={row.userId} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">
                      {row.userName}
                      {i === 0 ? (
                        <Badge variant="success" className="ml-2">
                          Top
                        </Badge>
                      ) : null}
                    </td>
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
        <h2 className="text-base font-semibold">Produits du jour (gain)</h2>
        {data.topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune vente payee.</p>
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
                {data.topProducts.map((row, i) => (
                  <tr key={row.productId} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">
                      {row.name}
                      {i < 3 ? (
                        <Badge variant="success" className="ml-2">
                          Phare
                        </Badge>
                      ) : null}
                    </td>
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

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Comparaison fournisseurs</h2>
          <Link
            href="/fournisseurs"
            className="text-xs font-medium text-primary hover:underline"
          >
            Voir fournisseurs →
          </Link>
        </div>
        {data.supplierComparisons.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Au moins 2 offres par produit sont necessaires (receptionnez des
            achats chez plusieurs fournisseurs).
          </p>
        ) : (
          <div className="space-y-2">
            {data.supplierComparisons.slice(0, 6).map((row) => (
              <div
                key={row.productId}
                className="rounded-2xl border border-border px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{row.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      Meilleur {formatCurrency(row.bestCost)} / u. · pire{" "}
                      {formatCurrency(row.worstCost)} / u.
                    </p>
                  </div>
                  <Badge variant="success">
                    Eco. max {formatCurrency(row.potentialSavingPerBase)} / u.
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {row.offers.map((offer) => (
                    <Badge
                      key={`${offer.supplierName}-${offer.purchasePackName}`}
                      variant={
                        offer.costPerBaseUnit <= row.bestCost
                          ? "success"
                          : "outline"
                      }
                      className="text-[10px]"
                    >
                      {offer.supplierName}:{" "}
                      {formatCurrency(offer.costPerBaseUnit)}/
                      {offer.purchasePackName}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Journal de caisse</h2>
        {data.operationalLedger.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun mouvement metier aujourd&apos;hui.
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
                {data.operationalLedger.map((entry) => (
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
    </div>
  );
}
