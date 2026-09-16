"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { DataTable, type DataColumn } from "@/components/crud/data-table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { useBcfRefresh } from "@/hooks/use-bcf-refresh";
import { listCashLedgerForDay } from "@/lib/repositories/cash-ledger";
import { getPurchase } from "@/lib/repositories/purchases";
import { getInvoice } from "@/lib/repositories/invoices";
import { paymentMethodLabels } from "@/lib/sales/cart";
import type { CashDirection, CashLedgerEntry, CashSourceType } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const sourceLabels: Record<CashSourceType, string> = {
  SALE: "Vente",
  PURCHASE: "Achat",
  REFUND: "Remboursement",
  MANUAL: "Manuel",
  ADJUSTMENT: "Ajustement",
};

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

type Props = {
  direction: CashDirection;
};

export function CashMovementsWorkspace({ direction }: Props) {
  const { version, mounted } = useBcfRefresh();

  const day = useMemo(() => {
    void version;
    return new Date();
  }, [version]);

  const entries = useMemo(() => {
    if (!mounted) return [];
    void version;
    return listCashLedgerForDay(day).filter((e) => e.direction === direction);
  }, [direction, day, mounted, version]);

  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const bySource = useMemo(() => {
    const map = new Map<CashSourceType, { count: number; amount: number }>();
    for (const entry of entries) {
      const current = map.get(entry.sourceType) ?? { count: 0, amount: 0 };
      current.count += 1;
      current.amount += entry.amount;
      map.set(entry.sourceType, current);
    }
    return [...map.entries()].sort((a, b) => b[1].amount - a[1].amount);
  }, [entries]);

  const isOut = direction === "OUT";
  const title = isOut ? "Sorties de caisse" : "Entrees de caisse";
  const description = isOut
    ? "Detail des paiements sortants du jour (achats recus, remboursements…)."
    : "Detail des encaissements du jour (ventes payees…).";

  const columns: DataColumn<CashLedgerEntry>[] = [
    {
      key: "time",
      header: "Heure",
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground">
          {formatTime(row.occurredAt)}
        </span>
      ),
    },
    {
      key: "label",
      header: "Libelle",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.label}</p>
          {row.description ? (
            <p className="truncate text-xs text-muted-foreground">
              {row.description}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "source",
      header: "Type",
      cell: (row) => (
        <Badge variant={isOut ? "danger" : "success"}>
          {sourceLabels[row.sourceType]}
        </Badge>
      ),
    },
    {
      key: "ref",
      header: "Reference",
      hideOnMobile: true,
      cell: (row) => {
        if (row.sourceType === "PURCHASE" && row.sourceId) {
          const purchase = getPurchase(row.sourceId);
          return (
            <Link
              href="/achats"
              className="text-xs font-medium text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {row.reference ?? purchase?.reference ?? "—"}
            </Link>
          );
        }
        if (row.sourceType === "SALE" && row.sourceId) {
          const invoice = getInvoice(row.sourceId);
          return (
            <Link
              href="/factures"
              className="text-xs font-medium text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {row.reference ?? invoice?.number ?? "—"}
            </Link>
          );
        }
        return (
          <span className="text-xs text-muted-foreground">
            {row.reference ?? "—"}
          </span>
        );
      },
    },
    {
      key: "payment",
      header: "Paiement",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.paymentMethod
            ? paymentMethodLabels[row.paymentMethod]
            : "—"}
        </span>
      ),
    },
    {
      key: "user",
      header: "Par",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{row.createdByName}</span>
      ),
    },
    {
      key: "amount",
      header: "Montant",
      className: "text-right",
      cell: (row) => (
        <span
          className={cn(
            "tabular-nums font-medium",
            isOut ? "text-destructive" : "text-success",
          )}
        >
          {isOut ? "−" : "+"}
          {formatCurrency(row.amount)}
        </span>
      ),
    },
  ];

  if (!mounted) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} description="Chargement…" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-border bg-surface-2"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={`${description} Journee du ${formatDayLabel(day)}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/comptabilite"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <ArrowLeft className="h-4 w-4" />
              Comptabilite
            </Link>
            {isOut ? (
              <Link
                href="/achats"
                className={cn(buttonVariants({ variant: "success" }))}
              >
                Voir les achats
              </Link>
            ) : (
              <Link
                href="/factures"
                className={cn(buttonVariants({ variant: "success" }))}
              >
                Voir les factures
              </Link>
            )}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={isOut ? "Total sorties" : "Total entrees"}
          value={formatCurrency(total)}
          variant={isOut ? "danger" : "success"}
          icon={
            isOut ? (
              <ArrowUpRight className="h-5 w-5" />
            ) : (
              <ArrowDownLeft className="h-5 w-5" />
            )
          }
        />
        <StatCard title="Mouvements" value={entries.length} />
        {bySource.slice(0, 2).map(([source, stats]) => (
          <StatCard
            key={source}
            title={sourceLabels[source]}
            value={formatCurrency(stats.amount)}
            subtitle={`${stats.count} operation(s)`}
            variant={isOut ? "danger" : "success"}
          />
        ))}
        {bySource.length === 0 ? (
          <>
            <StatCard title="Achats" value={formatCurrency(0)} subtitle="0" />
            <StatCard
              title="Autres"
              value={formatCurrency(0)}
              subtitle="0"
            />
          </>
        ) : null}
        {bySource.length === 1 ? (
          <StatCard title="Autres" value={formatCurrency(0)} subtitle="0" />
        ) : null}
      </div>

      {bySource.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Repartition par type</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {bySource.map(([source, stats]) => (
              <li
                key={source}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span>
                  {sourceLabels[source]}{" "}
                  <span className="text-muted-foreground">
                    ({stats.count})
                  </span>
                </span>
                <span
                  className={cn(
                    "tabular-nums font-medium",
                    isOut ? "text-destructive" : "text-success",
                  )}
                >
                  {formatCurrency(stats.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Detail des mouvements</h2>
        <DataTable
          rows={entries}
          columns={columns}
          rowKey={(row) => row.id}
          emptyTitle={isOut ? "Aucune sortie aujourd'hui" : "Aucune entree aujourd'hui"}
          emptyDescription={
            isOut
              ? "Les achats receptionnes et remboursements apparaitront ici."
              : "Les ventes payees apparaitront ici."
          }
        />
      </section>
    </div>
  );
}
