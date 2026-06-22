import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function MouvementsPage() {
  return (
    <ModulePlaceholder
      title="Mouvements de stock"
      description="Tracez toutes les entrees, sorties et ajustements de stock."
      features={[
        "Enregistrement entree / sortie",
        "References et notes de tracabilite",
        "Filtrage par date et produit",
        "Impact automatique sur les quantites",
      ]}
    />
  );
}
