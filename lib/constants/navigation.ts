import {
  ArrowLeftRight,
  Boxes,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  List,
  ShoppingCart,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type BreadcrumbItem = {
  label: string;
  href: string;
};

export const mainNavigation: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Vente", href: "/sales", icon: CircleDollarSign },
  { label: "Produits", href: "/produits", icon: Boxes },
  { label: "Mouvements de stock", href: "/mouvements", icon: ArrowLeftRight },
  { label: "Categories", href: "/categories", icon: List },
  { label: "Fournisseurs", href: "/fournisseurs", icon: Truck },
];

export const secondaryNavigation: NavItem[] = [
  { label: "Factures", href: "/factures", icon: FileText },
  { label: "Achats", href: "/achats", icon: ShoppingCart },
  { label: "Comptabilite", href: "/comptabilite", icon: Wallet },
];

export const allNavigation: NavItem[] = [
  ...mainNavigation,
  ...secondaryNavigation,
];

const segmentLabels: Record<string, string> = {
  sales: "Vente",
  produits: "Produits",
  mouvements: "Mouvements de stock",
  categories: "Categories",
  fournisseurs: "Fournisseurs",
  factures: "Factures",
  achats: "Achats",
  comptabilite: "Comptabilite",
  nouveau: "Nouveau",
  edit: "Modifier",
};

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === "/") {
    return mainNavigation.find((item) => item.href === "/");
  }

  return allNavigation
    .filter((item) => item.href !== "/")
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === "/") {
    return [{ label: "Dashboard", href: "/" }];
  }

  const crumbs: BreadcrumbItem[] = [{ label: "Dashboard", href: "/" }];
  const segments = pathname.split("/").filter(Boolean);
  let href = "";

  for (const segment of segments) {
    href += `/${segment}`;
    const navMatch = allNavigation.find((item) => item.href === href);
    crumbs.push({
      label: navMatch?.label ?? segmentLabels[segment] ?? titleCase(segment),
      href,
    });
  }

  return crumbs;
}

export function getParentHref(pathname: string): string | null {
  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return "/";

  return `/${segments.slice(0, -1).join("/")}`;
}
