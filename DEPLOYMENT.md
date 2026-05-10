# Deployment

## Overview

This repo is ready for a simple VPS deployment with three containers:

- `caddy`: public reverse proxy with automatic HTTPS
- `app`: Next.js production server
- `db`: PostgreSQL 17 with a named Docker volume

The app runs database migrations on container startup, and the included GitHub Actions workflow can deploy every push to `master` over SSH.

## 1. Point the domain

For `fit.leonlubberdink.com`, create this DNS record before the first deploy:

- type: `A`
- name/host: `fit`
- value: your VPS public IPv4 address

If your VPS also has IPv6, add an `AAAA` record for `fit` as well.

Then make sure the VPS firewall allows:

- `22/tcp` for SSH
- `80/tcp` for HTTP
- `443/tcp` for HTTPS

Caddy will request the TLS certificate automatically once the domain resolves to the VPS.

## 2. Prepare the VPS

Install Docker Engine, Docker Compose, and Git on the VPS. Then clone the repository into a stable app directory such as `/srv/fitness-tracker`:

```bash
git clone https://github.com/leonlubberdink/fitness-tracker.git /srv/fitness-tracker
cd /srv/fitness-tracker
cp .env.example .env
```

Update `.env` for production:

```env
POSTGRES_PASSWORD=use-a-strong-password
DATABASE_URL=postgresql://fitness_app:use-a-strong-password@localhost:5432/fitness_app
APP_DOMAIN=fit.leonlubberdink.com
APP_URL=https://fit.leonlubberdink.com
SESSION_TTL_DAYS=30
```

Start the stack once manually:

```bash
docker compose up -d --build
docker compose ps
```

Check that the site is live:

```bash
curl https://fit.leonlubberdink.com/api/health
```

If the first HTTPS request fails, verify DNS, ports `80` and `443`, and that nothing else is already bound to those ports.

Backup and restore commands are documented in [BACKUPS.md](/d:/Projects/Coding/fitness-app/BACKUPS.md).

## 3. Seed the first login user

Create the first user inside the running app container:

```bash
docker compose exec app node --import tsx scripts/seed-user.ts --email you@example.com --password "change-this-password"
```

Only seeded users can log in.

## 4. Enable GitHub deployment

This repo now includes `.github/workflows/deploy.yml`. It deploys on every push to `master` and can also be run manually from the Actions tab.

Create a GitHub environment named `production`, then add these environment secrets:

- `VPS_HOST`: your server IP or hostname
- `VPS_USER`: the SSH user that owns `/srv/fitness-tracker`
- `VPS_PORT`: usually `22`
- `VPS_APP_DIR`: the absolute deploy path, for example `/srv/fitness-tracker`
- `VPS_SSH_KEY`: the private SSH key GitHub Actions should use
- `VPS_KNOWN_HOSTS`: the server host key line from `ssh-keyscan -H your-server`
- `APP_URL`: `https://fit.leonlubberdink.com`

The workflow SSHes into the VPS and runs [scripts/deploy-vps.sh](/d:/Projects/Coding/fitness-app/scripts/deploy-vps.sh), which:

- verifies the deploy directory is clean
- pulls the latest `master`
- rebuilds the containers with `docker compose up -d --build --remove-orphans`
- waits for the app healthcheck to pass

Because the current `origin` remote is public HTTPS, the VPS can pull updates without extra GitHub credentials. If you later make the repository private, switch the server remote to SSH and add a read-only deploy key on the VPS.

## 5. Day-to-day operations

Useful commands on the VPS:

```bash
docker compose ps
docker compose logs -f caddy
docker compose logs -f app
docker compose logs -f db
```

Manual redeploy:

```bash
APP_DIR=/srv/fitness-tracker BRANCH=master bash scripts/deploy-vps.sh
```

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
