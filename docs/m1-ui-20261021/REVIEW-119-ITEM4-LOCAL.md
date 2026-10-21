# M1 item 4 — local preparation under the publication hold

Fable's clarification in PR119/comment6328385634, also relayed byte-identically in issue202/comment6328387040, resolves the copy interpretation within the existing M1 brief. This is local preparation only. Published PR119 remains `9b4a9159cd32f6681995c5bbfc97c2a31cc13ba3`; PR120 remains `6135bbced3895c652e187d61d165f17f3524b2b0`. No further publication is authorized until the requested re-review verdict. Fable owns Chromium and production-build qualification.

## Behavior and canonical owners

- `RunStatus` shows accepted cancellation as **Cancelling / Attention** with “Meri is finishing the current safe step before stopping.” A terminal cancel record from the saved-history projection selects **Stopped / Complete** with “Stopped. Completed steps remain recorded.” An event-stream status alone cannot establish the saved-history state. Completed/failed cancel receipts retain their actual outcome; a pending request does not claim accepted cancellation.
- `MeriConversationHost` passes the existing canonical history-source eligibility into `MeriLiveConversation`. **Ready / Complete**, “You can send your next message,” requires re-verified terminal history, no continuation recovery barrier, and cleared local command/draft-ACK barriers. It describes client-side admissibility, not physical retirement. Its action focuses the composer and does not dispatch.
- The existing `recoverConversationTurn` owner now performs exactly one reservation attempt per explicit command. The former timed retry wrapper and cadence constants are removed. An exact 409 `CONVERSATION_TURN_CONFLICT` / `NOT_DISPATCHED` on a retained send becomes a status, not a command error: “Meri is still finishing up. Your message is saved; try again in a moment.” **Retry same turn** reuses the immutable source/request/prompt. No timer resends it. Mapping-only failures without a retained message keep their existing recovery path and cannot claim a saved message.
- Existing draft and request owners retain text and request identity. A later matching acknowledgement cannot erase newer edits. PR119 still uses mounted/query state; PR120 supplies the approved same-tab persistence. No new persistence owner, public contract field, server route, runtime behavior, dependency or feature-default change is introduced.

The existing local status presentation is extracted cohesively inside `MeriLiveConversation` so the main composition remains within the repository's size gate. The future public turn-retired signal is a separate runtime brief item and is not implemented here. No Core migration, Workspace approval removal, merge or deployment is included.

## Verification

- Meri suite: **61 files / 878 tests passed**. After the final cohesive presentation/acknowledgement extraction, readiness and draft-ACK suites passed **8/8**. The earlier bundled-config run was invalidated by full-disk transform failures and a missing sparse-checkout evidence file; the exact baseline evidence was restored and the successful rerun used Vitest's supported `--configLoader runner --no-cache` options.
- Focused Stop checks: **24/24**. Explicit-turn checks: **8/8**. Ready/recovery presentation: **5/5**, including eleven excluded-readiness scenarios. These overlapping counts are not additive to the Meri suite.
- **33 distinct targeted mutants killed** during preparation: 8 Stop/history, 10 explicit reservation/recovery, 15 readiness/recovery presentation. Final readiness faults were rerun after moving that decision into the canonical composer-availability function. The subsequent acknowledgement extraction preserved its original effect body and passed the final eight-test rerun.
- Scoped product/browser TypeScript, changed-path lint and formatting passed. Architecture: **0 errors / 0 blocking findings**, 539 total signals, 521 reviewed and 18 unchanged inherited findings. No review record, boundary policy or size exemption changed.
- Browser scenarios are prepared for Fable, including terminal-history Ready followed by 409, no dispatch beyond the old timer cadence, explicit retry/double activation, retained request identity and newer-draft protection. No browser body, browser mutation, production build or live acceptance is claimed here.

Historical receipts and the earlier interpretation hold in `REVIEW-119-R1.md` remain historical; this clarification supplies the current copy interpretation. Publication remains held for the re-review verdict.

## Local stack rehearsal with the preserved PR120 integration

The unpublished PR119 correction is local commit `aa95d8f68903d50be21f136d702bf1fc33e3d616`, tree `0cf0f3e3da7310854a3166d8341defec48070054`. The existing PR120 integration from local `ba27333274c5bcfce1c7e3484f8f41620be0d337` is reapplied on that correction in a separate local branch. The remote PR119 and PR120 heads above were rechecked and remain unchanged; this rehearsal is not publication or a PR120 verdict.

All 55 integration paths remain present. Comparing the added/removed lines of the original integration with this reapplication shows 53 unchanged paths. Only `MeriLiveConversation.tsx` and `useConversationTurn.ts` required resolution: saved history and the Ready card are forwarded through the existing storage-aware presentation, and the persisted reservation helper calls the one-attempt recovery owner. Storage failure still blocks Ready and commands. Capture still precedes journal persistence and reservation dispatch. Capabilities, identity priming, exact scope cleanup and defaults are unchanged.

The stack adds three storage-failure exclusions to the readiness presentation table and adapts the new turn test to the existing mandatory capture signature and real primed tab storage. Fresh journal/draft owners verify that both retained records exist before dispatch. Those test adaptations and this receipt are the only additional paths beyond the 55 preserved integration paths.

- Combined Meri suite: **69 files / 918 tests passed**, using `--configLoader runner --no-cache`.
- The adapted turn test passes **5/5**. Two additional ordering mutants are killed: capture after journal write, and omitted capture. These supplement the 33 correction mutants above; no browser mutation is claimed.
- Changed overlap/test lint and formatting pass. Architecture remains **0 errors / 0 blocking**, 539 total, 521 reviewed, 18 inherited signals. No rule or review exemption changed.
- Full web TypeScript passed with no diagnostics (`tsc --noEmit --incremental false`, Node `--max-old-space-size=4096`). The initial default-heap attempt terminated at the 2 GB Node heap limit, so it is not counted as a completed check. The successful rerun changed only the process memory allowance; compiler checks and source were unchanged.
- Independent source review found no product regression in readiness/storage gating, saved-history Stop state, persistence ordering, immutable explicit retry, scope fencing or persisted-source recovery.

Chromium and the production build remain Fable's qualification gates. PR119 publication remains held for the re-review verdict; PR120 and Core107 have not been pushed. Core migration cleanup remains separate and requires the exact live ledger and resolution of the already-reported source/default-off conflict.
