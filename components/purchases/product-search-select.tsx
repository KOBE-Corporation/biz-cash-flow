"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

type ProductSearchSelectProps = {
  products: Product[];
  value: string;
  onChange: (productId: string, product: Product | undefined) => void;
  placeholder?: string;
  className?: string;
};

export function ProductSearchSelect({
  products,
  value,
  onChange,
  placeholder = "Rechercher un produit…",
  className,
}: ProductSearchSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = products.find((p) => p.id === value);

  useEffect(() => {
    if (!open) {
      setQuery(selected?.name ?? "");
    }
  }, [open, selected?.name, value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q),
    );
  }, [products, query]);

  const pick = (product: Product) => {
    onChange(product.id, product);
    setQuery(product.name);
    setOpen(false);
  };

  const clear = () => {
    onChange("", undefined);
    setQuery("");
    setOpen(true);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <input
          type="text"
          value={open ? query : selected?.name ?? query}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-border bg-input py-2 pl-2 pr-8 text-xs text-foreground outline-none focus:border-ring"
          onFocus={() => {
            setOpen(true);
            setQuery(selected?.name ?? "");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selected && e.target.value !== selected.name) {
              onChange("", undefined);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered[0]) pick(filtered[0]);
            }
          }}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground"
          tabIndex={-1}
          onClick={() => setOpen((v) => !v)}
          aria-label="Ouvrir la liste"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {open ? (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-card">
          {selected ? (
            <button
              type="button"
              className="w-full border-b border-border px-3 py-2 text-left text-[11px] text-muted-foreground hover:bg-surface-2"
              onClick={clear}
            >
              Effacer la selection
            </button>
          ) : null}
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Aucun produit pour « {query} »
            </p>
          ) : (
            filtered.map((product) => (
              <button
                key={product.id}
                type="button"
                className={cn(
                  "flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-surface-2",
                  product.id === value && "bg-surface-2",
                )}
                onClick={() => pick(product)}
              >
                <span className="text-xs font-medium text-foreground">
                  {product.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {product.sku}
                  {product.barcode ? ` · ${product.barcode}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
