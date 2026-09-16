"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error" | "info";

export type ToastState = {
  message: string;
  tone: ToastTone;
} | null;

export function useToast(durationMs = 3200) {
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

/**
 * Toast global : toujours monte sur `document.body` au-dessus des dialogs (z-200).
 */
export function ToastViewport({ toast, className }: ToastViewportProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!toast || !mounted) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed bottom-5 left-1/2 z-[9999] w-[min(92vw,28rem)] -translate-x-1/2 rounded-full border px-4 py-2.5 text-sm shadow-card",
        toast.tone === "success" &&
          "border-success/40 bg-success text-success-foreground",
        toast.tone === "error" &&
          "border-destructive/40 bg-destructive text-destructive-foreground",
        toast.tone === "info" && "border-border bg-popover text-foreground",
        className,
      )}
    >
      <span className="block truncate text-center font-medium">
        {toast.message}
      </span>
    </div>,
    document.body,
  );
}
