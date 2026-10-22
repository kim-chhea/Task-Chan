#!/usr/bin/env bash
# Runs on the VPS. Switches the live symlink only after migrate, config:cache,
# and the 12M PHP ini install.
# Does not run route:cache: routes/web.php registers GET / with a closure.
# If php-fpm reload, nginx reload, view:clear, queue:restart, or /up fails,
# points the symlink back and restores the previous 99-task-chan.ini.
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

# route:cache is intentionally not run. routes/web.php registers GET / with a
# closure, and `php artisan route:cache` cannot cache closures.

ini_dest=""
ini_stage=""
ini_had_previous=0
ini_installed=0
swapped=0

install_php_ini() {
  local ini_src="${release_dir}/backend/deploy/php/production.ini"
  if [[ -z "${PHP_INI_DIR:-}" ]]; then
    fail "PHP_INI_DIR is not set. Set it to PHP-FPM's conf.d, for example /etc/php/8.4/fpm/conf.d. The live symlink was not changed."
  fi
  if [[ ! -d "$PHP_INI_DIR" ]]; then
    fail "PHP_INI_DIR ${PHP_INI_DIR} does not exist on the server. The live symlink was not changed."
  fi
  if [[ ! -f "$ini_src" ]]; then
    fail "Missing ${ini_src}. That file sets the 12M upload limits. The live symlink was not changed."
  fi
  if ! command -v sudo >/dev/null 2>&1; then
    fail "sudo is not installed. The deploy runs sudo -n /usr/bin/install -m 644 to copy the PHP ini. The live symlink was not changed."
  fi

  ini_dest="${PHP_INI_DIR}/99-task-chan.ini"
  ini_stage="${DEPLOY_PATH}/shared/php-ini"
  mkdir -p "$ini_stage"
  cp -- "$ini_src" "${ini_stage}/99-task-chan.ini.next"
  chmod 644 "${ini_stage}/99-task-chan.ini.next"

  if [[ -e "$ini_dest" ]]; then
    if [[ ! -r "$ini_dest" ]]; then
      fail "Cannot read ${ini_dest} to keep a copy for rollback. The live symlink was not changed."
    fi
    cp -a -- "$ini_dest" "${ini_stage}/99-task-chan.ini.previous"
    ini_had_previous=1
  else
    rm -f -- "${ini_stage}/99-task-chan.ini.previous"
    ini_had_previous=0
  fi

  if ! sudo -n /usr/bin/install -m 644 "${ini_stage}/99-task-chan.ini.next" "$ini_dest"; then
    fail "Could not install the 12M PHP ini. The command is: sudo -n /usr/bin/install -m 644 ${ini_stage}/99-task-chan.ini.next ${ini_dest}. Add that exact command to sudoers. The live symlink was not changed."
  fi
  ini_installed=1
  echo "Installed ${ini_src} to ${ini_dest} with sudo -n /usr/bin/install -m 644."
}

restore_php_ini() {
  if ((ini_installed == 0)); then
    return 0
  fi
  if ((ini_had_previous == 1)); then
    if sudo -n /usr/bin/install -m 644 "${ini_stage}/99-task-chan.ini.previous" "$ini_dest"; then
      echo "Restored the previous ${ini_dest}." >&2
      return 0
    fi
    echo "Could not restore ${ini_dest} from ${ini_stage}/99-task-chan.ini.previous." >&2
    return 1
  fi
  if sudo -n /usr/bin/rm -f "$ini_dest"; then
    echo "Removed ${ini_dest}. There was no previous file." >&2
    return 0
  fi
  echo "Could not remove ${ini_dest}." >&2
  return 1
}

reload_php_fpm() {
  local service
  if [[ -n "${PHP_FPM_SERVICE:-}" ]]; then
    if sudo -n /usr/bin/systemctl reload "$PHP_FPM_SERVICE"; then
      echo "Reloaded ${PHP_FPM_SERVICE}."
      return 0
    fi
    echo "Could not reload ${PHP_FPM_SERVICE}. Allow the deploy user this exact command: sudo -n /usr/bin/systemctl reload ${PHP_FPM_SERVICE}" >&2
    return 1
  fi
  for service in php8.4-fpm php8.3-fpm php-fpm; do
    if sudo -n /usr/bin/systemctl reload "$service"; then
      echo "Reloaded ${service}."
      return 0
    fi
  done
  echo "Could not reload php-fpm. Set PHP_FPM_SERVICE to the unit name and allow that exact systemctl reload command in sudoers." >&2
  return 1
}

reload_nginx() {
  if sudo -n /usr/bin/systemctl reload nginx; then
    echo "Reloaded nginx."
    return 0
  fi
  echo "Could not reload nginx. Allow the deploy user this exact command: sudo -n /usr/bin/systemctl reload nginx" >&2
  return 1
}

rollback_live() {
  local reason=$1
  echo "$reason" >&2
  if ((swapped == 1)); then
    if [[ -n "$previous" && -d "$previous" ]]; then
      ln -sfn "$previous" "${current}.next"
      mv -Tf "${current}.next" "$current"
      echo "Rolled the live symlink back to ${previous}." >&2
    else
      rm -f -- "$current"
      echo "No previous release. Removed the live symlink. The failed release is still in ${release_dir}." >&2
    fi
  fi
  if ! restore_php_ini; then
    echo "The PHP ini was not restored. Check ${ini_dest:-99-task-chan.ini}." >&2
  fi
  if ((swapped == 1)); then
    if ! reload_php_fpm; then
      echo "php-fpm did not reload after rollback." >&2
    fi
    if ! reload_nginx; then
      echo "nginx did not reload after rollback." >&2
    fi
    if [[ -n "$previous" && -d "$previous/backend" ]]; then
      if ! (cd "$previous/backend" && "$PHP_BIN" artisan queue:restart); then
        echo "queue:restart after rollback failed." >&2
      fi
      if ! (cd "$previous/backend" && "$PHP_BIN" artisan view:clear); then
        echo "view:clear after rollback failed." >&2
      fi
    fi
  fi
  return 0
}

install_php_ini

previous=""
if [[ -L "$current" ]]; then
  previous=$(readlink -f "$current" || true)
fi

if ! ln -sfn "$release_dir" "${current}.next" || ! mv -Tf "${current}.next" "$current"; then
  rollback_live "Could not switch the live symlink."
  fail "Deploy failed before the new release went live."
fi
swapped=1
echo "Live symlink now points at ${release_dir}."

if ! reload_php_fpm; then
  rollback_live "php-fpm reload failed."
  fail "Deploy failed because php-fpm did not reload. The previous release is live again."
fi
if ! reload_nginx; then
  rollback_live "nginx reload failed."
  fail "Deploy failed because nginx did not reload. The previous release is live again."
fi
if ! "$PHP_BIN" artisan view:clear; then
  rollback_live "php artisan view:clear failed."
  fail "Deploy failed on view:clear. The previous release is live again."
fi
if ! "$PHP_BIN" artisan queue:restart; then
  rollback_live "php artisan queue:restart failed."
  fail "Deploy failed on queue:restart. The previous release is live again."
fi

health_ok=0
attempt=1
health_code="000"
health_body=$(mktemp "${release_dir}/health-body.XXXXXX")
while ((attempt <= 5)); do
  health_code="000"
  if health_code=$(curl --silent --show-error --max-time 10 --output "$health_body" --write-out '%{http_code}' "$HEALTHCHECK_URL"); then
    :
  else
    health_code="000"
  fi
  if [[ "$health_code" == "200" && -f "$health_body" ]] && grep -F -q 'Application up' "$health_body"; then
    health_ok=1
    break
  fi
  sleep 2
  attempt=$((attempt + 1))
done

if ((health_ok == 0)); then
  echo "Health check failed: GET ${HEALTHCHECK_URL} returned HTTP ${health_code}." >&2
  echo "The body must contain Laravel's text: Application up. A 200 by itself is not enough." >&2
  if [[ -f "$health_body" ]]; then
    echo "First lines of the response:" >&2
    head -n 5 "$health_body" >&2 || true
  fi
  rm -f -- "$health_body"
  rollback_live "Health check failed: GET ${HEALTHCHECK_URL}"
  fail "Deploy failed the /up check."
fi
rm -f -- "$health_body"

echo "Health check passed: GET ${HEALTHCHECK_URL} returned Application up."

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
