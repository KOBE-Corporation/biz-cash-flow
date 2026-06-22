"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { allNavigation } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  name: string;
  email: string;
};

export function UserMenu({ name, email }: UserMenuProps) {
  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{name}</p>
        <p className="truncate text-xs text-slate-500">{email}</p>
      </div>
      <nav className="py-1">
        {allNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-slate-100 pt-1">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50",
          )}
        >
          <LogOut className="h-4 w-4" />
          Deconnexion
        </button>
      </div>
    </div>
  );
}
