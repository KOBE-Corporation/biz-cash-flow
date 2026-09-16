/** Evenements navigateur pour synchroniser les workspaces mock (client). */

export const BCF_EVENTS = {
  SALE_COMPLETED: "bcf:sale-completed",
  INVOICE_CANCELLED: "bcf:invoice-cancelled",
  INVOICE_PAID: "bcf:invoice-paid",
  CREDIT_NOTE: "bcf:credit-note",
  STOCK_CHANGED: "bcf:stock-changed",
} as const;

export type BcfEventName = (typeof BCF_EVENTS)[keyof typeof BCF_EVENTS];

/** Evenements qui impactent caisse / factures / stock. */
export const BCF_SYNC_EVENTS: BcfEventName[] = [
  BCF_EVENTS.SALE_COMPLETED,
  BCF_EVENTS.INVOICE_CANCELLED,
  BCF_EVENTS.INVOICE_PAID,
  BCF_EVENTS.CREDIT_NOTE,
  BCF_EVENTS.STOCK_CHANGED,
];

export function dispatchBcfEvent(
  name: BcfEventName,
  detail?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
