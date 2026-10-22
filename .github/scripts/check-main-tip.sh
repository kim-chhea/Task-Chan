#!/usr/bin/env bash
# Exit 0 and mark the job skipped when this checkout is no longer the tip of main.
set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
  echo "GITHUB_OUTPUT is not set." >&2
  exit 1
fi

git fetch --no-tags --quiet origin main
head_sha=$(git rev-parse HEAD)
tip_sha=$(git rev-parse origin/main)

if [[ "$head_sha" != "$tip_sha" ]]; then
  echo "::notice title=Deploy skipped::Commit ${head_sha} is no longer the tip of main (${tip_sha}). A newer commit will deploy instead. The server was not changed."
  echo "skipped=true" >> "$GITHUB_OUTPUT"
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      echo "## Deploy skipped"
      echo "This commit is not the latest on main. Nothing was deployed."
    } >> "$GITHUB_STEP_SUMMARY"
  fi
  exit 0
fi

echo "skipped=false" >> "$GITHUB_OUTPUT"
echo "This commit is the tip of main (${tip_sha})."
