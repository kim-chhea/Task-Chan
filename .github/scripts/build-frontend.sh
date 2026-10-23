#!/usr/bin/env bash
# Production frontend build.
# CSP_CONNECT_SRC is the extra connect-src origin. php artisan csp:nginx reads the same value.
# When VITE_API_URL is set, CSP_CONNECT_SRC must include that origin.
# An empty CSP_CONNECT_SRC is only valid for a same-host deploy, where VITE_API_URL is also empty.
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$root/frontend"

if [[ ! -f package-lock.json ]]; then
  echo "frontend/package-lock.json is missing. npm ci cannot run." >&2
  exit 1
fi

origin=""
if [[ -n "${VITE_API_URL:-}" ]]; then
  if [[ ! "$VITE_API_URL" =~ ^https?://[^[:space:]@]+$ ]]; then
    echo "Variable VITE_API_URL must be an http or https address with no spaces, such as https://api.example.com." >&2
    exit 1
  fi
  rest=${VITE_API_URL#http://}
  if [[ "$rest" == "$VITE_API_URL" ]]; then
    rest=${VITE_API_URL#https://}
    scheme="https"
  else
    scheme="http"
  fi
  hostport=${rest%%/*}
  hostport=${hostport%%\?*}
  hostport=${hostport%%#*}
  origin="${scheme}://${hostport}"
fi

if [[ -n "$origin" && -z "${CSP_CONNECT_SRC:-}" ]]; then
  echo "VITE_API_URL is ${origin}, but CSP_CONNECT_SRC is empty." >&2
  echo "Set the CSP_CONNECT_SRC GitHub variable to ${origin}." >&2
  echo "Set the same value in the server .env so connect-src allows that origin." >&2
  echo "Leave both variables empty only when the site and the API share one host." >&2
  exit 1
fi

if [[ -n "$origin" && -n "${CSP_CONNECT_SRC:-}" ]]; then
  found=0
  # Split on spaces and commas. The CSP change accepts both.
  IFS=$' \t,' read -r -a parts <<< "$CSP_CONNECT_SRC"
  for part in "${parts[@]}"; do
    part=${part%/}
    if [[ "$part" == "$origin" ]]; then
      found=1
    fi
  done
  if ((found == 0)); then
    echo "CSP_CONNECT_SRC must include the VITE_API_URL origin ${origin}." >&2
    echo "Set both GitHub variables to that origin. Set CSP_CONNECT_SRC to the same value in the server .env." >&2
    exit 1
  fi
fi

export VITE_APP_NAME="${VITE_APP_NAME:-Task-Chan}"
npm ci
npm run build

if [[ ! -f dist/index.html ]]; then
  echo "frontend/dist/index.html was not created." >&2
  exit 1
fi
