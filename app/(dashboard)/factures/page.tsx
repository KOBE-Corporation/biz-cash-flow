import { Suspense } from "react";
import { InvoicesWorkspace } from "@/components/invoices/invoices-workspace";

export default function FacturesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted-foreground">Chargement…</div>
      }
    >
      <InvoicesWorkspace />
    </Suspense>
  );
}
