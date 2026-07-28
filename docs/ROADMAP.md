# Biz Cash Flow — Roadmap & analyse produit

Document de reference pour la vision metier, l’etat actuel et le plan d’implementation.
Derniere mise a jour : 28 juillet 2026.

---

## 1. Vision

**Biz Cash Flow** est une application de caisse / inventaire / comptabilite legere pour commerces de detail (telephonie, accessoires, cigarettes, bieres, etc.).

Objectif : permettre a un vendeur de :

1. Definir des **categories avec conditionnements multi-niveaux**
2. **Acheter** (avec ou sans fournisseur) et receptionner du stock
3. **Vendre** rapidement en caisse (especes / mobile money)
4. Suivre **marges, alertes stock, comparaison fournisseurs**
5. Garder une **tracabilite utilisateur** sur chaque operation

---

## 2. Analyse metier (cas reels)

### 2.1 Cigarettes (exemple Aspen)

| Niveau        | Contenu typique      | Unite de base |
|---------------|----------------------|---------------|
| Paquet        | 1 paquet             | 1             |
| Cartouche     | 20 paquets           | 20            |
| Carton        | 10 cartouches        | 200           |

On achete souvent en **carton**, on revend en **paquet**, **cartouche** ou **carton**, avec des prix de vente decidees par le vendeur. Le systeme peut **suggerer** un prix min (= cout unitaire), jamais l’imposer.

### 2.2 Bieres

| Niveau       | Contenu        |
|--------------|----------------|
| Bouteille    | 1              |
| Casier 12    | 12             |
| Casier 15    | 15             |
| Casier 24    | 24             |

Achat frequent en casier ; revente a l’unite ou au casier.

### 2.3 Regles cles

- **Categorie obligatoire** avant creation / achat d’un produit
- **Fournisseur optionnel** (si non mentionne → vide)
- **Stock toujours en unites de base**
- **Prix d’achat depend du fournisseur** → historique d’offres + comparaison
- **Code-barres unique** par produit (scan caisse ulterieur)
- **Chaque operation enregistre l’utilisateur** (qui a cree / modifie / recu / vendu)

---

## 3. Etat actuel (livré)

| Module              | Statut | Notes |
|---------------------|--------|--------|
| Categories + packs  | OK     | Unite de base + niveaux |
| Produits            | OK     | Barcode, packs, offres |
| Fournisseurs        | OK     | CRUD |
| Achats              | OK     | Fournisseur optionnel, reception stock |
| Mouvements stock    | OK     | IN / OUT / ADJUSTMENT |
| Ventes (POS)        | Partiel| Vente unite de base ; packs a brancher |
| Factures            | OK     | Liste / detail |
| Comptabilite jour   | OK     | Marges estimees, alertes, comparaison |
| Auth multi-users    | Stub   | `CURRENT_USER` — a remplacer |
| Audit trail         | En cours | `AuditLog` + champs `createdBy` |
| Scan hardware       | Prevue | Logique barcode presente |
| Docker BD / prod    | OK     | Dossier `setup/` |

---

## 4. Roadmap par phases

### Phase A — Immédiat (fondations metier) ✅ / 🔄

- [x] Schema packs / barcode / offers / supplier optionnel
- [x] UI categories avec conditionnements
- [x] UI achats : fournisseur optionnel, categorie inline, lots
- [x] Suggestion prix vente vs cout
- [x] Comptabilite du jour (mock)
- [x] Documentation (`docs/`, README, guide)
- [ ] Tracabilite User sur toutes les operations (schema + repos + UI)
- [ ] Vente multi-packs dans `/sales` (choix paquet / cartouche / casier)
- [ ] Decrement stock en unites de base selon le pack vendu

### Phase B — Court terme (caisse & stock)

- [ ] Scan code-barres → ajout panier (clavier / lecteur USB wedge)
- [ ] Recherche produit par barcode / SKU / nom unifiee
- [ ] Remises avancees (ligne + panier + motif)
- [ ] Annulation / avoir partiel sur facture
- [ ] Sessions de caisse (ouverture / fermeture / ecart)
- [ ] Compte de caisse du jour imprimable (PDF)
- [ ] Alertes stock sur dashboard + badge nav
- [ ] Historique prix de vente (qui a change quoi)

### Phase C — Moyen terme (compta & multi-users)

- [ ] Vraie authentification (email / mot de passe ou magic link)
- [ ] Roles : Admin, Gerant, Vendeur, Lecture seule
- [ ] Journal d’audit consultable (filtres user / date / entite)
- [ ] Journal comptable (ecritures INCOME / EXPENSE)
- [ ] Rapprochement ventes / achats / stock
- [ ] Export CSV / Excel / PDF
- [ ] Multi-magasin / multi-caisse (optionnel)
- [ ] Migration runtime mock → Prisma partout

### Phase D — Plus tard (peripheriques & scale)

- [ ] Imprimante tickets thermique
- [ ] Tiroir-caisse
- [ ] Lecteurs code-barres dedies (HID / serial)
- [ ] Balance / etiquette
- [ ] Mode hors-ligne + sync
- [ ] Notifications push (stock critique, ecart caisse)
- [ ] API publique / webhooks
- [ ] Application mobile companion

---

## 5. Catalogue de fonctionnalites (wishlist detaillee)

### 5.1 Catalogue & inventaire

- Gestion categories avec templates de packs predefinis (cigarettes, bieres, pieces)
- Duplication de categorie / produit
- Import catalogue CSV
- Generation etiquettes code-barres (impression A4 / thermique)
- Inventaire physique (comptage → ecarts → ajustements)
- Reservation stock (commandes clients)
- Lots / dates de peremption (boissons, alimentaires)
- Emplacements rayon / entrepot

### 5.2 Achats & fournisseurs

- Bons de commande (BROUILLON → ENVOYE → RECU)
- Reception partielle
- Retours fournisseur
- Historique prix d’achat + graphique d’evolution
- Score fournisseur (delai, ecart prix)
- Alertes « mieux acheter chez X »
- TVA / taxes a l’achat (si besoin local)

### 5.3 Ventes & caisse

- Grille POS tactile + clavier
- Packs multi-niveaux au panier
- Clients fideles (optionnel)
- Devis → facture
- Acomptes
- Paiements mixtes (especes + OM)
- Remboursements / echanges
- Facture proforma
- Mode « formation » (ventes fictives)
- Raccourcis clavier documentes

### 5.4 Comptabilite & reporting

- Compte du jour (CA, marge, panier moyen, nb tickets)
- Compte de la semaine / mois
- Top produits / flop
- Marges par categorie
- Gains/pertes a l’achat (ecart offre vs prix moyen)
- Tableau de bord KPI
- Cloture de journee (freeze + rapport)
- Impression / export PDF du compte
- Objectifs journaliers

### 5.5 Utilisateurs & securite

- Login / logout / session
- Roles et permissions granulaires
- **Audit log** : qui a fait quoi, quand, sur quelle entite
- Soft-delete avec motif
- Verrouillage ecran caisse (PIN vendeur)
- Journal des connexions

### 5.6 Stock & alertes

- Seuils min / max
- Alertes rupture / sous-seuil
- Suggestion de reapprovisionnement
- Valorisation stock (PMP / dernier cout)
- Mouvements lies automatiquement ventes/achats

### 5.7 Technique / DevOps

- Runtime 100 % Prisma (fin du mock store)
- Migrations versionnees
- Seeds realistes
- Tests unitaires pricing / packs
- Tests E2E caisse
- CI (lint, tsc, test)
- Monitoring erreurs (Sentry)
- Backups Postgres automatises (Docker)

---

## 6. Modele de donnees (points d’attention)

```
Category ──< Product ──< PurchaseItem >── Purchase (supplier?)
                │
                ├── packLevels (JSON)
                ├── barcode (unique)
                ├── StockMovement (createdBy User)
                ├── InvoiceItem >── Invoice (issuedBy User)
                └── ProductSupplierOffer >── Supplier

User ──< AuditLog (toutes operations)
```

**Stock** = toujours en unites de base.  
**Reception achat** : `qty_lots × unitsPerPurchasePack` → mouvement IN.  
**Vente pack** : `qty_packs × unitsOfBase` → mouvement OUT.

---

## 7. Recommandations produit

1. **Ne jamais forcer le prix de vente** — suggestion + avertissement si sous le cout.
2. **Categorie d’abord** — sinon les packs n’ont pas de sens.
3. **Comparer les fournisseurs** avant gros reappro.
4. **Tracabilite User des le debut** — indispensable en multi-vendeurs et pour litiges.
5. **POS d’abord, fancy reports ensuite** — le gain metier est a la caisse.
6. **Migrer vers Prisma** avant d’ajouter trop de modules mock.
7. **Sessions de caisse** avant les peripheriques hardware.
8. Documenter chaque champ metier (voir guide utilisateur).

---

## 8. Definition of Done (par feature)

Une feature est « terminee » si :

- [ ] Types + schema Prisma alignes
- [ ] Repository / action avec user courant
- [ ] Entree AuditLog
- [ ] UI fr + toasts d’erreur
- [ ] Cas limites (stock 0, prix 0, pack manquant)
- [ ] Mention dans ce roadmap (statut)

---

## 9. Prochaines actions concretes (ordre suggere)

1. Finaliser tracabilite User + page « Journal d’activite »
2. Vente multi-packs dans Sales
3. Scan barcode panier
4. Session de caisse + PDF compte du jour
5. Auth reelle + roles
6. Brancher Prisma sur Achats / Produits / Mouvements
7. Inventaire physique
8. Peripheriques

---

## 10. Liens

- [README racine](../README.md)
- [Guide utilisateur (pages & champs)](../docker/GUIDE-UTILISATION.md)
- [Docker technique](../setup/README.Docker.md)
