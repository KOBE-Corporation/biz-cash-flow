"use client";

import { forwardRef, useEffect, useRef } from "react";
import { Package, ScanLine } from "lucide-react";
import type { Product } from "@/lib/types";
import type { StockFilter } from "@/lib/sales/cart";
import {
  getAvailableStock,
  getCartQty,
  getStockFillPercent,
  getStockStatus,
} from "@/lib/sales/cart";
import type { CartLine } from "@/lib/types";
import { StockMeter } from "@/components/sales/stock-meter";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { cn, formatCurrency } from "@/lib/utils";

type ProductPickerProps = {
  query: string;
  onQueryChange: (value: string) => void;
  products: Product[];
  lines: CartLine[];
  stockFilter: StockFilter;
  onStockFilterChange: (filter: StockFilter) => void;
  highlightedIndex: number;
  onHighlightChange: (index: number) => void;
  onSelect: (product: Product) => void;
  onScanSubmit: (code: string) => boolean;
  flashProductId?: string | null;
};

const filters: { value: StockFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "available", label: "Dispo" },
  { value: "low", label: "Faible" },
  { value: "out", label: "Rupture" },
];

export const ProductPicker = forwardRef<HTMLInputElement, ProductPickerProps>(
  function ProductPicker(
    {
      query,
      onQueryChange,
      products,
      lines,
      stockFilter,
      onStockFilterChange,
      highlightedIndex,
      onHighlightChange,
      onSelect,
      onScanSubmit,
      flashProductId,
    },
    ref,
  ) {
    const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

    useEffect(() => {
      const node = itemRefs.current[highlightedIndex];
      node?.scrollIntoView({ block: "nearest" });
    }, [highlightedIndex]);

    return (
    <section className="flex h-[min(55vh,420px)] flex-col rounded-2xl border border-border bg-card p-3 shadow-card lg:h-full lg:min-h-0 lg:flex-1 lg:p-4">
      <div className="shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">Produits</h2>
            <p className="text-xs text-muted-foreground">
              `/` recherche · ↑↓ naviguer · Enter ajouter · scanner SKU
            </p>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex">
            <ScanLine className="h-3.5 w-3.5" />
            Scanner
          </Badge>
        </div>

        <SearchInput
          ref={ref}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              onHighlightChange(
                Math.min(highlightedIndex + 1, Math.max(0, products.length - 1)),
              );
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              onHighlightChange(Math.max(highlightedIndex - 1, 0));
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              const scanned = onScanSubmit(query);
              if (scanned) {
                onQueryChange("");
                return;
              }
              const product = products[highlightedIndex];
              if (product && getAvailableStock(product, lines) > 0) {
                onSelect(product);
              }
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onQueryChange("");
            }
          }}
          placeholder="Rechercher un produit ou scanner un code..."
          autoFocus
        />

        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Chip
              key={filter.value}
              active={stockFilter === filter.value}
              onClick={() => onStockFilterChange(filter.value)}
              className="px-3 py-1.5 text-xs"
            >
              {filter.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 py-16 text-center">
              <Package className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aucun produit ne correspond a votre recherche.
              </p>
            </div>
          ) : (
            products.map((product, index) => {
              const inCart = getCartQty(lines, product.id);
              const available = getAvailableStock(product, lines);
              const status = getStockStatus(product, inCart);
              const fill = getStockFillPercent(product, inCart);
              const outOfStock = available <= 0;
              const highlighted = index === highlightedIndex;
              const flashing = flashProductId === product.id;

              return (
                <button
                  key={product.id}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  type="button"
                  disabled={outOfStock}
                  onMouseEnter={() => onHighlightChange(index)}
                  onClick={() => onSelect(product)}
                  className={cn(
                    "flex w-full flex-col gap-2 rounded-xl border px-4 py-3 text-left transition-all",
                    outOfStock
                      ? "cursor-not-allowed border-transparent bg-surface-2/50 opacity-50"
                      : highlighted
                        ? "border-primary/50 bg-primary/10"
                        : "border-transparent bg-surface-2 hover:bg-surface-active",
                    flashing && "ring-2 ring-primary/60",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{product.sku}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {status === "out" ? (
                          <Badge variant="danger" className="px-2.5 py-1 text-xs">
                            Rupture
                          </Badge>
                        ) : status === "low" ? (
                          <Badge variant="warning" className="px-2.5 py-1 text-xs">
                            Stock faible · {available} restant
                            {available > 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="px-2.5 py-1 text-xs">
                            Stock {product.quantity}
                            {inCart > 0 ? ` · ${available} dispo` : ""}
                          </Badge>
                        )}
                        {inCart > 0 ? (
                          <Badge variant="accent" className="px-2.5 py-1 text-xs">
                            ×{inCart} panier
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-foreground">
                        {formatCurrency(product.salePrice)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">prix unit.</p>
                    </div>
                  </div>
                  <StockMeter percent={fill} status={status} />
                </button>
              );
            })
          )}
        </div>
      </section>
    );
  },
);
