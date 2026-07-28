import {
  AlertTriangle,
  Box,
  PackageX,
  Tags,
  Truck,
} from "lucide-react";
import { StatCard } from "@/components/ui/page-header";
import type { DashboardStats } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type DashboardStatsGridProps = {
  stats: DashboardStats;
};

export function DashboardStatsGrid({ stats }: DashboardStatsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Total Produits"
        value={stats.totalProducts}
        subtitle="Produits en stock"
      />
      <StatCard
        title="Categories"
        value={stats.totalCategories}
        subtitle="Categories de produits"
        icon={<Tags className="h-5 w-5" />}
      />
      <StatCard
        title="Fournisseurs"
        value={stats.totalSuppliers}
        subtitle="Fournisseurs actifs"
        icon={<Truck className="h-5 w-5" />}
      />
      <StatCard
        title="Valeur du stock"
        value={formatCurrency(stats.stockValue)}
        subtitle="Total valeur"
        variant="success"
        icon={<Box className="h-5 w-5 text-success" />}
      />
      <StatCard
        title="Stock Faible"
        value={stats.lowStockCount}
        subtitle="Besoin d'attention"
        variant="warning"
        icon={<AlertTriangle className="h-5 w-5 text-warning" />}
      />
      <StatCard
        title="Stock Epuise"
        value={stats.outOfStockCount}
        subtitle="Besoin de reapprovisionnement"
        variant="danger"
        icon={<PackageX className="h-5 w-5 text-destructive" />}
      />
    </div>
  );
}
