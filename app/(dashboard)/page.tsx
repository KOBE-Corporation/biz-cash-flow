import { DashboardActions } from "@/components/dashboard/dashboard-actions";
import { DashboardStatsGrid } from "@/components/dashboard/dashboard-stats-grid";
import { LowStockPanel } from "@/components/dashboard/low-stock-panel";
import { RecentMovements } from "@/components/dashboard/recent-movements";
import { PageHeader } from "@/components/ui/page-header";
import {
  getDashboardStats,
  getRecentMovements,
} from "@/lib/mock/dashboard";

export default function DashboardPage() {
  const dashboardStats = getDashboardStats();
  const recentMovements = getRecentMovements();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de votre inventaire et statistiques"
        actions={<DashboardActions />}
      />

      <DashboardStatsGrid stats={dashboardStats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentMovements movements={recentMovements} />
        <LowStockPanel count={dashboardStats.lowStockCount} />
      </div>
    </div>
  );
}
