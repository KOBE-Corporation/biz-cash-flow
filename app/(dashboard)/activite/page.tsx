import { Suspense } from "react";
import { AuditWorkspace } from "@/components/audit/audit-workspace";

export default function ActivitePage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted-foreground">Chargement…</div>
      }
    >
      <AuditWorkspace />
    </Suspense>
  );
}
