#!/usr/bin/env bash
# Qualification only. The designated shipping session owns image publication.
set -euo pipefail
export TZ=UTC NEXT_TELEMETRY_DISABLED=1
readonly expected_source=d4be41e60516e576c74afa304b50ed67da15cb93
readonly expected_tree=401cadde371b91606e3346243aaca6b6225aafcb
readonly expected_app_tree=6ae2118b797f478f5a63788841a9777d67c8001e
: "${CAPIRO_QUALIFICATION_RESULTS:?Set a new absolute result directory outside the checkout}"
case "$CAPIRO_QUALIFICATION_RESULTS" in /*) ;; *) exit 2 ;; esac
test ! -e "$CAPIRO_QUALIFICATION_RESULTS"
test "$(git rev-parse --show-toplevel)" = "$(pwd -P)"
node --input-type=module -e '
  import { realpathSync } from "node:fs";
  import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
  const requested = process.env.CAPIRO_QUALIFICATION_RESULTS;
  const destination = resolve(realpathSync(dirname(requested)), basename(requested));
  const location = relative(realpathSync(process.cwd()), destination);
  if (!(location === ".." || location.startsWith(`..${sep}`) || isAbsolute(location)))
    throw new Error("Result directory must be outside the source checkout; its parent must exist.");
'
if test -n "${PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:-}"; then
  export CAPIRO_QA_CHROMIUM_EXECUTABLE="$PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"
  export CAPIRO_TEST_CHROMIUM="$PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"
else
  unset PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH CAPIRO_QA_CHROMIUM_EXECUTABLE CAPIRO_TEST_CHROMIUM
fi
test "$(git rev-parse HEAD)" = "$expected_source"
test "$(git rev-parse 'HEAD^{tree}')" = "$expected_tree"
test "$(git rev-parse HEAD:apps/web)" = "$expected_app_tree"
test -z "$(git status --porcelain)"
mkdir -p "$CAPIRO_QUALIFICATION_RESULTS"
readonly result_dir="$CAPIRO_QUALIFICATION_RESULTS"

gate() {
  local gate_name="$1"
  shift
  date -u '+%Y-%m-%dT%H:%M:%SZ' > "$result_dir/$gate_name.started"
  set +e
  "$@" > "$result_dir/$gate_name.log" 2>&1
  local gate_status=$?
  set -e
  printf '%s\n' "$gate_status" > "$result_dir/$gate_name.exit"
  date -u '+%Y-%m-%dT%H:%M:%SZ' > "$result_dir/$gate_name.ended"
  test "$gate_status" -eq 0
}

git ls-tree -r --full-tree HEAD > "$result_dir/git-tree.txt"
gate install npm ci --ignore-scripts --no-audit --no-fund
gate browser-install npm exec --workspace @capiro/web -- playwright install --with-deps chromium
gate environment node --input-type=module -e '
  import { chromium } from "@playwright/test";
  import { execFileSync } from "node:child_process";
  import { availableParallelism, cpus } from "node:os";
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const browser = await chromium.launch({ executablePath });
  try {
    console.log(JSON.stringify({
      node: process.version,
      npm: execFileSync("npm", ["--version"], { encoding: "utf8" }).trim(),
      playwright: JSON.parse(execFileSync("node", ["-p", "JSON.stringify(require(\"@playwright/test/package.json\").version)"], { encoding: "utf8" })),
      launchedBrowserVersion: browser.version(),
      requestedExecutablePath: executablePath ?? null,
      playwrightConfiguredChromiumPath: chromium.executablePath(),
      launchPolicy: executablePath ? "explicit shared override" : "Playwright default headless launch",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      TZ: process.env.TZ, cpus: cpus().length, availableParallelism: availableParallelism()
    }, null, 2));
  } finally { await browser.close(); }
'
gate combined npm run check
gate elements node apps/web/deployment/portfolio/qualify-elements.mjs "$result_dir/elements-work"
gate portfolio env PLAYWRIGHT_JSON_OUTPUT_FILE="$result_dir/portfolio-results.json" npm run test:browser -- --workers=3 --output="$result_dir/portfolio-artifacts"
gate modules env PLAYWRIGHT_JSON_OUTPUT_FILE="$result_dir/modules-results.json" npm run test:browser:modules --workspace @capiro/web -- --output="$result_dir/modules-artifacts"
gate build npm run build
gate production npm run test:production -- "$result_dir/production"
test -z "$(git diff HEAD -- apps packages scripts vendor package.json package-lock.json .dockerignore docs/architecture-size-reviews.json)"
test "$(git rev-parse HEAD)" = "$expected_source"
test "$(git rev-parse 'HEAD^{tree}')" = "$expected_tree"
test "$(git rev-parse HEAD:apps/web)" = "$expected_app_tree"
git rev-parse HEAD 'HEAD^{tree}' HEAD:apps/web > "$result_dir/final-source.txt"
date -u '+%Y-%m-%dT%H:%M:%SZ' > "$result_dir/qualification-complete"
