"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  showClose?: boolean;
  /** Remplace le bloc titre / description par defaut. */
  header?: React.ReactNode;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  showClose = true,
  header,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const mounted = typeof document !== "undefined";

  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChangeRef.current(false);
    };

    window.addEventListener("keydown", onKeyDown);
    // Focus initial uniquement a l'ouverture — pas a chaque re-render parent
    // (sinon les inputs perdent le curseur apres chaque caractere).
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        aria-label="Fermer la boite de dialogue"
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description && !header ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative z-[201] flex w-full max-w-md flex-col overflow-hidden border border-border bg-card shadow-card outline-none",
          "max-h-[min(100dvh,100%)] rounded-t-2xl",
          "sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl",
          "pb-[env(safe-area-inset-bottom)]",
          className,
        )}
      >
        <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          {header ? (
            <>
              <h2 id={titleId} className="sr-only">
                {title}
              </h2>
              <div className="min-w-0 flex-1">{header}</div>
            </>
          ) : (
            <div className="min-w-0 space-y-1.5">
              <h2
                id={titleId}
                className="text-base font-semibold text-foreground sm:text-lg"
              >
                {title}
              </h2>
              {description ? (
                <p
                  id={descriptionId}
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {description}
                </p>
              ) : null}
            </div>
          )}
          {showClose ? (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 h-8 w-8 shrink-0 sm:right-4 sm:top-4"
              aria-label="Fermer"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        {children ? (
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            {children}
          </div>
        ) : null}

        {footer ? (
          <div className="shrink-0 border-t border-border bg-card px-4 py-4 sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive" | "warning";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel: _cancelLabel = "Annuler",
  variant = "default",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  const iconTone =
    variant === "destructive"
      ? "bg-destructive/15 text-destructive"
      : variant === "warning"
        ? "bg-warning/15 text-warning"
        : "bg-primary/15 text-primary";

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      showClose={!loading}
      header={
        <div className="flex w-full flex-col items-center gap-3 px-6 pt-1 text-center">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              iconTone,
            )}
            aria-hidden
          >
            <AlertTriangle className="h-6 w-6" strokeWidth={2} />
          </div>
          <p className="text-base font-semibold text-foreground sm:text-lg">
            {title}
          </p>
        </div>
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={loading}
            className={cn(
              "w-full sm:w-auto",
              variant === "warning" &&
                "bg-warning text-warning-foreground hover:bg-warning/90",
            )}
            onClick={handleConfirm}
          >
            {loading ? "Patientez..." : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-center sm:text-left">
        <p className="text-sm leading-relaxed text-foreground">
          Cette operation entrainera une{" "}
          <span className="font-medium">modification de la comptabilite</span>
          {" "}(ventes, achats, marges ou stock valorise).
        </p>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Verifiez bien avant de confirmer : l&apos;action peut etre difficile
            a reverser.
          </p>
        )}
      </div>
    </Dialog>
  );
}
