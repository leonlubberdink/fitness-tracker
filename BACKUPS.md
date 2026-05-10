# Backups

## What matters

For this app, the only critical state is the PostgreSQL database.

That database includes:

- seeded users
- exercises
- workout sessions
- exercise entries
- sets
- login rate limit records

The app image and containers can be rebuilt from the repository. The Docker
volume alone is not a backup.

## Create a backup

With the Compose stack running, create a SQL dump from the repo root:

```bash
pnpm db:backup
```

That writes a timestamped file into `./backups/`.

To choose the output path explicitly:

```bash
pnpm db:backup -- --output backups/fitness-app-manual.sql
```

Equivalent direct Docker command:

```bash
docker compose exec -T db sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges' > backups/fitness-app-manual.sql
```

## Restore a backup

Restore a SQL dump into the running Compose database:

```bash
pnpm db:restore -- --file backups/fitness-app-manual.sql
```

Equivalent direct Docker command:

```bash
docker compose exec -T db sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backups/fitness-app-manual.sql
```

## Restore into a fresh stack

1. Start the stack:

```bash
docker compose up -d
```

2. Restore the backup:

```bash
pnpm db:restore -- --file backups/fitness-app-manual.sql
```

3. Verify the app:

```bash
docker compose ps
docker compose logs --tail=50 app
```

4. Open the app and confirm:

- the seeded user can still log in
- exercises are present
- workout history is present

## Recommended workflow

- Take a backup before schema-changing deploys.
- Take a backup before deleting the Docker volume.
- Keep at least one backup copy outside the VPS if the data matters.

## Notes

- Backup files are ignored by Git via `/backups`.
- The restore script expects a plain SQL dump created by this project’s backup script.
