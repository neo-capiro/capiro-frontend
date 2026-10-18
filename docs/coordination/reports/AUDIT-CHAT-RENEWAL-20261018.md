# Meri initial-draft recovery after session renewal

Base: frontend PR97 `a0a542d5eff162bef572564ff0397e460d74ed77`. The user confirmed overlapping lanes stopped and authorized the remaining expiry/reconnect repair. PR97's transient-failure conversation preservation and ordinary first-ACK draft clearing remain included and are not rewritten.

## Problem and implementation

An initial admission could commit while its reply was lost and the browser session expired. Reconnecting and retrying the exact request then recovered a successful answer, but the old prompt remained in the composer. Its consumption guard had belonged to `MeriLiveConversation`, which unmounts when the session expires, while the draft itself belonged to `useConversationSession`.

Keep both local responsibilities in the same conversation lifetime: `initial-draft.ts` owns the captured prompt, captured draft and edit marker; `useConversationSession` retains that owner through replacement sessions and records all composer edits, including edits made while disconnected. The live view consumes only a positively observed submit. The guard is cleared before notifying React, making repeated effects idempotent. Newer typing remains intact, including text edited away and back to the same original words.

The existing run journal still owns immutable request identity and retry bytes. Account, client or selected conversation replacement still replaces this local draft owner. This change supplies no browser authorization and changes no proxy, identity gate, source flag, package pin or lockfile.

## Evidence

- Before repair, an isolated temporary harness loading the exact PR97 live-component source failed the new expiry/reconnect test: expected an empty composer after the recovered answer, received `Original initial message`. The temporary harness did not replace tracked worktree files.
- The repaired source passed 12/12 browser cases across `meri-initial-reconnect.spec.ts`, `meri-initial-input.spec.ts` and `meri-stored-conversation-recovery.spec.ts`. They cover exact retry identity, no duplicate dispatch, newer disconnected drafts, edits back to the same words and refused foreign-actor renewal without a late dispatch.
- Focused unit checks passed 58/58. Independent review reran 34/34 of those cases and found no blocking issue.
- TypeScript passed with a 6 GiB Node heap. Default 2 GiB attempts exhausted the heap; they did not establish a source failure. Scoped lint passed with two existing dependency warnings; formatting, architecture and whitespace checks passed.
- The root production build passed and generated 283/283 pages.

The default Playwright browser download was a corrupt archive in this environment. An initial launch attempt against a zero-byte partial executable failed before application assertions. The successful run used an independently launch-checked Chromium 153 test executable extracted from the pinned `@sparticuz/chromium@153.0.0` package outside the project. No project dependency or browser configuration was changed for that environment workaround.

Browser responses were synthetic fixtures. This verifies application behavior, not live Clerk/Core/Meri availability. No main merge, deployment, provider request or database operation occurred.

## Cross-tab accepted-run switch follow-up

Published fix: [`d626bb080d7774ba5fc8167661d21893d9f1e3c8`](https://github.com/neo-capiro/capiro-frontend/commit/d626bb080d7774ba5fc8167661d21893d9f1e3c8), directly above PR98 `985664cc`. Its complete tree `9731aafa5cf23130bcc99e3987e1da7e4f811591` equals local reviewed commit `3b8d228406bade77a74b074175e2f8e9008863a1`. Paired backend fence fix: [`1aa5c66e9283024e78ad6f26f5450cbc61a37659`](https://github.com/neo-capiro/meri-greenfield/commit/1aa5c66e9283024e78ad6f26f5450cbc61a37659). GitHub API publication changes commit metadata, not source bytes.

The conversation-lifetime guard still matched only prompt text and blocked every run while pending. A lost ACK for A followed by another tab advancing to B could leave an enabled Send silently returning, or B's same-text ACK could clear A's draft. Both actual browser flows failed on the preceding source. The repaired guard captures only after the canonical command journal records its immutable request and matches the full tenant/actor/client/conversation/run plus canonical request identity. Selecting accepted B retires A's local guard without changing draft text; renewal for the same run retains A's capture and exact retry. This retires no durable request or backend authority. Pending checks are scoped to the current run even before React's selection effect executes, so effect ordering cannot swallow Send.

The strengthened browser scenario enters newer draft text while A is disconnected, opens B using **Open latest accepted turn**, verifies the newer text survives, and observes Send create a reservation with sourceRunId B. The same-text case proves B's distinct request/ACK cannot consume A's draft; unit tests also reject a different request ID within the same run. Immutable journal bytes are neither mutated nor recreated for retries.

Final verification:

- **14/14 browser tests passed**, covering the two new cross-run cases and all preceding expiry/ACK/stored-recovery cases. The strengthened two cases then passed **2/2** again; counts overlap.
- **69/69 unit tests in nine files passed**; independent review reran **45/45** overlapping cases and found no blocker.
- TypeScript passes with a 6 GiB heap. Scoped lint has zero errors and five existing warnings; formatting and whitespace pass.
- Architecture has zero dependency errors and zero blocking size findings; 18 inherited findings remain visible. Independent responsibility reviews updated the exact fingerprints for the 81-line current-turn renderer and 82-line conversation-lifetime composition; request identity and draft matching remain separate owners.
- Root production build passes with **283/283 pages**.

[Before/after browser, units, typecheck, lint, build logs and hashes](audit-evidence-run-switch-20261018/follow-up-evidence-manifest.json); [architecture summary](audit-evidence-run-switch-20261018/architecture-summary.json).

Browser command from root:

```sh
CAPIRO_QA_CHROMIUM_EXECUTABLE=/tmp/meri-browser/chromium CAPIRO_BROWSER_TEST_PORT=5209 npx playwright test --config apps/web/test/browser/playwright.config.ts meri-initial-reconnect.spec.ts meri-initial-input.spec.ts meri-stored-conversation-recovery.spec.ts
```

Unit command from `apps/web`:

```sh
npx vitest run tests/meri-initial-draft.test.ts tests/meri-input-recovery.test.ts tests/meri-first-chat-core.test.ts tests/meri-first-chat-host.test.ts tests/meri-conversation-live.test.ts tests/meri-conversation-host.test.ts tests/meri-conversation-reconnect.test.ts tests/first-chat-bootstrap.test.ts tests/first-chat-intent.test.ts
```

The [paired backend report](https://github.com/neo-capiro/meri-greenfield/blob/fix/audit-nine-20261018/docs/integration/AUDIT-REPAIR-REVIEW-20261018.md) links every one of the **32 remaining standard failures**, assertions, locations, scrubbed logs and all **3 runtime/18 control** diagnostics. A fresh parent comparison proves no introduced failures: PR179 has 4,356 passed/33 failed; PR180 before and after this follow-up has 4,357 passed/32 failed. Thirty are inherited fixture/expectation/provenance failures and two are environment-related runner failures also present on the parent. Four additional inherited integration-fixture failures are recorded separately. Backend focused follow-up checks pass 123/123. Real PostgreSQL contention qualification remains unrun.

No merge, deploy, live database/provider operation or shared auth/client-gate change occurred. Browser fixtures do not establish live behavior. Dot owns the separate live first-chat startup investigation. PR175 remains unchanged at `993f52a9`.
