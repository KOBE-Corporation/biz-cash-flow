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
  return listCashSessions().find((s) => s.status === "CLOSED") ?? null;
}

export function hasEverHadCashSession() {
  return getStore().cashSessions.length > 0;
}

/** Suggestion de fonds : comptage / attendu de la derniere cloture. */
export function suggestOpeningFloat() {
  const last = getLastClosedSession();
  if (last?.closingCounted != null) return last.closingCounted;
  const open = getOpenCashSession();
  if (open) return getExpectedDrawerBalance(open);
  return 0;
}

/**
 * Solde theorique du tiroir pour une session :
 * openingFloat + mouvements operationnels du jour (FLOAT_* exclus).
 */
export function getExpectedDrawerBalance(session: CashSession, now = new Date()) {
  const day = parseBusinessDate(session.businessDate);
  const ledger = listCashLedgerForDay(day).filter((e) => {
    if (e.occurredAt < session.openedAt) return false;
    if (session.closedAt && e.occurredAt > session.closedAt) return false;
    if (e.sourceType === "FLOAT_IN" || e.sourceType === "FLOAT_OUT") return false;
    void now;
    return true;
  });
  const ops = sumOperationalCash(ledger);
  return session.openingFloat + ops.operationalNet;
}

export type EnsureDayResult = {
  session: CashSession | null;
  /** Afficher le formulaire d'ouverture (premiere fois seulement). */
  needsFirstOpen: boolean;
  /** Une bascule auto minuit a eu lieu. */
  rolledOver: boolean;
  /** Message court pour toast (optionnel). */
  message?: string;
};

/**
 * Garantit une session pour la date metier du jour, sans fausser le CA :
 * - Premiere utilisation → needsFirstOpen (UI fonds initial)
 * - Session ouverte d'un jour precedent → cloture auto 23:59 + nouvelle journee
 *   avec l'argent restant comme fonds (hors CA)
 * - Session du jour deja ouverte → silencieux
 * - Journee deja cloturee manuellement → pas de reouverture auto
 */
export function ensureTodayCashSession(now = new Date()): EnsureDayResult {
  const today = toBusinessDate(now);
  const todaySession = getCashSessionForDate(now);

  if (todaySession?.status === "OPEN") {
    return { session: todaySession, needsFirstOpen: false, rolledOver: false };
  }

  if (todaySession?.status === "CLOSED") {
    return {
      session: todaySession,
      needsFirstOpen: false,
      rolledOver: false,
      message: `Journee ${today} deja cloturee`,
    };
  }

  const open = getOpenCashSession();
  if (open && open.businessDate < today) {
    const carried = getExpectedDrawerBalance(open, now);
    const closeAt = new Date(endOfBusinessDay(open.businessDate).getTime() - 1);
    const closed = closeCashSession({
      sessionId: open.id,
      countedCash: carried,
      notes: "Cloture automatique 23:59 — report fonds en caisse",
      closedAt: closeAt,
      auto: true,
    });
    if (!closed.ok) {
      return {
        session: open,
        needsFirstOpen: false,
        rolledOver: false,
        message: closed.error,
      };
    }

    const opened = openCashSession({
      openingFloat: carried,
      notes: "Ouverture automatique — fonds reportes (hors CA)",
      businessDate: now,
      openedAt: startOfBusinessDay(now),
      auto: true,
      carriedFromSessionId: closed.data.id,
    });
    if (!opened.ok) {
      return {
        session: null,
        needsFirstOpen: false,
        rolledOver: true,
        message: opened.error,
      };
    }

    return {
      session: opened.data,
      needsFirstOpen: false,
      rolledOver: true,
      message: `Nouvelle journee ${today} — fonds reportes ${carried} (hors CA)`,
    };
  }

  if (open && open.businessDate === today) {
    return { session: open, needsFirstOpen: false, rolledOver: false };
  }

  // Pas de session aujourd'hui : report depuis derniere cloture ?
  if (!hasEverHadCashSession()) {
    return { session: null, needsFirstOpen: true, rolledOver: false };
  }

  const last = getLastClosedSession();
  const float = last?.closingCounted ?? 0;
  const opened = openCashSession({
    openingFloat: float,
    notes: last
      ? `Ouverture auto — report ${last.businessDate}`
      : "Ouverture automatique",
    businessDate: now,
    openedAt: startOfBusinessDay(now),
    auto: true,
    carriedFromSessionId: last?.id,
  });

  if (!opened.ok) {
    return {
      session: null,
      needsFirstOpen: true,
      rolledOver: false,
      message: opened.error,
    };
  }

  return {
    session: opened.data,
    needsFirstOpen: false,
    rolledOver: true,
    message: `Journee ${today} ouverte — fonds ${float} reportes (hors CA)`,
  };
}

export function openCashSession(input: {
  openingFloat: number;
  notes?: string;
  businessDate?: Date;
  openedAt?: Date;
  auto?: boolean;
  carriedFromSessionId?: string;
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
  const openedAt = input.openedAt ?? now;
  const last = getLastClosedSession();

  const session: CashSession = {
    id: createId("cs"),
    businessDate,
    status: "OPEN",
    openingFloat: float,
    openedAt,
    openedById: actor.id,
    openedByName: actor.name,
    openingNotes: input.notes?.trim() || undefined,
    carriedFromSessionId: input.carriedFromSessionId ?? last?.id,
  };

  store.cashSessions.unshift(session);

  // FLOAT_IN : audit tiroir uniquement — exclu du CA / taux (pnl.ts)
  // Date = debut de journee metier pour ne pas polluer la veille
  if (float > 0) {
    postCashEntry({
      direction: "IN",
      amount: float,
      label: input.auto
        ? `Fonds reportes ${businessDate}`
        : `Fonds d'ouverture ${businessDate}`,
      description:
        "Monnaie en caisse (report) — hors CA et hors taux periodiques",
      sourceType: "FLOAT_IN",
      sourceId: session.id,
      reference: session.id,
      occurredAt: openedAt,
    });
  }

  recordAudit({
    action: "OPEN_SESSION",
    entityType: "CashSession",
    entityId: session.id,
    summary: input.auto
      ? `Ouverture auto caisse ${businessDate} — fonds ${float}`
      : `Ouverture caisse ${businessDate} — fonds ${float}`,
    metadata: {
      openingFloat: float,
      carriedFrom: session.carriedFromSessionId,
      auto: !!input.auto,
    },
  });

  return { ok: true, data: session };
}

export function closeCashSession(input: {
  sessionId: string;
  countedCash: number;
  notes?: string;
  closedAt?: Date;
  auto?: boolean;
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
  const closedAt = input.closedAt ?? now;

  // FLOAT_OUT = report comptable du tiroir (l'argent reste physiquement).
  // Date = fin de journee metier pour rester dans les comptes du bon jour,
  // sans entrer dans le CA (filtre FLOAT_*).
  if (counted > 0) {
    postCashEntry({
      direction: "OUT",
      amount: counted,
      label: input.auto
        ? `Report fonds ${current.businessDate}`
        : `Fonds de cloture ${current.businessDate}`,
      description:
        "Argent restant en caisse pour le lendemain — hors CA / hors taux",
      sourceType: "FLOAT_OUT",
      sourceId: current.id,
      reference: current.id,
      occurredAt: closedAt,
    });
  }

  const updated: CashSession = {
    ...current,
    status: "CLOSED",
    closingCounted: counted,
    expectedAtClose: expected,
    variance,
    closedAt,
    closedById: actor.id,
    closedByName: actor.name,
    closingNotes: input.notes?.trim() || undefined,
  };
  store.cashSessions[index] = updated;

  recordAudit({
    action: "CLOSE_SESSION",
    entityType: "CashSession",
    entityId: updated.id,
    summary: input.auto
      ? `Cloture auto ${updated.businessDate} — report ${counted}`
      : `Cloture caisse ${updated.businessDate} — ecart ${variance}`,
    metadata: { counted, expected, variance, auto: !!input.auto },
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
    const day = (start.getDay() + 6) % 7;
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

  start.setMonth(0, 1);
  end.setTime(start.getTime());
  end.setFullYear(end.getFullYear() + 1);
  return { start, end, label: String(start.getFullYear()) };
}

/**
 * KPIs periodiques : uniquement mouvements operationnels + ventes payees.
 * Le float n'entre jamais dans les taux (pas de duplication jour → semaine).
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
    avgDailySales: Math.round(avgDailySales),
    floatExcluded: true as const,
    sessionsCount: sessions.length,
    openSessions: sessions.filter((s) => s.status === "OPEN").length,
  };
}

export function requireOpenSessionForSale(): RepoResult<CashSession> {
  const ensured = ensureTodayCashSession();
  if (ensured.needsFirstOpen || !ensured.session) {
    return {
      ok: false,
      error:
        "Premiere utilisation : definissez le fonds monnaie initial (Comptabilite ou barre caisse).",
    };
  }
  if (ensured.session.status !== "OPEN") {
    return {
      ok: false,
      error: `Journee ${ensured.session.businessDate} cloturee. Reouverture demain (report auto des fonds).`,
    };
  }
  return { ok: true, data: ensured.session };
}

export { startOfBusinessDay, endOfBusinessDay, toBusinessDate };
