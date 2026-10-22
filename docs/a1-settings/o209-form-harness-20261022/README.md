# O209 Settings form browser harness

Test-only follow-up to #117 `89cb85da3c23154b124c366157fcc6dd5b6ea7a6`, authorized by decision [6351322591](https://github.com/neo-capiro/capiro-frontend/pull/117#issuecomment-6351322591). #118 remains `248baf5dad008ff0f50fa31c61d791a3363da083`.

Three new browser files provide an HTML entry, a thin component mount and two Playwright scenarios. The existing Vite server, Playwright configuration, synthetic Clerk alias and `PortfolioHarnessProviders` are reused. Actual `SettingsDialog`, `CreateTenant`, QueryClient, Capiro transport, mutation journal, Web Crypto and semantic receipt validation run without replacement. The only service response is intercepted synthetic HTTP on the loopback page; no backend, live tenant or email provider is contacted.

The original `src/features/settings/security-form.test.tsx` is byte-for-byte unchanged: Git blob `59000e95adef69d7a20b9d2af23f9506e32b3be4`, SHA-256 `c4c7a907d3c4a9591b440d60850f0aa440cb3d360f859a7c45e74ba9aebd5fa8`. Its two names and eight assertion outcomes map one-to-one below. No product, dependency, lockfile, configuration, architecture registry/importer/evaluator or existing test changed.

| Original assertion | Browser counterpart (numbered in the new spec) |
|---|---|
| Busy dismissal does not call `close` | 1: close callback count is zero after disabled-button DOM click, real Escape and real backdrop click |
| Busy close button is disabled | 2: actual close button `disabled` is true |
| Creation requests once | 3: exactly one intercepted create POST while the response is pending |
| Every input is disabled | 4: every actual form input is disabled while pending |
| Pending Escape does not close | 5: close callback count remains zero after Escape |
| Mismatched receipt does not close | 6: close count remains zero after the refusal renders |
| Mismatched receipt does not refresh | 7: refresh count remains zero after the refusal renders |
| Body contains `not confirmed` | 8: the same text remains required |

The original mocked raw API permits an empty synthetic submission. Real transport requires valid slug, name and email, so the browser fixture fills those fields. Its response passes the canonical response schema but supplies the wrong slug, reaching the actual semantic receipt check. Waiting for refusal before assertions 6 and 7 prevents a pending response from falsely satisfying them. No positive accepted-receipt assertion existed in the original and none is claimed here.

## Execution receipt and limits

- Final collection: exit 0, exactly both scenarios collected.
- Touched-file ESLint: exit 0, no diagnostics.
- Focused TypeScript dependency-closure check of the two new TypeScript files: exit 0, no diagnostics. This is not the full application typecheck.
- Actual Playwright attempt: exit 1, **two browser-launch failures, zero scenarios and zero of eight assertions executed**, because the installed Playwright Chromium executable is absent. Raw browser report and verbatim log strings (`raw-logs.json`) are retained. No skips were introduced or treated as passes.
- The earlier attempt before the static response fixture was hoisted has the same missing-browser outcome; its verbatim log is retained separately inside `raw-logs.json`. Hoisting keeps one scenario callback focused on the ordered attempt; it changes no assertions or receipt.
- Original source hash, both test names, eight assertion sites and unchanged tracked production/configuration/registry files were checked. Final diff whitespace check passes. The first full diff check reported native Playwright trailing spaces in raw `.log` captures; the exact log strings are now JSON-encoded without changing their content (original SHA-256 values retained).

Existing matching-lock dependencies were reused: Node 24.19.0, Playwright 1.61.1, TypeScript 5.9.3. No installation or clean-install claim. This local source review/collection does not qualify actual DOM behavior. No browser mutation or backend/native qualification ran.

## Required Fable collection and execution

From repository root at the reviewed head:

```sh
npm run test:browser --workspace @capiro/web -- --list tests/browser/settings-security-form.spec.ts
npm run test:browser --workspace @capiro/web -- --workers=1 tests/browser/settings-security-form.spec.ts
```

The equivalent command from `apps/web` omits `--workspace @capiro/web`. The existing `**/*.spec.ts` pattern discovers this file, but the composed gate's explicit Portfolio spec list must include it (or run the second command as a separate required step). Retain exit status and `apps/web/test-results/browser-results.json`; qualification requires both exact scenario names passed, zero failed/skipped, with all eight checks reached. A successful `--list` report is collection only. The scenario names are identical to the originals.

Dot's exact-head review and Fable's green composed Chromium gate are required. The former composed PASS at #117 `89cb85da` + #118 `248baf5d` (CodeBuild `86ddf9ba`, 741 unit passes/36 skips, 38 Portfolio browser passes, build/smoke/scan PASS) remains operator-reported evidence at that older head, not qualification of this new harness.

Fable separately owns the isolated loopback **57 identities (21 standalone + 36 joined), zero skipped/pending/todo** run against pinned backend `ca4de503`, using the published wrapper command and receipt checker. Those 36 guarded cases are distinct from these two form scenarios. No joined guards or endpoints changed, and no joined run was duplicated. Deployed preview is not their target.

The frontend ship-request stays conditional. Backend-live/cutover, A2 HOLD and acceptance STOP2/6 remain. No merge, deployment, SQL or model turn occurred.
