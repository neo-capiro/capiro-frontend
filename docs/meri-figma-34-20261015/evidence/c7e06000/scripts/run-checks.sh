#!/bin/bash
# Evidence copy: as run, with the host worktree path replaced by <worktree> and the scratch path by <scratch>.
# Usage: run-checks.sh EVIDENCE_DIR TOOLROOT
set -u
E=$1; T=$2
export PATH=/opt/nvm/versions/node/v24.21.0/bin:$PATH
cd <worktree> || exit 2
mkdir -p "$E/logs"
run(){ name=$1; shift; { echo "\$ $*"; echo "# start_utc $(date -u +%FT%TZ)"; } > "$E/logs/$name.txt"; "$@" >> "$E/logs/$name.txt" 2>&1; rc=$?; echo "# end_utc $(date -u +%FT%TZ) exit=$rc" >> "$E/logs/$name.txt"; echo "$name exit=$rc"; return $rc; }
{
echo "date_utc: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "git rev-parse HEAD HEAD^{tree}:"; git rev-parse HEAD 'HEAD^{tree}'
echo "git status --porcelain --ignored=no (nothing between the markers means clean):"; echo "--- begin status"; git status --porcelain --ignored=no; echo "--- end status"
echo "node -v: $(node -v)"; echo "npm -v: $(npm -v)  (package.json packageManager: npm@11.9.0)"
echo "uname -m: $(uname -m)"; echo "uname -sr: $(uname -sr)"
echo "ldd --version | head -1: $(ldd --version | head -1)"
echo "nproc: $(nproc)"
echo "sha256sum package-lock.json: $(sha256sum package-lock.json)"
echo "node_modules/.package-lock.json sha256: $(sha256sum node_modules/.package-lock.json | cut -d' ' -f1)"
echo "node_modules: real directories (cp -a) copied from an existing install of the same package-lock.json; workspace links are relative (node_modules/@capiro/ui -> ../../packages/ui)"
} > "$E/logs/environment.txt"
run typecheck npm run typecheck
run unit-test npm test
run unit-test-apps-web-subset node --test apps/web/test/action-workflow.test.mjs apps/web/test/assets.test.mjs apps/web/test/cited-answer-assets.test.mjs apps/web/test/meri-fixture-screens.test.mjs apps/web/test/module-assets.test.mjs apps/web/test/preview-backend-boundary.test.mjs apps/web/test/run-workspace.test.mjs apps/web/test/settings-access.test.mjs apps/web/test/suggestions.test.mjs
run check-packages npm run check:packages
run architecture npm run architecture
echo '$ node scripts/architecture.mjs > architecture.json 2> architecture.stderr.txt' > "$E/logs/architecture-json.cmd.txt"
node scripts/architecture.mjs > "$E/logs/architecture.json" 2> "$E/logs/architecture.stderr.txt"; echo "exit=$?" >> "$E/logs/architecture-json.cmd.txt"
( cd "$T/linux-x64" && sha256sum metadata.json archive.tgz esbuild package.json && stat -c '%n %s bytes' metadata.json archive.tgz esbuild package.json ) > "$E/logs/ssr-0-toolroot-sha256.txt"
run ssr-1-pins-check npm run pins:check --workspace @capiro/qualification-elements
run ssr-2-typecheck npm run typecheck --workspace @capiro/qualification-elements
run ssr-3-build node packages/qualification-elements/ssr-build.mjs "$T" "$E/ssr-c7e06000" || exit 1
SHA=$(sha256sum "$E/ssr-c7e06000/receipt.json" | cut -d' ' -f1)
echo "MERI_ELEMENTS_SSR_RECEIPT=$E/ssr-c7e06000/receipt.json MERI_ELEMENTS_SSR_RECEIPT_SHA256=$SHA" > "$E/logs/ssr-4-env.txt"
MERI_ELEMENTS_SSR_RECEIPT="$E/ssr-c7e06000/receipt.json" MERI_ELEMENTS_SSR_RECEIPT_SHA256=$SHA run ssr-4-check-elements npm run check:elements
echo "--- post-run git status"; git status --porcelain --ignored=no
