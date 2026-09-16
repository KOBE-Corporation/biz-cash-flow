import {
  ArrowLeftRight,
  Boxes,
  CircleDollarSign,
  ClipboardList,
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
  /** Compteur dynamique optionnel (impayees, stock…). */
  badgeKey?: "unpaid" | "lowStock";
};

export type BreadcrumbItem = {
  label: string;
  href: string;
};

export const mainNavigation: NavItem[] = [
  { label: "Tableau de bord", href: "/", icon: LayoutDashboard },
  { label: "Vente", href: "/sales", icon: CircleDollarSign },
  { label: "Factures", href: "/factures", icon: FileText, badgeKey: "unpaid" },
  { label: "Produits", href: "/produits", icon: Boxes, badgeKey: "lowStock" },
  { label: "Categories", href: "/categories", icon: List },
  { label: "Mouvements", href: "/mouvements", icon: ArrowLeftRight },
  { label: "Fournisseurs", href: "/fournisseurs", icon: Truck },
];

export const secondaryNavigation: NavItem[] = [
  { label: "Achats", href: "/achats", icon: ShoppingCart },
  { label: "Comptabilite", href: "/comptabilite", icon: Wallet },
  { label: "Activite", href: "/activite", icon: ClipboardList },
];

export const allNavigation: NavItem[] = [
  ...mainNavigation,
  ...secondaryNavigation,
];

const segmentLabels: Record<string, string> = {
  sales: "Vente",
  produits: "Produits",
  mouvements: "Mouvements",
  categories: "Categories",
  fournisseurs: "Fournisseurs",
  factures: "Factures",
  achats: "Achats",
  comptabilite: "Comptabilite",
  activite: "Activite",
  stock: "Alertes stock",
  sorties: "Sorties caisse",
  entrees: "Entrees caisse",
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
    return [{ label: "Tableau de bord", href: "/" }];
  }

  const crumbs: BreadcrumbItem[] = [{ label: "Tableau de bord", href: "/" }];
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
