"use client";

import { useCallback, useEffect, useRef } from "react";
import { Printer } from "lucide-react";
import type { CartLine, PaymentMethod } from "@/lib/types";
import type { DiscountMode } from "@/lib/sales/cart";
import {
  getCartItemCount,
  getCartSubtotal,
  getCartTotal,
  getChangeDue,
  getLineTotal,
  paymentMethodLabels,
  resolveDiscountAmount,
} from "@/lib/sales/cart";
import { siteConfig } from "@/lib/constants/site";
import { getTodayFlagshipProductIds } from "@/lib/repositories/insights";
import { getProduct } from "@/lib/repositories/products";
import { cartLineRealizedGain } from "@/lib/sales/margin";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

type SaleInvoicePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: CartLine[];
  discount: number;
  discountMode: DiscountMode;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  clientName: string;
  issuedByName: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function SaleInvoicePreviewDialog({
  open,
  onOpenChange,
  lines,
  discount,
  discountMode,
  paymentMethod,
  amountReceived,
  clientName,
  issuedByName,
  loading = false,
  onConfirm,
}: SaleInvoicePreviewDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const confirmingRef = useRef(false);

  const now = new Date();
  const dateLabel = now.toLocaleDateString(siteConfig.locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeLabel = now.toLocaleTimeString(siteConfig.locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const invoiceRef = `FV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

  const itemCount = getCartItemCount(lines);
  const subtotal = getCartSubtotal(lines);
  const discountAmount = resolveDiscountAmount(subtotal, discount, discountMode);
  const total = getCartTotal(lines, discount, discountMode);
  const flagshipIds = new Set(getTodayFlagshipProductIds(3));
  const marginSummary = lines.reduce(
    (acc, line) => {
      const product = getProduct(line.productId);
      const row = cartLineRealizedGain(line, product?.purchasePrice ?? 0);
      acc.cost += row.cost;
      acc.gain += row.gain;
      if (row.belowCost) acc.belowCost += 1;
      return acc;
    },
    { cost: 0, gain: 0, belowCost: 0 },
  );
  // Appliquer le ratio apres remise sur le gain
  const paidRatio = subtotal > 0 ? total / subtotal : 1;
  const realizedGain = Math.round(marginSummary.gain * paidRatio);
  const realizedCost = Math.round(marginSummary.cost * paidRatio);
  const realizedMarginPct =
    total > 0 ? Math.round((realizedGain / total) * 1000) / 10 : 0;
  const isCash = paymentMethod === "CASH";
  const isCredit = paymentMethod === "CREDIT";
  const change = isCash ? getChangeDue(total, amountReceived) : 0;
  const received = isCredit
    ? 0
    : isCash
      ? amountReceived > 0
        ? amountReceived
        : total
      : total;

  const handleConfirm = useCallback(async () => {
    if (confirmingRef.current || loading) return;
    confirmingRef.current = true;
    try {
      await onConfirm();
    } finally {
      confirmingRef.current = false;
    }
  }, [loading, onConfirm]);

  useEffect(() => {
    if (!open) {
      confirmingRef.current = false;
      return;
    }

    const focusTimer = window.setTimeout(() => {
      confirmRef.current?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      if (loading) return;
      event.preventDefault();
      event.stopPropagation();
      void handleConfirm();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, handleConfirm, loading]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Aperçu facture"
      description="Enter pour valider · Echap pour annuler"
      className="max-w-lg"
    >
      <div className="max-h-[min(60vh,420px)] overflow-y-auto rounded-xl border border-border bg-background">
        <div className="space-y-3 p-4 font-mono text-[12px] leading-relaxed text-foreground">
          <div className="space-y-1 text-center">
            <p className="font-sans text-base font-bold tracking-tight text-primary">
              {siteConfig.name}
            </p>
            <p className="text-muted-foreground">Facture de vente</p>
            <p className="tabular-nums text-muted-foreground">
              {dateLabel} · {timeLabel}
            </p>
            <p className="tabular-nums">N° {invoiceRef}</p>
          </div>

          <Separator />

          <div className="space-y-1">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Client</span>
              <span className="truncate text-right font-sans font-medium">
                {clientName}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Émis par</span>
              <span className="truncate text-right font-sans font-medium">
                {issuedByName}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Paiement</span>
              <span>{paymentMethodLabels[paymentMethod]}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Articles</span>
              <span className="tabular-nums">{itemCount}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              <span>Article</span>
              <span className="text-right">Qté</span>
              <span className="min-w-[5.5rem] text-right">Total</span>
            </div>
            {lines.map((line) => (
              <div
                key={line.productId}
                className="grid grid-cols-[1fr_auto_auto] items-start gap-x-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-sans text-[13px] font-medium">
                    {line.name}
                    {flagshipIds.has(line.productId) ? (
                      <Badge variant="success" className="ml-1.5 align-middle">
                        Phare
                      </Badge>
                    ) : null}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {line.sku} · {formatCurrency(line.unitPrice)}
                  </p>
                </div>
                <span className="tabular-nums text-right">{line.quantity}</span>
                <span className="min-w-[5.5rem] text-right tabular-nums">
                  {formatCurrency(getLineTotal(line))}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-1">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Sous-total</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Remise
                  {discountMode === "percent" ? ` (${discount} %)` : ""}
                </span>
                <span className="tabular-nums">
                  −{formatCurrency(discountAmount)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 font-sans text-sm font-bold">
              <span>Total TTC</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between gap-3 text-success">
              <span>Gain realise (estime)</span>
              <span className="tabular-nums font-semibold">
                {formatCurrency(realizedGain)} ({realizedMarginPct} %)
              </span>
            </div>
            <div className="flex justify-between gap-3 text-[11px] text-muted-foreground">
              <span>Cout revient fige</span>
              <span className="tabular-nums">{formatCurrency(realizedCost)}</span>
            </div>
            {marginSummary.belowCost > 0 ? (
              <p className="text-[11px] text-destructive">
                {marginSummary.belowCost} ligne(s) sous le cout revient — vente
                refusee a la confirmation.
              </p>
            ) : null}
            {isCash ? (
              <>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Montant reçu</span>
                  <span className="tabular-nums">
                    {formatCurrency(received)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Rendu</span>
                  <span className="tabular-nums">{formatCurrency(change)}</span>
                </div>
              </>
            ) : null}
            {isCredit ? (
              <div className="flex justify-between gap-3 text-warning">
                <span>A devoir (credit)</span>
                <span className="tabular-nums">{formatCurrency(total)}</span>
              </div>
            ) : null}
          </div>

          <p className="pt-1 text-center text-[11px] text-muted-foreground">
            {isCredit
              ? "Vente a credit — reglement ulterieur"
              : "Merci pour votre achat"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => onOpenChange(false)}
        >
          Annuler
        </Button>
        <Button
          ref={confirmRef}
          disabled={loading}
          className="bg-success text-success-foreground hover:bg-success/90"
          onClick={handleConfirm}
        >
          <Printer className="h-4 w-4" />
          {loading ? "Enregistrement..." : "Confirmer la vente"}
        </Button>
      </div>
    </Dialog>
  );
}
