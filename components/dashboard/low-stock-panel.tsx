import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LowStockPanelProps = {
  count: number;
};

export function LowStockPanel({ count }: LowStockPanelProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <CardTitle>Produits en stock faible</CardTitle>
        </div>
        <Link
          href="/produits?filter=low-stock"
          className="text-sm font-medium text-primary hover:underline"
        >
          Voir tous
        </Link>
      </CardHeader>
      <CardContent>
        {count === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-2 px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Tous les produits sont bien stockes. Bien fait !
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {count} produit(s) necessitent un reapprovisionnement.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
