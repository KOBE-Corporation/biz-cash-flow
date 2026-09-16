import { createId, getStore, touch } from "@/lib/mock/store";
import { getActor, recordAudit } from "@/lib/repositories/audit";
import { postCashEntry, listCashLedgerForDay } from "@/lib/repositories/cash-ledger";
import {
  endOfBusinessDay,
  parseBusinessDate,
  startOfBusinessDay,
  sumOperationalCash,
  toBusinessDate,
} from "@/lib/cash/pnl";
import type { CashSession, RepoResult } from "@/lib/types";

export function listCashSessions() {
  return [...getStore().cashSessions].sort((a, b) =>
    b.businessDate.localeCompare(a.businessDate),
  );
}

export function getOpenCashSession() {
  return getStore().cashSessions.find((s) => s.status === "OPEN") ?? null;
}

export function getCashSessionForDate(date = new Date()) {
  const key = toBusinessDate(date);
  return (
    getStore().cashSessions.find((s) => s.businessDate === key) ?? null
  );
}

export function getLastClosedSession() {
  return (
    listCashSessions().find((s) => s.status === "CLOSED") ?? null
  );
}

/** Suggestion de fonds pour ouvrir : report du comptage de la veille. */
export function suggestOpeningFloat() {
  const last = getLastClosedSession();
  if (last?.closingCounted != null) return last.closingCounted;
  return 0;
}

/**
 * Solde theorique du tiroir pour une session :
 * openingFloat + mouvements operationnels du jour
 * (FLOAT ledger optionnel deja inclus via openingFloat, pas double-compte).
 */
export function getExpectedDrawerBalance(session: CashSession, now = new Date()) {
  const day = parseBusinessDate(session.businessDate);
  const ledger = listCashLedgerForDay(day).filter((e) => {
    // Ne compter que les mouvements pendant la session ouverte
    if (e.occurredAt < session.openedAt) return false;
    if (session.closedAt && e.occurredAt > session.closedAt) return false;
    // Exclure FLOAT_* du ledger si on utilise openingFloat comme source de verite
    if (e.sourceType === "FLOAT_IN" || e.sourceType === "FLOAT_OUT") return false;
    void now;
    return true;
  });
  const ops = sumOperationalCash(ledger);
  return session.openingFloat + ops.operationalNet;
}

export function openCashSession(input: {
  openingFloat: number;
  notes?: string;
  businessDate?: Date;
}): RepoResult<CashSession> {
  const store = getStore();
  const existingOpen = getOpenCashSession();
  if (existingOpen) {
    return {
      ok: false,
      error: `Une session est deja ouverte (${existingOpen.businessDate}). Cloturez-la d'abord.`,
    };
  }

  const businessDate = toBusinessDate(input.businessDate ?? new Date());
  const already = store.cashSessions.find(
    (s) => s.businessDate === businessDate,
  );
  if (already) {
    return {
      ok: false,
      error: `Une session existe deja pour ${businessDate}. Une seule journee = un compteur.`,
    };
  }

  const float = Math.max(0, Math.round(input.openingFloat));
  const actor = getActor();
  const now = touch();
  const last = getLastClosedSession();

  const session: CashSession = {
    id: createId("cs"),
    businessDate,
    status: "OPEN",
    openingFloat: float,
    openedAt: now,
    openedById: actor.id,
    openedByName: actor.name,
    openingNotes: input.notes?.trim() || undefined,
    carriedFromSessionId: last?.id,
  };

  store.cashSessions.unshift(session);

  // Trace ledger FLOAT_IN pour l'audit du tiroir — exclu du CA (voir pnl.ts)
  if (float > 0) {
    postCashEntry({
      direction: "IN",
      amount: float,
      label: `Fonds d'ouverture ${businessDate}`,
      description:
        "Monnaie / report veille — hors CA et hors taux periodiques",
      sourceType: "FLOAT_IN",
      sourceId: session.id,
      reference: session.id,
      occurredAt: now,
    });
  }

  recordAudit({
    action: "OPEN_SESSION",
    entityType: "CashSession",
    entityId: session.id,
    summary: `Ouverture caisse ${businessDate} — fonds ${float}`,
    metadata: { openingFloat: float, carriedFrom: last?.id },
  });

  return { ok: true, data: session };
}

export function closeCashSession(input: {
  sessionId: string;
  countedCash: number;
  notes?: string;
}): RepoResult<CashSession> {
  const store = getStore();
  const index = store.cashSessions.findIndex((s) => s.id === input.sessionId);
  if (index < 0) return { ok: false, error: "Session introuvable" };

  const current = store.cashSessions[index];
  if (current.status !== "OPEN") {
    return { ok: false, error: "Session deja cloturee" };
  }

  const counted = Math.max(0, Math.round(input.countedCash));
  const expected = getExpectedDrawerBalance(current);
  const variance = counted - expected;
  const actor = getActor();
  const now = touch();

  // FLOAT_OUT = on « sort » le fonds pour le report (hors PnL)
  // Montant = counted (ce qui reste dans le tiroir pour demain)
  if (counted > 0) {
    postCashEntry({
      direction: "OUT",
      amount: counted,
      label: `Fonds de cloture ${current.businessDate}`,
      description:
        "Report monnaie pour le lendemain — hors CA et hors taux",
      sourceType: "FLOAT_OUT",
      sourceId: current.id,
      reference: current.id,
      occurredAt: now,
    });
  }

  const updated: CashSession = {
    ...current,
    status: "CLOSED",
    closingCounted: counted,
    expectedAtClose: expected,
    variance,
    closedAt: now,
    closedById: actor.id,
    closedByName: actor.name,
    closingNotes: input.notes?.trim() || undefined,
  };
  store.cashSessions[index] = updated;

  recordAudit({
    action: "CLOSE_SESSION",
    entityType: "CashSession",
    entityId: updated.id,
    summary: `Cloture caisse ${updated.businessDate} — ecart ${variance}`,
    metadata: { counted, expected, variance },
  });

  return { ok: true, data: updated };
}

export type PeriodKey = "day" | "week" | "month" | "quarter" | "year";

export function getPeriodRange(period: PeriodKey, anchor = new Date()) {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  if (period === "day") {
    return { start, end, label: toBusinessDate(anchor) };
  }

  if (period === "week") {
    const day = (start.getDay() + 6) % 7; // lundi = 0
    start.setDate(start.getDate() - day);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
    return { start, end, label: `Semaine du ${toBusinessDate(start)}` };
  }

  if (period === "month") {
    start.setDate(1);
    end.setTime(start.getTime());
    end.setMonth(end.getMonth() + 1);
    return {
      start,
      end,
      label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    };
  }

  if (period === "quarter") {
    const q = Math.floor(start.getMonth() / 3);
    start.setMonth(q * 3, 1);
    end.setTime(start.getTime());
    end.setMonth(end.getMonth() + 3);
    return { start, end, label: `T${q + 1} ${start.getFullYear()}` };
  }

  // year
  start.setMonth(0, 1);
  end.setTime(start.getTime());
  end.setFullYear(end.getFullYear() + 1);
  return { start, end, label: String(start.getFullYear()) };
}

/**
 * KPIs periodiques : uniquement mouvements operationnels + ventes payees.
 * Le float n'entre jamais dans les taux.
 */
export function getPeriodStats(period: PeriodKey, anchor = new Date()) {
  const { start, end, label } = getPeriodRange(period, anchor);
  const store = getStore();

  const ledger = store.cashLedger.filter(
    (e) => e.occurredAt >= start && e.occurredAt < end,
  );
  const ops = sumOperationalCash(ledger);

  const sales = store.invoices.filter((inv) => {
    if (inv.status === "CANCELLED") return false;
    const t = new Date(inv.issuedAt);
    return t >= start && t < end && (inv.amountPaid ?? 0) > 0;
  });
  const salesTotal = sales.reduce((s, i) => s + (i.amountPaid ?? 0), 0);
  const salesCount = sales.length;

  const sessions = store.cashSessions.filter((s) => {
    const d = parseBusinessDate(s.businessDate);
    return d >= start && d < end;
  });

  const avgDailySales =
    period === "day"
      ? salesTotal
      : salesTotal /
        Math.max(
          1,
          Math.ceil((end.getTime() - start.getTime()) / (24 * 3600 * 1000)),
        );

  return {
    period,
    label,
    start,
    end,
    salesTotal,
    salesCount,
    operationalIn: ops.operationalIn,
    operationalOut: ops.operationalOut,
    operationalNet: ops.operationalNet,
    /** Taux / rythme : CA moyen par jour sur la periode. */
    avgDailySales: Math.round(avgDailySales),
    /** Ne pas utiliser float pour les taux. */
    floatExcluded: true as const,
    sessionsCount: sessions.length,
    openSessions: sessions.filter((s) => s.status === "OPEN").length,
  };
}

export function requireOpenSessionForSale(): RepoResult<CashSession> {
  const open = getOpenCashSession();
  if (!open) {
    return {
      ok: false,
      error:
        "Aucune session de caisse ouverte. Ouvrez la journee (avec fonds monnaie) avant de vendre.",
    };
  }
  const today = toBusinessDate(new Date());
  if (open.businessDate !== today) {
    return {
      ok: false,
      error: `Session ouverte pour ${open.businessDate}. Cloturez-la puis ouvrez ${today}.`,
    };
  }
  return { ok: true, data: open };
}

// re-export helpers used by UI
export { startOfBusinessDay, endOfBusinessDay, toBusinessDate };
