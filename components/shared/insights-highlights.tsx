"use client";

import Link from "next/link";
import { Crown, Package, TrendingDown, TrendingUp, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PeriodInsights } from "@/lib/repositories/insights";
import { formatCurrency } from "@/lib/utils";

type InsightsHighlightsProps = {
  insights: PeriodInsights;
  title?: string;
  showStock?: boolean;
  compact?: boolean;
};

export function InsightsHighlights({
  insights,
  title = "Highlights",
  showStock = true,
  compact = false,
}: InsightsHighlightsProps) {
  const top = insights.topProducts[0];
  const lowSold =
    insights.bottomProducts[0] ??
    (insights.unsoldProducts[0]
      ? {
          name: insights.unsoldProducts[0].name,
          qtySold: 0,
          revenue: 0,
        }
      : null);
  const topSeller = insights.topSellers[0];

  return (
    <div className="space-y-3">
      {title ? (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <span className="text-xs text-muted-foreground">{insights.label}</span>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Crown className="h-4 w-4 text-warning" />
              Plus vendu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {top ? (
              <>
                <p className="truncate font-semibold">{top.name}</p>
                <p className="text-xs text-muted-foreground">
                  {top.qtySold} u. · {formatCurrency(top.revenue)}
                </p>
                <Badge variant="success" className="mt-2">
                  Produit phare
                </Badge>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune vente</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Moins vendu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowSold ? (
              <>
                <p className="truncate font-semibold">{lowSold.name}</p>
                <p className="text-xs text-muted-foreground">
                  {"qtySold" in lowSold
                    ? `${lowSold.qtySold} u. · ${formatCurrency(lowSold.revenue)}`
                    : "0 vente"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>

        {showStock ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Package className="h-4 w-4 text-success" />
                  Plus en stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights.mostInStock ? (
                  <>
                    <p className="truncate font-semibold">
                      {insights.mostInStock.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {insights.mostInStock.quantity} u.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Package className="h-4 w-4 text-warning" />
                  Moins en stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights.leastInStock ? (
                  <>
                    <p className="truncate font-semibold">
                      {insights.leastInStock.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {insights.leastInStock.quantity} u.
                    </p>
                    <Link
                      href="/produits?filter=low"
                      className="mt-2 inline-block text-xs text-primary hover:underline"
                    >
                      Voir stock
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <User className="h-4 w-4 text-primary" />
            Meilleur vendeur
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topSeller ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{topSeller.userName}</p>
                <p className="text-xs text-muted-foreground">
                  {topSeller.salesCount} vente(s)
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums text-success">
                  {formatCurrency(topSeller.salesTotal)}
                </p>
                <Badge variant="success">Top caissier</Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune vente</p>
          )}
        </CardContent>
      </Card>

      {!compact && insights.topProducts.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-success" />
              Classement produits phares
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.topProducts.slice(0, 5).map((p, i) => (
              <div
                key={p.productId}
                className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                    {p.name}
                    {i < 3 ? (
                      <Badge variant="success" className="ml-2">
                        Phare
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.qtySold} u. · stock {p.stockQty}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(p.revenue)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
