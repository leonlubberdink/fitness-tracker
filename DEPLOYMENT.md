# Deployment

## Overview

This app ships with a simple three-container deployment:

- `caddy`: public HTTPS reverse proxy with automatic certificates
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
- `APP_DOMAIN`
- `APP_URL`
- `SESSION_TTL_DAYS` if you want a non-default session lifetime

Keep the host-side `DATABASE_URL` for local scripts and ad-hoc maintenance commands:

```env
DATABASE_URL=postgresql://fitness_app:your-strong-password@localhost:5432/fitness_app
```

Inside Docker Compose:

- the app container connects to the `db` service using `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`
- the `caddy` service terminates HTTPS and proxies traffic to the internal `app` service

Set the public URL to your real HTTPS domain:

```env
APP_DOMAIN=fitness.example.com
APP_URL=https://fitness.example.com
```

Before starting the stack, point your domain’s DNS A record at the VPS public IP address.

## 2. Start the stack

Build and start Caddy, the app, and the database:

```bash
docker compose up -d --build
```

Check container status:

```bash
docker compose ps
```

Stream logs:

```bash
docker compose logs -f caddy
docker compose logs -f app
docker compose logs -f db
```

Useful operational checks:

```bash
curl https://fitness.example.com/api/health
docker compose logs -f app
```

The app container emits structured JSON logs for:

- login success
- login failure
- login rate-limit blocks
- logout
- workout completion

Only Caddy is exposed publicly on ports `80` and `443`. The Next.js app stays on the internal Docker network.

On the first startup, Caddy will request and store TLS certificates automatically. If certificate issuance fails, check:

- the domain resolves to the VPS
- ports `80` and `443` are open on the VPS firewall
- no other process is already using those ports

Backup and restore commands are documented in [BACKUPS.md](/d:/Projects/Coding/fitness-app/BACKUPS.md).

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

If you change the proxy config, restart Caddy as well:

```bash
docker compose up -d caddy
```

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
