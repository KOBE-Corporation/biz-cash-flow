"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { mainNavigation, secondaryNavigation } from "@/lib/constants/navigation";
import { siteConfig } from "@/lib/constants/site";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

export function AppNavbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 text-xl font-bold tracking-tight text-primary"
        >
          {siteConfig.name}
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {mainNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          <div className="relative group">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Plus
              <ChevronDown className="h-4 w-4" />
            </button>
            <div className="invisible absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
              {secondaryNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50",
                    isActive(item.href) && "bg-primary/5 text-primary",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
              aria-label="Menu utilisateur"
            >
              B
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  aria-label="Fermer le menu"
                  onClick={() => setMenuOpen(false)}
                />
                <UserMenu
                  name="Ben Djibril"
                  email="bendjibril789@gmail.com"
                />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
