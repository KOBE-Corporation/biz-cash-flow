export type ShortcutItem = {
  keys: string[];
  label: string;
};

export const salesShortcuts: ShortcutItem[] = [
  { keys: ["/"], label: "Focus recherche" },
  { keys: ["↑", "↓"], label: "Naviguer dans la liste" },
  { keys: ["Enter"], label: "Ajouter le produit surligne" },
  { keys: ["Esc"], label: "Effacer la recherche" },
  { keys: ["+", "-"], label: "Qte du dernier article" },
  { keys: ["F4"], label: "Valider la vente" },
  { keys: ["Ctrl", "Backspace"], label: "Vider le panier" },
  { keys: ["Ctrl", "1-2"], label: "Mode de paiement" },
  { keys: ["?"], label: "Afficher les raccourcis" },
];

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}
