"use client";

import { useCallback, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/dialog";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive" | "warning";
};

type DialogConfig = Omit<ConfirmOptions, never> & {
  open: boolean;
};

const initialConfig: DialogConfig = {
  open: false,
  title: "",
  description: undefined,
  confirmLabel: "Confirmer",
  cancelLabel: "Annuler",
  variant: "default",
};

/**
 * Confirmation declarative pour operations sensibles.
 *
 * @example
 * const { confirm, dialog } = useConfirmDialog();
 * const ok = await confirm({
 *   title: "Supprimer ?",
 *   description: "Action irreversible.",
 *   variant: "destructive",
 * });
 * if (ok) { ... }
 * return <>{dialog}...</>
 */
export function useConfirmDialog() {
  const [config, setConfig] = useState<DialogConfig>(initialConfig);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setConfig({
        open: true,
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel ?? "Confirmer",
        cancelLabel: options.cancelLabel ?? "Annuler",
        variant: options.variant ?? "default",
      });
    });
  }, []);

  const finish = useCallback((confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setConfig(initialConfig);
  }, []);

  const dialog = (
    <ConfirmDialog
      open={config.open}
      onOpenChange={(open) => {
        if (!open) finish(false);
      }}
      title={config.title}
      description={config.description}
      confirmLabel={config.confirmLabel}
      cancelLabel={config.cancelLabel}
      variant={config.variant}
      onConfirm={async () => {
        finish(true);
      }}
    />
  );

  return { confirm, dialog };
}
