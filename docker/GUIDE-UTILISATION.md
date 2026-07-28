# Guide d’utilisation — Biz Cash Flow

Ce guide explique **chaque page**, **chaque notion metier** et **les champs** des formulaires.
Pour le demarrage Docker technique (compose, ports, profils), voir aussi [`../setup/README.Docker.md`](../setup/README.Docker.md).

---

## 1. Concepts metier

| Terme | Signification |
|-------|----------------|
| **Unite de base** | Plus petite unite de stock / vente (paquet, bouteille, piece…). Le stock est toujours compte dans cette unite. |
| **Conditionnement / pack** | Niveau de regroupement (cartouche = 20 paquets, casier 12 = 12 bouteilles). |
| **Cout unitaire** | Prix d’achat du lot ÷ nombre d’unites de base dans le lot. |
| **Prix de vente** | Decide par le vendeur. Le systeme peut **suggerer** un minimum (= cout), jamais l’imposer. |
| **Code-barres** | Identifiant unique du produit pour le scan caisse. Auto-genere si laisse vide. |
| **SKU** | Reference interne courte (ex. `ASPEN-MENTHOL`). |
| **Fournisseur** | Optionnel sur un achat. Utile pour comparer les prix d’achat. |
| **Offre fournisseur** | Dernier prix connu d’un produit chez un fournisseur pour un type de lot. |
| **Reception** | Passage d’un achat « En attente » → « Recu » : le stock augmente. |
| **Mouvement** | Entree / sortie / ajustement de stock (toujours en unites de base). |
| **Utilisateur (tracabilite)** | Chaque creation, modification, reception, vente est liee a l’utilisateur courant. |

---

## 2. Navigation (pages)

### Tableau de bord `/`

Vue synthetique : stock, alertes, indicateurs. Point d’entree apres connexion.

### Ventes `/sales`

Caisse POS : choisir un produit, panier, paiement especes ou mobile money, validation facture.

| Zone / champ | Role |
|--------------|------|
| Grille produits | Selection rapide |
| Panier | Lignes, quantites, total |
| Moyen de paiement | `CASH` ou `MOBILE_MONEY` |
| Montant recu | Especes : calcule la monnaie |
| Remise | Montant ou % |
| Notes | Optionnel sur la facture |

> Prochaine evolution : choisir le **niveau de pack** (paquet / cartouche / casier) et scan code-barres.

### Produits `/produits` (ou route equivalente)

Catalogue. Le **stock ne se cree pas ici** : il arrive via un **achat receptionne**.

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| Nom | Oui | Libelle affiche en caisse |
| SKU | Oui | Unique |
| Code-barres | Non* | *Genere auto si vide ; doit rester unique |
| Categorie | Oui | Porte les conditionnements |
| Fournisseur preferentiel | Non | Indication seulement |
| Cout / unite | Oui | Dernier cout de revient connu |
| Prix vente / unite | Oui | Prix decide par le vendeur |
| Prix par conditionnement | Selon packs | Prix de revente carton, casier… |
| Seuil min | Non | Declenche alerte stock faible |
| Description | Non | Info libre |
| Actif | — | Si inactif, invisible a la vente |

### Categories `/categories`

**A creer avant d’acheter un nouveau type de produit.**

| Champ | Description |
|-------|-------------|
| Nom | Ex. Cigarettes, Bieres |
| Description | Optionnel |
| Unite de base | Ex. paquet, bouteille |
| Conditionnements | Liste de niveaux : nom + nombre d’unites de base (la base = 1 est fixe) |
| Active | Visible ou non |

Exemple cigarettes :

1. `paquet` = 1  
2. `cartouche` = 20  
3. `carton` = 200  

### Achats `/achats`

Commandes fournisseurs + creation de produits + reception de stock.

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| Fournisseur | Non | Laisser « Aucun » si non mentionne |
| Lignes produit | Oui | Produit existant ou « Nouveau produit » |
| Lot | Oui | Type de conditionnement achete |
| Qte lots | Oui | Nombre de cartons / casiers… |
| Prix / lot | Oui | Prix paye pour un lot |
| Unites / lot | Oui | Pour calculer le cout unitaire |
| Notes | Non | Commentaire |

**Nouveau produit (depuis Achats)**

| Champ | Notes |
|-------|-------|
| Categorie | Obligatoire — bouton « Nouvelle » pour creer inline |
| Lot achete | Ex. carton |
| Prix du lot | Ex. 80 000 |
| Prix vente / unite | Suggestion = cout unitaire ; modifiable |
| Code-barres | Auto si vide |

**Reception** : le stock augmente de `qte × unites/lot`, l’offre fournisseur est mise a jour, l’utilisateur est enregistre.

### Fournisseurs

Fiches partenaires (nom, email, telephone, adresse, notes, actif).

### Mouvements de stock

Historique des entrees, sorties, ajustements. Chaque ligne porte la **quantite en unites de base**, une reference (facture / achat), et l’utilisateur.

| Type | Sens |
|------|------|
| IN | Entree (reception achat…) |
| OUT | Sortie (vente…) |
| ADJUSTMENT | Correction d’inventaire (+/-) |

### Factures

Historique des ventes : numero, client, statut, paiement, caissier (`issuedBy`), lignes.

### Comptabilite `/comptabilite`

Compte du jour :

- Ventes / achats du jour  
- Marge estimee (CA − cout revient)  
- Gains par produit  
- Comparaison fournisseurs (≥ 2 offres)  
- Alertes stock  
- Bouton **Imprimer le jour**

---

## 3. Parcours recommandes

### A. Premier produit cigarettes

1. **Categories** → Nouvelle → unite `paquet` → ajouter `cartouche` (20) et `carton` (200)  
2. **Achats** → Nouvel achat → (fournisseur optionnel) → Nouveau produit  
3. Choisir la categorie Cigarettes, lot `carton`, prix du carton  
4. Ajuster le prix de vente du paquet si besoin  
5. Enregistrer l’achat → **Recevoir** → le stock (paquets) augmente  

### B. Comparer deux fournisseurs

1. Recevoir le meme produit chez fournisseur A puis B (lots similaires)  
2. Ouvrir le produit → section **Offres fournisseurs**  
3. Ou **Comptabilite** → Comparaison fournisseurs  

### C. Vendre

1. `/sales` → ajouter le produit → payer → valider  
2. La facture porte le caissier ; le stock diminue (quand branche stock mock/Prisma)  

---

## 4. Docker — a quoi sert chaque chose

Les fichiers techniques sont dans `setup/`. Ce dossier `docker/` concentre le **guide metier + usage**.

| Element | Role |
|---------|------|
| `setup/compose.yaml` | Orchestre PostgreSQL (+ app en profil prod) |
| `setup/Dockerfile` | Image de production Next.js |
| `setup/.env.example` | Modele des variables d’environnement |
| `setup/.env` | Secrets locaux (**ne pas committer**) |
| Service `db` | Base PostgreSQL 16 |
| Service `app` | Application (profil `prod` seulement) |
| Port `5432` | Acces BD en local |
| Port `3000` | Acces app en prod Docker |

### Dev (BD seule)

```bash
cd setup
cp .env.example .env
docker compose up -d
# puis a la racine du projet :
npm run dev
```

`DATABASE_URL` doit pointer vers `localhost:5432`.

### Prod (app + BD)

```bash
cd setup
docker compose --profile prod up --build -d
```

`DATABASE_URL` utilise l’hote Docker `db` (pas `localhost`).

---

## 5. Tracabilite utilisateur

Pour chaque operation sensible, la base enregistre **qui** a agi :

| Operation | Champ typique |
|-----------|----------------|
| Vente / facture | `issuedById` |
| Mouvement stock | `createdById` |
| Creation / maj produit, categorie, fournisseur, achat | `createdById` / `updatedById` |
| Reception / annulation achat | statut + user via audit |
| Toute action | table `AuditLog` (journal) |

Cela permet plus tard : controle interne, litiges, filtres « actions de X ce jour ».

---

## 6. Bonnes pratiques

1. Toujours definir la **categorie + packs** avant le produit.  
2. Laisser le fournisseur **vide** s’il n’est pas connu — ne pas inventer.  
3. A la reception, verifier **unites / lot** (sinon le cout unitaire est faux).  
4. Ne pas vendre sous le cout sans raison (le systeme avertit).  
5. Preferer **desactiver** un produit plutot que le supprimer s’il a un historique.  
6. Imprimer / conserver le **compte du jour** en fin de service.

---

## 7. Glossaire des statuts

| Entite | Statut | Signification |
|--------|--------|----------------|
| Achat | PENDING | En attente de reception |
| Achat | RECEIVED | Stock deja augmente |
| Achat | CANCELLED | Annule (impossible si deja recu) |
| Facture | PAID | Payee (cas courant caisse) |
| Facture | DRAFT / SENT / CANCELLED | Cycles documentaires (evolution) |
| Produit / Categorie | Actif / Inactif | Visibilite operationnelle |

---

## 8. Liens

- Roadmap & analyse : [`../docs/ROADMAP.md`](../docs/ROADMAP.md)
- README projet : [`../README.md`](../README.md)
- Docker technique : [`../setup/README.Docker.md`](../setup/README.Docker.md)
