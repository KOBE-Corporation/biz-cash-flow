"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import type { CartLine } from "@/lib/types";
import { getCartItemCount, getLineTotal } from "@/lib/sales/cart";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";

type CartPanelProps = {
  lines: CartLine[];
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
};

const quickQuantities = [1, 2, 5, 10];

export function CartPanel({
  lines,
  onQuantityChange,
  onRemove,
  onClear,
}: CartPanelProps) {
  const itemCount = getCartItemCount(lines);
  const isEmpty = lines.length === 0;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card shadow-card">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Panier</h2>
          <p className="text-xs text-muted-foreground">
            {itemCount} article{itemCount > 1 ? "s" : ""} · +/- pour ajuster
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={isEmpty}
          onClick={onClear}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Vider
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 py-12 text-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Panier vide</p>
            <p className="text-xs text-muted-foreground">
              Selectionnez un produit a gauche pour commencer la vente.
            </p>
          </div>
        ) : (
          lines.map((line, index) => {
            const isLast = index === lines.length - 1;
            return (
              <div
                key={line.productId}
                className={cn(
                  "rounded-xl bg-surface-2 p-3 transition-colors",
                  isLast && "ring-1 ring-primary/30",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {line.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{line.sku}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatCurrency(line.unitPrice)} / unite
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(line.productId)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Retirer ${line.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1 rounded-xl bg-card p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={line.quantity <= 1}
                      onClick={() =>
                        onQuantityChange(line.productId, line.quantity - 1)
                      }
                      aria-label="Diminuer"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={line.maxQuantity}
                      value={line.quantity}
                      onChange={(event) =>
                        onQuantityChange(
                          line.productId,
                          Number(event.target.value) || 1,
                        )
                      }
                      className="h-8 w-14 border-0 bg-transparent px-1 text-center shadow-none"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={line.quantity >= line.maxQuantity}
                      onClick={() =>
                        onQuantityChange(line.productId, line.quantity + 1)
                      }
                      aria-label="Augmenter"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">
                      {formatCurrency(getLineTotal(line))}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {line.quantity}/{line.maxQuantity} stock
                    </p>
                  </div>
                </div>

                {isLast ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {quickQuantities.map((qty) => (
                      <Chip
                        key={qty}
                        className="px-2.5 py-1 text-[11px]"
                        active={line.quantity === qty}
                        disabled={qty > line.maxQuantity}
                        onClick={() => onQuantityChange(line.productId, qty)}
                      >
                        ×{qty}
                      </Chip>
                    ))}
                    <Chip
                      className="px-2.5 py-1 text-[11px]"
                      onClick={() =>
                        onQuantityChange(line.productId, line.maxQuantity)
                      }
                    >
                      Max
                    </Chip>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
