"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { ProductSearchSelect } from "@/components/purchases/product-search-select";
import { DataTable, type DataColumn } from "@/components/crud/data-table";
import { FormDialog } from "@/components/crud/form-dialog";
import { CrudToolbar } from "@/components/crud/toolbar";
import { Badge, Chip } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { ToastViewport, useToast } from "@/components/ui/toast";
import { useBcfRefresh } from "@/hooks/use-bcf-refresh";
import { useEntityList } from "@/hooks/use-entity-list";
import { BCF_EVENTS, dispatchBcfEvent } from "@/lib/events/bcf-events";
import {
  createMovement,
  getMovement,
  listMovements,
} from "@/lib/repositories/movements";
import { listProducts } from "@/lib/repositories/products";
import type { MovementType, Product, StockMovement } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const typeLabels: Record<MovementType, string> = {
  IN: "Entree",
  OUT: "Sortie",
  ADJUSTMENT: "Ajustement",
};

type PeriodFilter = "all" | "today" | "7d" | "30d";

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

function formatWhen(date: Date) {
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MovementsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast, showToast } = useToast();
  const { version, bump } = useBcfRefresh();
  const [typeFilter, setTypeFilter] = useState<MovementType | "all">("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [productFilter, setProductFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<StockMovement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    productId: "",
    type: "ADJUSTMENT" as MovementType,
    quantity: "1",
    reference: "",
    notes: "",
  });

  const products = useMemo(
    () => listProducts().filter((p) => p.isActive),
    [version],
  );
  const items = useMemo(() => {
    void version;
    return listMovements();
  }, [version]);

  const selectedProduct = products.find((p) => p.id === form.productId);

  const stats = useMemo(() => {
    const scoped = items.filter((m) => inPeriod(m.createdAt, periodFilter));
    const ins = scoped.filter((m) => m.type === "IN");
    const outs = scoped.filter((m) => m.type === "OUT");
    const adjs = scoped.filter((m) => m.type === "ADJUSTMENT");
    const sumQty = (rows: StockMovement[]) =>
      rows.reduce((s, m) => s + Math.abs(m.quantity), 0);
    return {
      total: scoped.length,
      inCount: ins.length,
      outCount: outs.length,
      adjCount: adjs.length,
      inQty: sumQty(ins),
      outQty: sumQty(outs),
      adjQty: adjs.reduce((s, m) => s + m.quantity, 0),
    };
  }, [items, periodFilter]);

  const filterFn = useCallback(
    (item: StockMovement, query: string) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (productFilter && item.productId !== productFilter) return false;
      if (!inPeriod(item.createdAt, periodFilter)) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.productName.toLowerCase().includes(q) ||
        (item.reference?.toLowerCase().includes(q) ?? false) ||
        (item.notes?.toLowerCase().includes(q) ?? false) ||
        item.createdByName.toLowerCase().includes(q)
      );
    },
    [typeFilter, productFilter, periodFilter],
  );

  const list = useEntityList(items, filterFn);

  const openCreate = useCallback(
    (opts?: { productId?: string; type?: MovementType }) => {
      setForm({
        productId: opts?.productId ?? products[0]?.id ?? "",
        type: opts?.type ?? "ADJUSTMENT",
        quantity: "1",
        reference: "",
        notes: "",
      });
      setError(null);
      setFormOpen(true);
    },
    [products],
  );

  useEffect(() => {
    const nouveau = searchParams.get("nouveau") === "1";
    const typeFromUrl = searchParams.get("type") as MovementType | null;
    const productFromUrl = searchParams.get("productId");
    const idFromUrl = searchParams.get("id");
    const filterFromUrl = searchParams.get("filter") as MovementType | "all" | null;

    let touched = false;

    if (filterFromUrl && (filterFromUrl === "all" || typeLabels[filterFromUrl])) {
      setTypeFilter(filterFromUrl === "all" ? "all" : filterFromUrl);
      touched = true;
    }

    if (productFromUrl) {
      setProductFilter(productFromUrl);
      touched = true;
    }

    if (idFromUrl) {
      const movement = getMovement(idFromUrl);
      if (movement) setDetail(movement);
      touched = true;
    }

    if (nouveau) {
      openCreate({
        productId: productFromUrl ?? undefined,
        type:
          typeFromUrl && typeLabels[typeFromUrl] ? typeFromUrl : "ADJUSTMENT",
      });
      touched = true;
    }

    if (touched) {
      router.replace("/mouvements", { scroll: false });
    }
    // Intentionnel : ne reagir qu'a l'URL d'entree
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSave = () => {
    if (!form.productId) {
      setError("Choisissez un produit");
      return;
    }
    const qty = Number(form.quantity);
    if (!Number.isFinite(qty) || qty === 0) {
      setError("Quantite invalide");
      return;
    }
    if (form.type === "ADJUSTMENT" && !form.notes.trim()) {
      setError("Une note est obligatoire pour un ajustement");
      return;
    }

    const result = createMovement({
      productId: form.productId,
      type: form.type,
      quantity: form.type === "ADJUSTMENT" ? qty : Math.abs(qty),
      reference: form.reference,
      notes: form.notes,
    });
    if (!result.ok) {
      setError(result.error);
      showToast(result.error, "error");
      return;
    }

    setFormOpen(false);
    bump();
    dispatchBcfEvent(BCF_EVENTS.STOCK_CHANGED, {
      productId: form.productId,
      source: "movement",
      movementId: result.data.id,
    });
    showToast(
      `${typeLabels[result.data.type]} enregistre — stock mis a jour`,
      "success",
    );
  };

  const setTypeFromCard = (value: MovementType | "all") => {
    setTypeFilter((prev) => (prev === value ? "all" : value));
  };

  const columns: DataColumn<StockMovement>[] = [
    {
      key: "date",
      header: "Date",
      cell: (row) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatWhen(row.createdAt)}
        </span>
      ),
    },
    {
      key: "product",
      header: "Produit",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.productName}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {row.createdByName}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <Badge
          variant={
            row.type === "IN"
              ? "success"
              : row.type === "OUT"
                ? "danger"
                : "warning"
          }
        >
          {typeLabels[row.type]}
        </Badge>
      ),
    },
    {
      key: "qty",
      header: "Qte",
      cell: (row) => (
        <span
          className={cn(
            "tabular-nums font-medium",
            row.type === "IN" || (row.type === "ADJUSTMENT" && row.quantity > 0)
              ? "text-success"
              : row.type === "OUT" ||
                  (row.type === "ADJUSTMENT" && row.quantity < 0)
                ? "text-destructive"
                : undefined,
          )}
        >
          {row.type === "ADJUSTMENT" && row.quantity > 0 ? "+" : ""}
          {row.quantity}
        </span>
      ),
    },
    {
      key: "ref",
      header: "Reference",
      hideOnMobile: true,
      cell: (row) => (
        <span className="line-clamp-2 text-xs text-muted-foreground">
          {row.reference || row.notes || "—"}
        </span>
      ),
    },
    {
      key: "price",
      header: "Prix unit.",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {row.unitPrice != null ? formatCurrency(row.unitPrice) : "—"}
        </span>
      ),
    },
  ];

  const periodLabel =
    periodFilter === "today"
      ? "Aujourd'hui"
      : periodFilter === "7d"
        ? "7 jours"
        : periodFilter === "30d"
          ? "30 jours"
          : "Toute periode";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mouvements de stock"
        description="Entrees, sorties et ajustements — impact immediat sur le stock."
        actions={
          <Button variant="success" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            Nouvel ajustement
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Mouvements"
          value={stats.total}
          subtitle={periodLabel}
          active={typeFilter === "all"}
          onClick={() => setTypeFromCard("all")}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title="Entrees"
          value={stats.inCount}
          subtitle={`${stats.inQty} unites`}
          variant="success"
          active={typeFilter === "IN"}
          onClick={() => setTypeFromCard("IN")}
          icon={<ArrowDownLeft className="h-5 w-5" />}
        />
        <StatCard
          title="Sorties"
          value={stats.outCount}
          subtitle={`${stats.outQty} unites`}
          variant="danger"
          active={typeFilter === "OUT"}
          onClick={() => setTypeFromCard("OUT")}
          icon={<ArrowUpRight className="h-5 w-5" />}
        />
        <StatCard
          title="Ajustements"
          value={stats.adjCount}
          subtitle={
            stats.adjQty === 0
              ? "Solde 0"
              : `Solde ${stats.adjQty > 0 ? "+" : ""}${stats.adjQty}`
          }
          variant="warning"
          active={typeFilter === "ADJUSTMENT"}
          onClick={() => setTypeFromCard("ADJUSTMENT")}
          icon={<SlidersHorizontal className="h-5 w-5" />}
        />
      </div>

      <CrudToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Produit, reference, notes, auteur…"
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
            {(["all", "IN", "OUT", "ADJUSTMENT"] as const).map((value) => (
              <Chip
                key={value}
                active={typeFilter === value}
                onClick={() => setTypeFilter(value)}
                className="px-2.5 py-1 text-xs"
              >
                {value === "all" ? "Tous" : typeLabels[value]}
              </Chip>
            ))}
            {productFilter ? (
              <Chip
                active
                onClick={() => setProductFilter("")}
                className="px-2.5 py-1 text-xs"
              >
                Produit filtre ×
              </Chip>
            ) : null}
          </>
        }
      />

      <DataTable
        rows={list.filtered}
        columns={columns}
        rowKey={(row) => row.id}
        emptyTitle="Aucun mouvement"
        emptyDescription="Les entrees d'achat, ventes et ajustements apparaitront ici."
        onRowClick={setDetail}
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Nouveau mouvement"
        description="Met a jour le stock du produit selectionne."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Annuler
            </Button>
            <Button variant="success" onClick={handleSave}>
              Enregistrer
            </Button>
          </div>
        }
      >
        <div className="space-y-1.5">
          <Label>Produit</Label>
          <ProductSearchSelect
            products={products}
            value={form.productId}
            onChange={(productId) =>
              setForm((p) => ({ ...p, productId }))
            }
          />
          {selectedProduct ? (
            <p className="text-xs text-muted-foreground">
              Stock actuel :{" "}
              <span className="font-medium tabular-nums text-foreground">
                {selectedProduct.quantity}
              </span>{" "}
              · seuil {selectedProduct.minStock}
            </p>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  type: e.target.value as MovementType,
                }))
              }
              className="flex h-11 w-full rounded-xl border border-border bg-input px-4 text-sm"
            >
              <option value="IN">Entree (+)</option>
              <option value="OUT">Sortie (−)</option>
              <option value="ADJUSTMENT">Ajustement (+/−)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>
              Quantite
              {form.type === "ADJUSTMENT" ? " (signee)" : ""}
            </Label>
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) =>
                setForm((p) => ({ ...p, quantity: e.target.value }))
              }
              placeholder={form.type === "ADJUSTMENT" ? "Ex. -3 ou 5" : "1"}
            />
          </div>
        </div>
        {selectedProduct && form.type !== "ADJUSTMENT" ? (
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
            Apres enregistrement : stock →{" "}
            <span className="font-medium tabular-nums text-foreground">
              {form.type === "IN"
                ? selectedProduct.quantity + Math.abs(Number(form.quantity) || 0)
                : selectedProduct.quantity - Math.abs(Number(form.quantity) || 0)}
            </span>
          </p>
        ) : null}
        {selectedProduct && form.type === "ADJUSTMENT" ? (
          <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
            Apres enregistrement : stock →{" "}
            <span className="font-medium tabular-nums text-foreground">
              {selectedProduct.quantity + (Number(form.quantity) || 0)}
            </span>
          </p>
        ) : null}
        <div className="space-y-1.5">
          <Label>Reference</Label>
          <Input
            value={form.reference}
            onChange={(e) =>
              setForm((p) => ({ ...p, reference: e.target.value }))
            }
            placeholder="Optionnel (bon, inventaire…)"
          />
        </div>
        <div className="space-y-1.5">
          <Label>
            Notes{form.type === "ADJUSTMENT" ? " (obligatoire)" : ""}
          </Label>
          <Input
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder={
              form.type === "ADJUSTMENT"
                ? "Motif de l'ajustement"
                : "Optionnel"
            }
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </FormDialog>

      <FormDialog
        open={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
        title={detail ? typeLabels[detail.type] : "Mouvement"}
        description={detail?.productName}
        className="max-w-md"
        footer={
          detail ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Link
                href={`/produits?id=${encodeURIComponent(detail.productId)}`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Voir le produit
              </Link>
              <Button
                variant="success"
                onClick={() => {
                  const productId = detail.productId;
                  setDetail(null);
                  openCreate({ productId, type: detail.type });
                }}
              >
                <Plus className="h-4 w-4" />
                Nouveau pour ce produit
              </Button>
            </div>
          ) : undefined
        }
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  detail.type === "IN"
                    ? "success"
                    : detail.type === "OUT"
                      ? "danger"
                      : "warning"
                }
              >
                {typeLabels[detail.type]}
              </Badge>
              <span
                className={cn(
                  "text-lg font-semibold tabular-nums",
                  detail.quantity > 0 ? "text-success" : "text-destructive",
                )}
              >
                {detail.quantity > 0 && detail.type === "ADJUSTMENT" ? "+" : ""}
                {detail.quantity}
              </span>
            </div>
            <dl className="grid gap-2 rounded-xl bg-surface-2 p-3">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Date</dt>
                <dd className="tabular-nums">{formatWhen(detail.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Par</dt>
                <dd>{detail.createdByName}</dd>
              </div>
              {detail.reference ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Reference</dt>
                  <dd className="text-right">{detail.reference}</dd>
                </div>
              ) : null}
              {detail.unitPrice != null ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Prix unit.</dt>
                  <dd className="tabular-nums">
                    {formatCurrency(detail.unitPrice)}
                  </dd>
                </div>
              ) : null}
              {detail.notes ? (
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd>{detail.notes}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}
      </FormDialog>

      <ToastViewport toast={toast} />
    </div>
  );
}
