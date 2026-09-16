"use client";

import { useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToastViewport, useToast } from "@/components/ui/toast";
import { dispatchBcfEvent, BCF_EVENTS } from "@/lib/events/bcf-events";
import {
  closeCashSession,
  getExpectedDrawerBalance,
  getOpenCashSession,
  openCashSession,
  suggestOpeningFloat,
} from "@/lib/repositories/cash-sessions";
import { formatCurrency } from "@/lib/utils";

type CashSessionBarProps = {
  compact?: boolean;
  onChanged?: () => void;
};

export function CashSessionBar({ compact, onChanged }: CashSessionBarProps) {
  const { toast, showToast } = useToast();
  const [floatInput, setFloatInput] = useState(String(suggestOpeningFloat()));
  const [countInput, setCountInput] = useState("");
  const [notes, setNotes] = useState("");
  const session = getOpenCashSession();

  const handleOpen = () => {
    const result = openCashSession({
      openingFloat: Math.round(Number(floatInput) || 0),
      notes: notes || undefined,
    });
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast(
      `Journee ${result.data.businessDate} ouverte — fonds ${formatCurrency(result.data.openingFloat)} (hors CA)`,
      "success",
    );
    dispatchBcfEvent(BCF_EVENTS.SESSION_OPENED, {
      businessDate: result.data.businessDate,
    });
    setNotes("");
    onChanged?.();
  };

  const handleClose = () => {
    if (!session) return;
    const counted =
      countInput.trim() === ""
        ? getExpectedDrawerBalance(session)
        : Math.round(Number(countInput) || 0);
    const result = closeCashSession({
      sessionId: session.id,
      countedCash: counted,
      notes: notes || undefined,
    });
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    const v = result.data.variance ?? 0;
    showToast(
      `Cloture ${result.data.businessDate} — ecart ${formatCurrency(v)}. Compteurs remis a 0 demain.`,
      v === 0 ? "success" : "error",
    );
    dispatchBcfEvent(BCF_EVENTS.SESSION_CLOSED, {
      businessDate: result.data.businessDate,
    });
    setFloatInput(String(result.data.closingCounted ?? 0));
    setCountInput("");
    setNotes("");
    onChanged?.();
  };

  if (session) {
    const expected = getExpectedDrawerBalance(session);
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Unlock className="h-4 w-4 text-success" />
              <p className="text-sm font-semibold">
                Caisse ouverte — {session.businessDate}
              </p>
              <Badge variant="success">OPEN</Badge>
            </div>
            {!compact ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Fonds monnaie {formatCurrency(session.openingFloat)} (hors CA) ·
                Tiroir theorique {formatCurrency(expected)} ·{" "}
                {session.openedByName}
              </p>
            ) : null}
          </div>
        </div>
        {!compact ? (
          <div className="mt-3 flex flex-wrap items-end gap-2">
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
              <Label className="text-[10px]">Note cloture</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-8 w-40 text-xs"
                placeholder="Optionnel"
              />
            </div>
            <Button
              size="sm"
              variant="destructive"
              className="h-8"
              onClick={handleClose}
            >
              Cloturer la journee
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 h-8"
            onClick={() => {
              if (!session) return;
              const counted = getExpectedDrawerBalance(session);
              const result = closeCashSession({
                sessionId: session.id,
                countedCash: counted,
              });
              if (!result.ok) {
                showToast(result.error, "error");
                return;
              }
              showToast(
                `Cloture ${result.data.businessDate} — ecart ${formatCurrency(result.data.variance ?? 0)}`,
                "success",
              );
              dispatchBcfEvent(BCF_EVENTS.SESSION_CLOSED, {
                businessDate: result.data.businessDate,
              });
              setFloatInput(String(result.data.closingCounted ?? 0));
              onChanged?.();
            }}
          >
            Cloturer (attendu)
          </Button>
        )}
        <ToastViewport toast={toast} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 print:hidden">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-warning" />
        <p className="text-sm font-semibold">Caisse fermee</p>
        <Badge variant="warning">CLOSED</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Ouvrez la journee avec un fonds monnaie. Ce montant ne compte pas dans
        le CA ni les taux (semaine / trimestre / annee).
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-[10px]">Fonds d&apos;ouverture</Label>
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
            placeholder="ex. Report veille"
          />
        </div>
        <Button size="sm" variant="success" className="h-8" onClick={handleOpen}>
          Ouvrir la journee
        </Button>
      </div>
      <ToastViewport toast={toast} />
    </div>
  );
}
