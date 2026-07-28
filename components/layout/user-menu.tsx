"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { allNavigation } from "@/lib/constants/navigation";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  name: string;
  email: string;
};

export function UserMenu({ name, email }: UserMenuProps) {
  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover py-2 shadow-lg">
      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
      <Separator />
      <nav className="py-1">
        {allNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-surface-active hover:text-foreground"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <Separator />
      <div className="pt-1">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10",
          )}
        >
          <LogOut className="h-4 w-4" />
          Deconnexion
        </button>
      </div>
    </div>
  );
}
