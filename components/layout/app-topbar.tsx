"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Keyboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  getBreadcrumbs,
  getParentHref,
} from "@/lib/constants/navigation";
import { SALES_OPEN_SHORTCUTS_EVENT } from "@/lib/sales/events";
import { salesShortcuts } from "@/lib/sales/shortcuts";
import { useSidebar } from "@/components/layout/sidebar-context";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function AccountMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogoutClick = () => {
    setMenuOpen(false);
    setLogoutOpen(true);
  };

  const handleLogoutConfirm = async () => {
    // Auth a brancher plus tard
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          aria-label="Menu compte"
          aria-expanded={menuOpen}
        >
          B
        </button>
        {menuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label="Fermer le menu compte"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-popover py-2 shadow-card">
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-foreground">
                  Ben Djibril
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  bendjibril789@gmail.com
                </p>
              </div>
              <div className="border-t border-border pt-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                  onClick={handleLogoutClick}
                >
                  <LogOut className="h-4 w-4" />
                  Deconnexion
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Se deconnecter ?"
        description="Vous allez quitter votre session. Vous pourrez vous reconnecter a tout moment."
        confirmLabel="Se deconnecter"
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
}

function SalesShortcutsControl() {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setHelpOpen(true);
    window.addEventListener(SALES_OPEN_SHORTCUTS_EVENT, onOpen);
    return () => window.removeEventListener(SALES_OPEN_SHORTCUTS_EVENT, onOpen);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setHelpOpen(true)}
        aria-label="Afficher les raccourcis"
      >
        <Keyboard className="h-4 w-4" />
        <span className="hidden sm:inline">Raccourcis</span>
        <span className="text-[10px] text-muted-foreground">?</span>
      </Button>

      <Dialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        title="Raccourcis clavier"
        description="Optimises pour une caisse rapide au clavier et au scanner."
      >
        <ul className="space-y-2">
          {salesShortcuts.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">{item.label}</span>
              <span className="flex flex-wrap justify-end gap-1">
                {item.keys.map((key) => (
                  <kbd
                    key={`${item.label}-${key}`}
                    className="rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-foreground"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}

export function AppTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggleCollapsed, setMobileOpen } = useSidebar();
  const breadcrumbs = getBreadcrumbs(pathname);
  const parentHref = getParentHref(pathname);
  const current = breadcrumbs[breadcrumbs.length - 1];
  const parents = breadcrumbs.slice(0, -1);
  const isSalesPage = pathname === "/sales" || pathname.startsWith("/sales/");

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-md sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Ouvrir le menu"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="hidden md:inline-flex"
        aria-label={collapsed ? "Agrandir le menu" : "Reduire le menu"}
        onClick={toggleCollapsed}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-5 w-5" />
        ) : (
          <PanelLeftClose className="h-5 w-5" />
        )}
      </Button>

      {parentHref ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Retour"
          onClick={() => router.push(parentHref)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      ) : null}

      <nav
        aria-label="Fil d'Ariane"
        className="flex min-w-0 flex-1 items-center gap-1 text-sm"
      >
        {parents.map((crumb) => (
          <div
            key={crumb.href}
            className="hidden min-w-0 items-center gap-1 sm:flex"
          >
            <Link
              href={crumb.href}
              className="truncate text-muted-foreground transition-colors hover:text-foreground"
            >
              {crumb.label}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </div>
        ))}
        <span
          className={cn(
            "truncate font-bold text-foreground",
            parents.length > 0 && "sm:max-w-[50%]",
          )}
        >
          {current?.label}
        </span>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        {isSalesPage ? <SalesShortcutsControl /> : null}
        <ThemeToggle />
        <AccountMenu />
      </div>
    </header>
  );
}
