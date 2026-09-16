"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import { DataTable, type DataColumn } from "@/components/crud/data-table";
import { FormDialog } from "@/components/crud/form-dialog";
import { CrudToolbar } from "@/components/crud/toolbar";
import { Badge, Chip } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import { ToastViewport, useToast } from "@/components/ui/toast";
import { useConfirmDialog } from "@/components/ui/use-confirm-dialog";
import { useEntityList } from "@/hooks/use-entity-list";
import { siteConfig } from "@/lib/constants/site";
import { paymentMethodLabels } from "@/lib/sales/cart";
import {
  cancelInvoice,
  countInvoicesByStatus,
  listInvoices,
  setInvoiceStatus,
  updateInvoiceNotes,
} from "@/lib/repositories/invoices";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyee",
  PAID: "Payee",
  CANCELLED: "Annulee",
};

type StatusFilter = InvoiceStatus | "all" | "today";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatIssuedAt(date: Date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function InvoicesWorkspace() {
  const { confirm, dialog } = useConfirmDialog();
  const { toast, showToast } = useToast();
  const [version, setVersion] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [notes, setNotes] = useState("");

  const items = useMemo(() => {
    void version;
    return listInvoices();
  }, [version]);

  const stats = useMemo(() => {
    void version;
    return countInvoicesByStatus();
  }, [version]);

  const todayPaid = useMemo(() => {
    const today = new Date();
    return items
      .filter((i) => i.status === "PAID" && isSameDay(new Date(i.issuedAt), today))
      .reduce((sum, i) => sum + i.totalAmount, 0);
  }, [items]);

  useEffect(() => {
    const refresh = () => setVersion((v) => v + 1);
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
  }, []);

  const filterFn = useCallback(
    (item: Invoice, query: string) => {
      if (statusFilter === "today") {
        if (!isSameDay(new Date(item.issuedAt), new Date())) return false;
      } else if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.number.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.issuedByName.toLowerCase().includes(q) ||
        (item.paymentMethod &&
          paymentMethodLabels[item.paymentMethod].toLowerCase().includes(q))
      );
    },
    [statusFilter],
  );

  const list = useEntityList(items, filterFn);

  const toggleStatusFilter = (value: StatusFilter) => {
    setStatusFilter((prev) => (prev === value ? "all" : value));
  };

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
      showToast("Notes enregistrees", "success");
    } else {
      showToast(result.error, "error");
    }
  };

  const handleCancel = async () => {
    if (!selected || selected.status === "CANCELLED") return;
    const ok = await confirm({
      title: `Annuler ${selected.number} ?`,
      description:
        selected.status === "PAID"
          ? `Le montant ${formatCurrency(selected.totalAmount)} sera rembourse en caisse et le stock des articles sera restocke.`
          : `La facture passera au statut Annulee.`,
      confirmLabel: "Confirmer l'annulation",
      variant: "destructive",
    });
    if (!ok) return;

    const result = cancelInvoice(selected.id);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }

    setSelected(result.data);
    setVersion((v) => v + 1);
    showToast(
      `Facture ${result.data.number} annulee — caisse + stock mis a jour`,
      "success",
    );
    window.dispatchEvent(
      new CustomEvent("bcf:invoice-cancelled", {
        detail: { invoiceNumber: result.data.number },
      }),
    );
  };

  const markPaid = async () => {
    if (!selected || selected.status === "PAID" || selected.status === "CANCELLED") {
      return;
    }
    const result = setInvoiceStatus(selected.id, "PAID");
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setSelected(result.data);
    setVersion((v) => v + 1);
    showToast(`Facture ${result.data.number} marquee payee`, "success");
  };

  const handlePrint = () => {
    window.print();
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
      key: "payment",
      header: "Paiement",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {paymentMethodLabels[row.paymentMethod]}
        </span>
      ),
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
        <span
          className={cn(
            "tabular-nums font-medium",
            row.status === "CANCELLED" && "text-muted-foreground line-through",
          )}
        >
          {formatCurrency(row.totalAmount)}
        </span>
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
          {formatIssuedAt(row.issuedAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        description="Suivi des ventes caisse : payees, annulees (remboursement + restock). Creation dans Vente."
        actions={
          <Link
            href="/sales"
            className={cn(buttonVariants({ variant: "success" }))}
          >
            Nouvelle vente
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Factures"
          value={stats.total}
          subtitle="Toutes"
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <StatCard
          title="Payees"
          value={stats.paid}
          subtitle={`${formatCurrency(stats.paidTotal)} — cliquer`}
          variant="success"
          active={statusFilter === "PAID"}
          onClick={() => toggleStatusFilter("PAID")}
        />
        <StatCard
          title="Annulees"
          value={stats.cancelled}
          subtitle={`${formatCurrency(stats.cancelledTotal)} — cliquer`}
          variant="danger"
          active={statusFilter === "CANCELLED"}
          onClick={() => toggleStatusFilter("CANCELLED")}
        />
        <StatCard
          title="CA du jour"
          value={formatCurrency(todayPaid)}
          subtitle="Ventes payees aujourd'hui"
          variant="success"
          active={statusFilter === "today"}
          onClick={() => toggleStatusFilter("today")}
        />
      </div>

      <CrudToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="N°, client, caissier ou paiement…"
        filters={
          <>
            {(
              ["all", "today", "PAID", "SENT", "DRAFT", "CANCELLED"] as const
            ).map((value) => (
              <Chip
                key={value}
                active={statusFilter === value}
                onClick={() => setStatusFilter(value)}
                className="px-2.5 py-1 text-xs"
              >
                {value === "all"
                  ? "Toutes"
                  : value === "today"
                    ? "Aujourd'hui"
                    : statusLabels[value]}
              </Chip>
            ))}
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
        title="Detail facture"
        description={
          selected
            ? `${selected.number} · ${statusLabels[selected.status]}`
            : undefined
        }
        className="max-w-lg print:max-w-none"
        footer={
          selected ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end print:hidden">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
              {selected.status !== "CANCELLED" ? (
                <Button
                  variant="outline"
                  onClick={() => void handleCancel()}
                >
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
              <Button variant="success" onClick={saveNotes}>
                Sauver notes
              </Button>
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="max-h-[min(55vh,480px)] space-y-3 overflow-y-auto rounded-xl border border-border bg-background p-4 text-[12px] print:max-h-none print:overflow-visible">
            <div className="space-y-1 text-center">
              <p className="font-sans text-base font-bold text-primary">
                {siteConfig.name}
              </p>
              <p className="text-muted-foreground">Facture de vente</p>
              <p className="font-mono tabular-nums">{selected.number}</p>
              <p className="tabular-nums text-muted-foreground">
                {formatIssuedAt(selected.issuedAt)}
              </p>
              <Badge
                variant={
                  selected.status === "PAID"
                    ? "success"
                    : selected.status === "CANCELLED"
                      ? "danger"
                      : "warning"
                }
              >
                {statusLabels[selected.status]}
              </Badge>
            </div>
            <Separator />
            <div className="space-y-1 font-sans">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium">{selected.customerName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Emis par</span>
                <span>{selected.issuedByName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Paiement</span>
                <span>{paymentMethodLabels[selected.paymentMethod]}</span>
              </div>
              {selected.status === "CANCELLED" && selected.cancelledByName ? (
                <div className="flex justify-between gap-2 text-destructive">
                  <span>Annulee par</span>
                  <span>
                    {selected.cancelledByName}
                    {selected.cancelledAt
                      ? ` · ${formatIssuedAt(selected.cancelledAt)}`
                      : ""}
                  </span>
                </div>
              ) : null}
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
                      {item.packName ? ` · ${item.packName}` : ""}
                      {item.unitsOfBase
                        ? ` · ${item.unitsOfBase} u.`
                        : ""}
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
            <div className="space-y-1 font-sans">
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
              {selected.amountReceived != null ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recu</span>
                  <span className="tabular-nums">
                    {formatCurrency(selected.amountReceived)}
                  </span>
                </div>
              ) : null}
              {selected.changeDue != null && selected.changeDue > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monnaie</span>
                  <span className="tabular-nums">
                    {formatCurrency(selected.changeDue)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm font-bold">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatCurrency(selected.totalAmount)}
                </span>
              </div>
            </div>
            <div className="space-y-1.5 pt-2 font-sans print:hidden">
              <Label htmlFor="inv-notes">Notes</Label>
              <Input
                id="inv-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Motif d'annulation, remarque…"
              />
            </div>
            <p className="text-[11px] text-muted-foreground print:hidden">
              Voir aussi{" "}
              <Link href="/comptabilite" className="text-primary hover:underline">
                Comptabilite
              </Link>{" "}
              pour le journal de caisse (vente / remboursement).
            </p>
          </div>
        ) : null}
      </FormDialog>

      {dialog}
      <ToastViewport toast={toast} />
    </div>
  );
}
