# Deployment

## Overview

This app ships with a simple two-container deployment:

- `app`: Next.js production server
- `db`: PostgreSQL 17 with a named Docker volume

The app runs database migrations automatically every time the container starts.

## 1. Prepare the server

Install Docker Engine and Docker Compose on your VPS.

Clone the repository onto the server, then create the production env file:

```bash
cp .env.example .env
```

Update these values in `.env`:

- `POSTGRES_PASSWORD`
- `APP_URL`
- `SESSION_TTL_DAYS` if you want a non-default session lifetime

Keep the host-side `DATABASE_URL` for local scripts and ad-hoc maintenance commands:

```env
DATABASE_URL=postgresql://fitness_app:your-strong-password@localhost:5432/fitness_app
```

Inside Docker Compose, the app container automatically connects to the `db`
service using `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`.

## 2. Start the stack

Build and start the app and database:

```bash
docker compose up -d --build
```

Check container status:

```bash
docker compose ps
```

Stream logs:

```bash
docker compose logs -f app
docker compose logs -f db
```

The app is bound to `127.0.0.1:3000`. Put Caddy or Nginx in front of it for TLS and public access.

## 3. Seed the first login user

Create or update a seeded user inside the running app container:

```bash
docker compose exec app node --import tsx scripts/seed-user.ts --email you@example.com --password "change-this-password"
```

Only seeded users can log in. There is no public signup flow in v1.

## 4. Update the app

Deploy new changes with:

```bash
docker compose up -d --build
```

Because the app runs migrations on startup, schema changes are applied during deployment.

## 5. Stop or remove the stack

Stop containers:

```bash
docker compose stop
```

Remove containers but keep database data:

```bash
docker compose down
```

Remove containers and delete database data:

```bash
docker compose down -v
```
