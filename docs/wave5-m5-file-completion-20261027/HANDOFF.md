# W5-M5-02 — saved filing completion navigation

Author: Wave5 MF19 lane. Base: frontend PR252 `1281d906986cc2f6efe79622fc907656c8d3478d`. Own branch: `codex/wave5-m5-file-completion-20261027`. Wave4 released the three intent presentation files for this isolated source change; PR252 and its checkout were not changed. The previous baseline was `d0a5707eedf269ae7294b45b33ee2e75833d336a`.

## Behavior and existing owners

A completed native filing now offers one Client Files link for each **saved** observation. The destination combines the retained `artifact.file` command's client ID and the correlated result's persisted document ID. The Core producer maps that document ID to the canonical Engagement attachment; artifact object/version IDs and transient upload IDs remain distinct. The receipt location remains plain recorded text and is never used as a link.

The existing `/portfolio/[clientId]/files?file=<attachmentId>` receiver selects from the current authorized list, obtains the attachment's source, and retains its existing current-access preview/download read. This change creates no files, decisions, effects, routes, public DTOs or permissions. Next Link uses `prefetch={false}`.

Pending, failed (including persisted failures), unknown, withheld and unavailable outcomes have no saved-file link. Mixed results link only the saved subset. Saved results still link when indexing is pending or extraction has a disclosed limitation; all original per-file receipt details remain. Wave4 Research Portfolio intent dispatch, saved research draft destination and recovery changes are preserved.

Exact producer/receiver reconciliation precedes this implementation: Core `c5b99db7238a5e29600e5c976806b0d1d1802f6d`, `apps/api/src/meri/meri-client-filing.service.ts` blob `56f573f70f93fa4b47049749f8aa9f0dca66f69b` and `execution-capability/native-artifact-file-execution.ts` blob `ae81bb082dcbf051dee3dab5028be91082281b7d`; Meri `337e54b3ad92bd80eb65eefc72b4245c4f9ff50d`, `apps/control/intents/filing-outcome.mjs` and canonical artifact-file validators. Existing frontend Files route, `linked-arrival.ts`, `queries.ts`, `contracts.ts` and `navigation.ts` are unchanged. No deployment parity is inferred.

## Changed ownership and design review signal

- `apps/web/src/features/meri/conversation/intents/intent-view.ts`: adds saved-file destination projection beside existing filing receipt projection. The generic public command arguments are narrowed for presentation; all provenance validation stays in the installed public receiver.
- `intent-view-types.ts`: internal row destination fields only, not a wire DTO.
- `ConversationIntents.tsx`: renders those destinations beside the existing task/research destinations.
- `apps/web/tests/meri-filing-completion.test.ts`: canonical receiver plus real card rendering, controlling only the asynchronous list hook.
- This unique handoff.

The existing intent view exceeds the 400-nonblank-line review signal (509→536); its `intentRow` function grows102→103 nonblank lines. The filing helper adds one cohesive presentation operation. The card file grows400→410 nonblank lines; its pre-existing `DecisionControls` signal remains86 with identical fingerprint. These counts use the existing `scanModule` on only the three changed source files, against the exact base. No new lifecycle, effects, cross-feature dependency or independent domain was introduced. Keep this source together with its existing receipt presentation rather than split it to satisfy a numeric threshold. Root and independent Hermes review acknowledged this proportionate source disposition. Shared review registries were not changed; their integration binding remains open as recorded below.

No implementation was replaced or made dead. Existing detailed receipt fields, other destination links and all imported owners remain used. No speculative receiver or secondary file workspace was added.

## Author verification

Qualified Windows Node24.22.1 with task-local npm11.9.0, as explicitly supplied by root after the current Wave4 environment clarification. Root ran owned `npm ci --ignore-scripts --no-audit --no-fund` (860 packages, exit0); `package-lock.json` stayed unchanged, SHA256 `7cfe0532786bf572642fc267ecab5fe9cb0e993720f83429088d750b7c977924`. No dependency upgrade or shared cache mutation. No build was needed.

Commands below ran on the candidate, with the restored original source after mutations. `npm11.9` denotes `node ../mf19-windows-toolchain/node_modules/npm/bin/npm-cli.js` from the repository root; Node24 was first in the process PATH and npm used the task-local cache.

| Check | Command / result |
|---|---|
| Focused receiver/card and retained regressions | `npm11.9 test --workspace @capiro/web -- tests/meri-filing-completion.test.ts tests/meri-intents-view.test.ts tests/meri-research-action-view.test.ts` — **37/37 PASS**, 3 files, exit0; final run15:41:01UTC. Includes15 new filing cases and22 existing intent/RP cases. |
| Typecheck | From `apps/web`: `node ../../node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.json` — **PASS**, exit0. |
| Touched lint | From `apps/web`: `node ../../node_modules/eslint/bin/eslint.js src/features/meri/conversation/intents/intent-view.ts src/features/meri/conversation/intents/intent-view-types.ts src/features/meri/conversation/intents/ConversationIntents.tsx tests/meri-filing-completion.test.ts --no-cache` — **PASS**, exit0. |
| Touched format | Same four paths with `node ../../node_modules/prettier/bin/prettier.cjs --check` — **PASS**, exit0. |
| Whitespace / scope | `git diff --check` — **PASS**. Source changes are only the released three files; one focused test and this handoff are new. |
| Positive failure witness | Temporarily replace `fileLinks: filingLinks(item.proposal, completed)` with `fileLinks: undefined`. Run new suite with `-t 'links each saved|mixed completion'`: **both tests FAIL as intended**, exit1, because no expected destinations render. |
| Negative mutation | Temporarily change the saved predicate to `file.status !== "failed"`. Run new suite with `-t 'mixed completion|a pending filing'`: **both tests FAIL as intended**, exit1, because pending files gain forbidden saved links. |

Both mutations were restored byte-for-byte in `finally`; each targeted run selected2 tests and filtered13. The final unfiltered focused run has no failures or skips. Mutation runner and retained result excerpts are in the task's `work/mf19-mutation-witness.mjs` and `work/mf19-author-checks.log`.

Initial authored fixtures exposed two invalid phase combinations; the unavailable execution fixture now uses its valid retained-approved phase, and phase-only completion is explicitly tested as receiver rejection. The exact installed public receiver also rejects a saved observation with a null filename, covered by the new negative case; no fallback label was invented. An initial root-directory lint invocation lacked the app config; the corrected app-directory command above passes. No remaining inherited failure was found by these checks.

## Independent review and duplicate-key follow-up

Hermes independently reported **SOURCE PASS** at `44dacb8a526cc882c034cc0312908734b71941ee` / tree `0455ecff06ea70f144f9189283507b5bf7dc7aa2` and reproduced37/37 focused tests. Its complete report is preserved by root at task `work/hermes-review/MF19-RESULT.txt`. This verdict is scoped to that head; the small follow-up below is for root's delta coordination.

The reviewer noted that the canonical receiver requires distinct approved object identities but does not require unique persisted document IDs. The follow-up keys each rendered link by document ID plus its immutable receipt-list position. It preserves both observations and their links rather than deduplicating or adding a receiving rule. A new admitted duplicate-ID fixture proves that distinct objects can pass the installed receiver with one persisted attachment ID and both links remain visible. It does not claim that a particular Core deduplication was observed live.

Delta author checks on27 October2026: `npm11.9 test --workspace @capiro/web -- tests/meri-filing-completion.test.ts` **16/16 PASS**, exit0,16:01:38UTC. Targeted ESLint `--no-cache` and Prettier `--check` on `ConversationIntents.tsx` and the filing test **PASS**; `git diff --check` **PASS**. Original projection/RP regression, typecheck and mutation evidence above remains retained; no broad rerun or build. Captured delta output: task `work/mf19-duplicate-key-checks.log`.

**Architecture binding dependency remains open; no whole architecture-gate PASS is claimed.** Hermes assessed the gate's own functions read-only: allocated base819 findings/158 blocking versus reviewed head820/159, with zero boundary errors. The one new blocking finding is the card file crossing400→410. Existing affected registry fingerprints were already stale/blocking at the base. The full gate command cannot run as shipped in this sparse checkout because `docs/architecture-size-reviews.json` is absent; the reviewer read that registry with `git show` for its comparison.

Root/shared-registry owner must bind the approved source disposition to the eventual integration tree through the reserved `scripts/architecture/reviewed-size-findings.json` and the PR252-line `docs/architecture-size-reviews.json`: add the card file-level review and refresh the affected `intent-view.ts` file/`intentRow` bindings. Existing baseline debt stays explicit and is not repaired by this lane. After the key follow-up the card still has410 nonblank lines, with file fingerprint `b19cc9aaa51cab5a0e7030c4e31629d1538f5fbbb0d947fb4c8967a2db8d88b1`; unchanged `DecisionControls` retains `66fb493c28e0e13de099ec29d0f2230a4a561594067a7702f8e7782bd548c7cf`. No registry or shared review record was edited.

Not run: broad test suites, production build, browser/visual/accessibility/native/live acceptance, cloud/database operations or deployment. Hermes owns independent review and affected acceptance; root/Release owns integration and targets. This narrow source candidate does not close full MF-19 or PF-23.
