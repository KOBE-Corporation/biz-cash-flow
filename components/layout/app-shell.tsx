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
          <main className="mx-auto w-full max-w-7xl min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
