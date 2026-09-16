"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  CircleDollarSign,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { DataTable, type DataColumn } from "@/components/crud/data-table";
import { FormDialog } from "@/components/crud/form-dialog";
import { CrudToolbar } from "@/components/crud/toolbar";
import { Badge, Chip } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { useBcfRefresh } from "@/hooks/use-bcf-refresh";
import { useEntityList } from "@/hooks/use-entity-list";
import { getAuditLog, listAuditLogs } from "@/lib/repositories/audit";
import type { AuditAction, AuditLog } from "@/lib/types";
import { cn } from "@/lib/utils";

const actionLabels: Record<AuditAction, string> = {
  CREATE: "Creation",
  UPDATE: "Maj",
  DELETE: "Suppression",
  RECEIVE: "Reception",
  CANCEL: "Annulation",
  SALE: "Vente",
  ADJUST: "Ajustement",
  LOGIN: "Connexion",
  OPEN_SESSION: "Ouverture caisse",
  CLOSE_SESSION: "Cloture caisse",
  PRICE_CHANGE: "Prix",
  DISCOUNT: "Remise",
  BELOW_COST: "Vente a perte",
  OTHER: "Autre",
};

const actionVariant: Partial<
  Record<AuditAction, "success" | "danger" | "warning" | "outline">
> = {
  SALE: "success",
  RECEIVE: "success",
  CREATE: "success",
  OPEN_SESSION: "success",
  CANCEL: "danger",
  DELETE: "danger",
  BELOW_COST: "danger",
  CLOSE_SESSION: "warning",
  ADJUST: "warning",
  PRICE_CHANGE: "warning",
  DISCOUNT: "warning",
  UPDATE: "outline",
};

type PeriodFilter = "all" | "today" | "7d" | "30d";

type EntityLink = { href: string; label: string };

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function inPeriod(date: Date, period: PeriodFilter) {
  if (period === "all") return true;
  const now = new Date();
  const start = startOfDay(now);
  if (period === "today") return date.getTime() >= start.getTime();
  const days = period === "7d" ? 7 : 30;
  const from = new Date(start);
  from.setDate(from.getDate() - (days - 1));
  return date.getTime() >= from.getTime();
}

function formatAt(date: Date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatFull(date: Date) {
  return date.toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function entityLink(log: AuditLog): EntityLink | null {
  if (!log.entityId) return null;
  const id = encodeURIComponent(log.entityId);
  switch (log.entityType) {
    case "Invoice":
      return { href: `/factures?id=${id}`, label: "Voir la facture" };
    case "Purchase":
      return { href: `/achats?id=${id}`, label: "Voir l'achat" };
    case "Product":
      return { href: `/produits?id=${id}`, label: "Voir le produit" };
    case "Supplier":
      return { href: `/fournisseurs?id=${id}`, label: "Voir le fournisseur" };
    case "Category":
      return { href: `/categories?id=${id}`, label: "Voir la categorie" };
    case "StockMovement":
      return { href: `/mouvements?id=${id}`, label: "Voir le mouvement" };
    default:
      return null;
  }
}

export function AuditWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { version } = useBcfRefresh();
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [detail, setDetail] = useState<AuditLog | null>(null);

  const items = useMemo(() => {
    void version;
    return listAuditLogs(500);
  }, [version]);

  const stats = useMemo(() => {
    const scoped = items.filter((i) => inPeriod(i.createdAt, periodFilter));
    return {
      total: scoped.length,
      sales: scoped.filter((i) => i.action === "SALE").length,
      sessions: scoped.filter(
        (i) => i.action === "OPEN_SESSION" || i.action === "CLOSE_SESSION",
      ).length,
      purchases: scoped.filter(
        (i) =>
          i.action === "RECEIVE" ||
          (i.entityType === "Purchase" &&
            (i.action === "CREATE" || i.action === "CANCEL")),
      ).length,
      cancels: scoped.filter((i) => i.action === "CANCEL").length,
      adjusts: scoped.filter((i) => i.action === "ADJUST").length,
    };
  }, [items, periodFilter]);

  const filterFn = useCallback(
    (item: AuditLog, query: string) => {
      if (actionFilter !== "all" && item.action !== actionFilter) return false;
      if (!inPeriod(item.createdAt, periodFilter)) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.summary.toLowerCase().includes(q) ||
        item.userName.toLowerCase().includes(q) ||
        item.entityType.toLowerCase().includes(q) ||
        (item.entityId?.toLowerCase().includes(q) ?? false) ||
        actionLabels[item.action].toLowerCase().includes(q)
      );
    },
    [actionFilter, periodFilter],
  );

  const list = useEntityList(items, filterFn);

  useEffect(() => {
    const actionFromUrl = searchParams.get("action") as AuditAction | null;
    const idFromUrl = searchParams.get("id");
    let touched = false;

    if (actionFromUrl && actionLabels[actionFromUrl]) {
      setActionFilter(actionFromUrl);
      touched = true;
    }

    if (idFromUrl) {
      const log = getAuditLog(idFromUrl);
      if (log) setDetail(log);
      touched = true;
    }

    if (touched) {
      router.replace("/activite", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setActionFromCard = (value: AuditAction | "all") => {
    setActionFilter((prev) => (prev === value ? "all" : value));
  };

  const columns: DataColumn<AuditLog>[] = [
    {
      key: "when",
      header: "Quand",
      cell: (row) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatAt(row.createdAt)}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      cell: (row) => (
        <Badge variant={actionVariant[row.action] ?? "outline"}>
          {actionLabels[row.action]}
        </Badge>
      ),
    },
    {
      key: "summary",
      header: "Resume",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.summary}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {row.entityType}
            {row.entityId ? ` · ${row.entityId}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "user",
      header: "Par",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{row.userName}</span>
      ),
    },
  ];

  const detailLink = detail ? entityLink(detail) : null;
  const periodLabel =
    periodFilter === "today"
      ? "Aujourd'hui"
      : periodFilter === "7d"
        ? "7 jours"
        : periodFilter === "30d"
          ? "30 jours"
          : "Recents";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal d'activite"
        description="Trace de toutes les operations (ventes, caisse, achats, stock…)."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Evenements"
          value={stats.total}
          subtitle={periodLabel}
          active={actionFilter === "all"}
          onClick={() => setActionFromCard("all")}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          title="Ventes"
          value={stats.sales}
          subtitle="Tickets enregistres"
          variant="success"
          active={actionFilter === "SALE"}
          onClick={() => setActionFromCard("SALE")}
          icon={<CircleDollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Achats / receptions"
          value={stats.purchases}
          subtitle={`${stats.cancels} annulation${stats.cancels === 1 ? "" : "s"}`}
          active={actionFilter === "RECEIVE"}
          onClick={() => setActionFromCard("RECEIVE")}
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <StatCard
          title="Sessions caisse"
          value={stats.sessions}
          subtitle={`${stats.adjusts} ajustement${stats.adjusts === 1 ? "" : "s"} stock`}
          variant="warning"
          active={actionFilter === "OPEN_SESSION"}
          onClick={() => setActionFromCard("OPEN_SESSION")}
          icon={<Wallet className="h-5 w-5" />}
        />
      </div>

      <CrudToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Resume, utilisateur, entite…"
        filters={
          <>
            {(["all", "today", "7d", "30d"] as const).map((value) => (
              <Chip
                key={value}
                active={periodFilter === value}
                onClick={() => setPeriodFilter(value)}
                className="px-2.5 py-1 text-xs"
              >
                {value === "all"
                  ? "Periode"
                  : value === "today"
                    ? "Aujourd'hui"
                    : value === "7d"
                      ? "7 j"
                      : "30 j"}
              </Chip>
            ))}
            <Chip
              active={actionFilter === "all"}
              onClick={() => setActionFilter("all")}
              className="px-2.5 py-1 text-xs"
            >
              Toutes
            </Chip>
            {(
              [
                "SALE",
                "DISCOUNT",
                "PRICE_CHANGE",
                "BELOW_COST",
                "RECEIVE",
                "CREATE",
                "UPDATE",
                "ADJUST",
                "CANCEL",
                "OPEN_SESSION",
                "CLOSE_SESSION",
                "DELETE",
              ] as AuditAction[]
            ).map((a) => (
              <Chip
                key={a}
                active={actionFilter === a}
                onClick={() =>
                  setActionFilter((prev) => (prev === a ? "all" : a))
                }
                className="px-2.5 py-1 text-xs"
              >
                {actionLabels[a]}
              </Chip>
            ))}
          </>
        }
      />

      <DataTable
        rows={list.filtered}
        columns={columns}
        rowKey={(row) => row.id}
        emptyTitle="Aucune activite"
        emptyDescription="Les operations apparaitront ici au fil de l'usage."
        onRowClick={setDetail}
      />

      <FormDialog
        open={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
        title={detail ? actionLabels[detail.action] : "Evenement"}
        description={detail?.summary}
        className="max-w-md"
        footer={
          detailLink ? (
            <Link
              href={detailLink.href}
              className={cn(buttonVariants({ variant: "success" }))}
              onClick={() => setDetail(null)}
            >
              {detailLink.label}
            </Link>
          ) : undefined
        }
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <Badge variant={actionVariant[detail.action] ?? "outline"}>
              {actionLabels[detail.action]}
            </Badge>
            <dl className="grid gap-2 rounded-xl bg-surface-2 p-3">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Quand</dt>
                <dd className="text-right">{formatFull(detail.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Par</dt>
                <dd>{detail.userName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Entite</dt>
                <dd className="text-right">
                  {detail.entityType}
                  {detail.entityId ? (
                    <span className="block text-[11px] text-muted-foreground">
                      {detail.entityId}
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
            {detail.metadata && Object.keys(detail.metadata).length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Details
                </p>
                <ul className="space-y-1 rounded-xl bg-surface-2 p-3 text-xs">
                  {Object.entries(detail.metadata).map(([key, value]) => (
                    <li
                      key={key}
                      className="flex justify-between gap-3"
                    >
                      <span className="text-muted-foreground">{key}</span>
                      <span className="max-w-[60%] truncate text-right tabular-nums">
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value ?? "—")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </FormDialog>
    </div>
  );
}
