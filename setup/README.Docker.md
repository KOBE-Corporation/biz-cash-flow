### Demarrage avec Docker

1. Copiez le fichier d'environnement :
   ```bash
   cp .env.example .env
   ```
2. Modifiez `setup/.env` avec vos mots de passe (ne jamais committer ce fichier).
3. Lancez les services :
   ```bash
   docker compose up --build
   ```

L'application sera disponible sur http://localhost:3000  
PostgreSQL sera accessible sur le port `5432`.

### Services

| Service | Description |
|---------|-------------|
| `app`   | Application Next.js |
| `db`    | PostgreSQL 16 |

### Commandes utiles

```bash
# Appliquer le schema Prisma (depuis le conteneur app)
docker compose exec app npx prisma db push

# Ouvrir Prisma Studio
docker compose exec app npx prisma studio
```

### Notes

- Le fichier `setup/.env` est ignore par Git. Utilisez `setup/.env.example` comme reference.
- Le contexte de build Docker pointe vers la racine du projet (`..`).
