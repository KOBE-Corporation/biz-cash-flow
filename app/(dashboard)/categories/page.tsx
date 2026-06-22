import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function CategoriesPage() {
  return (
    <ModulePlaceholder
      title="Categories"
      description="Organisez vos produits par categories."
      features={[
        "Creation de categories",
        "Association produit / categorie",
        "Statistiques par categorie",
      ]}
    />
  );
}
