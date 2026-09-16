"use client";

import { useMemo, useState } from "react";
import { DataTable, type DataColumn } from "@/components/crud/data-table";
import { CrudToolbar } from "@/components/crud/toolbar";
import { Badge, Chip } from "@/components/ui/badge";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { useBcfRefresh } from "@/hooks/use-bcf-refresh";
import { useEntityList } from "@/hooks/use-entity-list";
import { listAuditLogs } from "@/lib/repositories/audit";
import type { AuditAction, AuditLog } from "@/lib/types";

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
  OTHER: "Autre",
};

function formatAt(date: Date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function AuditWorkspace() {
  const { version } = useBcfRefresh();
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");

  const items = useMemo(() => {
    void version;
    return listAuditLogs(300);
  }, [version]);

  const list = useEntityList(items, (item, query) => {
    if (actionFilter !== "all" && item.action !== actionFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.summary.toLowerCase().includes(q) ||
      item.userName.toLowerCase().includes(q) ||
      item.entityType.toLowerCase().includes(q) ||
      (item.entityId?.toLowerCase().includes(q) ?? false)
    );
  });

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
      cell: (row) => <Badge variant="outline">{actionLabels[row.action]}</Badge>,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal d'activite"
        description="Trace de toutes les operations (ventes, caisse, annulations, sessions…)."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Evenements" value={items.length} subtitle="Recents" />
        <StatCard
          title="Ventes"
          value={items.filter((i) => i.action === "SALE").length}
        />
        <StatCard
          title="Sessions caisse"
          value={
            items.filter(
              (i) =>
                i.action === "OPEN_SESSION" || i.action === "CLOSE_SESSION",
            ).length
          }
        />
      </div>

      <CrudToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Resume, utilisateur, entite…"
        filters={
          <>
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
                "OPEN_SESSION",
                "CLOSE_SESSION",
                "CANCEL",
                "RECEIVE",
                "UPDATE",
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
      />
    </div>
  );
}
