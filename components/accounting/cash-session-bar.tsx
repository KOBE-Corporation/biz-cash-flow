"use client";

import { useEffect, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToastViewport, useToast } from "@/components/ui/toast";
import { dispatchBcfEvent, BCF_EVENTS } from "@/lib/events/bcf-events";
import {
  closeCashSession,
  ensureTodayCashSession,
  getExpectedDrawerBalance,
  getOpenCashSession,
  openCashSession,
  suggestOpeningFloat,
  type EnsureDayResult,
} from "@/lib/repositories/cash-sessions";
import { formatCurrency } from "@/lib/utils";

type CashSessionBarProps = {
  /** Mode vente : discret. Mode compta : cloture accessible. */
  variant?: "sales" | "accounting";
  onChanged?: () => void;
};

/**
 * - Premiere fois : formulaire fonds initial (seul moment ou le gros bandeau s'affiche).
 * - Ensuite : bascule auto a minuit (fonds reportes, hors CA) — pas de spam UI.
 * - Vente : rien si session OK ; Comptabilite : ligne discrete + cloture manuelle.
 */
export function CashSessionBar({
  variant = "sales",
  onChanged,
}: CashSessionBarProps) {
  const { toast, showToast } = useToast();
  const [floatInput, setFloatInput] = useState("0");
  const [countInput, setCountInput] = useState("");
  const [notes, setNotes] = useState("");
  const [ensured, setEnsured] = useState<EnsureDayResult | null>(null);
  const [showClosePanel, setShowClosePanel] = useState(false);
  const [, setTick] = useState(0);

  const refresh = (opts?: { silent?: boolean }) => {
    const result = ensureTodayCashSession();
    setEnsured(result);
    setFloatInput(String(suggestOpeningFloat()));
    if (result.rolledOver && result.message && !opts?.silent) {
      showToast(result.message, "success");
      dispatchBcfEvent(BCF_EVENTS.SESSION_OPENED, {
        businessDate: result.session?.businessDate,
        auto: true,
      });
      onChanged?.();
    }
    setTick((t) => t + 1);
  };

  useEffect(() => {
    refresh({ silent: false });
    // Verifie le changement de jour (onglet revenu / chaque minute)
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh({ silent: false });
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => refresh({ silent: true }), 60_000);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const session = getOpenCashSession() ?? (ensured?.session?.status === "OPEN" ? ensured.session : null);
  const needsFirstOpen = ensured?.needsFirstOpen ?? false;
  const todayClosed =
    ensured?.session?.status === "CLOSED" && !session;

  const handleOpen = () => {
    const result = openCashSession({
      openingFloat: Math.round(Number(floatInput) || 0),
      notes: notes || "Fonds initial",
    });
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast(
      `Caisse demarree — fonds ${formatCurrency(result.data.openingFloat)} (hors CA). Les jours suivants basculent seuls a minuit.`,
      "success",
    );
    dispatchBcfEvent(BCF_EVENTS.SESSION_OPENED, {
      businessDate: result.data.businessDate,
    });
    setNotes("");
    setEnsured({
      session: result.data,
      needsFirstOpen: false,
      rolledOver: false,
    });
    onChanged?.();
  };

  const handleClose = (countedOverride?: number) => {
    const open = getOpenCashSession();
    if (!open) return;
    const expected = getExpectedDrawerBalance(open);
    const counted =
      countedOverride ??
      (countInput.trim() === ""
        ? expected
        : Math.round(Number(countInput) || 0));
    const result = closeCashSession({
      sessionId: open.id,
      countedCash: counted,
      notes: notes || undefined,
    });
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    const v = result.data.variance ?? 0;
    showToast(
      `Journee cloturee — ecart ${formatCurrency(v)}. Demain le fonds ${formatCurrency(counted)} sera reporte auto (hors CA).`,
      v === 0 ? "success" : "error",
    );
    dispatchBcfEvent(BCF_EVENTS.SESSION_CLOSED, {
      businessDate: result.data.businessDate,
    });
    setCountInput("");
    setNotes("");
    setShowClosePanel(false);
    setEnsured({
      session: result.data,
      needsFirstOpen: false,
      rolledOver: false,
    });
    onChanged?.();
  };

  // Premiere fois uniquement : gros bandeau
  if (needsFirstOpen && !session) {
    return (
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 print:hidden">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-warning" />
          <p className="text-sm font-semibold">Premier demarrage caisse</p>
          <Badge variant="warning">1×</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Indiquez l&apos;argent deja present (monnaie). Ce fonds ne compte
          pas dans le CA. Ensuite, chaque jour a 23h59 bascule seul : l&apos;argent
          reste en caisse comme fonds du lendemain, sans dupliquer les comptes.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Fonds initial</Label>
            <Input
              type="number"
              min={0}
              value={floatInput}
              onChange={(e) => setFloatInput(e.target.value)}
              className="h-8 w-32 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Note</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 w-40 text-xs"
              placeholder="ex. Fond de caisse"
            />
          </div>
          <Button size="sm" variant="success" className="h-8" onClick={handleOpen}>
            Demarrer
          </Button>
        </div>
        <ToastViewport toast={toast} />
      </div>
    );
  }

  // Vente : silencieux si tout va bien
  if (variant === "sales") {
    if (session) {
      return <ToastViewport toast={toast} />;
    }
    if (todayClosed) {
      return (
        <div className="mb-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground print:hidden">
          Journee cloturee — ventes desactivees jusqu&apos;a demain (report auto
          des fonds).
          <ToastViewport toast={toast} />
        </div>
      );
    }
    return <ToastViewport toast={toast} />;
  }

  // Comptabilite : ligne discrete + cloture optionnelle
  if (session) {
    const expected = getExpectedDrawerBalance(session);
    return (
      <div className="rounded-xl border border-border bg-card p-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Unlock className="h-4 w-4 text-success" />
            <p className="text-sm font-medium">
              Journee {session.businessDate}
            </p>
            <Badge variant="success">Ouverte</Badge>
            <span className="text-xs text-muted-foreground">
              Fonds {formatCurrency(session.openingFloat)} (hors CA) · Tiroir{" "}
              {formatCurrency(expected)}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => setShowClosePanel((v) => !v)}
          >
            {showClosePanel ? "Masquer" : "Cloturer…"}
          </Button>
        </div>
        {showClosePanel ? (
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
            <div className="space-y-1">
              <Label className="text-[10px]">Comptage physique</Label>
              <Input
                type="number"
                min={0}
                value={countInput}
                placeholder={String(expected)}
                onChange={(e) => setCountInput(e.target.value)}
                className="h-8 w-32 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Note</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-8 w-40 text-xs"
              />
            </div>
            <Button
              size="sm"
              variant="destructive"
              className="h-8"
              onClick={() => handleClose()}
            >
              Cloturer maintenant
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => handleClose(expected)}
            >
              Cloturer (attendu)
            </Button>
          </div>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">
            A 23h59 la journee bascule seule : l&apos;argent reste en caisse
            comme fonds du lendemain, sans entrer dans le CA ni les taux.
          </p>
        )}
        <ToastViewport toast={toast} />
      </div>
    );
  }

  if (todayClosed && ensured?.session) {
    return (
      <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm print:hidden">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            Journee {ensured.session.businessDate} cloturee
          </span>
          <Badge variant="outline">CLOSED</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Fonds reportes demain :{" "}
          {formatCurrency(ensured.session.closingCounted ?? 0)} (hors CA).
        </p>
        <ToastViewport toast={toast} />
      </div>
    );
  }

  return <ToastViewport toast={toast} />;
}
