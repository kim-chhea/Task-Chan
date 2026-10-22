#!/usr/bin/env bash
# Runs on the VPS. Switches the live symlink only after migrate and config:cache.
# If /up fails, points the symlink back at the previous release.
set -euo pipefail

fail() {
  echo "$1" >&2
  exit 1
}

: "${DEPLOY_PATH:?DEPLOY_PATH is required}"
: "${RELEASE:?RELEASE is required}"
: "${HEALTHCHECK_URL:?HEALTHCHECK_URL is required}"
WEB_USER=${WEB_USER:-www-data}
PHP_BIN=${PHP_BIN:-php}

if [[ ! "$DEPLOY_PATH" =~ ^/[A-Za-z0-9._/-]+$ || "$DEPLOY_PATH" == *..* || "$DEPLOY_PATH" == */ ]]; then
  fail "DEPLOY_PATH must be an absolute path such as /var/www/taskchan."
fi
if [[ ! "$RELEASE" =~ ^[0-9]{8}T[0-9]{6}Z-[0-9a-f]{7,40}$ ]]; then
  fail "RELEASE name is not a timestamp plus commit id."
fi
if [[ ! "$HEALTHCHECK_URL" =~ ^https?://[^/[:space:]]+/up$ ]]; then
  fail "HEALTHCHECK_URL must be an http(s) URL whose path is /up."
fi
if [[ ! "$WEB_USER" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]]; then
  fail "WEB_USER must be a Linux user name."
fi
if [[ ! "$PHP_BIN" =~ ^[A-Za-z0-9._+/-]+$ || "$PHP_BIN" == *..* ]]; then
  fail "PHP_BIN must be a command or an absolute path."
fi
if [[ -n "${PHP_FPM_SERVICE:-}" && ! "$PHP_FPM_SERVICE" =~ ^[a-zA-Z0-9][a-zA-Z0-9@._-]{0,63}$ ]]; then
  fail "PHP_FPM_SERVICE must be a systemd unit name."
fi
if [[ -n "${PHP_INI_DIR:-}" && ( ! "$PHP_INI_DIR" =~ ^/[A-Za-z0-9._/-]+$ || "$PHP_INI_DIR" == *..* ) ]]; then
  fail "PHP_INI_DIR must be an absolute directory."
fi

release_dir="${DEPLOY_PATH}/releases/${RELEASE}"
shared="${DEPLOY_PATH}/shared"
current="${DEPLOY_PATH}/current"

if [[ ! -d "$release_dir/backend" || ! -f "$release_dir/frontend/dist/index.html" ]]; then
  fail "Release ${release_dir} is incomplete. Expected backend/ and frontend/dist/index.html."
fi

mkdir -p -- "$DEPLOY_PATH"
exec 9>"${DEPLOY_PATH}/deploy.lock"
if ! flock -n 9; then
  fail "Another deploy holds ${DEPLOY_PATH}/deploy.lock. Wait for it to finish."
fi

if [[ "$PHP_BIN" == */* ]]; then
  if [[ ! -x "$PHP_BIN" ]]; then
    fail "PHP_BIN ${PHP_BIN} is not executable on the server. Install PHP 8.4 or set PHP_BIN."
  fi
elif ! command -v "$PHP_BIN" >/dev/null 2>&1; then
  fail "PHP command '${PHP_BIN}' is not on the PATH. Install PHP 8.4 or set PHP_BIN."
fi

if ! command -v curl >/dev/null 2>&1; then
  fail "curl is not installed on the server. The health check requests ${HEALTHCHECK_URL}."
fi

env_file="${shared}/.env"
if [[ ! -f "$env_file" ]]; then
  fail "Missing ${env_file}. Copy backend/.env.production.example there, set APP_KEY, the database password, and your real domains. Do not commit that file."
fi
if ! grep -qE '^APP_KEY=base64:[A-Za-z0-9+/=]+[[:space:]]*$' "$env_file"; then
  fail "APP_KEY in ${env_file} must look like APP_KEY=base64:... Run php artisan key:generate --show on the server and paste the value. Do not commit the file."
fi
if grep -qE '^APP_DEBUG="?true"?[[:space:]]*$' "$env_file"; then
  fail "APP_DEBUG is true in ${env_file}. Set APP_DEBUG=false before deploying."
fi
if ! grep -qE '^APP_ENV="?production"?[[:space:]]*$' "$env_file"; then
  fail "Set APP_ENV=production in ${env_file}."
fi

mkdir -p \
  "${shared}/storage/app/public" \
  "${shared}/storage/app/private" \
  "${shared}/storage/framework/cache/data" \
  "${shared}/storage/framework/sessions" \
  "${shared}/storage/framework/views" \
  "${shared}/storage/logs" \
  "${release_dir}/backend/bootstrap/cache"

chmod -R a+rX "$release_dir"

storage_link="${release_dir}/backend/storage"
if [[ -L "$storage_link" ]]; then
  rm -- "$storage_link"
else
  rm -rf -- "$storage_link"
fi
ln -sfn "$shared/storage" "$storage_link"
ln -sfn "$env_file" "${release_dir}/backend/.env"

if id "$WEB_USER" >/dev/null 2>&1; then
  chgrp -R "$WEB_USER" "$shared/storage" "${release_dir}/backend/bootstrap/cache" \
    || echo "Could not give ${WEB_USER} group access to storage. PHP may not be able to write uploads or sessions."
fi
chmod -R ug+rwx "$shared/storage" "${release_dir}/backend/bootstrap/cache"

cd "${release_dir}/backend"

if ! "$PHP_BIN" artisan package:discover --ansi; then
  fail "php artisan package:discover failed. The live symlink was not changed."
fi
if ! "$PHP_BIN" artisan config:clear --ansi; then
  fail "php artisan config:clear failed. The live symlink was not changed."
fi

# Rewrites the nginx snippet from the server .env so connect-src matches the build.
if "$PHP_BIN" artisan list --raw 2>/dev/null | awk '{print $1}' | grep -qx 'csp:nginx'; then
  mkdir -p deploy/nginx
  if ! "$PHP_BIN" artisan csp:nginx > deploy/nginx/csp.conf; then
    fail "php artisan csp:nginx failed. The live symlink was not changed. Check CSP_CONNECT_SRC in ${env_file}."
  fi
  echo "Rewrote deploy/nginx/csp.conf from CSP_CONNECT_SRC."
fi

ini_src=""
if [[ -f deploy/php/production.ini ]]; then
  ini_src="deploy/php/production.ini"
elif [[ -f php.ini ]]; then
  # Dev upload limits. Safe to drop into conf.d. Do not pass this file to php -c:
  # that would replace the whole PHP config and drop extensions such as pdo_mysql.
  ini_src="php.ini"
fi
if [[ -n "$ini_src" && -n "${PHP_INI_DIR:-}" ]]; then
  if [[ ! -d "$PHP_INI_DIR" ]]; then
    fail "PHP_INI_DIR ${PHP_INI_DIR} does not exist on the server. The live symlink was not changed."
  fi
  if ! install -m 644 "$ini_src" "${PHP_INI_DIR}/99-task-chan.ini"; then
    fail "Could not copy ${ini_src} to ${PHP_INI_DIR}/99-task-chan.ini. The live symlink was not changed."
  fi
  echo "Installed ${ini_src} to ${PHP_INI_DIR}/99-task-chan.ini."
elif [[ -n "$ini_src" ]]; then
  echo "PHP upload limits are in ${ini_src}. Set PHP_INI_DIR (for example /etc/php/8.4/fpm/conf.d) to install them, or copy the file into PHP's conf.d yourself."
fi

if ! "$PHP_BIN" artisan migrate --force; then
  fail "php artisan migrate --force failed. The live symlink was not changed. Database changes that already ran are not rolled back automatically."
fi
if ! "$PHP_BIN" artisan config:cache; then
  fail "php artisan config:cache failed. The live symlink was not changed."
fi
if [[ ! -e public/storage ]]; then
  if ! "$PHP_BIN" artisan storage:link; then
    fail "php artisan storage:link failed. The live symlink was not changed."
  fi
fi

previous=""
if [[ -L "$current" ]]; then
  previous=$(readlink -f "$current" || true)
fi

reload_services() {
  local service
  local reloaded=0
  if [[ -n "${PHP_FPM_SERVICE:-}" ]]; then
    if sudo -n systemctl reload "$PHP_FPM_SERVICE"; then
      echo "Reloaded ${PHP_FPM_SERVICE}."
      reloaded=1
    else
      echo "Could not reload ${PHP_FPM_SERVICE}. Allow the deploy user: sudo -n systemctl reload ${PHP_FPM_SERVICE}" >&2
    fi
  else
    for service in php8.4-fpm php8.3-fpm php-fpm; do
      if sudo -n systemctl reload "$service" 2>/dev/null; then
        echo "Reloaded ${service}."
        reloaded=1
        break
      fi
    done
    if ((reloaded == 0)); then
      echo "Could not reload php-fpm. Set PHP_FPM_SERVICE if the unit has another name." >&2
    fi
  fi
  if sudo -n systemctl reload nginx 2>/dev/null; then
    echo "Reloaded nginx."
  fi
}

ln -sfn "$release_dir" "${current}.next"
mv -Tf "${current}.next" "$current"
echo "Live symlink now points at ${release_dir}."
reload_services

health_ok=0
attempt=1
while ((attempt <= 5)); do
  if curl --fail --silent --show-error --max-time 10 --output /dev/null "$HEALTHCHECK_URL"; then
    health_ok=1
    break
  fi
  sleep 2
  attempt=$((attempt + 1))
done

if ((health_ok == 0)); then
  echo "Health check failed: GET ${HEALTHCHECK_URL}" >&2
  if [[ -n "$previous" && -d "$previous" ]]; then
    ln -sfn "$previous" "${current}.next"
    mv -Tf "${current}.next" "$current"
    reload_services || true
    echo "Rolled the live symlink back to ${previous}." >&2
  else
    rm -f -- "$current"
    echo "No previous release. Removed the live symlink. The failed release is still in ${release_dir}." >&2
  fi
  fail "Deploy failed the /up check."
fi

echo "Health check passed: GET ${HEALTHCHECK_URL}"

releases_root="${DEPLOY_PATH}/releases"
dirs=()
while IFS= read -r dir; do
  dirs+=("$dir")
done < <(find "$releases_root" -mindepth 1 -maxdepth 1 -type d | sort)
keep=5
count=${#dirs[@]}
if ((count > keep)); then
  remove=$((count - keep))
  deleted=0
  for dir in "${dirs[@]}"; do
    if ((deleted >= remove)); then
      break
    fi
    case "$dir" in
      "$releases_root"/*) ;;
      *) fail "Refusing to delete unexpected path ${dir}." ;;
    esac
    if [[ "$dir" == "$release_dir" || "$dir" == "$previous" ]]; then
      continue
    fi
    rm -rf -- "$dir"
    echo "Removed old release ${dir}."
    deleted=$((deleted + 1))
  done
fi

echo "Deploy succeeded."
