import { siteConfig } from "@/lib/constants/site";
import type { DailyAccounting } from "@/lib/repositories/accounting";
import { formatCurrency } from "@/lib/utils";

function fmtDate(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function fmtTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Genere un HTML imprimable / sauvegardable en PDF (via impression navigateur). */
export function buildDailyReportHtml(data: DailyAccounting) {
  const day = fmtDate(data.date);
  const session = data.session;
  const rows = data.operationalLedger
    .map(
      (e) =>
        `<tr>
          <td>${fmtTime(e.occurredAt)}</td>
          <td>${e.label}</td>
          <td>${e.sourceType}</td>
          <td>${e.createdByName}</td>
          <td style="text-align:right">${e.direction === "IN" ? "+" : "−"}${formatCurrency(e.amount)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Rapport caisse ${day} — ${siteConfig.name}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #111; padding: 24px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 14px; margin: 24px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .muted { color: #666; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
    .card strong { display: block; font-size: 18px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #eee; padding: 6px 4px; text-align: left; }
    th { font-size: 11px; color: #666; }
    .note { background: #fff8e6; border: 1px solid #f0e0a0; padding: 10px; border-radius: 8px; font-size: 12px; margin: 12px 0; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>${siteConfig.name} — Rapport de caisse</h1>
  <p class="muted">Journee du ${day}${session ? ` · Session ${session.status}` : " · Aucune session"}</p>

  <div class="note">
    <strong>Important — fonds monnaie</strong><br/>
    Le fonds d'ouverture (${formatCurrency(data.openingFloat)}) sert de monnaie et
    <em>n'entre pas</em> dans le CA ni dans les taux semaine / trimestre / annee.
    Les compteurs metier repartent a 0 a chaque nouvelle journee (nouvelle session).
  </div>

  <div class="grid">
    <div class="card">CA encaisse<strong>${formatCurrency(data.salesTotal)}</strong><span class="muted">${data.salesCount} vente(s)</span></div>
    <div class="card">Net metier<strong>${formatCurrency(data.netCash)}</strong><span class="muted">Entrées − sorties (hors float)</span></div>
    <div class="card">Tiroir theorique<strong>${formatCurrency(data.expectedDrawer)}</strong><span class="muted">Float + net metier</span></div>
    <div class="card">Marge estimee<strong>${formatCurrency(data.estimatedMargin)}</strong></div>
    <div class="card">Achats<strong>${formatCurrency(data.purchasesTotal)}</strong></div>
    <div class="card">Resultat jour<strong>${formatCurrency(data.dailyResult)}</strong></div>
  </div>

  <h2>Taux periodiques (hors float)</h2>
  <div class="grid">
    <div class="card">Semaine<strong>${formatCurrency(data.periods.week.salesTotal)}</strong><span class="muted">moy. ${formatCurrency(data.periods.week.avgDailySales)}/j</span></div>
    <div class="card">Mois<strong>${formatCurrency(data.periods.month.salesTotal)}</strong><span class="muted">moy. ${formatCurrency(data.periods.month.avgDailySales)}/j</span></div>
    <div class="card">Trimestre<strong>${formatCurrency(data.periods.quarter.salesTotal)}</strong><span class="muted">${data.periods.quarter.label}</span></div>
    <div class="card">Annee<strong>${formatCurrency(data.periods.year.salesTotal)}</strong><span class="muted">${data.periods.year.label}</span></div>
  </div>

  <h2>Journal operationnel</h2>
  <table>
    <thead><tr><th>Heure</th><th>Libelle</th><th>Type</th><th>Par</th><th>Montant</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5">Aucun mouvement</td></tr>`}</tbody>
  </table>

  <h2>Ventes par caissier</h2>
  <table>
    <thead><tr><th>Caissier</th><th>Ventes</th><th>CA</th><th>Encaissé</th></tr></thead>
    <tbody>
      ${
        data.salesByUser.length
          ? data.salesByUser
              .map(
                (u) =>
                  `<tr><td>${u.userName}</td><td>${u.salesCount}</td><td>${formatCurrency(u.salesTotal)}</td><td>${formatCurrency(u.cashIn)}</td></tr>`,
              )
              .join("")
          : `<tr><td colspan="4">Aucune</td></tr>`
      }
    </tbody>
  </table>

  <p class="muted" style="margin-top:24px">Genere le ${fmtDate(new Date())} a ${fmtTime(new Date())}</p>
  <p class="no-print muted">Astuce : Ctrl+P → « Enregistrer au format PDF ».</p>
</body>
</html>`;
}

export function downloadDailyReportPdf(data: DailyAccounting) {
  const html = buildDailyReportHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (w) {
    w.addEventListener("load", () => {
      try {
        w.focus();
        w.print();
      } catch {
        /* ignore */
      }
    });
  }
  // Aussi proposer un telechargement fichier
  const a = document.createElement("a");
  const day = `${data.date.getFullYear()}-${String(data.date.getMonth() + 1).padStart(2, "0")}-${String(data.date.getDate()).padStart(2, "0")}`;
  a.href = url;
  a.download = `rapport-caisse-${day}.html`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
