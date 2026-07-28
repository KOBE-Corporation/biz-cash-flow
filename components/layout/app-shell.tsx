"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { SidebarProvider } from "@/components/layout/sidebar-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background lg:h-svh lg:overflow-hidden">
        <AppSidebar />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AppTopbar />
          <main className="mx-auto w-full max-w-7xl min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-2 sm:px-3 sm:py-3 lg:px-3 lg:py-2">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
