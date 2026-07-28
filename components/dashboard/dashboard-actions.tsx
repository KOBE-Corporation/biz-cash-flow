import Link from "next/link";
import { ArrowLeftRight, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardActions() {
  return (
    <>
      <Link
        href="/mouvements/nouveau"
        className={cn(buttonVariants({ variant: "outline" }))}
      >
        <ArrowLeftRight className="h-4 w-4" />
        Enregistrer
      </Link>
      <Link
        href="/produits/nouveau"
        className={cn(buttonVariants({ variant: "default" }))}
      >
        <Plus className="h-4 w-4" />
        Nouveau produit
      </Link>
    </>
  );
}
