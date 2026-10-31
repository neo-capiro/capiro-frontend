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

# The accepted FE362 entry is /meri?scope=general. Next may emit a 307 Location,
# or a streamed 200 containing the exact __next-page-redirect meta element.
# Parse the document rather than substring-matching markup: comments and inert
# script/style/template/noscript/textarea/title contexts are ignored, attributes
# must be the exact operative names/values, and duplicate/conflicting declarations
# are rejected.
root_parser=$(cat <<'NODE'
const fs = require('fs');
const src = fs.readFileSync(0, 'utf8');
const fail = (reason) => { console.log(JSON.stringify({ok:false,reason})); process.exit(1); };
function tagEnd(s, start) {
  let quote = null;
  for (let i = start + 1; i < s.length; i++) {
    const c = s[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '>') return i;
  }
  return -1;
}
function attrs(text) {
  let inner = text.slice(5, -1);
  if (inner.endsWith('/')) inner = inner.slice(0, -1);
  const out = {}; let dup = false; let m;
  const re = /([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  while ((m = re.exec(inner))) {
    const name = (m[1] || '').toLowerCase();
    if (!name) continue;
    if (Object.prototype.hasOwnProperty.call(out, name)) dup = true;
    out[name] = m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : ''));
  }
  return {out, dup};
}
function rawEnd(s, start, name) {
  if (name === 'plaintext') return s.length;
  const re = new RegExp('</' + name + '(?=[\\s/>])', 'ig');
  re.lastIndex = start;
  const m = re.exec(s);
  if (!m) return s.length;
  const end = tagEnd(s, m.index);
  return end < 0 ? s.length : end + 1;
}
const rawText = new Set(['script','style','textarea','title','iframe','xmp','noembed','noframes','noscript','plaintext']);
const unsupported = new Set(['select','svg','math']);
function skipTemplate(s, start) {
  let depth = 1;
  let i = start;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    if (lt < 0) return -1;
    if (s.startsWith('<!--', lt)) {
      const end = s.indexOf('-->', lt + 4);
      if (end < 0) return -1;
      i = end + 3;
      continue;
    }
    if (s.startsWith('<![CDATA[', lt)) {
      const end = s.indexOf(']]>', lt + 9);
      if (end < 0) return -1;
      i = end + 3;
      continue;
    }
    if (s[lt + 1] === '!' || s[lt + 1] === '?') {
      const end = tagEnd(s, lt);
      if (end < 0) return -1;
      i = end + 1;
      continue;
    }
    const m = /^<\/?([A-Za-z][A-Za-z0-9:-]*)/.exec(s.slice(lt, lt + 80));
    if (!m) { i = lt + 1; continue; }
    const name = m[1].toLowerCase();
    const after = lt + (s[lt + 1] === '/' ? 2 : 1) + m[1].length;
    const boundary = s[after] || '';
    if (!boundary || !/[\s/>]/.test(boundary)) {
      const end = tagEnd(s, lt);
      if (end < 0) return -1;
      i = end + 1;
      continue;
    }
    const end = tagEnd(s, lt);
    if (end < 0) return -1;
    if (s[lt + 1] === '/') {
      if (name === 'template') {
        depth--;
        if (depth === 0) return end + 1;
      }
      i = end + 1;
      continue;
    }
    if (unsupported.has(name)) return -1;
    if (name === 'template') { depth++; i = end + 1; continue; }
    if (rawText.has(name)) {
      const next = rawEnd(s, end + 1, name);
      if (next < 0) return -1;
      i = next;
      continue;
    }
    i = end + 1;
  }
  return -1;
}
const metas = [];
let i = 0;
while (i < src.length) {
  const lt = src.indexOf('<', i);
  if (lt < 0) break;
  if (src.startsWith('<!--', lt)) {
    const end = src.indexOf('-->', lt + 4);
    if (end < 0) break;
    i = end + 3;
    continue;
  }
  if (src.startsWith('<![CDATA[', lt)) {
    const end = src.indexOf(']]>', lt + 9);
    if (end < 0) break;
    i = end + 3;
    continue;
  }
  if (src[lt + 1] === '!' || src[lt + 1] === '?') {
    const end = tagEnd(src, lt);
    if (end < 0) break;
    i = end + 1;
    continue;
  }
  const m = /^<\/?([A-Za-z][A-Za-z0-9:-]*)/.exec(src.slice(lt, lt + 80));
  if (!m) { i = lt + 1; continue; }
  const name = m[1].toLowerCase();
  const after = lt + (src[lt + 1] === '/' ? 2 : 1) + m[1].length;
  const boundary = src[after] || '';
  if (!boundary || !/[\s/>]/.test(boundary)) {
    const end = tagEnd(src, lt);
    if (end < 0) fail('unterminated tag');
    i = end + 1;
    continue;
  }
  const end = tagEnd(src, lt);
  if (end < 0) fail('unterminated tag');
  if (src[lt + 1] === '/') { i = end + 1; continue; }
  if (unsupported.has(name)) fail('unsupported context');
  if (name === 'template') {
    const next = skipTemplate(src, end + 1);
    if (next < 0) fail('unterminated template');
    i = next;
    continue;
  }
  if (rawText.has(name)) { i = rawEnd(src, end + 1, name); continue; }
  if (name === 'meta') metas.push(src.slice(lt, end + 1));
  i = end + 1;
}
if (!metas.length) fail('no meta element');
const candidates = [];
let duplicate = false;
for (const text of metas) {
  const {out, dup} = attrs(text);
  if (dup) duplicate = true;
  if (out.id || /^refresh$/i.test(out['http-equiv'] || '') || out.content === '1;url=/meri?scope=general') candidates.push(out);
}
if (duplicate) fail('duplicate attributes');
if (candidates.length === 0) fail('no redirect meta');
if (candidates.length > 1) fail('conflicting redirect meta');
const a = candidates[0];
if (Object.keys(a).some((name) => name.startsWith('data-'))) fail('data-* attributes');
if (a.id !== '__next-page-redirect') fail('missing exact id');
if ((a['http-equiv'] || '').toLowerCase() !== 'refresh') fail('missing exact http-equiv');
if (a.content !== '1;url=/meri?scope=general') fail('wrong destination');
console.log(JSON.stringify({ok:true}));
NODE
)
node_version=$(docker exec "$name" node --version 2>/dev/null) || { echo "root gate failed: container node unavailable" >&2; exit 1; }
[[ "$node_version" =~ ^v[0-9]+\. ]] || { echo "root gate failed: unusable container node" >&2; exit 1; }
root_status=$(curl "${curl_limits[@]}" --silent --show-error --output "$scratch/body" --dump-header "$scratch/headers" --write-out '%{http_code}' "$base/")
grep -qi '^x-content-type-options: nosniff' "$scratch/headers" || { echo "root gate failed: missing x-content-type-options" >&2; exit 1; }
grep -qi '^x-frame-options: DENY' "$scratch/headers" || { echo "root gate failed: missing x-frame-options" >&2; exit 1; }
! grep -qi '^x-powered-by:' "$scratch/headers" || { echo "root gate failed: x-powered-by present" >&2; exit 1; }
root_location=$(sed -n 's/^[Ll]ocation: //p' "$scratch/headers" | tr -d '\r')
root_location_path=${root_location%%\?*}
case "$root_status" in
  307)
    [[ "$root_location" == /meri\?scope=general || "$root_location" == "$base/meri?scope=general" ]] || {
      echo "root redirect gate failed: status=307 location=${root_location_path:0:120}" >&2; exit 1; }
    ;;
  200)
    if ! docker exec -i "$name" node -e "$root_parser" < "$scratch/body" > "$scratch/root-parse.json" 2> "$scratch/root-parse.err"; then
      root_reason=$(tr -d '\r\n' < "$scratch/root-parse.json" | head -c 200 || true)
      echo "root streamed redirect gate failed: status=200 parser=${root_reason:-<no result>}" >&2; exit 1
    fi
    ;;
  *)
    echo "root redirect gate failed: status=$root_status location=${root_location_path:0:120}" >&2; exit 1;;
esac
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
