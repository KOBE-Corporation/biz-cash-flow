import type { CashLedgerEntry, CashSourceType } from "@/lib/types";

/** Mouvements qui impactent le CA / tresorerie operationnelle (pas le float). */
export const OPERATIONAL_CASH_SOURCES: CashSourceType[] = [
  "SALE",
  "PURCHASE",
  "REFUND",
  "MANUAL",
  "ADJUSTMENT",
];

export const FLOAT_CASH_SOURCES: CashSourceType[] = ["FLOAT_IN", "FLOAT_OUT"];

export function isOperationalCash(source: CashSourceType) {
  return !FLOAT_CASH_SOURCES.includes(source);
}

export function isFloatCash(source: CashSourceType) {
  return FLOAT_CASH_SOURCES.includes(source);
}

export function sumOperationalCash(entries: CashLedgerEntry[]) {
  let cashIn = 0;
  let cashOut = 0;
  let floatIn = 0;
  let floatOut = 0;

  for (const e of entries) {
    if (e.sourceType === "FLOAT_IN") {
      floatIn += e.amount;
      continue;
    }
    if (e.sourceType === "FLOAT_OUT") {
      floatOut += e.amount;
      continue;
    }
    if (e.direction === "IN") cashIn += e.amount;
    else cashOut += e.amount;
  }

  return {
    /** Encaissements metier (ventes, manuels…). */
    operationalIn: cashIn,
    /** Decaissements metier (achats, remboursements…). */
    operationalOut: cashOut,
    /** Net metier — base des taux journaliers / periodes. */
    operationalNet: cashIn - cashOut,
    floatIn,
    floatOut,
    /** Variation physique brute du tiroir (inclut float). */
    drawerDelta: cashIn + floatIn - cashOut - floatOut,
  };
}

export function toBusinessDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseBusinessDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function startOfBusinessDay(isoOrDate: string | Date) {
  if (typeof isoOrDate === "string") return parseBusinessDate(isoOrDate);
  const d = new Date(isoOrDate);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfBusinessDay(isoOrDate: string | Date) {
  const start = startOfBusinessDay(isoOrDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return end;
}
