# Biz Cash Flow

Application de **caisse (POS)**, **inventaire** et **comptabilite legere** pour commerces de detail (telephonie, accessoires, cigarettes, bieres, etc.).

Stack : **Next.js 16**, **React 19**, **Tailwind CSS 4**, **Prisma**, **PostgreSQL**.

---

## Fonctionnalites actuelles

- **Categories** avec unite de base et conditionnements multi-niveaux (paquet / cartouche / carton, bouteille / casiers…)
- **Produits** : SKU, code-barres unique, prix d’achat / vente, packs, seuil de stock
- **Achats** : fournisseur optionnel, creation produit + categorie inline, reception de stock
- **Offres fournisseurs** : comparaison des couts unitaires
- **Ventes POS** : panier, especes / mobile money, facture
- **Mouvements de stock** : entrees, sorties, ajustements
- **Comptabilite du jour** : CA, marge estimee, gains/produit, alertes, impression
- **Tracabilite utilisateur** : chaque operation est liee a un utilisateur (`AuditLog` + champs `createdBy` / `updatedBy`)

En developpement, une partie des donnees tourne encore sur un **store mock** en memoire ; le schema Prisma / Postgres est la cible de production.

---

## Demarrage rapide

### 1. Dependances

```bash
npm install
```

### 2. Base de donnees (Docker)

```bash
cd setup
cp .env.example .env
# Editez setup/.env puis :
docker compose up -d
cd ..
```

PostgreSQL ecoute sur `localhost:5432`.

### 3. Schema Prisma

A la racine, assurez-vous que `DATABASE_URL` pointe vers la BD locale, puis :

```bash
npm run db:push
npm run db:generate
```

### 4. App

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

### Production complete (app + BD)

```bash
cd setup
docker compose --profile prod up --build -d
```

Details : [`setup/README.Docker.md`](setup/README.Docker.md).

---

## Structure utile

| Chemin | Role |
|--------|------|
| `app/(dashboard)/` | Pages (ventes, produits, achats, compta…) |
| `components/` | UI metier (POS, CRUD, dialogs) |
| `lib/repositories/` | Acces donnees (mock pour l’instant) |
| `lib/sales/` | Logique panier, pricing, packs |
| `lib/mock/store.ts` | Seed & store memoire |
| `prisma/schema.prisma` | Modele de donnees |
| `docs/ROADMAP.md` | Analyse, roadmap, wishlist |
| `docker/GUIDE-UTILISATION.md` | Guide pages / champs / parcours |
| `setup/` | Docker Compose, Dockerfile, env |

---

## Scripts npm

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur de developpement |
| `npm run build` | Prisma generate + build Next |
| `npm run start` | Serveur production |
| `npm run lint` | ESLint |
| `npm run db:push` | Pousse le schema vers Postgres |
| `npm run db:migrate` | Migrations Prisma |
| `npm run db:studio` | UI Prisma Studio |

---

## Parcours metier minimal

1. Creer une **categorie** (unite de base + packs)  
2. Creer un **achat** → **nouveau produit** (categorie obligatoire, fournisseur optionnel)  
3. **Recevoir** l’achat → stock alimente  
4. Vendre dans **Ventes**  
5. Consulter **Comptabilite** (compte du jour)

Guide detaille : [`docker/GUIDE-UTILISATION.md`](docker/GUIDE-UTILISATION.md).  
Roadmap complete : [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## Tracabilite

Toute operation sensible enregistre l’utilisateur courant (stub auth : `lib/auth/current-user.ts`, a remplacer par une vraie session).  
Voir le modele `AuditLog` et les relations `User` dans `prisma/schema.prisma`.

---

## Licence

Projet prive — KOBE Corporation.
