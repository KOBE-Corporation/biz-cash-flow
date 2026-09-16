import { Suspense } from "react";
import { MovementsWorkspace } from "@/components/movements/movements-workspace";

export default function MouvementsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted-foreground">Chargement…</div>
      }
    >
      <MovementsWorkspace />
    </Suspense>
  );
}
