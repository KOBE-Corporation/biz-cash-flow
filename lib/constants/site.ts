export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Biz Cash Flow",
  description:
    "Gestion de boutique : stock, factures, achats, comptabilite et tracabilite des flux.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  currency: "F CFA",
  locale: "fr-FR",
} as const;
