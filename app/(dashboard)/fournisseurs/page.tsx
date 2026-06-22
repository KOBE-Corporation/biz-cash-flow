import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function FournisseursPage() {
  return (
    <ModulePlaceholder
      title="Fournisseurs"
      description="Gerez vos partenaires et leurs coordonnees."
      features={[
        "Fiche fournisseur complete",
        "Historique des achats",
        "Liaison produits / fournisseurs",
      ]}
    />
  );
}
