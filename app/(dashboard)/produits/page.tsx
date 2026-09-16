import { Suspense } from "react";
import { ProductsWorkspace } from "@/components/products/products-workspace";

export default function ProduitsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted-foreground">Chargement…</div>
      }
    >
      <ProductsWorkspace />
    </Suspense>
  );
}
