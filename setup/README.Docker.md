### Docker — Biz Cash Flow

Guide metier (pages, champs, parcours) : [`../docker/GUIDE-UTILISATION.md`](../docker/GUIDE-UTILISATION.md)  
Roadmap : [`../docs/ROADMAP.md`](../docs/ROADMAP.md)

Depuis le dossier `setup/` :

```bash
cp .env.example .env
# Editez setup/.env (ne jamais le committer)
```

#### Mode dev (local) — uniquement PostgreSQL

L'app tourne sur votre machine (`npm run dev`), Docker ne lance que la BD.

```bash
docker compose up -d
```

- PostgreSQL : `localhost:5432`
- `DATABASE_URL` doit utiliser l'hote `localhost` (voir `.env.example`)

#### Mode prod — construire et lancer l'image complete

```bash
docker compose --profile prod up --build -d
```

- App : http://localhost:3000
- BD : service `db` (dans le reseau Docker)
- Dans `.env` prod : `DATABASE_URL=...@db:5432/...` et `NODE_ENV=production`

#### Services

| Service | Profil | Description |
|---------|--------|-------------|
| `db`    | (toujours) | PostgreSQL 16 |
| `app`   | `prod`     | Image Next.js construite |

#### Commandes utiles (prod)

```bash
docker compose --profile prod exec app npx prisma db push
docker compose --profile prod logs -f app
docker compose down
```
