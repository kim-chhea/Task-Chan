#!/usr/bin/env bash
# Wait until the CI MySQL service accepts the empty-root login the tests use.
set -euo pipefail

for _attempt in $(seq 1 30); do
  # PHP source, not a shell expansion.
  # shellcheck disable=SC2016
  if php -r 'try { new PDO("mysql:host=127.0.0.1;port=3306", "root", ""); exit(0); } catch (Throwable $e) { exit(1); }'; then
    exit 0
  fi
  sleep 2
done

echo "MySQL did not accept connections on 127.0.0.1:3306 as root with an empty password." >&2
echo "phpunit.xml expects database work_tracker_test. The workflow creates that database." >&2
exit 1
