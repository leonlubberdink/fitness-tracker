#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="${APP_DIR:?APP_DIR is required}"
BRANCH="${BRANCH:-master}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required on the VPS." >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required on the VPS." >&2
  exit 1
fi

if [ ! -d "$APP_DIR" ]; then
  echo "App directory '$APP_DIR' does not exist." >&2
  exit 1
fi

cd "$APP_DIR"

if [ ! -f ".env" ]; then
  echo "Missing .env in '$APP_DIR'." >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Deployment directory has uncommitted changes. Refusing to deploy." >&2
  exit 1
fi

git fetch --prune origin "$BRANCH"

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH" --track "origin/$BRANCH"
fi

git pull --ff-only origin "$BRANCH"

docker compose up -d --build --remove-orphans

app_container_id="$(docker compose ps -q app)"

if [ -z "$app_container_id" ]; then
  echo "App container did not start." >&2
  exit 1
fi

for attempt in $(seq 1 60); do
  health_state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$app_container_id")"

  if [ "$health_state" = "healthy" ]; then
    docker compose ps
    echo "Deployment finished successfully."
    exit 0
  fi

  if [ "$health_state" = "unhealthy" ] || [ "$health_state" = "exited" ]; then
    echo "App container became $health_state during deployment." >&2
    docker compose logs --tail=100 app
    exit 1
  fi

  sleep 2
done

echo "App healthcheck did not pass in time." >&2
docker compose logs --tail=100 app
exit 1
