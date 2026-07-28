"use client";

import { useCallback, useMemo, useState } from "react";
import { DataTable, type DataColumn } from "@/components/crud/data-table";
import { FormDialog } from "@/components/crud/form-dialog";
import { CrudToolbar } from "@/components/crud/toolbar";
import { Badge, Chip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import { useConfirmDialog } from "@/components/ui/use-confirm-dialog";
import { useEntityList } from "@/hooks/use-entity-list";
import { siteConfig } from "@/lib/constants/site";
import { paymentMethodLabels } from "@/lib/sales/cart";
import {
  listInvoices,
  setInvoiceStatus,
  updateInvoiceNotes,
} from "@/lib/repositories/invoices";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyee",
  PAID: "Payee",
  CANCELLED: "Annulee",
};

export function InvoicesWorkspace() {
  const { confirm, dialog } = useConfirmDialog();
  const [version, setVersion] = useState(0);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [notes, setNotes] = useState("");

  const items = useMemo(() => {
    void version;
    return listInvoices();
  }, [version]);

  const filterFn = useCallback(
    (item: Invoice, query: string) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.number.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.issuedByName.toLowerCase().includes(q)
      );
    },
    [statusFilter],
  );

  const list = useEntityList(items, filterFn);

  const openDetail = (invoice: Invoice) => {
    setSelected(invoice);
    setNotes(invoice.notes ?? "");
  };

  const saveNotes = () => {
    if (!selected) return;
    const result = updateInvoiceNotes(selected.id, notes);
    if (result.ok) {
      setSelected(result.data);
      setVersion((v) => v + 1);
    }
  };

  const cancelInvoice = async () => {
    if (!selected || selected.status === "CANCELLED") return;
    const ok = await confirm({
      title: "Annuler cette facture ?",
      description: `${selected.number} — ${formatCurrency(selected.totalAmount)}`,
      confirmLabel: "Annuler la facture",
      variant: "destructive",
    });
    if (!ok) return;
    const result = setInvoiceStatus(selected.id, "CANCELLED");
    if (result.ok) {
      setSelected(result.data);
      setVersion((v) => v + 1);
    }
  };

  const markPaid = async () => {
    if (!selected || selected.status === "PAID") return;
    const result = setInvoiceStatus(selected.id, "PAID");
    if (result.ok) {
      setSelected(result.data);
      setVersion((v) => v + 1);
    }
  };

  const columns: DataColumn<Invoice>[] = [
    {
      key: "number",
      header: "N°",
      cell: (row) => (
        <span className="font-medium tabular-nums">{row.number}</span>
      ),
    },
    {
      key: "client",
      header: "Client",
      cell: (row) => row.customerName,
    },
    {
      key: "issuer",
      header: "Emis par",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{row.issuedByName}</span>
      ),
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
            row.status === "PAID"
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
      key: "date",
      header: "Date",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {row.issuedAt.toLocaleDateString(siteConfig.locale)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        description="Consultez les ventes emises depuis la caisse. La creation se fait dans Vente."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Factures" value={items.length} />
        <StatCard
          title="Payees"
          value={items.filter((i) => i.status === "PAID").length}
          variant="success"
        />
        <StatCard
          title="Annulees"
          value={items.filter((i) => i.status === "CANCELLED").length}
          variant="danger"
        />
      </div>

      <CrudToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="N°, client ou caissier…"
        filters={
          <>
            {(["all", "PAID", "SENT", "DRAFT", "CANCELLED"] as const).map(
              (value) => (
                <Chip
                  key={value}
                  active={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                  className="px-2.5 py-1 text-xs"
                >
                  {value === "all" ? "Toutes" : statusLabels[value]}
                </Chip>
              ),
            )}
          </>
        }
      />

      <DataTable
        rows={list.filtered}
        columns={columns}
        rowKey={(row) => row.id}
        emptyTitle="Aucune facture"
        emptyDescription="Les ventes validees dans la caisse apparaitront ici."
        onRowClick={openDetail}
      />

      <FormDialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title="Aperçu facture"
        description={
          selected
            ? `${selected.number} · ${statusLabels[selected.status]}`
            : undefined
        }
        className="max-w-lg"
        footer={
          selected ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {selected.status !== "CANCELLED" ? (
                <Button variant="outline" onClick={() => void cancelInvoice()}>
                  Annuler la facture
                </Button>
              ) : null}
              {selected.status !== "PAID" && selected.status !== "CANCELLED" ? (
                <Button
                  className="bg-success text-success-foreground hover:bg-success/90"
                  onClick={() => void markPaid()}
                >
                  Marquer payee
                </Button>
              ) : null}
              <Button onClick={saveNotes}>Sauver notes</Button>
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="max-h-[min(55vh,420px)] space-y-3 overflow-y-auto rounded-xl border border-border bg-background p-4 font-mono text-[12px]">
            <div className="space-y-1 text-center">
              <p className="font-sans text-base font-bold text-primary">
                {siteConfig.name}
              </p>
              <p className="text-muted-foreground">Facture de vente</p>
              <p className="tabular-nums">{selected.number}</p>
              <p className="tabular-nums text-muted-foreground">
                {selected.issuedAt.toLocaleString(siteConfig.locale)}
              </p>
            </div>
            <Separator />
            <div className="space-y-1">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Client</span>
                <span className="font-sans font-medium">{selected.customerName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Emis par</span>
                <span className="font-sans">{selected.issuedByName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Paiement</span>
                <span>{paymentMethodLabels[selected.paymentMethod]}</span>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              {selected.items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_auto_auto] gap-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-sans text-[13px] font-medium">
                      {item.productName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.productSku}
                    </p>
                  </div>
                  <span className="tabular-nums">{item.quantity}</span>
                  <span className="min-w-[5rem] text-right tabular-nums">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="tabular-nums">
                  {formatCurrency(selected.subtotal)}
                </span>
              </div>
              {selected.discountAmount > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remise</span>
                  <span className="tabular-nums">
                    −{formatCurrency(selected.discountAmount)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between font-sans text-sm font-bold">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatCurrency(selected.totalAmount)}
                </span>
              </div>
            </div>
            <div className="space-y-1.5 pt-2 font-sans">
              <Label htmlFor="inv-notes">Notes</Label>
              <Input
                id="inv-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </FormDialog>

      {dialog}
    </div>
  );
}
