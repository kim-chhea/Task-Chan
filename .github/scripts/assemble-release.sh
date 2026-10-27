#!/usr/bin/env bash
# Build a release folder: Laravel with vendor, and frontend/dist. No .env.
set -euo pipefail

dest=${1:?usage: assemble-release.sh /absolute/release-dir}
root=$(cd "$(dirname "$0")/../.." && pwd)

if [[ "$dest" != /* ]]; then
  echo "The release directory must be an absolute path." >&2
  exit 1
fi

if [[ ! -f "$root/frontend/dist/index.html" ]]; then
  echo "frontend/dist/index.html is missing. Build the frontend first." >&2
  exit 1
fi

(
  cd "$root/backend"
  backup=""
  if [[ -f .env ]]; then
    backup=$(mktemp)
    cp .env "$backup"
  fi
  # Called from the EXIT trap, including when composer fails.
  # shellcheck disable=SC2317
  cleanup() {
    status=$?
    if [[ -n "$backup" && -f "$backup" ]]; then
      mv "$backup" .env
    else
      rm -f .env
    fi
    exit "$status"
  }
  trap cleanup EXIT
  cp .env.example .env
  # artisan requires vendor/autoload.php, which does not exist until composer install.
  composer install --no-dev --no-interaction --prefer-dist --no-progress --optimize-autoloader
  php artisan key:generate --force --ansi
)

mkdir -p "$dest/backend" "$dest/frontend"
rsync -a --delete \
  --exclude '.env' \
  --exclude '.env.backup' \
  --exclude '.env.production' \
  --exclude '.env.local' \
  --exclude 'auth.json' \
  --exclude 'node_modules/' \
  --exclude '.phpunit.cache/' \
  --exclude '.phpunit.result.cache' \
  --exclude 'storage/logs/*' \
  --exclude 'storage/framework/cache/data/*' \
  --exclude 'storage/framework/sessions/*' \
  --exclude 'storage/framework/views/*' \
  --exclude 'storage/pail/' \
  "$root/backend/" "$dest/backend/"

rm -f "$dest/backend/.env" "$dest/backend/bootstrap/cache/config.php"
rsync -a --delete "$root/frontend/dist/" "$dest/frontend/dist/"
git -C "$root" rev-parse HEAD > "$dest/REVISION"

if [[ -f "$dest/backend/.env" ]]; then
  echo "Refusing to upload because backend/.env is inside the release." >&2
  exit 1
fi

echo "Release folder is ready at ${dest}."
