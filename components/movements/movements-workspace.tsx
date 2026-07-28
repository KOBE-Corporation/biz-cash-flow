"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { DataTable, type DataColumn } from "@/components/crud/data-table";
import { FormDialog } from "@/components/crud/form-dialog";
import { CrudToolbar } from "@/components/crud/toolbar";
import { Badge, Chip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { useEntityList } from "@/hooks/use-entity-list";
import { createMovement, listMovements } from "@/lib/repositories/movements";
import { listProducts } from "@/lib/repositories/products";
import type { MovementType, StockMovement } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const typeLabels: Record<MovementType, string> = {
  IN: "Entree",
  OUT: "Sortie",
  ADJUSTMENT: "Ajustement",
};

export function MovementsWorkspace() {
  const [version, setVersion] = useState(0);
  const [typeFilter, setTypeFilter] = useState<MovementType | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    productId: "",
    type: "IN" as MovementType,
    quantity: "1",
    reference: "",
    notes: "",
  });

  const products = useMemo(() => listProducts().filter((p) => p.isActive), [version]);
  const items = useMemo(() => {
    void version;
    return listMovements();
  }, [version]);

  const filterFn = useCallback(
    (item: StockMovement, query: string) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.productName.toLowerCase().includes(q) ||
        (item.reference?.toLowerCase().includes(q) ?? false)
      );
    },
    [typeFilter],
  );

  const list = useEntityList(items, filterFn);

  const openCreate = () => {
    setForm({
      productId: products[0]?.id ?? "",
      type: "IN",
      quantity: "1",
      reference: "",
      notes: "",
    });
    setError(null);
    setFormOpen(true);
  };

  const handleSave = () => {
    const qty = Number(form.quantity);
    const result = createMovement({
      productId: form.productId,
      type: form.type,
      quantity: form.type === "ADJUSTMENT" ? qty : Math.abs(qty),
      reference: form.reference,
      notes: form.notes,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFormOpen(false);
    setVersion((v) => v + 1);
  };

  const columns: DataColumn<StockMovement>[] = [
    {
      key: "date",
      header: "Date",
      cell: (row) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {row.createdAt.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "product",
      header: "Produit",
      cell: (row) => <span className="font-medium">{row.productName}</span>,
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
        <span className="tabular-nums">
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
        <span className="text-xs text-muted-foreground">
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mouvements de stock"
        description="Historique des entrees, sorties et ajustements."
        actions={
          <Button variant="success" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvel ajustement
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Mouvements" value={items.length} />
        <StatCard
          title="Entrees"
          value={items.filter((m) => m.type === "IN").length}
          variant="success"
        />
        <StatCard
          title="Sorties"
          value={items.filter((m) => m.type === "OUT").length}
          variant="danger"
        />
      </div>

      <CrudToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Produit ou reference…"
        filters={
          <>
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
          </>
        }
      />

      <DataTable
        rows={list.filtered}
        columns={columns}
        rowKey={(row) => row.id}
        emptyTitle="Aucun mouvement"
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
          <select
            value={form.productId}
            onChange={(e) => setForm((p) => ({ ...p, productId: e.target.value }))}
            className="flex h-11 w-full rounded-xl border border-border bg-input px-4 text-sm"
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} (stock {product.quantity})
              </option>
            ))}
          </select>
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
              <option value="IN">Entree</option>
              <option value="OUT">Sortie</option>
              <option value="ADJUSTMENT">Ajustement (+/-)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Quantite</Label>
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Reference</Label>
          <Input
            value={form.reference}
            onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
            placeholder="Optionnel"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Input
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Optionnel"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </FormDialog>
    </div>
  );
}
