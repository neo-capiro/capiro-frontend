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
