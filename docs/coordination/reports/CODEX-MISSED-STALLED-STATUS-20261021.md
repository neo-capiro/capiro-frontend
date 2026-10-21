# Recovered Meri observation-status fix — 21 October 2026

## Source and scope

Base: `4f9a7e8dcaa9ba03494dc5a49559daf70cea5100`, the refreshed frontend main containing PR113's preview-line consolidation and PR102's disabled-by-default approvals. Branch: `codex/missed-stalled-status-20261021`. Nothing is merged or deployed by this task.

The all-history audit found one additional unpublished product fix in the preserved local refs: `0e4a9d748591774e838592ab9bccf89706392e59` (`codex/meri-stalled-status-20261019`, Codex, 2026-10-19T23:53:44Z). It was received with explicit cherry-pick provenance as `180ca0bed2fbadda9d103f3f0079e3dc82c8c8a6`. The original checkout and its evidence remain untouched. The prior owner recorded a local-only independent review and 16 passing cases in `evidence/meri-consumer-67fdf56b/stalled-status-validation.json`; those historical results do not substitute for this branch's checks.

When event observation stalls, the last observed queued/running state cannot establish current execution. `RunStatus` now says the run status is unknown and offers Reconnect. A companion correction makes the page-leaving hint explain that leaving does not cancel the run; it no longer promises continued execution. The existing retry, cancellation, observation and authoritative terminal-state owners are unchanged. No public contract, token, proxy, feature flag, dependency or infrastructure change is included.

## Verification

- Node 24.10.0 and npm 11.9.0. Isolated dependencies were copied from the preserved checkout with the identical lock SHA-256 `c42e790cc2eb7d2d62c0daac01bba9a3002f65a8b2a3ba97ad192ab164898234`; nested installed versions were reconciled with the lock. 841 applicable installed package versions match. Five optional WASM fallbacks are absent; the native Windows bindings are present. This is not a claimed fresh network install. An attempted offline `npm install` hit the existing 0.1.0/0.1.10 peer-resolution conflict and did not change the lock.
- Focused Vitest: `meri-run-status`, `meri-conversation-live`, and `meri-conversation-reconnect`: **28/28 passed**. The recovered test drives the real observation retry loop for queued and running states, verifies the four failed attempts, and checks truthful rendered status and the Reconnect control.
- Scoped ESLint: **0 errors**, one existing unused `run` import warning in the browser fixture; changed-file Prettier and `git diff --check` pass.
- Full web TypeScript (`tsc --noEmit --incremental false`, 4 GiB heap): **pass**.
- Public-package pin/provenance check and architecture gate: **pass**. No boundary errors or new blocking size findings.
- Actual Chrome/Playwright: **3/3 passed**, exit 0. Cases cover exhausted reconnects resuming the accepted cursor, durable Stop plus authoritative cancelled state, and completed cancellation receipts that must not claim cancellation. Windows left the test-only Vite server alive after all cases passed; stopping that exact owned server process completed Playwright teardown. No application/server behavior was altered to pass the cases.
- Root `npm run build`: **pass**, including Meri client compilation and **283/283** generated Next pages.

Retained command output is in [the supplemental evidence directory](missed-stalled-status-20261021/). Focused commands from `apps/web` were `vitest run tests/meri-run-status.test.ts tests/meri-conversation-live.test.ts tests/meri-conversation-reconnect.test.ts --maxWorkers=1` and `playwright test --config test/browser/playwright.config.ts test/browser/meri-conversation-host.spec.ts --grep 'repeated failed reconnects|Stop requests durable|completed cancel receipt'`; both used the explicit Node 24 executable. Root checks were `scripts/public-packages.mjs`, `scripts/architecture.mjs` and `npm run build`.

Browser data is explicitly synthetic. These checks do not establish live Clerk/Core/Meri service behavior, deployment acceptance or complete Figma visual parity.

## Other source lanes

The inventory covers 151 remote branches, 113 historical PR heads and eight original local heads. Historical memory review, held roster source and browser-spec donors require separate content reconciliation on a supplemental branch; this narrow status PR does not claim to receive them. Superseded historical reports and deliberately retained evidence archives keep their existing dispositions in `docs/integration/FRONTEND-INTEGRATION-LEDGER.md` section 8. No branch merely being a donor is treated as proof that current consolidation already covers it.
