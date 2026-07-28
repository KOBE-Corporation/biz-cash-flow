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
    <section className="flex h-auto flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:h-full lg:min-h-0">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <ShoppingBag className="h-4 w-4 shrink-0 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Panier</h2>
          </div>
          <p className="truncate text-[11px] text-muted-foreground">
            {itemCount} article{itemCount > 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={isEmpty}
          onClick={onClear}
          className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Vider
        </Button>
      </div>

      <div className="max-h-[280px] space-y-2 overflow-y-auto px-3 py-3 lg:max-h-none lg:min-h-0 lg:flex-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-surface-2 px-3 py-6 text-center">
            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            <p className="text-xs font-medium text-foreground">Panier vide</p>
            <p className="text-[11px] text-muted-foreground">
              Ajoutez un produit pour commencer.
            </p>
          </div>
        ) : (
          lines.map((line, index) => {
            const isLast = index === lines.length - 1;
            return (
              <div
                key={line.productId}
                className={cn(
                  "rounded-lg bg-surface-2 px-2.5 py-2 transition-colors",
                  isLast && "ring-1 ring-primary/30",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {line.name}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {line.sku} · {formatCurrency(line.unitPrice)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(line.productId)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Retirer ${line.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-0.5 rounded-lg bg-card p-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={line.quantity <= 1}
                      onClick={() =>
                        onQuantityChange(line.productId, line.quantity - 1)
                      }
                      aria-label="Diminuer"
                    >
                      <Minus className="h-3 w-3" />
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
                      className="h-6 w-9 border-0 bg-transparent px-0 text-center text-xs shadow-none"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={line.quantity >= line.maxQuantity}
                      onClick={() =>
                        onQuantityChange(line.productId, line.quantity + 1)
                      }
                      aria-label="Augmenter"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="truncate text-xs font-bold tabular-nums text-foreground">
                      {formatCurrency(getLineTotal(line))}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {line.quantity}/{line.maxQuantity}
                    </p>
                  </div>
                </div>

                {isLast ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {quickQuantities.map((qty) => (
                      <Chip
                        key={qty}
                        className="px-1.5 py-0.5 text-[10px]"
                        active={line.quantity === qty}
                        disabled={qty > line.maxQuantity}
                        onClick={() => onQuantityChange(line.productId, qty)}
                      >
                        ×{qty}
                      </Chip>
                    ))}
                    <Chip
                      className="px-1.5 py-0.5 text-[10px]"
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
