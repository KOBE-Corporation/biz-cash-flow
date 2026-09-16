"use client";

import { useMemo, useState } from "react";
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

export function AccountingWorkspace() {
  const [tick, setTick] = useState(0);
  const data = useMemo(() => {
    void tick;
    return getDailyAccounting(new Date());
  }, [tick]);

  const handlePrint = () => {
    window.print();
  };

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
        Journee du{" "}
        {data.date.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Entrees caisse"
          value={formatCurrency(data.cashIn)}
          subtitle={`${data.salesCount} vente(s) payee(s)`}
          variant="success"
        />
        <StatCard
          title="Sorties caisse"
          value={formatCurrency(data.cashOut)}
          subtitle={`${data.purchasesCount} achat(s) recu(s)`}
          variant="danger"
        />
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
        <StatCard
          title="Achats recus"
          value={formatCurrency(data.purchasesTotal)}
          subtitle="Sorties stock + caisse"
        />
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
        />
      </div>

      {(data.lowStockAlerts > 0 || data.outOfStockAlerts > 0) && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm print:border-border">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium text-foreground">Alertes stock</p>
            <p className="text-muted-foreground">
              {data.outOfStockAlerts} produit(s) en rupture,{" "}
              {data.lowStockAlerts} sous le seuil minimum. Voir la page Produits
              / Mouvements.
            </p>
          </div>
        </div>
      )}

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
                      {entry.occurredAt.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Comparaison fournisseurs
        </h2>
        {data.supplierComparisons.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Pas encore assez d&apos;offres (il faut au moins 2 fournisseurs pour
            un meme produit).
          </p>
        ) : (
          <div className="space-y-3">
            {data.supplierComparisons.map((item) => (
              <div
                key={item.productId}
                className="rounded-2xl border border-border p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{item.productName}</p>
                  <Badge variant="success">
                    Economie max / unite :{" "}
                    {formatCurrency(item.potentialSavingPerBase)}
                  </Badge>
                </div>
                <ul className="space-y-1.5 text-sm">
                  {item.offers.map((offer) => (
                    <li
                      key={`${offer.supplierName}-${offer.purchasePackName}`}
                      className="flex flex-wrap justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2"
                    >
                      <span>
                        {offer.supplierName} · {offer.purchasePackName} (
                        {formatCurrency(offer.packPurchasePrice)})
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatCurrency(offer.costPerBaseUnit)} / unite
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground print:hidden">
        Chaque ligne de caisse est liee a l&apos;utilisateur courant (stub auth).
        La gestion multi-users arrivera plus tard. Marge = CA − cout de revient
        des articles vendus.
      </p>
    </div>
  );
}
