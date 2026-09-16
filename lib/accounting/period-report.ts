import { siteConfig } from "@/lib/constants/site";
import type { PeriodKey } from "@/lib/repositories/cash-sessions";
import {
  getPeriodInsights,
  type PeriodInsights,
} from "@/lib/repositories/insights";
import { formatCurrency } from "@/lib/utils";

const PERIOD_TITLES: Record<PeriodKey, string> = {
  day: "Journalier",
  week: "Hebdomadaire",
  month: "Mensuel",
  quarter: "Trimestriel",
  year: "Annuel",
};

function fmtDate(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function fmtTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPeriodReportHtml(insights: PeriodInsights) {
  const title = PERIOD_TITLES[insights.period];
  const range = `${fmtDate(insights.start)} → ${fmtDate(new Date(insights.end.getTime() - 1))}`;

  const topRows = insights.topProducts
    .map(
      (p, i) =>
        `<tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(p.name)}${i < 3 ? ' <span class="badge">Phare</span>' : ""}</td>
          <td>${escapeHtml(p.sku)}</td>
          <td class="num">${p.qtySold}</td>
          <td class="num">${formatCurrency(p.revenue)}</td>
          <td class="num">${formatCurrency(p.estimatedGain)}</td>
          <td class="num">${p.stockQty}</td>
        </tr>`,
    )
    .join("");

  const bottomRows =
    insights.bottomProducts.length > 0
      ? insights.bottomProducts
          .map(
            (p) =>
              `<tr>
                <td>${escapeHtml(p.name)}</td>
                <td class="num">${p.qtySold}</td>
                <td class="num">${formatCurrency(p.revenue)}</td>
              </tr>`,
          )
          .join("")
      : insights.unsoldProducts
          .slice(0, 5)
          .map(
            (p) =>
              `<tr>
                <td>${escapeHtml(p.name)}</td>
                <td class="num">0</td>
                <td class="num">${formatCurrency(0)}</td>
              </tr>`,
          )
          .join("");

  const sellerRows = insights.topSellers
    .map(
      (s, i) =>
        `<tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(s.userName)}${i === 0 ? ' <span class="badge">Top</span>' : ""}</td>
          <td class="num">${s.salesCount}</td>
          <td class="num">${formatCurrency(s.salesTotal)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Rapport ${title} — ${siteConfig.name}</title>
  <style>
    :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --accent:#0f766e; --soft:#f8fafc; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", system-ui, sans-serif; color: var(--ink); margin: 0; padding: 28px; background: #fff; }
    .header { display:flex; justify-content:space-between; gap:16px; border-bottom: 3px solid var(--accent); padding-bottom: 14px; margin-bottom: 18px; }
    .brand { font-size: 22px; font-weight: 800; color: var(--accent); letter-spacing: -0.02em; }
    .meta { text-align:right; font-size: 12px; color: var(--muted); }
    h1 { font-size: 18px; margin: 0 0 4px; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 22px 0 10px; }
    .note { background: #ecfdf5; border: 1px solid #99f6e4; color: #115e59; padding: 10px 12px; border-radius: 10px; font-size: 12px; margin-bottom: 16px; }
    .kpis { display:grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0 8px; }
    .kpi { background: var(--soft); border: 1px solid var(--line); border-radius: 12px; padding: 12px; }
    .kpi .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
    .kpi .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
    .kpi .sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); border-bottom: 1px solid var(--line); padding: 8px 6px; }
    td { border-bottom: 1px solid var(--line); padding: 8px 6px; vertical-align: top; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .badge { display:inline-block; background: var(--accent); color:#fff; font-size: 9px; padding: 1px 6px; border-radius: 999px; margin-left: 4px; vertical-align: middle; }
    .two { display:grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid var(--line); font-size: 11px; color: var(--muted); display:flex; justify-content:space-between; }
    @media print {
      body { padding: 12px; }
      .no-print { display:none !important; }
      .kpi, .note { break-inside: avoid; }
    }
    @media (max-width: 720px) {
      .kpis, .two { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${escapeHtml(siteConfig.name)}</div>
      <h1>Rapport de ventes — ${title}</h1>
      <div class="meta" style="text-align:left">${escapeHtml(insights.label)} · ${range}</div>
    </div>
    <div class="meta">
      Genere le ${fmtDate(new Date())} a ${fmtTime(new Date())}<br/>
      Fonds monnaie exclus du CA
    </div>
  </div>

  <div class="note">
    Les totaux ci-dessous sont <strong>metier</strong> (ventes / caisse operationnelle).
    Le fonds de caisse (monnaie) n'entre pas dans le CA ni dans les taux periodiques — pas de duplication entre jours.
  </div>

  <div class="kpis">
    <div class="kpi"><div class="label">CA encaisse</div><div class="value">${formatCurrency(insights.salesTotal)}</div><div class="sub">${insights.salesCount} ticket(s)</div></div>
    <div class="kpi"><div class="label">Net caisse</div><div class="value">${formatCurrency(insights.operationalNet)}</div><div class="sub">Hors float</div></div>
    <div class="kpi"><div class="label">Marge estimee</div><div class="value">${formatCurrency(insights.estimatedMargin)}</div><div class="sub">CA − cout revient</div></div>
    <div class="kpi"><div class="label">CA moyen / jour</div><div class="value">${formatCurrency(insights.avgDailySales)}</div><div class="sub">Sur la periode</div></div>
  </div>

  <h2>Produits phares</h2>
  <table>
    <thead>
      <tr><th>#</th><th>Produit</th><th>SKU</th><th class="num">Qte (u.)</th><th class="num">CA</th><th class="num">Gain est.</th><th class="num">Stock</th></tr>
    </thead>
    <tbody>
      ${topRows || `<tr><td colspan="7">Aucune vente sur la periode</td></tr>`}
    </tbody>
  </table>

  <div class="two">
    <div>
      <h2>Moins vendus</h2>
      <table>
        <thead><tr><th>Produit</th><th class="num">Qte</th><th class="num">CA</th></tr></thead>
        <tbody>${bottomRows || `<tr><td colspan="3">—</td></tr>`}</tbody>
      </table>
    </div>
    <div>
      <h2>Meilleurs vendeurs</h2>
      <table>
        <thead><tr><th>#</th><th>Caissier</th><th class="num">Tickets</th><th class="num">CA</th></tr></thead>
        <tbody>${sellerRows || `<tr><td colspan="4">—</td></tr>`}</tbody>
      </table>
    </div>
  </div>

  <h2>Stock</h2>
  <div class="kpis" style="grid-template-columns: 1fr 1fr;">
    <div class="kpi">
      <div class="label">Plus en stock</div>
      <div class="value" style="font-size:15px">${insights.mostInStock ? escapeHtml(insights.mostInStock.name) : "—"}</div>
      <div class="sub">${insights.mostInStock ? `${insights.mostInStock.quantity} u.` : ""}</div>
    </div>
    <div class="kpi">
      <div class="label">Moins en stock</div>
      <div class="value" style="font-size:15px">${insights.leastInStock ? escapeHtml(insights.leastInStock.name) : "—"}</div>
      <div class="sub">${insights.leastInStock ? `${insights.leastInStock.quantity} u.` : ""}</div>
    </div>
  </div>

  <div class="footer">
    <span>${escapeHtml(siteConfig.name)} — document interne</span>
    <span class="no-print">Ctrl+P → Enregistrer au format PDF</span>
  </div>
</body>
</html>`;
}

export function downloadPeriodReportPdf(
  period: PeriodKey,
  anchor = new Date(),
) {
  const insights = getPeriodInsights(period, anchor);
  const html = buildPeriodReportHtml(insights);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const stamp = `${anchor.getFullYear()}${String(anchor.getMonth() + 1).padStart(2, "0")}${String(anchor.getDate()).padStart(2, "0")}`;
  const filename = `rapport-ventes-${period}-${stamp}.html`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (w) {
    const tryPrint = () => {
      try {
        w.focus();
        w.print();
      } catch {
        /* ignore */
      }
    };
    w.addEventListener("load", tryPrint);
    // fallback si load deja passe
    window.setTimeout(tryPrint, 400);
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 90_000);
  return insights;
}

/** @deprecated utiliser downloadPeriodReportPdf('day') */
export function downloadDailyReportPdf() {
  return downloadPeriodReportPdf("day");
}
