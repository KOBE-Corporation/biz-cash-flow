"use client";

import type { Product, ProductPackPrice } from "@/lib/types";
import { getAvailablePackQty, getProductPacks } from "@/lib/sales/cart";
import type { CartLine } from "@/lib/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type PackPickerDialogProps = {
  product: Product | null;
  lines: CartLine[];
  onClose: () => void;
  onSelect: (pack: ProductPackPrice) => void;
};

export function PackPickerDialog({
  product,
  lines,
  onClose,
  onSelect,
}: PackPickerDialogProps) {
  if (!product) return null;

  const packs = getProductPacks(product);

  return (
    <Dialog
      open={!!product}
      onOpenChange={(open) => !open && onClose()}
      title="Choisir le conditionnement"
      description={product.name}
    >
      <div className="grid gap-2">
        {packs.map((pack) => {
          const available = getAvailablePackQty(product, lines, pack);
          const disabled = available <= 0;
          return (
            <button
              key={pack.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(pack)}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-left transition-colors hover:bg-surface-active disabled:opacity-40"
            >
              <div className="min-w-0">
                <p className="font-medium">{pack.name}</p>
                <p className="text-xs text-muted-foreground">
                  {pack.unitsOfBase} u. base · max {available}
                </p>
              </div>
              <span className="shrink-0 tabular-nums font-semibold">
                {formatCurrency(pack.salePrice)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
      </div>
    </Dialog>
  );
}
