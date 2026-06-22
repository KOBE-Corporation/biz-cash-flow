import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function FacturesPage() {
  return (
    <ModulePlaceholder
      title="Factures"
      description="Creez et suivez vos factures clients."
      features={[
        "Generation de factures",
        "Calcul automatique des totaux",
        "Statuts brouillon / envoyee / payee",
        "Export PDF",
      ]}
    />
  );
}
