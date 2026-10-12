# PROS-F01 current-read repair

Candidate `e7e62353c62d91fd7f234016db4ce7283b38bfcd` on `repair/capiro-prospect-current-read-20261012`, based on `3562618f73d7a1f9d620d7b7b28c9e8c2c1ac83d` in `/workspace/capiro-prospect-current-read`.

A failed current Prospects read now removes cached cards, counts, pipeline/stage dialogs and the creation editor, disables list actions, and leaves the existing truthful error and Retry control. Recovery requires a successful current list request. Returning to a recently cached filter also waits for its current request. Failed-read recovery discards old dialog inputs; successful same-filter background refreshes preserve an active creation draft.

## Bounded implementation

- `apps/web/src/features/portfolio/prospects/ProspectsIndex.tsx:38`: every data-backed branch uses one gate requiring query success, a read after this observer/filter mounted, and no current error.
- `ProspectsIndex.tsx:44`: list errors remove only `new` and `pipeline` URL intents, preserving filters and ensuring recovery does not reopen old dialogs. The child components unmount, discarding their local creation/stage/drag state.
- `apps/web/src/features/portfolio/prospects/queries.ts:39`: the existing prospect list query uses `staleTime: 0`. This makes mount/filter changes request current data even when that query key has older cached success. The view uses TanStack's existing `isFetchedAfterMount`, avoiding a new cache or authorization mechanism.
- `apps/web/tests/browser/prospect-current-read.spec.ts`:12 focused acceptance controls, using the existing synthetic Portfolio fixture and current product routes.

No endpoint, backend authority, mutation contract, shared query framework, shared manifest or architecture registry changed. Prospect detail and its existing error gate are unchanged. This addresses the frontend release blocker for PROS-001/PROS-002; it does not establish backend authorization bypass or close native acceptance dependencies.

## Red-before/green-after evidence

The original root replay is copied byte-for-byte into `baseline-replay/`, with `baseline-provenance.json` linking and hashing the published source evidence. It reproduces a successful cached list followed by a fresh403, with the old cards and pipeline still usable. Frozen4a and the previous Workspace repair are untouched.

- `red-results.json` / `red.log`: eight index controls fail as expected on original source:403/503 cached remount, cached filter return and background reread while creation or pipeline-stage editors are open. A ninth initial client control encountered a test-clock/locator issue; that failure is not counted as product evidence.
- `red-client-corrected-results.json` / corresponding log: corrected client route control reproduces the stale creation editor on return after403. The route uses the actual client Relationships view, avoiding the Playwright clock Intl wrapper incompatibility in the unrelated client Overview. The intermediate failed fixture attempts remain available rather than being represented as product failures.
- `red-client.log` / `red-client-final.log`: intermediate fixture diagnostics; the latter also records the successful baseline background-reread preservation control.
- `red-fresh-filter-results.json` / log: two additional controls fail on the first error-gate candidate. After a filtered403/503 within30seconds, returning to the earlier still-fresh cache displayed old records without another request. The final list freshness and fetched-after-mount gate repairs this case.
- `final-results.json` / `final.log`:15/15 pass on final source:12 new controls plus3 existing Prospects cases. The controls cover403 and503, current errors and Retry, held recovery with no cached resurrection, discarding/reopening creation and stage editors, fresh cached filter return, client route replacement, successful background input preservation, and zero unexpected mutations. Existing cases preserve old-backend disabled creation, company edits, new-catalog creation/stage flow, legacy stages and retained note failures.
- Final TypeScript, focused ESLint, Prettier and `git diff --check`: pass (`typecheck-final.log`, `lint-final.log`, `format-final.log`).
- Final screenshots under `final-artifacts/` show current403/503 error states without cached records or totals and with disabled Add/Pipeline controls. The403 screenshot was inspected visually.

All browser requests are local synthetic traffic and the fixture uses one worker with system Chromium. No live writes or providers were called. The Portfolio harness uses canonical DataProvider, not the full ApplicationBoundary: the client control qualifies actual navigation to another client's route, editor unmount and failed re-entry. Full live session/client authority behavior remains a separate integration gate.

## Exact commands

From the repair worktree:

```sh
node node_modules/@playwright/test/cli.js test --config /tmp/capiro-prospect-current-read-20261012/red.config.mts
node node_modules/@playwright/test/cli.js test --config /tmp/capiro-prospect-current-read-20261012/red-client-corrected.config.mts --grep 'client route replacement'
node node_modules/@playwright/test/cli.js test --config /tmp/capiro-prospect-current-read-20261012/red-fresh-filter.config.mts --grep 'earlier filter cache is fresh'
node node_modules/@playwright/test/cli.js test --config /tmp/capiro-prospect-current-read-20261012/final.config.mts
node node_modules/prettier/bin/prettier.cjs --check apps/web/src/features/portfolio/prospects/ProspectsIndex.tsx apps/web/src/features/portfolio/prospects/queries.ts apps/web/tests/browser/prospect-current-read.spec.ts
node scripts/architecture.mjs
```

The red commands were run before their corresponding source repairs. From `apps/web`:

```sh
node ../../node_modules/typescript/bin/tsc --noEmit --incremental false
node ../../node_modules/eslint/bin/eslint.js src/features/portfolio/prospects/ProspectsIndex.tsx src/features/portfolio/prospects/queries.ts tests/browser/prospect-current-read.spec.ts
```

External server/config files are in this evidence directory. The server is the existing Portfolio fixture copied to point at this repair worktree and port5299. Configs leave `webServer` undefined, set one worker, and use `/usr/bin/chromium`. Dependencies are an untracked borrowed symlink to the frozen checkout's install. No shared fixture server/config file was edited.

## Integration work

Architecture reports zero boundary/dependency/cycle errors and one changed-source review signal: `ProspectsIndex`,189 nonblank lines (module215). `source-review.json` contains the exact source SHA256/function fingerprint and cohesive responsibility review. The query hook and new test file have no size signals. Root owns registering this review and rerunning the guard; no thresholds or registry records were bypassed.

Root owns clean install, production Next build and final combined qualification. No AWS, native backend writes, provider calls, paid models or deployment were run. This is a frontend behavior repair, not a native acceptance or deployment claim.

Independent review accepted this exact committed candidate with no source concerns: six external probes pass, plus a fresh replay of all12 new controls (18 independent passes). The reviewer covered fresh-cache return after403/503, the existing detail editor and held current retry, client navigation retaining a pipeline URL intent, and successful background input preservation. The exact189-line ProspectsIndex responsibility/fingerprint review was accepted. Source-bound independent evidence is under `/tmp/capiro-p1-independent-review/current-read`, including the independent results, corrected detail controls and author-case replay. The final independent report/manifest is owned by that reviewer. Root still owns architecture registration and combined qualification.
