import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StockMovement } from "@/lib/types";
import { cn } from "@/lib/utils";

type RecentMovementsProps = {
  movements: StockMovement[];
};

export function RecentMovements({ movements }: RecentMovementsProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Mouvements recents</CardTitle>
        <Link
          href="/mouvements"
          className="text-sm font-medium text-primary hover:underline"
        >
          Voir tous
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {movements.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Aucun mouvement recent.
          </p>
        ) : (
          movements.map((movement) => {
            const isOut = movement.type === "OUT";

            return (
              <div
                key={movement.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      isOut ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500",
                    )}
                  >
                    {isOut ? (
                      <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {movement.productName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {format(movement.createdAt, "PPP p", { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      isOut ? "text-red-500" : "text-emerald-500",
                    )}
                  >
                    {isOut ? "-" : "+"}
                    {movement.quantity}
                  </p>
                  <p className="text-xs text-slate-400">
                    {movement.reference ?? "No reference"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
