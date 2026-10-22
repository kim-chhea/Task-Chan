#!/usr/bin/env bash
# Check the deploy secrets and write an SSH config that pins the host key.
# Never prints the private key. Never turns host-key checking off.
set -euo pipefail

out_dir=${1:?usage: validate-deploy-secrets.sh /absolute/output-dir}

if [[ "$out_dir" != /* || "$out_dir" == *[[:space:]]* ]]; then
  echo "The SSH output directory must be an absolute path without spaces." >&2
  exit 1
fi

umask 077
rm -rf -- "$out_dir"
mkdir -p -- "$out_dir"
chmod 700 "$out_dir"

example_host_key='AAAAC3NzaC1lZDI1NTE5AAAAILaiAE1SWMJ16zJOVxUn2ZX22PNeZWG72FNEAQPM6+WJ'

fail_private_key() {
  local detail=${1:-}
  echo "Secret SSH_PRIVATE_KEY is wrong." >&2
  if [[ -n "$detail" ]]; then
    echo "$detail" >&2
  fi
  echo "A correct value starts with this line:" >&2
  echo "-----BEGIN OPENSSH PRIVATE KEY-----" >&2
  echo "and the last line is:" >&2
  echo "-----END OPENSSH PRIVATE KEY-----" >&2
  echo "with a newline after that last line." >&2
  echo "Create it with: ssh-keygen -t ed25519 -f ~/.ssh/taskchan_deploy -N \"\"" >&2
  echo "Paste the private file (~/.ssh/taskchan_deploy), not the .pub file." >&2
  echo "A public key is one line that starts with ssh-ed25519. That is the wrong secret." >&2
  exit 1
}

fail_known_hosts() {
  local detail=${1:-}
  echo "Secret SSH_KNOWN_HOSTS is wrong." >&2
  if [[ -n "$detail" ]]; then
    echo "$detail" >&2
  fi
  echo "Each key line has the form: <host> <keytype> <base64>" >&2
  echo "A correct line looks like:" >&2
  echo "203.0.113.10 ssh-ed25519 ${example_host_key}" >&2
  echo "203.0.113.10 is a documentation address. Use your real server, not that line." >&2
  echo "Create it with: ssh-keyscan -t ed25519 <real server IP>" >&2
  echo "Replace <real server IP> with the server's IP. Do not type those words." >&2
  echo "Do not leave the secret empty. Do not use a placeholder IP. End the file with a newline." >&2
  echo "Do not paste a hashed line. Hashed lines start with |1|. Paste the plain ssh-keyscan output." >&2
  exit 1
}

is_placeholder_host() {
  local host=$1
  local lower
  lower=$(printf '%s' "$host" | tr '[:upper:]' '[:lower:]')
  case "$lower" in
    *'<'* | *'>'* | *'real server ip'* | *'your_server'* | *'your-server'* | *'your.server'* | *placeholder* | *replace_me* | *changeme* | x.x.x.x | 0.0.0.0 | 127.0.0.1 | localhost | example.com | *.example.com | *.example.org | *.example.net | *.localhost | *.invalid | *.test)
      return 0
      ;;
  esac
  if [[ "$lower" =~ ^192\.0\.2\.[0-9]+$ || "$lower" =~ ^198\.51\.100\.[0-9]+$ || "$lower" =~ ^203\.0\.113\.[0-9]+$ ]]; then
    return 0
  fi
  return 1
}

is_ipv4() {
  local host=$1
  local octet
  [[ "$host" =~ ^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$ ]] || return 1
  for octet in "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}" "${BASH_REMATCH[4]}"; do
    if ((10#$octet > 255)); then
      return 1
    fi
  done
  return 0
}

is_hostname() {
  local host=$1
  [[ "$host" =~ ^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$ ]]
}

require_text() {
  local name=$1
  local value=$2
  local hint=$3
  if [[ -z "${value//[[:space:]]/}" ]]; then
    echo "Variable ${name} is not set. ${hint}" >&2
    exit 1
  fi
}

SSH_HOST=${SSH_HOST:-}
SSH_USER=${SSH_USER:-}
SSH_PORT=${SSH_PORT:-22}
DEPLOY_PATH=${DEPLOY_PATH:-}
HEALTHCHECK_URL=${HEALTHCHECK_URL:-http://127.0.0.1/up}
WEB_USER=${WEB_USER:-www-data}
PHP_BIN=${PHP_BIN:-php}
PHP_FPM_SERVICE=${PHP_FPM_SERVICE:-}
PHP_INI_DIR=${PHP_INI_DIR:-}
SSH_PRIVATE_KEY=${SSH_PRIVATE_KEY:-}
SSH_KNOWN_HOSTS=${SSH_KNOWN_HOSTS:-}

require_text SSH_HOST "${SSH_HOST:-}" "It is the server IP or hostname. Example shape: 198.51.100.20 is documentation only; use the real address."
require_text SSH_USER "${SSH_USER:-}" "It is the SSH user on the server, such as deploy."
require_text DEPLOY_PATH "${DEPLOY_PATH:-}" "It is the absolute folder on the server, such as /var/www/taskchan."

if is_placeholder_host "$SSH_HOST"; then
  echo "Variable SSH_HOST is a placeholder (${SSH_HOST})." >&2
  echo "Set it to the real server IP or hostname. Do not copy an example address." >&2
  exit 1
fi

if ! is_ipv4 "$SSH_HOST" && ! is_hostname "$SSH_HOST"; then
  echo "Variable SSH_HOST must be a hostname or an IPv4 address. Got a value that is neither." >&2
  echo "Put the port in SSH_PORT, not in SSH_HOST." >&2
  exit 1
fi

if [[ ! "$SSH_PORT" =~ ^[0-9]+$ ]] || ((10#$SSH_PORT < 1 || 10#$SSH_PORT > 65535)); then
  echo "Variable SSH_PORT must be a number from 1 to 65535. The usual value is 22." >&2
  exit 1
fi

if [[ ! "$SSH_USER" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]]; then
  echo "Variable SSH_USER must be a short Linux user name, such as deploy." >&2
  exit 1
fi

if [[ ! "$DEPLOY_PATH" =~ ^/[A-Za-z0-9._/-]+$ || "$DEPLOY_PATH" == *..* || "$DEPLOY_PATH" == */ ]]; then
  echo "Variable DEPLOY_PATH must be an absolute path such as /var/www/taskchan." >&2
  echo "No spaces, no .., and no trailing slash." >&2
  exit 1
fi

if [[ ! "$HEALTHCHECK_URL" =~ ^https?://[^/[:space:]]+/up$ ]]; then
  echo "Variable HEALTHCHECK_URL must be an http or https URL whose path is /up." >&2
  echo "Examples: http://127.0.0.1/up or https://api.example.com/up" >&2
  exit 1
fi

if [[ ! "$WEB_USER" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]]; then
  echo "Variable WEB_USER must be a Linux user name. The usual value is www-data." >&2
  exit 1
fi

if [[ ! "$PHP_BIN" =~ ^[A-Za-z0-9._+/-]+$ || "$PHP_BIN" == *..* ]]; then
  echo "Variable PHP_BIN must be a command name or a path, such as php or /usr/bin/php." >&2
  exit 1
fi

if [[ -n "${PHP_FPM_SERVICE:-}" && ! "$PHP_FPM_SERVICE" =~ ^[a-zA-Z0-9][a-zA-Z0-9@._-]{0,63}$ ]]; then
  echo "Variable PHP_FPM_SERVICE must be a systemd unit name, such as php8.4-fpm." >&2
  exit 1
fi

if [[ -z "${PHP_INI_DIR//[[:space:]]/}" ]]; then
  echo "Variable PHP_INI_DIR is not set." >&2
  echo "Set it to PHP-FPM's conf.d directory, such as /etc/php/8.4/fpm/conf.d." >&2
  echo "The deploy installs the 12M PHP ini there and stops before the symlink swap if this directory is missing." >&2
  exit 1
fi
if [[ ! "$PHP_INI_DIR" =~ ^/[A-Za-z0-9._/-]+$ || "$PHP_INI_DIR" == *..* ]]; then
  echo "Variable PHP_INI_DIR must be an absolute directory, such as /etc/php/8.4/fpm/conf.d." >&2
  exit 1
fi

key_compact=${SSH_PRIVATE_KEY:-}
key_compact=${key_compact//[[:space:]]/}
if [[ -z "$key_compact" ]]; then
  fail_private_key "The secret is empty."
fi

first_line=""
while IFS= read -r line || [[ -n "$line" ]]; do
  line=${line//$'\r'/}
  if [[ -n "${line//[[:space:]]/}" ]]; then
    first_line=$line
    break
  fi
done <<< "${SSH_PRIVATE_KEY}"

case "$first_line" in
  "ssh-ed25519 "* | "ssh-rsa "* | "ecdsa-"* | "sk-ssh-"* | "sk-ecdsa-"* | "-----BEGIN PUBLIC KEY-----" | "-----BEGIN OPENSSH PUBLIC KEY-----")
    fail_private_key "This looks like a public key. You pasted the .pub file."
    ;;
  "-----BEGIN OPENSSH PRIVATE KEY-----" | "-----BEGIN RSA PRIVATE KEY-----" | "-----BEGIN EC PRIVATE KEY-----" | "-----BEGIN PRIVATE KEY-----")
    ;;
  "-----BEGIN ENCRYPTED PRIVATE KEY-----")
    fail_private_key "The key is encrypted. Create it again with -N \"\" so it has no passphrase."
    ;;
  *)
    fail_private_key "The first line is not -----BEGIN OPENSSH PRIVATE KEY-----."
    ;;
esac

key_file="$out_dir/id_ed25519"
printf '%s' "$SSH_PRIVATE_KEY" > "$key_file"
if grep -q $'\r' "$key_file"; then
  tr -d '\r' < "$key_file" > "$key_file.unix"
  mv "$key_file.unix" "$key_file"
  echo "::warning title=SSH_PRIVATE_KEY::The private key had Windows line endings. They were removed. Paste the file as Unix text next time."
fi
# Do not use $(tail). Command substitution deletes the newline we are checking for.
if [[ "$(tail -c 1 "$key_file" | wc -l | tr -d '[:space:]')" == "0" ]]; then
  printf '\n' >> "$key_file"
  echo "::warning title=SSH_PRIVATE_KEY::The private key was missing the trailing newline. One was added. The last line must be -----END OPENSSH PRIVATE KEY----- followed by a newline."
fi
chmod 600 "$key_file"

key_err="$out_dir/key.err"
if ! ssh-keygen -y -f "$key_file" -P "" > "$out_dir/derived.pub" 2> "$key_err"; then
  extra=""
  if [[ -s "$key_err" ]] && grep -qi 'passphrase' "$key_err"; then
    extra="ssh-keygen says the key has a passphrase. Create it with -N \"\"."
  fi
  rm -f "$key_err" "$out_dir/derived.pub"
  fail_private_key "$extra"
fi
if ! grep -qE '^(ssh-ed25519|ssh-rsa|ecdsa-sha2-|sk-ssh-|sk-ecdsa-)' "$out_dir/derived.pub"; then
  rm -f "$key_err" "$out_dir/derived.pub"
  fail_private_key "ssh-keygen -y could not read a public key from it."
fi
rm -f "$key_err" "$out_dir/derived.pub"

hosts_compact=${SSH_KNOWN_HOSTS:-}
hosts_compact=${hosts_compact//[[:space:]]/}
if [[ -z "$hosts_compact" ]]; then
  fail_known_hosts "The secret is empty."
fi

known_file="$out_dir/known_hosts"
printf '%s' "$SSH_KNOWN_HOSTS" > "$known_file"
if grep -q $'\r' "$known_file"; then
  tr -d '\r' < "$known_file" > "$known_file.unix"
  mv "$known_file.unix" "$known_file"
  echo "::warning title=SSH_KNOWN_HOSTS::The known_hosts value had Windows line endings. They were removed."
fi
if [[ "$(tail -c 1 "$known_file" | wc -l | tr -d '[:space:]')" == "0" ]]; then
  printf '\n' >> "$known_file"
  echo "::warning title=SSH_KNOWN_HOSTS::The known_hosts value was missing the trailing newline. One was added. A correct file ends with a newline after the key line."
fi
chmod 600 "$known_file"

key_types='ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521|ssh-ed25519-cert-v01@openssh.com|ssh-rsa-cert-v01@openssh.com|ecdsa-sha2-nistp256-cert-v01@openssh.com|sk-ssh-ed25519@openssh.com|sk-ecdsa-sha2-nistp256@openssh.com'
line_no=0
plain_lines=0
matched=0
while IFS= read -r line || [[ -n "$line" ]]; do
  line_no=$((line_no + 1))
  if [[ -z "${line//[[:space:]]/}" || "$line" =~ ^[[:space:]]*# ]]; then
    continue
  fi
  # shellcheck disable=SC2034
  read -r host keytype keydata _comment <<< "$line"
  if [[ "$host" == '|1|'* ]]; then
    fail_known_hosts "Line ${line_no} is a hashed known_hosts line (it starts with |1|). A hash cannot be checked against SSH_HOST. Paste the plain line from ssh-keyscan -t ed25519. Do not run ssh-keygen -H, and leave HashKnownHosts off."
  fi
  if [[ -z "${keydata:-}" ]]; then
    fail_known_hosts "Line ${line_no} is not <host> <keytype> <base64>."
  fi
  if [[ "$host" == @* ]]; then
    fail_known_hosts "Line ${line_no} starts with ${host}. Paste the plain ssh-keyscan line."
  fi
  if [[ ! "$keytype" =~ ^($key_types)$ ]]; then
    fail_known_hosts "Line ${line_no} has key type '${keytype}'. Use ssh-ed25519 from ssh-keyscan -t ed25519."
  fi
  if [[ ! "$keydata" =~ ^[A-Za-z0-9+/]+={0,3}$ || ${#keydata} -lt 20 ]]; then
    fail_known_hosts "Line ${line_no} does not have a base64 key in the third field."
  fi
  if [[ "$keydata" == "$example_host_key" ]]; then
    fail_known_hosts "Line ${line_no} is the sample from docs/CI-CD.md. Run ssh-keyscan on your server and paste that output."
  fi

  IFS=',' read -r -a host_parts <<< "$host"
  for part in "${host_parts[@]}"; do
    if [[ "$part" == '|1|'* ]]; then
      fail_known_hosts "Line ${line_no} contains a hashed host (|1|). Paste the plain ssh-keyscan line. Do not run ssh-keygen -H."
    fi
    if [[ "$part" == *'*'* || "$part" == *'?'* || "$part" == '!'* ]]; then
      fail_known_hosts "Line ${line_no} uses a wildcard host. Pin the exact host from ssh-keyscan."
    fi
    bare=$part
    part_port=""
    if [[ "$part" =~ ^\[(.+)\]:([0-9]+)$ ]]; then
      bare=${BASH_REMATCH[1]}
      part_port=${BASH_REMATCH[2]}
    fi
    if is_placeholder_host "$bare"; then
      fail_known_hosts "Line ${line_no} uses placeholder host '${bare}'. Use the real server IP from ssh-keyscan."
    fi
    plain_lines=$((plain_lines + 1))
    if [[ "$SSH_PORT" == "22" ]]; then
      if [[ "$part" == "$SSH_HOST" || "$part" == "[${SSH_HOST}]:22" ]]; then
        matched=1
      fi
    else
      if [[ "$part" == "[${SSH_HOST}]:${SSH_PORT}" ]]; then
        matched=1
      elif [[ "$part" == "$SSH_HOST" && -z "$part_port" ]]; then
        fail_known_hosts "SSH_PORT is ${SSH_PORT}, so the host field must be [${SSH_HOST}]:${SSH_PORT}. A bare host is only used for port 22."
      fi
    fi
  done
done < "$known_file"

if ((plain_lines == 0)); then
  fail_known_hosts "There is no key line. Comments and blank lines do not count."
fi
if ((matched == 0)); then
  fail_known_hosts "No line is for SSH_HOST (${SSH_HOST}) on port ${SSH_PORT}. The host in the secret and the SSH_HOST variable must be the same."
fi

kh_err="$out_dir/known_hosts.err"
if ! ssh-keygen -l -f "$known_file" > "$out_dir/fingerprints.txt" 2> "$kh_err"; then
  reason="ssh-keygen -l rejected the file, so the base64 is not a real host key."
  if [[ -s "$kh_err" ]]; then
    reason="${reason} $(head -n 1 "$kh_err")"
  fi
  rm -f "$kh_err" "$out_dir/fingerprints.txt"
  fail_known_hosts "$reason"
fi
rm -f "$kh_err" "$out_dir/fingerprints.txt"

config_file="$out_dir/ssh_config"
cat > "$config_file" << EOF
Host taskchan-deploy
  HostName ${SSH_HOST}
  User ${SSH_USER}
  Port ${SSH_PORT}
  IdentityFile ${key_file}
  IdentitiesOnly yes
  StrictHostKeyChecking yes
  UserKnownHostsFile ${known_file}
  GlobalKnownHostsFile /dev/null
  CheckHostIP yes
  BatchMode yes
  PasswordAuthentication no
  KbdInteractiveAuthentication no
  PreferredAuthentications publickey
  ConnectTimeout 15
  ConnectionAttempts 1
  ServerAliveInterval 15
  ServerAliveCountMax 4
  HashKnownHosts no
  UpdateHostKeys no
EOF
chmod 600 "$config_file"

if grep -E -q 'StrictHostKeyChecking[[:space:]]+(no|accept-new)' "$config_file"; then
  echo "Refusing to continue. The SSH config does not pin the host key." >&2
  exit 1
fi

echo "SSH_PRIVATE_KEY passed ssh-keygen -y. SSH_KNOWN_HOSTS passed ssh-keygen -l. Host key checking is strict."
