"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { X } from "lucide-react";
import {
  mainNavigation,
  secondaryNavigation,
  type NavItem,
} from "@/lib/constants/navigation";
import { siteConfig } from "@/lib/constants/site";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useBcfRefresh } from "@/hooks/use-bcf-refresh";
import { countInvoicesByStatus } from "@/lib/repositories/invoices";
import { listProducts } from "@/lib/repositories/products";
import { cn } from "@/lib/utils";

function NavLink({
  item,
  active,
  collapsed,
  badge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const showBadge = typeof badge === "number" && badge > 0;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={item.label}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        collapsed && "md:justify-center md:px-0",
        active
          ? "bg-surface-active text-foreground"
          : "text-muted-foreground hover:bg-surface-active hover:text-foreground",
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className={cn("truncate", collapsed && "md:hidden")}>
        {item.label}
      </span>
      {showBadge ? (
        <span
          className={cn(
            "ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground",
            collapsed && "md:absolute md:right-1 md:top-1 md:ml-0",
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

type NavSectionProps = {
  title: string;
  items: NavItem[];
  collapsed: boolean;
  isActive: (href: string) => boolean;
  badges: Partial<Record<"unpaid" | "lowStock", number>>;
  onNavigate?: () => void;
};

function NavSection({
  title,
  items,
  collapsed,
  isActive,
  badges,
  onNavigate,
}: NavSectionProps) {
  return (
    <div className="space-y-1">
      <p
        className={cn(
          "px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
          collapsed && "md:hidden",
        )}
      >
        {title}
      </p>
      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isActive(item.href)}
          collapsed={collapsed}
          badge={item.badgeKey ? badges[item.badgeKey] : undefined}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();
  const { version } = useBcfRefresh();

  const badges = useMemo(() => {
    void version;
    const unpaid = countInvoicesByStatus().unpaid;
    const lowStock = listProducts().filter(
      (p) =>
        p.isActive &&
        (p.quantity <= 0 || (p.quantity > 0 && p.quantity <= p.minStock)),
    ).length;
    return { unpaid, lowStock };
  }, [version]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-label="Fermer le menu"
          onClick={closeMobile}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-64 flex-col border-r border-border bg-card transition-[width,transform] duration-200",
          "md:sticky md:top-0 md:h-dvh md:z-0",
          collapsed ? "md:w-[72px]" : "md:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-border px-3",
            collapsed ? "md:justify-center" : "justify-between",
          )}
        >
          <Link
            href="/"
            onClick={closeMobile}
            title={siteConfig.name}
            className="truncate text-lg font-bold tracking-tight text-primary"
          >
            <span className={cn(collapsed && "md:hidden")}>{siteConfig.name}</span>
            <span className={cn("hidden", collapsed && "md:inline")}>BCF</span>
          </Link>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-surface-active hover:text-foreground md:hidden"
            aria-label="Fermer"
            onClick={closeMobile}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-2 py-4">
          <NavSection
            title="Exploitation"
            items={mainNavigation}
            collapsed={collapsed}
            isActive={isActive}
            badges={badges}
            onNavigate={closeMobile}
          />
          <NavSection
            title="Finance"
            items={secondaryNavigation}
            collapsed={collapsed}
            isActive={isActive}
            badges={badges}
            onNavigate={closeMobile}
          />
        </nav>
      </aside>
    </>
  );
}
