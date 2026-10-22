#!/usr/bin/env bash
# Upload one release over SSH and run remote-deploy.sh on the server.
set -euo pipefail

ssh_dir=${1:?usage: upload-and-deploy.sh /ssh-dir /release-dir}
local_release=${2:?usage: upload-and-deploy.sh /ssh-dir /release-dir}
root=$(cd "$(dirname "$0")/../.." && pwd)
config="${ssh_dir}/ssh_config"

if [[ ! -f "$config" || ! -f "${ssh_dir}/id_ed25519" || ! -f "${ssh_dir}/known_hosts" ]]; then
  echo "SSH files are missing. Run validate-deploy-secrets.sh first." >&2
  exit 1
fi
if grep -E -q 'StrictHostKeyChecking[[:space:]]+(no|accept-new)' "$config"; then
  echo "Refusing to connect. StrictHostKeyChecking must be yes." >&2
  exit 1
fi
DEPLOY_PATH=${DEPLOY_PATH:-}
HEALTHCHECK_URL=${HEALTHCHECK_URL:-http://127.0.0.1/up}
if [[ ! "$DEPLOY_PATH" =~ ^/[A-Za-z0-9._/-]+$ || "$DEPLOY_PATH" == *..* ]]; then
  echo "DEPLOY_PATH is not a safe absolute path." >&2
  exit 1
fi

stamp=$(date -u +%Y%m%dT%H%M%SZ)
short=$(git -C "$root" rev-parse --short=12 HEAD)
release="${stamp}-${short}"
remote_release="${DEPLOY_PATH}/releases/${release}"
shared="${DEPLOY_PATH}/shared"

echo "Connecting with pinned host keys."
if ! ssh -F "$config" taskchan-deploy true; then
  echo "SSH failed before anything was uploaded." >&2
  echo "Secret SSH_KNOWN_HOSTS does not match this server, or the private key was rejected." >&2
  echo "A correct known_hosts line looks like:" >&2
  echo "203.0.113.10 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI..." >&2
  echo "Create it with: ssh-keyscan -t ed25519 -p ${SSH_PORT:-22} <real server IP>" >&2
  echo "Replace <real server IP> with the real address. Do not type those words." >&2
  echo "Secret SSH_PRIVATE_KEY must be the private file, not the .pub file." >&2
  exit 1
fi

# shellcheck disable=SC2029
ssh -F "$config" taskchan-deploy "mkdir -p -- $(printf '%q' "$remote_release") $(printf '%q' "$shared") $(printf '%q' "${DEPLOY_PATH}/releases")"

if ! ssh -F "$config" taskchan-deploy "test -f $(printf '%q' "${shared}/.env")"; then
  echo "The server is missing ${shared}/.env." >&2
  echo "Copy backend/.env.production.example to that path and fill in the real values before the first deploy." >&2
  echo "Do not commit that file." >&2
  exit 1
fi

if ! ssh -F "$config" taskchan-deploy "command -v rsync >/dev/null && command -v bash >/dev/null && command -v flock >/dev/null"; then
  echo "The server needs rsync, bash, and flock (util-linux). Install them, then re-run the deploy." >&2
  exit 1
fi

if ! rsync -az --delete \
  -e "ssh -F ${config}" \
  "${local_release}/" "taskchan-deploy:${remote_release}/"; then
  echo "Upload failed. The live symlink was not changed." >&2
  exit 1
fi

echo "Uploaded release ${release}."

# shellcheck disable=SC2029
ssh -F "$config" taskchan-deploy \
  "DEPLOY_PATH=$(printf '%q' "$DEPLOY_PATH") RELEASE=$(printf '%q' "$release") HEALTHCHECK_URL=$(printf '%q' "$HEALTHCHECK_URL") WEB_USER=$(printf '%q' "${WEB_USER:-www-data}") PHP_BIN=$(printf '%q' "${PHP_BIN:-php}") PHP_FPM_SERVICE=$(printf '%q' "${PHP_FPM_SERVICE:-}") PHP_INI_DIR=$(printf '%q' "${PHP_INI_DIR:-}") bash -s" \
  < "$root/.github/scripts/remote-deploy.sh"
