"use client";

import { Banknote, CircleEqual, Wallet } from "lucide-react";
import type { CartLine, PaymentMethod } from "@/lib/types";
import type { DiscountMode } from "@/lib/sales/cart";
import {
  getCartItemCount,
  getCartTotal,
  getChangeDue,
  paymentMethodLabels,
} from "@/lib/sales/cart";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency } from "@/lib/utils";

type ReimbursementPanelProps = {
  lines: CartLine[];
  discount: number;
  discountMode: DiscountMode;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  onAmountReceivedChange: (value: number) => void;
};

const quickCashAmounts = [
  { value: 1_000, label: "+1k" },
  { value: 5_000, label: "+5k" },
  { value: 10_000, label: "+10k" },
  { value: 20_000, label: "+20k" },
  { value: 50_000, label: "+50k" },
];

export function ReimbursementPanel({
  lines,
  discount,
  discountMode,
  paymentMethod,
  amountReceived,
  onAmountReceivedChange,
}: ReimbursementPanelProps) {
  const total = getCartTotal(lines, discount, discountMode);
  const itemCount = getCartItemCount(lines);
  const change = getChangeDue(total, amountReceived);
  const remaining = Math.max(0, total - amountReceived);
  const isCash = paymentMethod === "CASH";
  const isEmpty = lines.length === 0;
  const isExact =
    !isEmpty && amountReceived > 0 && remaining === 0 && change === 0;
  const isOverpaid = amountReceived > total && total > 0;
  const isUnderpaid = amountReceived > 0 && remaining > 0;

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:h-full lg:min-h-0">
      <div className="shrink-0 border-b border-border px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Wallet className="h-4 w-4 shrink-0 text-primary" />
          <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
            Remboursement
          </h2>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          Monnaie a rendre exacte
        </p>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-y-auto overflow-x-hidden px-3 py-3">
        <div className="min-w-0 rounded-xl bg-surface-2 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Total a payer
          </p>
          <p className="mt-1 break-words text-xl font-bold leading-tight tracking-tight text-foreground tabular-nums">
            {formatCurrency(total)}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {itemCount} article{itemCount > 1 ? "s" : ""} ·{" "}
            {paymentMethodLabels[paymentMethod]}
          </p>
        </div>

        {isCash ? (
          <>
            <div className="min-w-0 space-y-1.5">
              <Label
                htmlFor="received-main"
                className="text-xs text-muted-foreground"
              >
                Montant recu
              </Label>
              <Input
                id="received-main"
                type="number"
                min={0}
                value={amountReceived || ""}
                placeholder={String(total || 0)}
                className="h-10 min-w-0 text-sm font-semibold tabular-nums"
                onChange={(event) =>
                  onAmountReceivedChange(
                    Math.max(0, Number(event.target.value) || 0),
                  )
                }
              />
              <div className="flex flex-wrap gap-1 pt-0.5">
                <Chip
                  className="px-2 py-1 text-[10px]"
                  disabled={isEmpty}
                  onClick={() => onAmountReceivedChange(total)}
                >
                  <CircleEqual className="h-3 w-3" />
                  Exact
                </Chip>
                {quickCashAmounts.map((amount) => (
                  <Chip
                    key={amount.value}
                    className="px-2 py-1 text-[10px]"
                    disabled={isEmpty}
                    onClick={() =>
                      onAmountReceivedChange(amountReceived + amount.value)
                    }
                  >
                    {amount.label}
                  </Chip>
                ))}
                <Chip
                  className="px-2 py-1 text-[10px]"
                  disabled={amountReceived <= 0}
                  onClick={() => onAmountReceivedChange(0)}
                >
                  Reset
                </Chip>
              </div>
            </div>

            <div
              className={cn(
                "min-w-0 rounded-xl border p-3",
                isExact && "border-success/40 bg-success/10",
                isOverpaid && "border-primary/40 bg-primary/10",
                isUnderpaid && "border-warning/40 bg-warning/10",
                !amountReceived && "border-border bg-surface-2",
              )}
            >
              {isUnderpaid ? (
                <>
                  <p className="text-[11px] uppercase tracking-wide text-warning">
                    Reste a payer
                  </p>
                  <p className="mt-1 break-words text-lg font-bold leading-tight text-warning tabular-nums">
                    {formatCurrency(remaining)}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex min-w-0 items-center gap-2">
                    <Banknote className="h-4 w-4 shrink-0 text-foreground" />
                    <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                      Monnaie a rendre
                    </p>
                  </div>
                  <p className="mt-1 break-words text-xl font-bold leading-tight tracking-tight text-foreground tabular-nums">
                    {formatCurrency(change)}
                  </p>
                  {isExact ? (
                    <Badge
                      variant="success"
                      className="mt-2 px-2 py-0.5 text-[10px]"
                    >
                      Montant exact
                    </Badge>
                  ) : null}
                  {isOverpaid ? (
                    <p className="mt-2 break-words text-xs text-muted-foreground">
                      Recu {formatCurrency(amountReceived)}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="min-w-0 rounded-xl border border-border bg-surface-2 p-3">
            <p className="text-sm leading-snug text-muted-foreground">
              Paiement {paymentMethodLabels[paymentMethod].toLowerCase()} — pas
              de rendu.
            </p>
            <p className="mt-2 break-words text-lg font-bold tabular-nums text-foreground">
              {formatCurrency(total)}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
