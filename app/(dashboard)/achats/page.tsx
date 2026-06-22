import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function AchatsPage() {
  return (
    <ModulePlaceholder
      title="Achats"
      description="Suivez vos commandes et receptions fournisseurs."
      features={[
        "Bon de commande fournisseur",
        "Reception et mise a jour du stock",
        "Suivi des montants et statuts",
        "Lien avec la comptabilite",
      ]}
    />
  );
}
