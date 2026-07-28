import { Suspense } from "react";
import { PurchasesWorkspace } from "@/components/purchases/purchases-workspace";

export default function AchatsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted-foreground">Chargement…</div>
      }
    >
      <PurchasesWorkspace />
    </Suspense>
  );
}
