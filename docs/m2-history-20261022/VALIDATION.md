# M2 history source validation

Frontend base: `e5f1f263f94ede9b785e4eabc3a5afe84b0f03c2`. Core remains unchanged at `ca4de503fb6ec09caf0daf8b976a0f649c6b9665`. All fixtures and screenshots use synthetic identities and data. Commands below use the repository-installed tooling directly: Windows, Node 24.22.1, TypeScript 5.9.3, Vitest 4.1.11, Playwright 1.61.1 and Next.js 16.4.0. No dependencies or lockfiles changed.

## Passing source checks

From `apps/web`:

```powershell
node ../../node_modules/vitest/vitest.mjs run tests/meri-conversation-list.test.ts tests/meri-capabilities.test.ts tests/meri-conversation-host.test.ts tests/meri-conversation-recents-clock.test.ts tests/meri-history-proxy.test.ts tests/meri-first-chat-route.test.ts tests/meri-first-chat-preview-policy.test.ts tests/meri-first-chat-host.test.ts tests/meri-first-chat-core.test.ts tests/meri-initial-draft.test.ts
node ../../node_modules/typescript/bin/tsc --noEmit
```

Result: 90 tests in 10 files passed; TypeScript exit 0. Scoped ESLint and Prettier over all changed application source and tests exited 0 with no warnings. The shared test harness was separately checked with its existing source, without reformatting unrelated lines.

From the repository root:

```powershell
node node_modules/@playwright/test/cli.js test --config apps/web/test/browser/playwright.config.ts apps/web/test/browser/meri-conversation-list.spec.ts apps/web/test/browser/meri-history.spec.ts
node scripts/public-packages.mjs
node scripts/architecture.mjs
node docs/m2-history-20261022/mutation-check.mjs
```

Result: 15 browser cases passed (8 new list cases, 7 existing history cases). The list cases cover paginated loaded-page filtering, keyboard open/reload, 401/403/503 without stale or empty substitution, foreign owner rejection even in an omitted client, client switch, late response after account replacement, and restoration of an unsent draft without dispatch. Package integrity passed. Architecture discovered `/meri/conversations` with 0 errors and 0 blocking findings; 18 unchanged inherited size findings remain unreviewed.

Visual review: [desktop](desktop.png) and [390px phone](phone.png) were inspected after the passing browser run. The phone assertion checks no horizontal document overflow. The new surface uses the previously adopted cmdk/shadcn Command, the exact Figma conversation icon, shared shell/fonts/buttons, and static geometry.

## Controlled mutation checks

Each mutant was applied alone, its named test failed at an assertion, and the original file was restored byte-for-byte in `finally`. Ten mutants produced eleven failing check executions. Infrastructure failures do not count as kills. The runner saves detailed synthetic output under the ignored `apps/web/work/m2-history-mutations` directory.

| Mutant | Check that caught it |
|---|---|
| Bypass feature/capability gating | Unit admission assertions |
| Admit identity while refetching | Unit admission assertions |
| Admit archived selected client | Unit admission assertions |
| Route a list client change to `/meri` | Unit selector and browser client-switch checks |
| Restore old capability destination | Capability route inventory |
| Drop conversation selector when opening | Browser keyboard-open/reload check |
| Render empty content instead of history error | All three 401/403/503 browser cases |
| Ignore another actor's history owner | Browser mixed-client owner rejection |
| Freeze the old actor in current account scope | Browser delayed identity replacement |
| Discard persisted unsent draft on remount | Browser list/draft round-trip |

The final 90-unit/15-browser passing runs occurred after all mutants were restored.

## Failed local checks and exact-base comparison

The following additional raw-Node command reports 23 passing cases and two module-load failures:

```powershell
node --test apps/web/test/meri-history-pages.test.mjs apps/web/test/meri-conversation-selection.test.mjs apps/web/test/meri-conversation-selection-journal.test.mjs apps/web/test/meri-turn-recovery.test.mjs apps/web/test/meri-prompt-identity.test.mjs scripts/architecture-conversation.test.mjs scripts/public-packages.test.mjs
```

`meri-conversation-selection-journal.test.mjs` cannot resolve the extensionless `meri-actions/session-receipt` import from `query-journal.ts`. `meri-turn-recovery.test.mjs` cannot resolve the extensionless `turn-persistence` import from `turn-journal.ts`. Both reproduce from an exact `git archive` of the base source with the same installed web dependencies made available. Neither test nor imported production file was changed by this slice. These failures remain open; the passing Vitest/browser coverage is a separate evidence tier.

From `apps/web`, `node ../../node_modules/next/dist/bin/next build` compiled successfully, passed its TypeScript phase, generated 287 pages and listed `/meri/conversations`, then exited 1 with `SecurityFatalError`: the pinned Next.js version has a known security vulnerability. No full build PASS is claimed, no dependency version changed, and the command was not retried to bypass the advisory. An exact-base production build was not run. The shipping owner must resolve the dependency/security gate and qualify the exact candidate.

`git rev-parse e5f1f263:<path>` and `git hash-object <path>` agree byte-for-byte for both dependency files: `apps/web/package.json` has Git blob `2579493e59d3368b03e3b1e4cd8b1e5cafc18a3f`, and `package-lock.json` has Git blob `e92f43c615808857f9c09c60a45049db3574a5ca`. The manifest pins Next.js 16.4.0; the installed package reports 16.4.0. The only package-manifest change is `packages/ui/package.json` exposing its existing `./command` source, with no dependency change.

## Unrun and held

Docker/Linux, PostgreSQL 16, native service, AWS/CodeBuild/image scanning, provider and live acceptance gates were not run. No database, provider or live-chat operation occurred. S2 acceptance remains the prerequisite for Wave 2 deployment and Core migrations. General bootstrap/runtime/schema compatibility, MG-05 context, MG-02 selected workflow lifecycle, MF-19/PF-02 cross-module receipt handshake, and MF-09 management mutations remain open as recorded in [STATUS](STATUS.md).

## Split-package qualification correction — 2026-10-23

Source: PR #123 at `e24e8f425ee8173757163065fcc2b6b10a46f685`; bounded correction requested in comment 6354522322.

The existing MF-09 list imports `@capiro/ui/command`, so the package export is retained. The unchanged repository generator `node packages/qualification-elements/generate-pins.mjs` regenerates `promotion-pins.json`. The full qualifier also exposed one stale exact-export assertion: its expected map omitted `./command: ./src/shadcn/command.tsx`. That single mapping is added; strict equality, closure checks, negative cases, deadlines and all 18 declarations remain. The final generated diff contains only the manifest record and the test-file record. No manual hash edit, component/provenance change, dependency change or gate bypass.

This Linux workspace recovered the complete UI and qualification package sources, workspace manifests, active lock and required vendored archives from the exact published head, verifying Git blob identities. It is a targeted qualification checkout, not a full application-build checkout.

Commands and actual results (Node 24.19.0, npm 11.9.0):
- `npm ci --ignore-scripts --no-audit --no-fund --workspace @capiro/qualification-elements --workspace @capiro/ui --include-workspace-root`: exit 0, 371 packages installed from the unchanged root lock.
- `node packages/qualification-elements/generate-pins.mjs`: exit 0.
- `node apps/web/deployment/portfolio/qualify-elements.mjs "$(mktemp -d)/elements"`: **exit 0; 18/18 PASS, 0 skipped**, including generator check mode, qualification TypeScript, pinned esbuild/SSR receipt verification, dependency/notice closure and negative checks. Full output: [qualify-elements-20261023.log](./qualify-elements-20261023.log).
- `git diff --check`: exit 0.

The initial local qualifier attempt stopped at missing `node_modules`. After the exact locked install, an intermediate run reached 17/18 with the missing command-export mapping above. Those attempts are not passes. The final run followed that bounded correction; no blind retry.

Final pins SHA-256: `ea363fc6982d7d0d4db68b8f029d9630ab210b294e47dbea229a2aa793167bf0`.
SSR receipt SHA-256: `70360eec91dbac9a4b3d6d15eb0b04e74e2a9b448aa0e56f4b8192601e2d30f2` (receipt paths in the log are local evidence, not a portable build).
The verified manifest at this source is 2493 bytes / `cdca27609c5c8406a1198b9e8ec57e1e5b07d0de2a9e9cea56b2e5a0cf28e6fd`; its stale pin was 2448 bytes / `3babdbb821c3c1ed0609efa5b23f15d2882c99121b2500715e275ea5d2ba605d`. This is the source-verified direction of the pin update.

### Remaining holds

The earlier Windows `SecurityFatalError` is **unresolved**. Its raw log and exact message/stack are absent from this recovered workspace and were not committed. The historical report above is a summary, not a verbatim error. The sanitized original message/stack was requested from dot/Fable in PR comment 6354917558; no environmental classification is established. CodeBuild 8a3ca423 stopped at qualify-elements and did not reproduce or clear the Next failure.

No application build, browser comparison, smoke, scan, native service, provider or live acceptance gate was repeated here. Fable's full exact-head production qualification and dot's re-review remain required. The two historical raw-Node module-load failures remain open. No dependency/advisory bypass, migration, deployment or merge. Wave 2 deployment remains held pending verified S2 acceptance; STOP2/6 remains.
