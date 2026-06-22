import Link from "next/link";
import { ArrowLeftRight, Plus } from "lucide-react";

export function DashboardActions() {
  return (
    <>
      <Link
        href="/mouvements/nouveau"
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <ArrowLeftRight className="h-4 w-4" />
        Enregistrer
      </Link>
      <Link
        href="/produits/nouveau"
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        Nouveau produit
      </Link>
    </>
  );
}
