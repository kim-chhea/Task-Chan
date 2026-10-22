#!/usr/bin/env bash
# Decide whether the deploy job should run. Missing secrets skip the deploy.
# A present but invalid secret is rejected later, with the secret named in the log.
set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
  echo "GITHUB_OUTPUT is not set." >&2
  exit 1
fi

ready=true

git fetch --no-tags --quiet origin main
head_sha=$(git rev-parse HEAD)
tip_sha=$(git rev-parse origin/main)
if [[ "$head_sha" != "$tip_sha" ]]; then
  echo "::notice title=Deploy skipped::Commit ${head_sha} is no longer the tip of main (${tip_sha}). A newer commit will deploy instead. The server was not changed."
  ready=false
fi

# Strip all whitespace so a secret made of spaces counts as empty.
key_compact=${SSH_PRIVATE_KEY:-}
key_compact=${key_compact//[[:space:]]/}
hosts_compact=${SSH_KNOWN_HOSTS:-}
hosts_compact=${hosts_compact//[[:space:]]/}

if [[ -z "$key_compact" ]]; then
  echo "::notice title=Deploy skipped::Secret SSH_PRIVATE_KEY is not set. A correct value starts with -----BEGIN OPENSSH PRIVATE KEY----- and the last line is -----END OPENSSH PRIVATE KEY----- followed by a newline. Paste the private file from ssh-keygen -t ed25519 -f ~/.ssh/taskchan_deploy -N \"\". Do not paste the .pub file. See docs/CI-CD.md."
  ready=false
fi

if [[ -z "$hosts_compact" ]]; then
  echo "::notice title=Deploy skipped::Secret SSH_KNOWN_HOSTS is not set. A correct value is one line: the server IP, then ssh-ed25519, then the base64 key from ssh-keyscan. Do not leave it empty and do not type a placeholder IP. See docs/CI-CD.md."
  ready=false
fi

if [[ "$ready" == "false" ]]; then
  echo "Deploy will be skipped. CI already passed. The server was not changed."
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      echo "## Deploy skipped"
      echo "The production deploy did not run. Add the missing items in docs/CI-CD.md, then push again."
    } >> "$GITHUB_STEP_SUMMARY"
  fi
  echo "ready=false" >> "$GITHUB_OUTPUT"
  exit 0
fi

echo "SSH_PRIVATE_KEY and SSH_KNOWN_HOSTS are set. The deploy job will check that the values are valid."
echo "ready=true" >> "$GITHUB_OUTPUT"
