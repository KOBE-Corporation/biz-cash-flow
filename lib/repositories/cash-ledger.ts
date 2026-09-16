import { createId, getStore, touch } from "@/lib/mock/store";
import { getActor, recordAudit } from "@/lib/repositories/audit";
import type {
  CashDirection,
  CashLedgerEntry,
  CashSourceType,
  PaymentMethod,
  RepoResult,
} from "@/lib/types";

export type PostCashInput = {
  direction: CashDirection;
  amount: number;
  label: string;
  sourceType: CashSourceType;
  sourceId?: string;
  reference?: string;
  description?: string;
  paymentMethod?: PaymentMethod;
  occurredAt?: Date;
  /** Evite les doublons (ex. meme vente deja postee). */
  dedupeKey?: { sourceType: CashSourceType; sourceId: string; direction: CashDirection };
};

export function listCashLedger(limit = 200) {
  return [...getStore().cashLedger]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, limit);
}

export function listCashLedgerForDay(date = new Date()) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return getStore()
    .cashLedger.filter(
      (entry) =>
        entry.occurredAt >= dayStart && entry.occurredAt < dayEnd,
    )
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}

function findExisting(input: PostCashInput["dedupeKey"]) {
  if (!input?.sourceId) return null;
  return (
    getStore().cashLedger.find(
      (entry) =>
        entry.sourceType === input.sourceType &&
        entry.sourceId === input.sourceId &&
        entry.direction === input.direction,
    ) ?? null
  );
}

/**
 * Enregistre une entree ou sortie d'argent dans le journal de caisse.
 * Trace automatiquement l'utilisateur courant (stub auth pour l'instant).
 */
export function postCashEntry(
  input: PostCashInput,
): RepoResult<CashLedgerEntry> {
  const amount = Math.round(Math.abs(input.amount));
  if (amount <= 0) {
    return { ok: false, error: "Montant invalide" };
  }

  const dedupe = input.dedupeKey ?? (
    input.sourceId
      ? {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          direction: input.direction,
        }
      : undefined
  );
  const existing = findExisting(dedupe);
  if (existing) {
    return { ok: true, data: existing };
  }

  const actor = getActor();
  const now = touch();
  const entry: CashLedgerEntry = {
    id: createId("cash"),
    direction: input.direction,
    amount,
    paymentMethod: input.paymentMethod,
    label: input.label.trim(),
    description: input.description?.trim() || undefined,
    reference: input.reference?.trim() || undefined,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    occurredAt: input.occurredAt ?? now,
    createdById: actor.id,
    createdByName: actor.name,
    createdAt: now,
  };

  getStore().cashLedger.unshift(entry);
  recordAudit({
    action: input.direction === "IN" ? "SALE" : "UPDATE",
    entityType: "CashLedgerEntry",
    entityId: entry.id,
    summary: `${entry.direction === "IN" ? "Entree" : "Sortie"} caisse ${entry.amount} — ${entry.label}`,
    metadata: {
      direction: entry.direction,
      amount: entry.amount,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      reference: entry.reference,
    },
  });

  return { ok: true, data: entry };
}

export function postSaleCash(input: {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paymentMethod: PaymentMethod;
  occurredAt?: Date;
  customerName?: string;
}) {
  return postCashEntry({
    direction: "IN",
    amount: input.amount,
    label: `Vente ${input.invoiceNumber}`,
    description: input.customerName
      ? `Encaissement client ${input.customerName}`
      : "Encaissement vente",
    reference: input.invoiceNumber,
    sourceType: "SALE",
    sourceId: input.invoiceId,
    paymentMethod: input.paymentMethod,
    occurredAt: input.occurredAt,
  });
}

export function postPurchaseCash(input: {
  purchaseId: string;
  reference: string;
  amount: number;
  supplierName?: string;
  occurredAt?: Date;
}) {
  return postCashEntry({
    direction: "OUT",
    amount: input.amount,
    label: `Achat ${input.reference}`,
    description: input.supplierName
      ? `Paiement fournisseur ${input.supplierName}`
      : "Paiement achat (reception)",
    reference: input.reference,
    sourceType: "PURCHASE",
    sourceId: input.purchaseId,
    occurredAt: input.occurredAt,
  });
}

export function postRefundCash(input: {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  occurredAt?: Date;
}) {
  return postCashEntry({
    direction: "OUT",
    amount: input.amount,
    label: `Remboursement ${input.invoiceNumber}`,
    description: "Annulation / remboursement vente",
    reference: input.invoiceNumber,
    sourceType: "REFUND",
    sourceId: input.invoiceId,
    paymentMethod: input.paymentMethod,
    occurredAt: input.occurredAt,
  });
}
