"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error" | "info";

export type ToastState = {
  message: string;
  tone: ToastTone;
} | null;

export function useToast(durationMs = 2800) {
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), durationMs);
    return () => window.clearTimeout(timer);
  }, [toast, durationMs]);

  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    setToast({ message, tone });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  return { toast, showToast, clearToast };
}

type ToastViewportProps = {
  toast: ToastState;
  className?: string;
};

export function ToastViewport({ toast, className }: ToastViewportProps) {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed bottom-4 left-1/2 z-[300] max-w-[min(90vw,28rem)] -translate-x-1/2 rounded-full border px-4 py-2.5 text-sm shadow-card",
        toast.tone === "success" &&
          "border-success/40 bg-success text-success-foreground",
        toast.tone === "error" &&
          "border-destructive/40 bg-destructive text-destructive-foreground",
        toast.tone === "info" &&
          "border-border bg-popover text-foreground",
        className,
      )}
    >
      <span className="block truncate text-center">{toast.message}</span>
    </div>
  );
}
