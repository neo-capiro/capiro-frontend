# A1 Work browser fixture correction — 2026-10-22

Fable gate 6350271684 reports 16 new Work browser failures at #117 `353d4743a1cca73a2a504a15489bc9e549f045da` + #118 `248baf5dad008ff0f50fa31c61d791a3363da083`, base `87a8495138f0af5303bc93397438238c6cc5081b`. This packet classifies the source cause and records a fixture-only correction. It does not claim a local browser PASS.

## Classification and correction

These are stale **association fixtures**, not renamed selectors. The approved WS-04 rule in `features/portfolio/work/contracts.ts` admits only the exact client UUID and excludes prospect drafts. Names are presentation only. Both positive rows in `work-boundary-fixtures.ts` and both positive rows in `work-documents.spec.ts` still supplied names without `clientId`; therefore they are correctly withheld by current production code. Base admitted a unique name, which explains why those old fixtures passed there. `WorkPage` mounts `portfolio/work/WorkspaceDocuments`, not the Modules `WorkspaceLibrary` or `DraftClientAssociation`.

The source diagnosis accounts for all 16 reported failures:

| Cases | Count | Missing positive fixture |
|---|---:|---|
| Strategy list refresh 403/503 | 2 | Shared `workDrafts` |
| Strategy detail refresh 403/410/503 | 3 | Shared `workDrafts` |
| Documents/client/clients refresh | 3 | Shared `workDrafts` |
| Mismatched Strategy/client detail | 2 | Shared `workDrafts` |
| Mismatched current Client recovery | 1 | Shared `workDrafts` |
| Removed Strategy / late detail | 1 | Shared `workDrafts` |
| Client-scope change | 1 | Shared `workDrafts` |
| Failed refresh of empty Strategy list | 1 | Shared `workDrafts` |
| Healthy counts / exact Strategy links | 1 | Shared `workDrafts` |
| Canonical Workspace editor route | 1 | Local `drafts` |

The delta supplies the current UUID to those four positive rows. Negative fixtures explicitly remain unbound: the spread third row in the canonical-route test has `clientId: null`; the legacy duplicate-name case maps rows to null associations; the unique same-name/other-client case omits associations. No name fallback is restored. Every existing visibility, absence, canonical-link, row-count, refresh/cache, mobile, and no-unexpected-request assertion is retained. AST comparison preserves all 72 + 13 direct `expect(...)` call sites, their surrounding expectation chains, and every test name. There are no new skips. Independent read-only source review found no weakening.

## Executed checks and limits

- The requested command ran on the composed source: `npm run test:browser -- --workers=1 tests/browser/work-boundary.spec.ts tests/browser/work-documents.spec.ts`. It collected **18 cases**, then every case failed at browser launch: missing `/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell`. **Zero cases executed; exit 1.** This does not reproduce or clear Fable's 16 DOM failures. The two existing negative cases are included, not skipped.
- Canonical focused `work-associations.test.ts` + `domain-behavior.test.ts`: **10/10 pass**, zero skips, exit 0. Existing cases cover unique-name refusal, wrong UUID, rename/duplicate-name UUID persistence, and prospect exclusion. These unit results do not qualify browser interactions.
- Touched-file ESLint: **exit 0, zero errors/warnings**. Narrow TypeScript including the existing harness's Window declaration: **exit 0, zero diagnostics**. The initial wrong-cwd lint attempt and incomplete scratch TypeScript include are preserved in `setup-failures.txt`; no repository configuration changed.
- `git diff --check` and assertion parity pass. Product source and all architecture inputs are unchanged, so the existing zero-blocker gate is retained at its original attribution; no duplicate architecture or full production qualification was run.

The physical composed source was checked against **2,670 pinned source/test/UI blobs**, then overlaid with only these three fixture changes. Dependencies reuse the existing exact-lock installation; no clean-install claim, package/config changes or browser download. Shared overlay storage was full and RAM scratch had about 55 MiB free; no unrelated resources were removed.

Fable's `capiro-portfolio-preview-build:8a369283` / kit `ship-fe-f6427c42` remains the authoritative operator receipt: preview units/typecheck/lint/architecture/qualify-elements pass; **44 unit files, 741 passed / 36 skipped**; Meri browser **3 + 11 passed**; Portfolio browser **22 passed / 16 failed**. **Next build, container smoke and scan were not reached.** These results are neither rewritten nor treated as passing this new head. Raw current CodeBuild JSON/traces were not supplied here.

## All skipped cases and the separate form gap

`SKIPPED-TESTS.json` lists **every exact name of the 36 skips**, their common file, source hash and guard. They are the two 18-case joined suites in `tests/workspace-descendant-gateway.test.ts`, guarded by both `WS03_WORKSPACE_TEST_URL` and `WS03_WORKSPACE_CONTROL_URL`. They require explicit loopback Workspace admission/control fixture servers. They are **not jsdom tests**. The exact list is reconciled from the earlier raw author Vitest receipt and unchanged source; matching the current operator count is not independent access to his raw artifact.

The existing backend `apps/workspace/test/support/ws03-gateway-authority.ts` runner can supply the synthetic loopback servers and run this frontend file with both variables. The frontend file currently defines 57 cases (21 standalone + 36 joined); the runner asserts success, zero failures/pending, and more than 16 total cases, rather than pinning the total to 57. This is a proposed Fable-owned qualification route, not a new run here. Earlier native PG16 37/37 includes seven selected frozen-gateway cases and must not be presented as all 36 joined cases.

Separately, `src/features/settings/security-form.test.tsx` contains **two tests, zero executed**:

1. `all dismiss paths are ignored while a security dialog is busy`.
2. `tenant creation freezes fields and close controls until the exact receipt is accepted`.

Both ordinary Vitest globs select `.test.ts`, excluding this `.tsx` file. Explicit collection previously failed at worker startup because its requested jsdom environment is not declared/locked. The 36 skipped count does not cover these two cases.

**Proposed form qualification:** use the existing locked Playwright/Vite runner and Fable's Chromium CodeBuild stage for a dedicated SettingsDialog/CreateTenant browser harness, preserving both scenarios and every assertion with an explicit old-to-new coverage map. This adds no dependency and exercises a real DOM. It needs a separate bounded harness disposition; no form test was deleted, moved, rewritten or declared passing in this fixture correction. The form gap stays open until actual execution is recorded.

## Handoff

Dot: review the exact resulting #117 head and fixture/assertion delta. #118 remains unchanged at `248baf5dad008ff0f50fa31c61d791a3363da083`. Fable: rerun the two named Work suites in the existing Chromium runner, then the full composed gate. No final ship request or release clearance. Backend-live/cutover, A2 HOLD and acceptance **STOP2/6** remain. No A2, inherited cancelled-notes work, merge/deploy, live SQL or acceptance turns.
