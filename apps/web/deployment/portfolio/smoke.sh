#!/usr/bin/env bash
set -euo pipefail

image="${1:?image required}"
name="portfolio-preview-smoke-${CODEBUILD_BUILD_NUMBER:-local}"
curl_limits=(--connect-timeout 2 --max-time 5)
cleanup() {
  docker rm -f "$name" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run -d --name "$name" -p 127.0.0.1:5188:5188 "$image" >/dev/null
test "$(docker exec "$name" id -u)" = 1000

ready=0
for _ in $(seq 1 30); do
  if [[ "$(curl "${curl_limits[@]}" --fail --silent http://127.0.0.1:5188/healthz || true)" == *'"status":"ok"'* ]]; then
    ready=1
    break
  fi
  sleep 2
done
test "$ready" = 1

root_status=$(curl "${curl_limits[@]}" --silent --show-error --output /dev/null --write-out '%{http_code} %{redirect_url}' http://127.0.0.1:5188/)
test "$root_status" = '307 http://127.0.0.1:5188/portfolio'
portfolio_page=$(curl "${curl_limits[@]}" --fail --silent --show-error http://127.0.0.1:5188/portfolio)
[[ "$portfolio_page" == *'Portfolio setup required'* ]]
sign_in_page=$(curl "${curl_limits[@]}" --fail --silent --show-error http://127.0.0.1:5188/sign-in)
[[ "$sign_in_page" == *'Configure the existing Clerk test application to sign in.'* ]]
status=$(curl "${curl_limits[@]}" --silent --show-error --output /dev/null --write-out '%{http_code}' http://127.0.0.1:5188/api/backend/core/clients)
test "$status" = 503

echo "Container smoke passed: nonroot user, /healthz, Portfolio home redirect, setup/sign-in, and unconfigured proxy."
