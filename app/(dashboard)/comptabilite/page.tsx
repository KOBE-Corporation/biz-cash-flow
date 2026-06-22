import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function ComptabilitePage() {
  return (
    <ModulePlaceholder
      title="Comptabilite"
      description="Vue comptable et calcul des benefices."
      features={[
        "Journal des ecritures comptables",
        "Calcul des marges et benefices",
        "Rapprochement ventes / achats",
        "Tracabilite complete des flux financiers",
      ]}
    />
  );
}
