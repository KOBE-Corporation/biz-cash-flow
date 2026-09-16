"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Mail, MessageCircle, Printer } from "lucide-react";
import { InsightsHighlights } from "@/components/shared/insights-highlights";
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
import { useBcfRefresh } from "@/hooks/use-bcf-refresh";
import { useEntityList } from "@/hooks/use-entity-list";
import { siteConfig } from "@/lib/constants/site";
import { dispatchBcfEvent, BCF_EVENTS } from "@/lib/events/bcf-events";
import { paymentMethodLabels } from "@/lib/sales/cart";
import {
  buildInvoiceSharePayload,
  cancelInvoice,
  countInvoicesByStatus,
  createCreditNote,
  getInvoiceBalance,
  isInvoiceOpen,
  listCreditNotes,
  listInvoiceIssuers,
  listInvoices,
  markInvoiceReminder,
  recordInvoicePayment,
  statusLabel,
  updateInvoiceNotes,
} from "@/lib/repositories/invoices";
import {
  getPeriodInsights,
  getTodayFlagshipProductIds,
} from "@/lib/repositories/insights";
import type { Invoice, InvoiceStatus, PaymentMethod } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type StatusFilter =
  | InvoiceStatus
  | "all"
  | "today"
  | "unpaid";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
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

function toInputDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function InvoicesWorkspace() {
  const { dialog } = useConfirmDialog();
  const { toast, showToast } = useToast();
  const { version, bump } = useBcfRefresh();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [issuerFilter, setIssuerFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [notes, setNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CASH");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [creditOpen, setCreditOpen] = useState(false);

  const items = useMemo(() => {
    void version;
    return listInvoices();
  }, [version]);

  const stats = useMemo(() => {
    void version;
    return countInvoicesByStatus();
  }, [version]);

  const issuers = useMemo(() => {
    void version;
    return listInvoiceIssuers();
  }, [version]);

  const creditNotes = useMemo(() => {
    void version;
    if (!selected) return [];
    return listCreditNotes(selected.id);
  }, [version, selected]);

  const flagshipIds = useMemo(() => {
    void version;
    return new Set(getTodayFlagshipProductIds(3));
  }, [version]);

  const dayInsights = useMemo(() => {
    void version;
    return getPeriodInsights("day", new Date(), {
      top: 5,
      bottom: 3,
      sellers: 3,
    });
  }, [version]);

  const todayPaid = useMemo(() => {
    const today = new Date();
    return items
      .filter((i) => i.status === "PAID" && isSameDay(new Date(i.issuedAt), today))
      .reduce((sum, i) => sum + i.totalAmount, 0);
  }, [items]);

  const filterFn = useCallback(
    (item: Invoice, query: string) => {
      if (statusFilter === "today") {
        if (!isSameDay(new Date(item.issuedAt), new Date())) return false;
      } else if (statusFilter === "unpaid") {
        if (!isInvoiceOpen(item)) return false;
      } else if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (issuerFilter !== "all" && item.issuedById !== issuerFilter) {
        return false;
      }

      if (dateFrom) {
        const from = startOfDay(new Date(dateFrom));
        if (new Date(item.issuedAt) < from) return false;
      }
      if (dateTo) {
        const to = endOfDay(new Date(dateTo));
        if (new Date(item.issuedAt) > to) return false;
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
    [statusFilter, issuerFilter, dateFrom, dateTo],
  );

  const list = useEntityList(items, filterFn);

  const toggleStatusFilter = (value: StatusFilter) => {
    setStatusFilter((prev) => (prev === value ? "all" : value));
  };

  const setTodayPeriod = () => {
    const today = toInputDate(new Date());
    setDateFrom(today);
    setDateTo(today);
    setStatusFilter("today");
  };

  const clearPeriod = () => {
    setDateFrom("");
    setDateTo("");
    if (statusFilter === "today") setStatusFilter("all");
  };

  const openDetail = (invoice: Invoice) => {
    setSelected(invoice);
    setNotes(invoice.notes ?? "");
    setCancelReason("");
    setCancelOpen(false);
    setCreditOpen(false);
    setCreditAmount("");
    setCreditReason("");
    const balance = getInvoiceBalance(invoice);
    setPayAmount(balance > 0 ? String(balance) : "");
    setPayMethod("CASH");
  };

  const saveNotes = () => {
    if (!selected) return;
    const result = updateInvoiceNotes(selected.id, notes);
    if (result.ok) {
      setSelected(result.data);
      bump();
      showToast("Notes enregistrees", "success");
    } else {
      showToast(result.error, "error");
    }
  };

  const handleCancel = () => {
    if (!selected || selected.status === "CANCELLED") return;
    const reason = cancelReason.trim();
    if (reason.length < 3) {
      showToast("Motif d'annulation obligatoire (3 car. min.)", "error");
      return;
    }
    const result = cancelInvoice(selected.id, reason);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setSelected(result.data);
    setCancelOpen(false);
    bump();
    showToast(
      `Facture ${result.data.number} annulee — caisse + stock mis a jour`,
      "success",
    );
    dispatchBcfEvent(BCF_EVENTS.INVOICE_CANCELLED, {
      invoiceNumber: result.data.number,
    });
    dispatchBcfEvent(BCF_EVENTS.STOCK_CHANGED, {
      invoiceNumber: result.data.number,
    });
  };

  const handlePayment = () => {
    if (!selected) return;
    const amount = Math.round(Number(payAmount) || 0);
    const result = recordInvoicePayment(selected.id, amount, payMethod);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setSelected(result.data);
    bump();
    setPayAmount(
      getInvoiceBalance(result.data) > 0
        ? String(getInvoiceBalance(result.data))
        : "",
    );
    showToast(
      `Encaissement ${formatCurrency(amount)} — ${statusLabel(result.data.status)}`,
      "success",
    );
    dispatchBcfEvent(BCF_EVENTS.INVOICE_PAID, {
      invoiceNumber: result.data.number,
    });
  };

  const handleReminder = () => {
    if (!selected) return;
    const result = markInvoiceReminder(selected.id);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setSelected(result.data.invoice);
    bump();
    window.open(result.data.whatsappUrl, "_blank", "noopener,noreferrer");
    showToast("Relance WhatsApp ouverte", "success");
  };

  const handleShare = (channel: "whatsapp" | "email" | "print") => {
    if (!selected) return;
    if (channel === "print") {
      window.print();
      return;
    }
    const share = buildInvoiceSharePayload(selected);
    if (channel === "whatsapp") {
      window.open(share.whatsappUrl, "_blank", "noopener,noreferrer");
      return;
    }
    window.open(share.mailtoUrl, "_blank", "noopener,noreferrer");
  };

  const handleCreditNote = () => {
    if (!selected) return;
    const amount = Math.round(Number(creditAmount) || 0);
    const result = createCreditNote({
      invoiceId: selected.id,
      amount,
      reason: creditReason,
    });
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setSelected(result.data.invoice);
    setCreditOpen(false);
    setCreditAmount("");
    setCreditReason("");
    bump();
    showToast(
      `Avoir ${result.data.creditNote.number} — ${formatCurrency(amount)}`,
      "success",
    );
    dispatchBcfEvent(BCF_EVENTS.CREDIT_NOTE, {
      invoiceNumber: selected.number,
    });
    dispatchBcfEvent(BCF_EVENTS.STOCK_CHANGED, {
      invoiceNumber: selected.number,
    });
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
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate">{row.customerName}</p>
          {isInvoiceOpen(row) ? (
            <p className="text-[10px] text-warning">
              Du {formatCurrency(getInvoiceBalance(row))}
            </p>
          ) : null}
        </div>
      ),
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
                : row.status === "PARTIALLY_PAID" || row.status === "SENT"
                  ? "warning"
                  : "outline"
          }
        >
          {statusLabel(row.status)}
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

  const balance = selected ? getInvoiceBalance(selected) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        description="Ventes caisse, credits clients, avoirs, relances et annulations tracees."
        actions={
          <Link
            href="/sales"
            className={cn(buttonVariants({ variant: "success" }))}
          >
            Nouvelle vente
          </Link>
        }
      />

      <InsightsHighlights
        insights={dayInsights}
        title="Highlights du jour"
        compact
        showStock={false}
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
          title="Impayees"
          value={stats.unpaid}
          subtitle={`${formatCurrency(stats.unpaidTotal)} — a relancer`}
          variant="warning"
          active={statusFilter === "unpaid"}
          onClick={() => toggleStatusFilter("unpaid")}
        />
        <StatCard
          title="Annulees"
          value={stats.cancelled}
          subtitle={`${formatCurrency(stats.cancelledTotal)} — cliquer`}
          variant="danger"
          active={statusFilter === "CANCELLED"}
          onClick={() => toggleStatusFilter("CANCELLED")}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="CA du jour"
          value={formatCurrency(todayPaid)}
          subtitle="Ventes payees aujourd'hui"
          variant="success"
          active={statusFilter === "today"}
          onClick={() => setTodayPeriod()}
        />
      </div>

      <CrudToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="N°, client, caissier ou paiement…"
        filters={
          <div className="flex w-full flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  "all",
                  "today",
                  "unpaid",
                  "PAID",
                  "PARTIALLY_PAID",
                  "SENT",
                  "CANCELLED",
                ] as const
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
                      : value === "unpaid"
                        ? "Impayees"
                        : statusLabel(value)}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Du</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 w-[140px] text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Au</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 w-[140px] text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  Caissier
                </Label>
                <select
                  value={issuerFilter}
                  onChange={(e) => setIssuerFilter(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="all">Tous</option>
                  {issuers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              {(dateFrom || dateTo || issuerFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    clearPeriod();
                    setIssuerFilter("all");
                  }}
                >
                  Reset filtres
                </Button>
              )}
            </div>
          </div>
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
            ? `${selected.number} · ${statusLabel(selected.status)}`
            : undefined
        }
        className="max-w-lg print:max-w-none"
        footer={
          selected ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end print:hidden">
              <Button variant="outline" onClick={() => handleShare("print")}>
                <Printer className="h-4 w-4" />
                Imprimer / PDF
              </Button>
              <Button variant="outline" onClick={() => handleShare("whatsapp")}>
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button variant="outline" onClick={() => handleShare("email")}>
                <Mail className="h-4 w-4" />
                Email
              </Button>
              {selected.status !== "CANCELLED" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setCancelOpen(true);
                    setCreditOpen(false);
                  }}
                >
                  Annuler
                </Button>
              ) : null}
              {selected.status !== "CANCELLED" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreditOpen(true);
                    setCancelOpen(false);
                    setCreditAmount(
                      String(
                        Math.max(
                          0,
                          selected.totalAmount - (selected.creditedAmount ?? 0),
                        ),
                      ),
                    );
                  }}
                >
                  Avoir
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
          <div className="max-h-[min(60vh,520px)] space-y-3 overflow-y-auto rounded-xl border border-border bg-background p-4 text-[12px] print:max-h-none print:overflow-visible">
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
                {statusLabel(selected.status)}
              </Badge>
            </div>
            <Separator />
            <div className="space-y-1 font-sans">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium">{selected.customerName}</span>
              </div>
              {selected.customerPhone ? (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Tel.</span>
                  <span>{selected.customerPhone}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Emis par</span>
                <span>{selected.issuedByName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Paiement</span>
                <span>{paymentMethodLabels[selected.paymentMethod]}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Paye</span>
                <span className="tabular-nums">
                  {formatCurrency(selected.amountPaid ?? 0)}
                </span>
              </div>
              {(selected.creditedAmount ?? 0) > 0 ? (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Avoirs</span>
                  <span className="tabular-nums">
                    −{formatCurrency(selected.creditedAmount)}
                  </span>
                </div>
              ) : null}
              {balance > 0 ? (
                <div className="flex justify-between gap-2 font-semibold text-warning">
                  <span>Reste du</span>
                  <span className="tabular-nums">
                    {formatCurrency(balance)}
                  </span>
                </div>
              ) : null}
              {selected.lastReminderAt ? (
                <div className="flex justify-between gap-2 text-muted-foreground">
                  <span>Derniere relance</span>
                  <span>{formatIssuedAt(selected.lastReminderAt)}</span>
                </div>
              ) : null}
              {selected.status === "CANCELLED" ? (
                <div className="space-y-0.5 text-destructive">
                  <div className="flex justify-between gap-2">
                    <span>Annulee par</span>
                    <span>
                      {selected.cancelledByName}
                      {selected.cancelledAt
                        ? ` · ${formatIssuedAt(selected.cancelledAt)}`
                        : ""}
                    </span>
                  </div>
                  {selected.cancelReason ? (
                    <p className="text-[11px]">Motif : {selected.cancelReason}</p>
                  ) : null}
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
                      {item.productId && flagshipIds.has(item.productId) ? (
                        <Badge variant="success" className="ml-1.5 align-middle">
                          Phare
                        </Badge>
                      ) : null}
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
              <div className="flex justify-between text-sm font-bold">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatCurrency(selected.totalAmount)}
                </span>
              </div>
            </div>

            {creditNotes.length > 0 ? (
              <div className="space-y-1.5 rounded-lg border border-border p-2 print:hidden">
                <p className="text-[11px] font-medium">Avoirs</p>
                {creditNotes.map((cn) => (
                  <div
                    key={cn.id}
                    className="flex justify-between gap-2 text-[11px] text-muted-foreground"
                  >
                    <span>
                      {cn.number} — {cn.reason}
                    </span>
                    <span className="tabular-nums">
                      −{formatCurrency(cn.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {balance > 0 && selected.status !== "CANCELLED" ? (
              <div className="space-y-2 rounded-lg border border-warning/30 bg-warning/5 p-3 print:hidden">
                <p className="text-[11px] font-medium">Encaisser le solde</p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="h-8 w-28 text-xs"
                  />
                  <select
                    value={payMethod}
                    onChange={(e) =>
                      setPayMethod(e.target.value as PaymentMethod)
                    }
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="CASH">Especes</option>
                    <option value="MOBILE_MONEY">OM / MoMo</option>
                  </select>
                  <Button size="sm" className="h-8" onClick={handlePayment}>
                    Encaisser
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={handleReminder}
                  >
                    Relancer
                  </Button>
                </div>
              </div>
            ) : null}

            {cancelOpen ? (
              <div className="space-y-2 rounded-lg border border-destructive/30 p-3 print:hidden">
                <p className="text-[11px] font-medium text-destructive">
                  Motif d&apos;annulation (obligatoire)
                </p>
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="ex. Erreur caisse, client refuse…"
                  className="h-8 text-xs"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8"
                    onClick={handleCancel}
                  >
                    Confirmer l&apos;annulation
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => setCancelOpen(false)}
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            ) : null}

            {creditOpen ? (
              <div className="space-y-2 rounded-lg border border-border p-3 print:hidden">
                <p className="text-[11px] font-medium">
                  Note de credit / avoir (remboursement partiel)
                </p>
                <Input
                  type="number"
                  min={0}
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="Montant"
                  className="h-8 text-xs"
                />
                <Input
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="Motif (obligatoire)"
                  className="h-8 text-xs"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-8" onClick={handleCreditNote}>
                    Creer l&apos;avoir
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => setCreditOpen(false)}
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5 pt-2 font-sans print:hidden">
              <Label htmlFor="inv-notes">Notes</Label>
              <Input
                id="inv-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Remarque…"
              />
            </div>
            <p className="text-[11px] text-muted-foreground print:hidden">
              Voir aussi{" "}
              <Link href="/comptabilite" className="text-primary hover:underline">
                Comptabilite
              </Link>{" "}
              pour le journal de caisse.
            </p>
          </div>
        ) : null}
      </FormDialog>

      {dialog}
      <ToastViewport toast={toast} />
    </div>
  );
}
