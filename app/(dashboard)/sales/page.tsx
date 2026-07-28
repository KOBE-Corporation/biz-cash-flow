import { SalesWorkspace } from "@/components/sales/sales-workspace";
import { PageHeader } from "@/components/ui/page-header";

export default function SalesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vente"
        description="Caisse rapide : recherche, raccourcis clavier, stock en temps reel et validation securisee."
      />
      <SalesWorkspace />
    </div>
  );
}
