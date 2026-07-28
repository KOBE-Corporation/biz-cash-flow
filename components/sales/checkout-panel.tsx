"use client";

import { CircleEqual, Wallet } from "lucide-react";
import type { CartLine, PaymentMethod } from "@/lib/types";
import type { DiscountMode } from "@/lib/sales/cart";
import {
  getCartSubtotal,
  getCartTotal,
  resolveDiscountAmount,
} from "@/lib/sales/cart";
import { Chip } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency } from "@/lib/utils";

type CheckoutPanelProps = {
  lines: CartLine[];
  discount: number;
  discountMode: DiscountMode;
  paymentMethod: PaymentMethod;
  note: string;
  amountReceived: number;
  onDiscountChange: (value: number) => void;
  onDiscountModeChange: (mode: DiscountMode) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onNoteChange: (value: string) => void;
  onAmountReceivedChange: (value: number) => void;
};

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Especes" },
  { value: "MOBILE_MONEY", label: "OM / MoMo" },
];

const quickCashAmounts = [
  { value: 1_000, label: "+1k" },
  { value: 5_000, label: "+5k" },
  { value: 10_000, label: "+10k" },
  { value: 20_000, label: "+20k" },
  { value: 50_000, label: "+50k" },
];

export function CheckoutPanel({
  lines,
  discount,
  discountMode,
  paymentMethod,
  note,
  amountReceived,
  onDiscountChange,
  onDiscountModeChange,
  onPaymentMethodChange,
  onNoteChange,
  onAmountReceivedChange,
}: CheckoutPanelProps) {
  const subtotal = getCartSubtotal(lines);
  const discountAmount = resolveDiscountAmount(subtotal, discount, discountMode);
  const total = getCartTotal(lines, discount, discountMode);
  const isEmpty = lines.length === 0;
  const isCash = paymentMethod === "CASH";

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:h-full lg:min-h-0">
      <div className="shrink-0 border-b border-border px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Wallet className="h-4 w-4 shrink-0 text-primary" />
          <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
            Paiement
          </h2>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          Mode, montant recu, remise
        </p>
      </div>

      <div className="min-h-0 min-w-0 flex-1 space-y-2.5 overflow-x-hidden overflow-y-auto px-3 py-2.5">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">
            Mode · Ctrl+1..2
          </Label>
          <div className="grid grid-cols-2 gap-1.5">
            {paymentMethods.map((method, index) => (
              <button
                key={method.value}
                type="button"
                onClick={() => onPaymentMethodChange(method.value)}
                className={cn(
                  "min-w-0 truncate rounded-lg px-2 py-2 text-center text-[11px] font-medium transition-colors",
                  paymentMethod === method.value
                    ? "bg-surface-active text-foreground"
                    : "bg-surface-2 text-muted-foreground hover:text-foreground",
                )}
              >
                {index + 1}. {method.label}
              </button>
            ))}
          </div>
        </div>

        {isCash ? (
          <div className="space-y-1.5">
            <Label
              htmlFor="received-main"
              className="text-[11px] text-muted-foreground"
            >
              Montant recu
            </Label>
            <Input
              id="received-main"
              type="number"
              min={0}
              value={amountReceived || ""}
              placeholder={String(total || 0)}
              className="h-9 min-w-0 text-sm font-semibold tabular-nums"
              onChange={(event) =>
                onAmountReceivedChange(
                  Math.max(0, Number(event.target.value) || 0),
                )
              }
            />
            <div className="flex flex-wrap gap-1">
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
        ) : null}

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="discount" className="text-[11px] text-muted-foreground">
              Remise
            </Label>
            <div className="flex gap-1">
              <Chip
                className="px-1.5 py-0.5 text-[10px]"
                active={discountMode === "amount"}
                onClick={() => onDiscountModeChange("amount")}
              >
                F
              </Chip>
              <Chip
                className="px-1.5 py-0.5 text-[10px]"
                active={discountMode === "percent"}
                onClick={() => onDiscountModeChange("percent")}
              >
                %
              </Chip>
            </div>
          </div>
          <Input
            id="discount"
            type="number"
            min={0}
            max={discountMode === "percent" ? 100 : undefined}
            value={discount || ""}
            placeholder="0"
            className="h-8 text-xs"
            onChange={(event) =>
              onDiscountChange(Math.max(0, Number(event.target.value) || 0))
            }
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="note" className="text-[11px] text-muted-foreground">
            Note
          </Label>
          <Input
            id="note"
            value={note}
            placeholder="Client..."
            className="h-8 text-xs"
            onChange={(event) => onNoteChange(event.target.value)}
          />
        </div>

        <Separator />

        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between gap-2 text-muted-foreground">
            <span>Sous-total</span>
            <span className="truncate tabular-nums">
              {formatCurrency(subtotal)}
            </span>
          </div>
          <div className="flex justify-between gap-2 text-muted-foreground">
            <span>Remise</span>
            <span className="truncate tabular-nums">
              - {formatCurrency(discountAmount)}
            </span>
          </div>
          <div className="flex justify-between gap-2 font-bold text-foreground">
            <span>Total</span>
            <span className="truncate tabular-nums">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
