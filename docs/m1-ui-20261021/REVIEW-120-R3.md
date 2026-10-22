# PR120 navigation retry correction

Bounded response to [Fable gate report6339139522](https://github.com/neo-capiro/capiro-frontend/pull/120#issuecomment-6339139522), revised 2026-10-22T11:01:37Z. The reviewed parent is `5d2a37454f9ff3276bb1fd71980b61491b4a2f7c`, tree `2deda999885621fa6a759f925888e387d8885dd2`; PR119 remains `5c86f9b3e6b138fe1b572b071d66766591f6dd7e`, tree `0cf0f3e3da7310854a3166d8341defec48070054`. Resulting publication hashes are in the PR body.

## Cause and correction

All three reported fixtures persist the original request before deliberately losing its submit acknowledgement. Ordinary navigation keeps the same QueryClient and genuinely uncertain request. The R2 startup change nevertheless read SDK history, admitted the already completed run, and then reconciled the matching request to observed. That removed **Retry same request** before the required click. For initial input, admitting a history view also prevents the original `submitInitial` workflow: the unchanged SDK rejects it as `initial-input-already-observed`.

The canonical command journal now records, only in the mounted journal handle, whether it populated an absent query-cache value from session storage. The value is captured before cache initialization. No persistent record, public DTO, identity rule or authority changes.

- Existing-cache unknown input waits for explicit Retry, preserving its original workflow and bytes. It does not automatically read SDK history, acknowledge the request or resend.
- Hard reload keeps R2's read-only SDK admission and matching canonical-history reconciliation. Queued stored input still needs explicit **Continue accepted request**. Stored bytes alone never enable Stop or establish authority.
- The existing explicit initialPrompt branch remains first. Storage failure has a false hydration flag and retains its existing fail-closed behavior.

Only three production files change: `query-journal.ts`, `useRunCommandJournal.ts` and `useLiveRun.ts`. The SDK, RunStatus, browser specs, fixtures, timeouts, retries, skips, shell and feature defaults are unchanged.

## Source attribution and browser results

Source comparison against the exact PR119 tree shows that it skipped startup history for retained unknown input and had no automatic reconciliation effect. The behavior causing these failures was introduced in PR120 R2. This is source attribution, not a substitute for the requested per-head browser execution.

| Pinned browser case                                                                                         | Fable at parent 5d2a3745 | PR119 5c86f9b3 reproduction here | Corrected-head browser result here |
| ----------------------------------------------------------------------------------------------------------- | ------------------------ | -------------------------------- | ---------------------------------- |
| `combined-successor.spec.ts`: unknown input across all three bound destinations before explicit exact retry | Reported click timeout   | NOT RUN — runner restriction     | NOT RUN — coordinator gate         |
| `meri-conversation-host.spec.ts`: navigation retains uncertain request and exact run before retry           | Reported click timeout   | NOT RUN — runner restriction     | NOT RUN — coordinator gate         |
| `meri-initial-input.spec.ts`: interrupted initial submit survives navigation and retries original input     | Reported click timeout   | NOT RUN — runner restriction     | NOT RUN — coordinator gate         |

The prior Chromium singleton-socket EPERM and failed scoped escalation remain restrictions. No browser-launch retry, alternate-launch bypass, unchanged central suite duplication or image build was attempted here. The permitted runner must execute the named cases at both requested old heads and the corrected head; main comparison and the complete new-head Meri suite remain coordinator-owned. Fable's serving-release pass and 907-unit receipt are attributed to his report, not rerun locally.

## Local composition evidence

The existing readmission unit harness now composes the real hook, journal, RunStatus callback and SDK with the existing pinned initial-input browser fixture handlers. It launches no browser or network service.

- Both ordinary and initial lost-ACK navigation cases failed on the unchanged parent product source: startup made `/api/conversations/history` before the explicit retry. With the correction, zero calls occur before the visible, enabled Retry action. Its callback replays exactly the original bytes; the initial path repeats allocation/admission/submit, while the ordinary path does not allocate.
- A new lost-admission hard-reload case proves queued history is read without dispatch, then explicit Continue admits/submits the same input without another allocation.
- Existing readmission/Stop, foreign-history, exact-request mismatch and queued-continuation assertions remain.

Four targeted mutants were detected by assertions and restored: `R3-NAV-AUTO-HISTORY`, `R3-RELOAD-SKIP-ADMISSION`, `R3-INITIAL-LOSE-WORKFLOW`, and `R3-NAV-AUTO-RESEND`. Each new case has a detecting mutation. The focused readmission/input-recovery/readiness set passed 23/23; this overlaps the combined suite and is not additive.

Combined Meri checks passed **72 files / 932 tests**, zero failed or skipped. Full web TypeScript (`tsc --noEmit --incremental false`, 4 GiB heap) passed. Its initial run found an optional fixture-fulfillment argument missing a type guard; the guard was added, then TypeScript and the six-case readmission suite passed. No production source changed after the combined run. Architecture passed with **0 errors / 0 blocking** (539 total, 521 reviewed, 18 inherited); no rule or exemption changed. Changed-path ESLint, Prettier and whitespace checks passed. These are local source/composition results, not browser, full-web-suite or image qualification.

## Holds

No browser PASS or whole-image readiness is claimed. #119/#120 ship requests remain held for the named regressions' executed requalification, the inherited alignment finding, production image/build and applicable native/live acceptance. Updated retained alignment measurements in comment6338689877 distinguish status wrapper x808 from target804, but the intended historical design revision and full trigger/font evidence remain unresolved. No CSS or tolerance was guessed.

Core #108 remains unchanged at `ca079eb4c55acce756c8294a96a7fba555f01def` and **NOT DEPLOYABLE**. The newly relayed nineteen-migration brief requests changes beyond this session's directly confirmed proposal-only collision boundary. Confirmation was requested through dot in [comment6339234867](https://github.com/neo-capiro/meri-greenfield/issues/202#issuecomment-6339234867); SQL and deploy readiness remain unchanged. PostgreSQL migration execution remains Fable-run regardless. All other release, ownership, sequencing and no-early-Wave-2 holds remain. No SQL, AWS, merge or deployment action.
