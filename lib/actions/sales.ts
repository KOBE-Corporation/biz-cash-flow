"use server";

/**
 * @deprecated Les ventes POS passent par `lib/repositories/sales` (store mock client)
 * pour rester synchronisees avec Comptabilite / Factures / Stock.
 * Cette action ne doit plus etre utilisee pour le flux caisse.
 */
export async function createSaleInvoice() {
  return {
    ok: false as const,
    error:
      "Flux vente migre vers le store local — rechargez la page Vente.",
  };
}
