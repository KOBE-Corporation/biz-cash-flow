"use client";

import Link from "next/link";
import {
  CreditCard,
  Crown,
  Layers,
  Package,
  Receipt,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PeriodInsights } from "@/lib/repositories/insights";
import { paymentMethodLabels } from "@/lib/sales/cart";
import { formatCurrency } from "@/lib/utils";

type InsightsHighlightsProps = {
  insights: PeriodInsights;
  title?: string;
  showStock?: boolean;
  compact?: boolean;
  showBusinessKpis?: boolean;
};

export function InsightsHighlights({
  insights,
  title = "Highlights",
  showStock = true,
  compact = false,
  showBusinessKpis = true,
}: InsightsHighlightsProps) {
  const top = insights.topProducts[0];
  const topCategory = insights.topCategories[0];
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

      {showBusinessKpis ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Receipt className="h-4 w-4 text-primary" />
                CA encaisse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold tabular-nums">
                {formatCurrency(insights.salesTotal)}
              </p>
              <p className="text-xs text-muted-foreground">
                {insights.salesCount} ticket(s) · moy.{" "}
                {formatCurrency(insights.avgTicket)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Wallet className="h-4 w-4 text-destructive" />
                Sorties argent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold tabular-nums text-destructive">
                {formatCurrency(insights.cashOut)}
              </p>
              <p className="text-xs text-muted-foreground">
                Achats / rembours. / manuels
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Wallet className="h-4 w-4 text-success" />
                Net caisse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold tabular-nums">
                {formatCurrency(insights.operationalNet)}
              </p>
              <p className="text-xs text-muted-foreground">Hors float</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-success" />
                Marge realisee
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold tabular-nums">
                {formatCurrency(insights.realizedMargin)}
              </p>
              <p className="text-xs text-muted-foreground">
                {insights.marginPercent} % du CA · cout fige a la vente
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Package className="h-4 w-4 text-warning" />
                Potentiel stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold tabular-nums">
                {formatCurrency(insights.catalogPotentialGain)}
              </p>
              <p className="text-xs text-muted-foreground">
                Si vente du stock actuel ·{" "}
                {insights.catalogPotentialMarginPercent} %
                {insights.belowCostProductCount > 0
                  ? ` · ${insights.belowCostProductCount} sous cout`
                  : ""}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Crown className="h-4 w-4 text-warning" />
              Produit phare
            </CardTitle>
          </CardHeader>
          <CardContent>
            {top ? (
              <>
                <p className="truncate font-semibold">{top.name}</p>
                <p className="text-xs text-muted-foreground">
                  {top.qtySold} u. · {formatCurrency(top.revenue)}
                  {top.categoryName ? ` · ${top.categoryName}` : ""}
                </p>
                <Badge variant="success" className="mt-2">
                  Phare
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
              <Layers className="h-4 w-4 text-primary" />
              Categorie phare
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCategory ? (
              <>
                <p className="truncate font-semibold">{topCategory.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(topCategory.revenue)} ·{" "}
                  {topCategory.sharePercent} % du CA
                </p>
                <Badge variant="success" className="mt-2">
                  Famille phare
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
                <Link
                  href="/produits"
                  className="mt-2 inline-block text-xs text-primary hover:underline"
                >
                  Voir produits
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>

        {showStock ? (
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
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4 text-primary" />
                Meilleur vendeur
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topSeller ? (
                <>
                  <p className="truncate font-semibold">{topSeller.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {topSeller.salesCount} vente(s) ·{" "}
                    {formatCurrency(topSeller.salesTotal)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune vente</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {showStock ? (
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
      ) : null}

      {insights.paymentMix.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CreditCard className="h-4 w-4 text-primary" />
              Mix paiements
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {insights.paymentMix.map((row) => (
              <div
                key={row.method}
                className="rounded-lg bg-surface-2 px-3 py-2 text-sm"
              >
                <p className="font-medium">{paymentMethodLabels[row.method]}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {row.count} · {formatCurrency(row.total)} · {row.sharePercent}{" "}
                  %
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {!compact && insights.topCategories.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Layers className="h-4 w-4 text-primary" />
              Classement categories phares
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.topCategories.slice(0, 5).map((c, i) => (
              <div
                key={c.categoryId}
                className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                    {c.name}
                    {i < 3 ? (
                      <Badge variant="success" className="ml-2">
                        Phare
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {c.qtySold} u. · {c.sharePercent} % CA · gain{" "}
                    {formatCurrency(c.estimatedGain)} · stock bas{" "}
                    {c.lowStockCount + c.outOfStockCount}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(c.revenue)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

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
                    {p.qtySold} u. · stock {p.stockQty} · gain{" "}
                    {formatCurrency(p.estimatedGain)}
                    {p.categoryName ? ` · ${p.categoryName}` : ""}
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
