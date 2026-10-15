# Meri Figma 3.4 frontend: portable qualification evidence at c7e06000

Owner: Fable implementation owner. Independent validation by dot/Codex remains separate. This bundle answers the "Portable frontend evidence checklist" in dot's successor review of 15 October 2026 and the evidence HOLD in the corrected frontend review of `78b1c126`. It is evidence for an independent reviewer to check. It is not an acceptance decision.

## Source pin

| Item | Value |
|---|---|
| Evidence pin (PIN) | `c7e060007f5cd5a9b786442d0cc168a73c5565a8`, tree `e9905e0acf209cbd319166437c06ca1e112fa3de` |
| PIN parent | `78b1c12691541a32aa82039d2518b91a5e780ce5` (the source dot accepted), tree `0dc355ce7f81bb43b20202dd44facbefd004e988` |
| PIN branch | `meri/f34-evidence-docs` |
| PIN change | Docs only: `docs/meri-figma-34-20261015/ELEMENTS-ADOPTION.md` (current FileTree row and adaptation summary; original checks table labelled historical), `packages/qualification-elements/README.md` ("fifteen" became the eighteen cases now declared), and `packages/qualification-elements/promotion-pins.json` regenerated with `node generate-pins.mjs` because it binds the README bytes. No component, test, harness, manifest or lockfile changed. Canonical `packages/ui/provenance.json` is unchanged. |
| Evidence branch | `meri/f34-evidence-c7e06000`: PIN plus this directory only |

Every check below ran from a clean worktree at PIN. `git status --porcelain --ignored=no` was empty before the runs and after them (`logs/environment.txt`, final line of `scripts/run-checks.sh`).

## Environment

From `logs/environment.txt`:

- Node `v24.21.0`, npm `11.19.0` (the root `packageManager` field says `npm@11.9.0`; npm only listed the tree here and installed nothing).
- `uname -m` `x86_64`, Linux 6.18.44; `ldd (Ubuntu GLIBC 2.39-0ubuntu8.9) 2.39`; 4 cores, shared with other sessions.
- `package-lock.json` SHA-256 `6dc039be028c302b58965532b05d3dd5aa0ca1ed8bb6a90be716eb6325d24d13`, identical at `78b1c126` and PIN.
- `node_modules`: real directories copied with `cp -a` from an existing install of that same lockfile. Workspace links are relative (`node_modules/@capiro/ui -> ../../packages/ui`). `npm ls --all` for the qualification workspace exits 0 with no missing, invalid or extraneous entries (`dependencies/`).
- Browser: `CAPIRO_QA_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, `@playwright/test` 1.61.1, `axe-core` 4.14.0.
- esbuild tool root: official esbuild 0.28.2 linux-x64, hash-checked by `ssr-build.mjs` against `packages/qualification-elements/toolchain-pins.json`. The tool files are not shipped. Their SHA-256 values (`logs/ssr-0-toolroot-sha256.txt`):
  - `metadata.json` (1,770 bytes): `b6b0f9925ee7be3147e3dba80c26248c2af19ad11c796bd262497af43e99c679`
  - `archive.tgz` (4,741,809 bytes): `9573bb2233aab0f9ea7647d5cca9726113cc1768de61d66b17267f4db84488f6`
  - `esbuild` (11,427,952 bytes): `e1698a3d5c6c0798fee4fd3b5cc816651f460c63d390a7a26ea4beb0b1884100`
  - `package.json` (372 bytes): `a3924c1835c7849adeb3d82ac24525da0d4190607b60d05265dc6746bde2ddb8`

## Results

| Check | Command (from repository root unless noted) | Result | Log |
|---|---|---|---|
| Typecheck | `npm run typecheck` (all six workspaces) | pass, exit 0 | `logs/typecheck.txt` |
| Unit suite | `npm test` = `node --test scripts/*.test.mjs apps/web/test/*.test.mjs` | **116/116 pass** | `logs/unit-test.txt` |
| Unit subset reported earlier as "52" | `node --test apps/web/test/*.test.mjs` (the nine files listed in the log) | **52/52 pass**. The earlier "52 units" figure is this `apps/web/test` subset. Full `npm test` adds 64 `scripts/*.test.mjs` cases. | `logs/unit-test-apps-web-subset.txt` |
| Architecture | `npm run architecture`; also `node scripts/architecture.mjs > architecture.json` | exit 0; `errors: []`; size summary total 503, reviewed 484, inherited unreviewed 19, **blocking 0** | `logs/architecture.txt`, `logs/architecture.json` |
| Public packages | `npm run check:packages` | pass, exit 0 | `logs/check-packages.txt` |
| SSR pins | `npm run pins:check --workspace @capiro/qualification-elements` | pass (`{"check":true,"bytes":15370}`) | `logs/ssr-1-pins-check.txt` |
| SSR typecheck | `npm run typecheck --workspace @capiro/qualification-elements` | pass | `logs/ssr-2-typecheck.txt` |
| SSR receipt preparation | `node packages/qualification-elements/ssr-build.mjs <TOOLROOT> <NEWOUT>` | receipt SHA-256 `4ad91e1597290a64daeb03e560dfcc0a52534cef3dfda3938cfd52ae1caacf5e`; bundle 20,518,628 bytes; 2,807 inputs; 3,155 dependency records | `logs/ssr-3-build.txt` |
| SSR qualification | `MERI_ELEMENTS_SSR_RECEIPT=<NEWOUT>/receipt.json MERI_ELEMENTS_SSR_RECEIPT_SHA256=4ad91e15...cf5e npm run check:elements` | **18/18 pass** (pins check, typecheck, `node --test qualification.test.mjs`) | `logs/ssr-4-check-elements.txt`, `logs/ssr-4-env.txt` |
| Offline receipt verification | `scripts/offline-verify.sh` (see below) | new receipt passes at PIN; historical receipt passes at `78b1c126`; each receipt is refused at the other pin | `logs/ssr-5-offline-verify.txt` |
| Playwright, 12 Meri specs | see "Playwright invocation" | **95/95 expected, 0 unexpected, 0 flaky, 0 skipped** (7.7 min, 1 worker) | `playwright/list-output.txt`, `playwright/report.json` |

The environment variable names are taken from `packages/qualification-elements/qualification.test.mjs` (lines 142-143 and 213-214), which reads `MERI_ELEMENTS_SSR_RECEIPT` and `MERI_ELEMENTS_SSR_RECEIPT_SHA256`. `<NEWOUT>` was a new scratch directory. Its complete contents are copied unchanged into `ssr/c7e06000/`.

### First attempt, kept visible

The first run used `node_modules` symlinked to another checkout. Typecheck, units, architecture and packages passed (`logs/superseded-symlink-attempt/`). `ssr-build.mjs` then refused with `AssertionError: input escapes source roots`. The workspace links inside the symlinked `node_modules` resolved into the other checkout's `packages/ui`, outside this worktree, so the canonical guard rejected the input. That was a test-environment problem, not a source defect. The fix was a real `node_modules` copy, and every check was rerun. The failed build's partial output directory was deleted before the rerun. Its log is kept.

## SSR receipts: new and historical

| Receipt | Directory | `receipt.json` SHA-256 | Verifies at |
|---|---|---|---|
| New | `ssr/c7e06000/` | `4ad91e1597290a64daeb03e560dfcc0a52534cef3dfda3938cfd52ae1caacf5e` | PIN `c7e06000` |
| Historical | `ssr/historical-78b1c126/` | `1d7b867567ce988514762f39dec396432f101e5bbcf562fa3aa8be28138b31e6` (matches the supplied digest) | `78b1c126` |

Both directories are byte-for-byte copies of the original output directories. Each contains `receipt.json`, the three bound outputs `fixture.cjs`, `fixture.cjs.LEGAL.txt` and `metafile.json`, the esbuild version and build stdout/stderr and process envelopes, the discovery compile, and the `negative-*` directory that the drift-negative test creates beside the receipt. One item is left out of each copy: `negative-*/workspace/node_modules`, a symlink the test makes to the host `node_modules` (historical: `/home/user/capiro-frontend-meri/node_modules`; new: `/home/user/fe-evidence/node_modules`).

**The receipt identity changed, so both receipts are kept.** The docs-only PIN changed it. The receipt binds `sourceRecords()`, which hashes every owned file in `packages/ui` and `packages/qualification-elements`, and that set includes the qualification README and the generated `promotion-pins.json`. Field-by-field comparison (`logs/receipt-comparison.txt`):

- Identical: `schema`, `scope`, `node`, `tool`, `entry`, `inputs` (the 2,806 bound input mappings), `dependencies` (all 3,155 records), `externalImports`, `resolverMetadataRecords`.
- `fixture.cjs` (`45f3177103cd430d39098b444edf50f1d0fc489eaa7f0ed1277d02f627350c48`) and `fixture.cjs.LEGAL.txt` (`3b408a8916297642fec7bfc9f090491d53ebbc7accdbd28a10e89db897bc49b0`) are byte-identical. The rendered bundle did not change.
- `sources`: 67 records each. Only two differ:
  - `packages/qualification-elements/README.md`: 2,620 bytes `6924b865...8215` became 2,722 bytes `9be79d39...29c3`.
  - `packages/qualification-elements/promotion-pins.json`: 15,370 bytes `a8974baf...bbb0` became 15,370 bytes `b4755848...c806`.
- `metafile.json` differs only in its two `outputs` keys. esbuild writes them as paths relative to the build directory, so they name the output directory. All 2,807 `inputs` entries are identical, and the output entries are identical once their keys are reduced to the basename.
- `discovery` and `build` envelopes differ in output paths in `argv`, `cwd` (historical `/home/user/capiro-frontend-meri/...`, new `/home/user/fe-evidence/...`), timestamps and durations.

Consequence: the historical receipt is refused at PIN ("package source pins"), and the new receipt is refused at `78b1c126` for the same reason (`logs/ssr-5-offline-verify.txt`, section 3). This is the designed drift guard. Neither receipt was edited.

### Installed dependency bytes for `verifySSRReceipt`

`verifySSRReceipt` runs `verifySSRBundle`. It then re-hashes every `receipt.dependencies` record under the workspace `node_modules` and recomputes the input bindings from `metafile.json` (`ssr-build.mjs` lines 46-79 at `78b1c126`). Shipping `node_modules` is not needed:

- `dependencies/bound-dependency-manifest.tsv`: exactly the 3,155 bound files (path relative to `node_modules`, bytes, SHA-256, role). 2,788 are esbuild bundle inputs and 367 are the fixed resolver `package.json` records. They total 24,088,353 bytes, the same set for both receipts.
- `dependencies/bound-dependency-files.tar.gz` (4,579,223 bytes): those 3,155 files, unchanged, in a deterministic tar (sorted, mtime 0, uid/gid 0, `gzip -n -9`). The raw set is 24 MB, above the ~5 MB guide. It is included because it compresses to 4.6 MB and makes the receipt independently checkable without `npm ci`. These are unmodified files from public npm packages, and their licence notices are recorded in `fixture.cjs.LEGAL.txt` and `packages/ui/THIRD-PARTY-NOTICES.md`. Remove it if the reviewer prefers a manifest-only bundle.
- `dependencies/npm-ls-qualification-elements.trimmed.json`: `npm ls --all --long --json --workspace @capiro/qualification-elements` (exit 0), cut down to name, version, path and resolved, with `integrity` joined from `package-lock.json` (1,315 nodes, all with integrity apart from workspace links). The only lock/tree differences are the two workspace links, which npm writes as `file:../../packages/...` in `npm ls` and as `packages/...` in the lock.

Offline procedure (`scripts/offline-verify.sh`, logged in `logs/ssr-5-offline-verify.txt`). It builds a fresh directory from `git archive <commit> packages/ui packages/qualification-elements`, extracts only the tarball as `node_modules`, and calls the canonical `verifySSRReceipt({ receiptPath, expectedSha256 })` from that archive's `ssr-build.mjs`. It needs Node v24.21.0 on linux-x64, because the receipt binds `process.version`, platform and arch. Both receipts pass at their own commits.

A receipt passing verification is not a test pass. The 18-test result is the `npm run check:elements` log above, run against the new receipt. It includes the real-receipt identity and drift negatives, deterministic Conversation/Message/PromptInput server rendering, and escaping of hostile text. The historical receipt's own 18/18 run at `78b1c126` was not repeated here. Only its bytes and its `verifySSRReceipt` result are re-established.

## Playwright invocation

From `apps/web` at PIN (`scripts/run-playwright.sh`):

```
CAPIRO_QA_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
PLAYWRIGHT_JSON_OUTPUT_NAME=<bundle>/playwright/report.json \
npx playwright test --config test/browser/playwright.config.ts --reporter=json,list \
  test/browser/acceptance-meri-icons.spec.ts test/browser/acceptance-meri-theme.spec.ts \
  test/browser/acceptance-shared-incompletes.spec.ts test/browser/meri-action-host-mobile-navigation.spec.ts \
  test/browser/meri-adopted-disclosures.spec.ts test/browser/meri-adopted-elements.spec.ts \
  test/browser/meri-file-tree-keyboard.spec.ts test/browser/meri-files-navigation.spec.ts \
  test/browser/meri-files-workflow.spec.ts test/browser/settings-scenes.spec.ts \
  test/browser/shared-home-accessibility-interaction.spec.ts test/browser/shared-home-accessibility.spec.ts
```

No grep or filter: every case in these 12 files ran (`playwright/spec-list.txt`). The list matches the 12 files and per-file counts of the owner's earlier 95-case run. The config's webServer builds the Vite harness (`test/browser/server.mjs`, `test/browser/main.tsx`) and previews it on `127.0.0.1:5197`. Playwright started and stopped it. It uses one worker, no retries, screenshots only on failure and traces kept only on failure.

| Spec | Cases | Cases with 390/375 px in the title |
|---|---:|---:|
| acceptance-meri-icons | 2 | 0 |
| acceptance-meri-theme | 6 | 3 |
| acceptance-shared-incompletes | 20 | 10 |
| meri-action-host-mobile-navigation | 2 | 1 |
| meri-adopted-disclosures | 6 | 0 |
| meri-adopted-elements | 12 | 0 |
| meri-file-tree-keyboard | 2 | 0 |
| meri-files-navigation | 4 | 1 |
| meri-files-workflow | 9 | 3 |
| settings-scenes | 21 | 0 |
| shared-home-accessibility-interaction | 7 | 2 |
| shared-home-accessibility | 4 | 2 |
| **Total** | **95** | **22** |

Nothing failed, so no traces or failure screenshots exist. The passing-case screenshots that tests write to their output directory were not kept. The report's inline attachments are kept: 61 focus screenshots, the FileTree and footer screenshots, rendered-contrast JSON and the axe results. `playwright/tests-summary.json` gives per-test status and duration taken from the report.

## Accessibility (axe) results

`apps/web/test/accessibility.ts` runs the full default axe rules, fails on any violation, and attaches the raw result as `axe-full-default-results`. All 36 attachments in the report are decoded unchanged into `playwright/axe/NN-<spec>-<title>.json`. `playwright/axe/axe-summary.json` lists each one's SHA-256, URL, viewport, and violation and `incomplete` counts.

- **Violations: 0 in all 36 audits.**
- Audits with `incomplete` results: 28 of 36.
  - `color-contrast` (serious): 28 audits, 290 nodes. 289 nodes give "Element's background color could not be determined due to a background gradient". One gives "Element content contains only non-text characters".
  - `frame-tested` (critical): audits 18 and 24, WebPreview light/dark. axe did not enter the `sandbox=""` srcdoc iframe. **The preview document's contents are not covered by axe.**
  - `label-content-name-mismatch` (serious): audits 34 and 36, Modules home at 1440 and 390. The `About Modules` info button has an icon-only visible label, so axe could not decide.
- Only `acceptance-meri-theme` (audits 01-06) resolves its `incomplete` results automatically. `expectGradientIncompletes` requires every incomplete to be `color-contrast` and measures each node's rendered contrast (`rendered-contrast-axe-incomplete-*` attachments). In the other 22 audits with incompletes, the incompletes are kept but not judged by any test. They need manual review before anyone claims a clean contrast audit.

### Where each audit ran

Axe runs once per test, at the point shown. It does not run after later transitions in the same test.

| Audits | Test | Audited state |
|---|---|---|
| 01, 04 | theme: authored dark fixture (1440, 390) | `/meri/fixture/home`, dark, after keyboard Enter on "Start research draft" filled the draft |
| 02, 05 | theme: ordinary Files (1440, 390) | `/meri/files`, dark, after Modules navigation, Back/Back/Forward and a light/dark preference toggle |
| 03, 06 | theme: fixture Files (1440, 390) | `/meri/fixture/workspace-files`, same sequence as 02/05 |
| 07, 10 | disclosures: Tool (light, dark) | `tool-activity`, after the Tool disclosure was toggled open-closed-open by keyboard, focus on "View expanded tool activity". Not audited: the expanded-tool page reached afterwards |
| 08, 11 | disclosures: Task (light, dark) | `specialist-activity`, Research details expanded, the other three collapsed |
| 09, 12 | disclosures: Plan/Queue (light, dark) | `research-progress`, focus on "View run". Not audited: `run-detail` |
| 13, 19 | elements: Confirmation (light, dark) | `review-task-action`, focus on "Request changes". Not audited: `reject-or-request-changes`, `action-receipts`, `executed-task-proposal` |
| 14, 20 | elements: Checkpoint (light, dark) | `checkpoint-restore`, focus on "Fork into a new conversation". Not audited: `interrupted-run` |
| 15, 21 | elements: Sources (light, dark) | `evidence-sources`, after keyboard selection of source [1], with detail heading focused |
| 16, 22 | elements: Artifact (light, dark) | `analysis-outputs` before any interaction. Not audited: `workspace-files` card or `word-document` |
| 17, 23 | elements: Attachments (light, dark) | `attach-files` with one attachment, focus on Remove. Not audited: the empty state after removal |
| 18, 24 | elements: WebPreview (light, dark) | `generated-web-preview` after refresh and a Desktop/Phone width toggle, focus on "Full screen". Not audited: the fullscreen or fallback state. Iframe content not tested (`frame-tested`) |
| 25, 26 | FileTree keyboard (light, dark) | `workspace-files` / `dark-workspace-files` at the end of the keyboard and pointer sequence (Published re-expanded) |
| 27-30 | Files workflow docx/xlsx (1440, 390) | `/meri/files` after create, revise and verify of synthetic bytes |
| 31, 32 | Files disabled (1440x844, 390) | `/meri/files?documents-disabled=1` unavailable state |
| 33-36 | shared home (meri/modules at 1440, 390) | ordinary `/meri` and `/modules` home on first render |

Specs with no axe call: `acceptance-meri-icons`, `acceptance-shared-incompletes` (rendered-contrast measurements only), `meri-action-host-mobile-navigation`, `meri-files-navigation`, `settings-scenes`, `shared-home-accessibility-interaction`.

## Limits

- **Not a mobile qualification.** 22 of the 95 cases run at 390 or 375 px, because the 12 files include them. Mobile remains deferred and was not qualified.
- **No live services.** The harness is loopback-only with intercepted, synthetic fixtures. There is no live Capiro, Meri backend, auth, authorization, persistence, model, provider or browser-host integration. The SSR fixture is offline and synthetic.
- **Axe ran only at the explicit audit points above**, not after later transitions. `incomplete` results outside the theme spec are unresolved. Passing axe checks are not a manual accessibility audit or screen-reader evaluation.
- Not covered: release, deployment, Fargate or browser-sandbox gates. Contrast was measured only where the tests measure it.
- Same host, same Node/platform as the historical receipt. Independent reproduction on another host needs Node v24.21.0 linux-x64 and, to rebuild a receipt, the official esbuild 0.28.2 tool package that matches `toolchain-pins.json`.

## Host paths and scrubbing

My own text logs and copied scripts have host paths replaced: `<scratch>` or `<evidence-scratch>` for the session scratch directory, `<worktree>` for the evidence worktree, `<original-checkout>` for the other checkout. Machine artifacts are byte-exact and keep their host paths:

- `ssr/*/receipt.json`, `build.process.json`, `discovery/build.process.json` and `metafile.json` keys contain `/tmp/claude-0/.../scratchpad/esbuild-tool/root/linux-x64/esbuild`, the build `cwd` (`/home/user/capiro-frontend-meri/...` or `/home/user/fe-evidence/...`) and the scratch output directory. They are hashed, so they were not edited.
- `ssr/*/negative-*/` receipts copy those fields.
- `playwright/report.json` contains `/home/user/fe-evidence/...` paths in its config (`rootDir`, `configFile`, output dir) and in the spec locations. It is the raw reporter output and was left unedited.

## Files

| Path | What it is |
|---|---|
| `README.md` | This file |
| `SHA256SUMS` | `sha256sum` of every other file in this directory (`sha256sum -c SHA256SUMS` from this directory) |
| `logs/environment.txt` | Pin, clean status, Node/npm/arch/glibc/lockfile |
| `logs/typecheck.txt`, `unit-test.txt`, `unit-test-apps-web-subset.txt`, `check-packages.txt`, `architecture.txt`, `architecture.json`, `architecture-json.cmd.txt`, `architecture.stderr.txt` | Full non-browser check output |
| `logs/ssr-0`..`ssr-5*`, `receipt-comparison.txt` | Tool hashes, pins, typecheck, build, the 18-test run with env, offline verification, receipt diff |
| `logs/superseded-symlink-attempt/` | First attempt, including the failed `ssr-3-build.txt` |
| `ssr/c7e06000/` | New receipt directory, unchanged (8.5 MB of other files plus three 20.5 MB `fixture.cjs` copies) |
| `ssr/historical-78b1c126/` | Historical receipt directory, unchanged |
| `dependencies/` | Bound dependency manifest, tarball, trimmed `npm ls` with lock integrity, `npm ls` exit/stderr |
| `playwright/report.json` | Raw JSON reporter output (29,272,937 bytes, mostly base64 axe JSON and focus screenshots) |
| `playwright/list-output.txt`, `spec-list.txt`, `tests-summary.json` | List reporter log with command, spec list, per-test summary |
| `playwright/axe/` | 36 decoded axe results and `axe-summary.json` |
| `scripts/` | The runner, Playwright, offline-verify and axe-extraction scripts as run (paths scrubbed) |

Size: about 183 MB on disk. Most of it is the six identical `fixture.cjs` copies (20,518,628 bytes each), which Git stores as a single blob. Then `report.json` (29 MB) and the decoded axe JSON (12 MB).

No secrets, credentials or private source content are included. Identities and records are synthetic fixtures.
