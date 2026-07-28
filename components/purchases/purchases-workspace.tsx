"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { DataTable, type DataColumn } from "@/components/crud/data-table";
import { FormDialog } from "@/components/crud/form-dialog";
import { CrudToolbar } from "@/components/crud/toolbar";
import { Badge, Chip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { useConfirmDialog } from "@/components/ui/use-confirm-dialog";
import { useEntityList } from "@/hooks/use-entity-list";
import {
  createPurchase,
  listPurchases,
  setPurchaseStatus,
  updatePurchase,
} from "@/lib/repositories/purchases";
import { listProducts } from "@/lib/repositories/products";
import { listSuppliers } from "@/lib/repositories/suppliers";
import type { Purchase, PurchaseStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type LineDraft = {
  key: string;
  productId: string;
  quantity: string;
  unitPrice: string;
};

const statusLabels: Record<PurchaseStatus, string> = {
  PENDING: "En attente",
  RECEIVED: "Recu",
  CANCELLED: "Annule",
};

function newLine(productId = "", unitPrice = "0"): LineDraft {
  return {
    key: Math.random().toString(36).slice(2),
    productId,
    quantity: "1",
    unitPrice,
  };
}

export function PurchasesWorkspace() {
  const { confirm, dialog } = useConfirmDialog();
  const [version, setVersion] = useState(0);
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<Purchase | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);

  const suppliers = useMemo(() => listSuppliers().filter((s) => s.isActive), [version]);
  const products = useMemo(() => listProducts().filter((p) => p.isActive), [version]);
  const items = useMemo(() => {
    void version;
    return listPurchases();
  }, [version]);

  const filterFn = useCallback(
    (item: Purchase, query: string) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.reference.toLowerCase().includes(q) ||
        item.supplierName.toLowerCase().includes(q)
      );
    },
    [statusFilter],
  );

  const list = useEntityList(items, filterFn);

  const openCreate = () => {
    const firstProduct = products[0];
    setEditingId(null);
    setSupplierId(suppliers[0]?.id ?? "");
    setNotes("");
    setLines([
      newLine(firstProduct?.id, String(firstProduct?.purchasePrice ?? 0)),
    ]);
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (purchase: Purchase) => {
    if (purchase.status !== "PENDING") {
      setDetail(purchase);
      return;
    }
    setEditingId(purchase.id);
    setSupplierId(purchase.supplierId);
    setNotes(purchase.notes ?? "");
    setLines(
      purchase.items.map((item) => ({
        key: item.id,
        productId: item.productId,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
      })),
    );
    setError(null);
    setFormOpen(true);
  };

  const handleSave = () => {
    const payload = {
      supplierId,
      notes,
      items: lines.map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity) || 0,
        unitPrice: Number(line.unitPrice) || 0,
      })),
    };
    const result = editingId
      ? updatePurchase(editingId, payload)
      : createPurchase(payload);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFormOpen(false);
    setVersion((v) => v + 1);
  };

  const receive = async (purchase: Purchase) => {
    const ok = await confirm({
      title: "Recevoir cet achat ?",
      description: "Le stock des produits sera augmente.",
      confirmLabel: "Recevoir",
      variant: "default",
    });
    if (!ok) return;
    const result = setPurchaseStatus(purchase.id, "RECEIVED");
    if (!result.ok) {
      await confirm({
        title: "Echec",
        description: result.error,
        confirmLabel: "OK",
        variant: "warning",
      });
      return;
    }
    setDetail(null);
    setVersion((v) => v + 1);
  };

  const cancel = async (purchase: Purchase) => {
    const ok = await confirm({
      title: "Annuler cet achat ?",
      confirmLabel: "Annuler l'achat",
      variant: "destructive",
    });
    if (!ok) return;
    const result = setPurchaseStatus(purchase.id, "CANCELLED");
    if (!result.ok) {
      await confirm({
        title: "Echec",
        description: result.error,
        confirmLabel: "OK",
        variant: "warning",
      });
      return;
    }
    setDetail(null);
    setVersion((v) => v + 1);
  };

  const columns: DataColumn<Purchase>[] = [
    {
      key: "ref",
      header: "Reference",
      cell: (row) => <span className="font-medium tabular-nums">{row.reference}</span>,
    },
    {
      key: "supplier",
      header: "Fournisseur",
      cell: (row) => row.supplierName,
    },
    {
      key: "total",
      header: "Total",
      cell: (row) => (
        <span className="tabular-nums">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      cell: (row) => (
        <Badge
          variant={
            row.status === "RECEIVED"
              ? "success"
              : row.status === "CANCELLED"
                ? "danger"
                : "warning"
          }
        >
          {statusLabels[row.status]}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[1%] text-right",
      cell: (row) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {row.status === "PENDING" ? (
            <Button
              size="sm"
              className="h-8 bg-success text-success-foreground hover:bg-success/90"
              onClick={() => void receive(row)}
            >
              <Check className="h-3.5 w-3.5" />
              Recevoir
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Achats"
        description="Commandes fournisseurs et reception de stock."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvel achat
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Achats" value={items.length} />
        <StatCard
          title="En attente"
          value={items.filter((p) => p.status === "PENDING").length}
          variant="warning"
        />
        <StatCard
          title="Recus"
          value={items.filter((p) => p.status === "RECEIVED").length}
          variant="success"
        />
      </div>

      <CrudToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Reference ou fournisseur…"
        filters={
          <>
            {(["all", "PENDING", "RECEIVED", "CANCELLED"] as const).map((value) => (
              <Chip
                key={value}
                active={statusFilter === value}
                onClick={() => setStatusFilter(value)}
                className="px-2.5 py-1 text-xs"
              >
                {value === "all" ? "Tous" : statusLabels[value]}
              </Chip>
            ))}
          </>
        }
      />

      <DataTable
        rows={list.filtered}
        columns={columns}
        rowKey={(row) => row.id}
        emptyTitle="Aucun achat"
        onRowClick={openEdit}
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingId ? "Modifier l'achat" : "Nouvel achat"}
        className="max-w-2xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>Enregistrer</Button>
          </div>
        }
      >
        <div className="space-y-1.5">
          <Label>Fournisseur</Label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="flex h-11 w-full rounded-xl border border-border bg-input px-4 text-sm"
          >
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Lignes</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  newLine(products[0]?.id, String(products[0]?.purchasePrice ?? 0)),
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Ligne
            </Button>
          </div>
          {lines.map((line, index) => (
            <div key={line.key} className="grid gap-2 rounded-xl bg-surface-2 p-2 sm:grid-cols-[1fr_80px_110px_36px]">
              <select
                value={line.productId}
                onChange={(e) => {
                  const product = products.find((p) => p.id === e.target.value);
                  setLines((prev) =>
                    prev.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            productId: e.target.value,
                            unitPrice: String(product?.purchasePrice ?? 0),
                          }
                        : item,
                    ),
                  );
                }}
                className="h-10 rounded-lg border border-border bg-input px-2 text-xs"
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min={1}
                value={line.quantity}
                className="h-10"
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, quantity: e.target.value } : item,
                    ),
                  )
                }
              />
              <Input
                type="number"
                min={0}
                value={line.unitPrice}
                className="h-10"
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, unitPrice: e.target.value } : item,
                    ),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-9 text-destructive"
                disabled={lines.length <= 1}
                onClick={() =>
                  setLines((prev) => prev.filter((_, i) => i !== index))
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </FormDialog>

      <FormDialog
        open={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
        title={detail ? detail.reference : "Achat"}
        description={detail ? detail.supplierName : undefined}
        className="max-w-lg"
        footer={
          detail?.status === "PENDING" ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => detail && void cancel(detail)}>
                <X className="h-4 w-4" />
                Annuler l'achat
              </Button>
              <Button
                className="bg-success text-success-foreground hover:bg-success/90"
                onClick={() => detail && void receive(detail)}
              >
                <Check className="h-4 w-4" />
                Recevoir
              </Button>
            </div>
          ) : undefined
        }
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <Badge
              variant={
                detail.status === "RECEIVED"
                  ? "success"
                  : detail.status === "CANCELLED"
                    ? "danger"
                    : "warning"
              }
            >
              {statusLabels[detail.status]}
            </Badge>
            <div className="space-y-2">
              {detail.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className="tabular-nums">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="tabular-nums">
                {formatCurrency(detail.totalAmount)}
              </span>
            </div>
          </div>
        ) : null}
      </FormDialog>

      {dialog}
    </div>
  );
}
