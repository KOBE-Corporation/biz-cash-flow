import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function ProduitsPage() {
  return (
    <ModulePlaceholder
      title="Produits"
      description="Gerez votre catalogue, prix et niveaux de stock."
      features={[
        "Liste et recherche des produits",
        "Creation et edition de fiches produit",
        "Suivi des quantites et seuils d'alerte",
        "Historique des mouvements par produit",
      ]}
    />
  );
}
