"use client";

import type { CartLine, PaymentMethod } from "@/lib/types";
import type { DiscountMode } from "@/lib/sales/cart";
import {
  getCartSubtotal,
  getCartTotal,
  getChangeDue,
  paymentMethodLabels,
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
  amountReceived: number;
  onDiscountChange: (value: number) => void;
  onDiscountModeChange: (mode: DiscountMode) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onNoteChange: (value: string) => void;
  onAmountReceivedChange: (value: number) => void;
  onCheckout: () => void;
};

const paymentMethods: PaymentMethod[] = [
  "CASH",
  "MOBILE_MONEY",
  "CARD",
  "CREDIT",
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
  onCheckout,
}: CheckoutPanelProps) {
  const subtotal = getCartSubtotal(lines);
  const discountAmount = resolveDiscountAmount(subtotal, discount, discountMode);
  const total = getCartTotal(lines, discount, discountMode);
  const change = getChangeDue(total, amountReceived);
  const isEmpty = lines.length === 0;
  const lastLine = lines[lines.length - 1];

  return (
    <section className="flex shrink-0 flex-col rounded-2xl border border-border bg-card shadow-card">
      <div className="border-b border-border px-4 py-4">
        <h2 className="text-base font-semibold text-foreground">Paiement</h2>
        <p className="text-xs text-muted-foreground">
          Remise, reglement et validation · F4
        </p>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Mode de paiement · Ctrl+1..4
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map((method, index) => (
              <button
                key={method}
                type="button"
                onClick={() => onPaymentMethodChange(method)}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                  paymentMethod === method
                    ? "bg-surface-active text-foreground"
                    : "bg-surface-2 text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="mr-1 text-[10px] text-muted-foreground">
                  {index + 1}.
                </span>
                {paymentMethodLabels[method]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="discount" className="text-xs text-muted-foreground">
                Remise
              </Label>
              <div className="flex gap-1">
                <Chip
                  className="px-2 py-0.5 text-[10px]"
                  active={discountMode === "amount"}
                  onClick={() => onDiscountModeChange("amount")}
                >
                  F CFA
                </Chip>
                <Chip
                  className="px-2 py-0.5 text-[10px]"
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
              onChange={(event) =>
                onDiscountChange(Math.max(0, Number(event.target.value) || 0))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-xs text-muted-foreground">
              Note (optionnel)
            </Label>
            <Input
              id="note"
              value={note}
              placeholder="Client, reference..."
              onChange={(event) => onNoteChange(event.target.value)}
            />
          </div>
        </div>

        {paymentMethod === "CASH" ? (
          <div className="space-y-1.5">
            <Label htmlFor="received" className="text-xs text-muted-foreground">
              Montant recu
            </Label>
            <Input
              id="received"
              type="number"
              min={0}
              value={amountReceived || ""}
              placeholder={String(total || 0)}
              onChange={(event) =>
                onAmountReceivedChange(
                  Math.max(0, Number(event.target.value) || 0),
                )
              }
            />
            {amountReceived > 0 ? (
              <p className="text-xs text-muted-foreground">
                Monnaie a rendre :{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(change)}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        <Separator />

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Sous-total</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>
              Remise
              {discountMode === "percent" && discount > 0
                ? ` (${discount}%)`
                : ""}
            </span>
            <span>- {formatCurrency(discountAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-lg font-bold text-foreground">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {lastLine ? (
            <p className="text-[11px] text-muted-foreground">
              Dernier article : {lastLine.name}
            </p>
          ) : null}
        </div>

        <Button
          className="w-full bg-success text-success-foreground hover:bg-success/90"
          size="lg"
          disabled={isEmpty}
          onClick={onCheckout}
        >
          Valider la vente
          <Badge
            variant="outline"
            className="ml-1 border-success-foreground/30 bg-transparent px-2 py-0.5 text-[10px] text-success-foreground"
          >
            F4
          </Badge>
        </Button>
      </div>
    </section>
  );
}
