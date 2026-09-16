"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BCF_SYNC_EVENTS,
  type BcfEventName,
} from "@/lib/events/bcf-events";

/**
 * Force un re-render quand le store mock change (ventes, factures, stock…)
 * ou quand l'onglet redevient visible.
 */
export function useBcfRefresh(
  events: readonly BcfEventName[] = BCF_SYNC_EVENTS,
) {
  const [version, setVersion] = useState(0);
  const [mounted, setMounted] = useState(false);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") bump();
    };

    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", onVisible);
    for (const name of events) {
      window.addEventListener(name, bump);
    }

    return () => {
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", onVisible);
      for (const name of events) {
        window.removeEventListener(name, bump);
      }
    };
  }, [mounted, bump, events]);

  return { version, mounted, bump };
}
