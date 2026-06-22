import {
  ArrowLeftRight,
  Boxes,
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

export const mainNavigation: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
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
