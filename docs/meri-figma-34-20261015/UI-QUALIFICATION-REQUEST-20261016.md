# Meri UI qualification request — held for Shipping admission

Source behavior is pinned by
`92ae83cdbf165f36a77280d061b23b329f1b90ca` / tree
`63e58d4017c749e550e1ab3640df5888ceb50a7e`. Later documentation-only descendants
must be identified explicitly. Working directory:
`C:/Users/neoma/Documents/Codex/2026-10-15/task-7/meri-ui-followup`.

This is an execution request, not a slot grant. Shipping
`01a1383e-0c6b-778e-8893-2359c0da802e` is the sole heavy-test coordinator;
Meri qualification coordinator is `01a14243-40ec-7321-b8f4-1cf827a7f0c1`.
No npm, semantic compiler, browser or production build has been launched.

## Dependency preparation

Request a separate bounded install slot for the task-local unchanged root lock:
`npm ci --ignore-scripts --no-audit --no-fund`, Node 24.19.0, npm version recorded
before use, 512 MiB Node heap, ten-minute outer bound. The root lock SHA-256 is
`6dc039be028c302b58965532b05d3dd5aa0ca1ed8bb6a90be716eb6325d24d13`,
matching the existing frontend peer locks. Preserve hashes before/after and
workspace resolution to this checkout. Do not borrow another checkout's
workspace links. The parser-only local copy is disposable during the clean
install. No scripts, runtime downloads, package upgrades or lock edits.

## Browser selection and lifecycle

Use the existing canonical `apps/web/test/browser/playwright.config.ts` and its
unchanged test-only `server.mjs`. From `apps/web`, requested argv is:

```text
node ../../node_modules/@playwright/test/cli.js test --config test/browser/playwright.config.ts "(meri.*|acceptance-meri.*|settings.*)\.spec\.ts$" --workers=1 --retries=0 --timeout=30000 --global-timeout=1200000 --reporter=json --output C:/Users/neoma/Documents/Codex/2026-10-15/task-7/evidence/meri-settings-browser-artifacts
```

The selection is 17 existing spec files: two acceptance-Meri files, thirteen
`meri-*.spec.ts` files and two Settings files. Manual source inspection expects
133 registrations, including **19** in `meri-conversation-host.spec.ts` and three
in `meri-conversation-artifacts.spec.ts`. The old report claimed 22 host cases;
that claim must be checked by an actual `--list --reporter=json` inventory after
admission. Manual counts are not a registration or execution result. Require the
same registered IDs in the full run and retain any failure, skip or timeout.

Run the one affected mixed-spec case separately with the same bounds/config:

```text
node ../../node_modules/@playwright/test/cli.js test --config test/browser/playwright.config.ts test/browser/combined-successor.spec.ts --grep "^unknown Meri input remains visible and scoped across all three bound destinations before explicit exact retry$" --workers=1 --retries=0 --timeout=30000 --global-timeout=180000 --reporter=json --output C:/Users/neoma/Documents/Codex/2026-10-15/task-7/evidence/combined-meri-browser-artifacts
```

One worker; zero retries. Ask for a 2048 MiB heap cap per Node process and a fresh
host-capacity admission of at least the coordinator's 4 GiB plus safety margin.
The heap cap is not an aggregate browser/server memory limit. The canonical
harness builds with Vite, serves only `127.0.0.1:5197`, refuses server reuse, and
starts no Next/provider/database service. Use only the installed, explicitly
verified browser path/version selected by the coordinator; check both
`CAPIRO_QA_CHROMIUM_EXECUTABLE` (higher priority, different arguments) and
`CAPIRO_TEST_CHROMIUM`. No download. Windows Node/Chrome evidence does not qualify
Linux Node/Chromium.

Set `PLAYWRIGHT_JSON_OUTPUT_FILE` to a fresh task-owned report for each inventory
and run. Use the existing owned-process supervisor/cleanup procedure, retain
parent/child PIDs and port ownership, terminate only this run's owned tree on
failure or deadline, and verify no owned process or listener remains. Do not
create another runner or alter the canonical server/config/test bodies.

These browser tests use synthetic identity, transport and artifact responses.
They exercise actual UI interaction and retain axe default results, including
incomplete records; they do not qualify real authentication, providers, backend
authorization or durability. Preserve existing untested state records.

## Unit/static and production build slots

After dependencies, request the existing focused unit selection, one worker,
1024 MiB heap, 120-second outer bound, from `apps/web`:

```text
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts tests/meri-conversation-live.test.ts tests/meri-conversation-host.test.ts tests/meri-document-links.test.ts tests/meri-unavailable-resources.test.ts --maxWorkers=1 --no-file-parallelism --reporter=json --outputFile C:/Users/neoma/Documents/Codex/2026-10-15/task-7/evidence/meri-focused-unit.json
```

Counts must come from the actual report. Check ESLint and Prettier on the two
changed TypeScript files with the installed canonical tools (512 MiB heap,
60-second bound each). No baseline, snapshot or rules changes.

The production build request is the default root **`npm run build`**, which
first emits the public Meri client declarations and then runs the canonical
Next build with full semantic typing. Request a 6144 MiB Node heap and a
twenty-minute outer bound, separately admitted with sufficient host commit
headroom for its children. Preserve default build settings and diagnostics.
No duplicate full TSC run after it passes. No serve/deployment follows the build.

Run stages sequentially, never concurrently with another heavy slot. On resource
failure, retain the failed outcome, release the slot and re-coordinate; no retry
loop. Report actual runtime and cleanup. No paid, AWS, real-provider or live
database action is authorized.
