import { Suspense } from "react";
import { SuppliersWorkspace } from "@/components/suppliers/suppliers-workspace";

export default function FournisseursPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted-foreground">Chargement…</div>
      }
    >
      <SuppliersWorkspace />
    </Suspense>
  );
}
