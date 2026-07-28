"use client";

import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>");
  return ctx;
}

type TabsProps = {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
};

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className,
}: TabsProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = controlledValue ?? uncontrolled;

  const setValue = (next: string) => {
    if (controlledValue === undefined) setUncontrolled(next);
    onValueChange?.(next);
  };

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex w-full gap-1 rounded-full bg-surface-2 p-1",
        className,
      )}
      {...props}
    />
  );
}

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export function TabsTrigger({
  className,
  value,
  ...props
}: TabsTriggerProps) {
  const { value: active, setValue } = useTabs();
  const isActive = active === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={cn(
        "flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-card text-foreground shadow-card"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={() => setValue(value)}
      {...props}
    />
  );
}

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
};

export function TabsContent({
  className,
  value,
  ...props
}: TabsContentProps) {
  const { value: active } = useTabs();
  if (active !== value) return null;

  return (
    <div
      role="tabpanel"
      className={cn("mt-4 outline-none", className)}
      {...props}
    />
  );
}
