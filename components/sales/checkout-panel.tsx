"use client";

import type { CartLine, PaymentMethod } from "@/lib/types";
import type { DiscountMode } from "@/lib/sales/cart";
import {
  getCartSubtotal,
  getCartTotal,
  resolveDiscountAmount,
} from "@/lib/sales/cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  onDiscountChange: (value: number) => void;
  onDiscountModeChange: (mode: DiscountMode) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onNoteChange: (value: string) => void;
  onCheckout: () => void;
};

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Especes" },
  { value: "MOBILE_MONEY", label: "OM / MoMo" },
];

export function CheckoutPanel({
  lines,
  discount,
  discountMode,
  paymentMethod,
  note,
  onDiscountChange,
  onDiscountModeChange,
  onPaymentMethodChange,
  onNoteChange,
  onCheckout,
}: CheckoutPanelProps) {
  const subtotal = getCartSubtotal(lines);
  const discountAmount = resolveDiscountAmount(subtotal, discount, discountMode);
  const total = getCartTotal(lines, discount, discountMode);
  const isEmpty = lines.length === 0;

  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-border bg-card shadow-card lg:h-full lg:min-h-0 lg:overflow-hidden">
      <div className="shrink-0 border-b border-border px-3 py-2.5">
        <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
          Paiement
        </h2>
        <p className="truncate text-xs text-muted-foreground">
          Mode, remise · F4
        </p>
      </div>

      <div className="min-w-0 space-y-2.5 overflow-x-hidden px-3 py-2.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
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

      <div className="shrink-0 border-t border-border px-3 py-2.5">
        <Button
          className="h-9 w-full min-w-0 bg-success text-success-foreground hover:bg-success/90"
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
}
