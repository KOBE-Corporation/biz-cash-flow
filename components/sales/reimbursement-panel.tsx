"use client";

import { forwardRef } from "react";
import { Banknote } from "lucide-react";
import type { CartLine, PaymentMethod } from "@/lib/types";
import type { DiscountMode } from "@/lib/sales/cart";
import {
  getCartTotal,
  getChangeDue,
  paymentMethodLabels,
} from "@/lib/sales/cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type ReimbursementPanelProps = {
  lines: CartLine[];
  discount: number;
  discountMode: DiscountMode;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  onCheckout: () => void;
};

export const ReimbursementPanel = forwardRef<
  HTMLButtonElement,
  ReimbursementPanelProps
>(function ReimbursementPanel(
  {
    lines,
    discount,
    discountMode,
    paymentMethod,
    amountReceived,
    onCheckout,
  },
  ref,
) {
  const total = getCartTotal(lines, discount, discountMode);
  const isEmpty = lines.length === 0;
  const change =
    paymentMethod === "CASH" ? getChangeDue(total, amountReceived) : 0;

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="shrink-0 border-b border-border px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Banknote className="h-4 w-4 shrink-0 text-primary" />
          <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
            Caisse
          </h2>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          Enter apres montant · F4 pour valider
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 overflow-hidden px-3 py-3">
        <div className="min-w-0 space-y-3">
          <div className="min-w-0 rounded-xl bg-surface-2 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Net a payer
            </p>
            <p className="mt-1 break-words text-xl font-bold leading-tight tracking-tight text-foreground tabular-nums">
              {formatCurrency(total)}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {paymentMethodLabels[paymentMethod]}
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">Remboursement</span>
            <Badge
              variant={change > 0 ? "warning" : "outline"}
              className="px-2.5 py-1 text-xs tabular-nums"
            >
              {formatCurrency(change)}
            </Badge>
          </div>
        </div>

        <Button
          ref={ref}
          className="h-10 w-full shrink-0 bg-success text-success-foreground hover:bg-success/90"
          disabled={isEmpty}
          onClick={onCheckout}
        >
          <span className="truncate">Valider</span>
          <Badge
            variant="outline"
            className="ml-1 shrink-0 border-success-foreground/30 bg-transparent px-2 py-0.5 text-[10px] text-success-foreground"
          >
            F4
          </Badge>
        </Button>
      </div>
    </section>
  );
});
