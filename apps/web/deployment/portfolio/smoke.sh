#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: bash smoke.sh LOCAL_IMAGE"
  echo "Runs one unconfigured local container on an ephemeral loopback port."
  echo "Exit 0: passed; 1: container/HTTP gate failed; 2: invalid arguments."
}
if [[ "${1:-}" == --help && "$#" == 1 ]]; then usage; exit 0; fi
if [[ "$#" != 1 || -z "$1" || "$1" == -* ]]; then usage >&2; exit 2; fi
image="$1"
docker image inspect "$image" --format '{{.Id}}' >/dev/null
name="capiro-unified-smoke-$$-$RANDOM"
scratch=$(mktemp -d)
curl_limits=(--connect-timeout 2 --max-time 5)
cleanup() {
  docker rm -f "$name" >/dev/null 2>&1 || true
  rm -rf "$scratch"
}
trap cleanup EXIT

docker run -d --name "$name" -p 127.0.0.1::5188 "$image" >/dev/null
test "$(docker exec "$name" id -u)" = 1000
endpoint=$(docker port "$name" 5188/tcp)
[[ "$endpoint" =~ ^127\.0\.0\.1:[0-9]+$ ]]
base="http://$endpoint"
ready=0
for _ in $(seq 1 30); do
  if [[ "$(curl "${curl_limits[@]}" --fail --silent "$base/healthz" || true)" == *'"status":"ok"'* ]]; then
    ready=1
    break
  fi
  sleep 2
done
test "$ready" = 1

probe() {
  local path="$1" expected="$2" status
  status=$(curl "${curl_limits[@]}" --silent --show-error --output "$scratch/body" --dump-header "$scratch/headers" --write-out '%{http_code}' "$base$path")
  if [[ "$status" != "$expected" ]]; then
    echo "Container gate failed: $path expected $expected, received $status" >&2
    return 1
  fi
  grep -qi '^x-content-type-options: nosniff' "$scratch/headers"
  grep -qi '^x-frame-options: DENY' "$scratch/headers"
  ! grep -qi '^x-powered-by:' "$scratch/headers"
}

probe / 307
root_location=$(sed -n 's/^[Ll]ocation: //p' "$scratch/headers" | tr -d '\r')
[[ "$root_location" == /meri\?scope=general || "$root_location" == "$base/meri?scope=general" ]]
probe /portfolio 200
grep -q 'Portfolio setup required' "$scratch/body"
probe /meri 200
probe /modules 200
grep -q 'Connection setup required' "$scratch/body"
probe /settings 307
location=$(sed -n 's/^[Ll]ocation: //p' "$scratch/headers" | tr -d '\r')
[[ "$location" == /settings/personal || "$location" == "$base/settings/personal" ]]
probe /settings/personal 200
probe /settings/billing 200
probe /calendar 200
probe /sign-in 200
grep -q 'Sign-in setup required' "$scratch/body"
probe /api/backend/core/clients 503
probe /api/capiro/me.read 503

echo "Container smoke passed: nonroot, health, canonical root, all modes/settings/calendar/sign-in, headers and both unconfigured API boundaries."
