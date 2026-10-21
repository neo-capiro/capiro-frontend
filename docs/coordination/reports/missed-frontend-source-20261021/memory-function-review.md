# Memory function design review

Eight new size signals were reviewed as cohesive responsibilities; no threshold was weakened. Fingerprints and source links are recorded in the architecture manifest.

## MemoryCorrectionComposer

Source: `apps/web/src/features/meri/memory-review/MemoryCorrectionComposer.tsx`

One Core-selected personal-memory correction form: selection, current-text display, bounded draft and submission feedback. The hook owns transport, CAS capture and unknown-outcome holds; the component owns no authority or canonical writes. Pending submission now disables the draft alongside selection and refresh, preventing success from erasing newer edits. Disabled/default and pending/uncertain behavior are exercised by real-browser fixtures.

Fingerprint: `9db9d5c18c631b102e794c3d9d6acefef28ab392814ceaca3d97a80a3e99a814`

## MemoryOwnerInbox

Source: `apps/web/src/features/meri/memory-review/MemoryOwnerInbox.tsx`

One owner-review list and its explicit confirmation UI. Page/loading/unknown decisions are composed from the owner inbox hook; candidate presentation is delegated to CandidateCard. The component neither chooses Core ownership nor interprets a pending list as a terminal decision. Bounded pagination and explicit status reconciliation remain in the hook and receiving functions.

Fingerprint: `7d7b86d39a445618b277d757ce8f7eaf95477e95e0b92b247f62a44f3692406d`

## CandidateCard

Source: `apps/web/src/features/meri/memory-review/MemoryOwnerInbox.tsx`

One memory candidate card with kind-specific decision confirmation and rejection reason. Its props supply captured review state and callbacks; it does not dispatch requests, own identity or mutate canonical memory. Keeping confirmation beside the displayed immutable candidate preserves the decision context without a second state owner.

Fingerprint: `8aee6c36a03e2c41b03ed4a04feb4838428126c9861ccd14ece2bcd5a4c0f055`

## proxyOwnerMemoryReview

Source: `apps/web/src/features/meri/memory-review/owner-review-proxy.server.ts`

One fixed-operation native Core memory HTTP boundary. It validates exact paths/methods, same-origin mutation input, UUIDs, bounded closed bodies, configured targets and verified replies; deadlines, native tokens and no-store responses follow existing owners. Item reads, correction proposals and version decisions share this constrained transport boundary while Core alone owns authorization, CAS and canonical decisions. Root cross-repository review matched the routes and response shapes; preview source remains null and all activation gates remain held.

Fingerprint: `927f0a6775a3aa2d80609d5bcc9c1129a1e18f2711fab1fff497b5a5b588afe7`

## useOwnerCorrection

Source: `apps/web/src/features/meri/memory-review/useOwnerCorrection.ts`

One account-scoped correction workflow lifecycle. It loads controlling items, captures their microsecond CAS, manages pagination and records unknown submission IDs before dispatch. Generation and abort guards fence stale reads; ApplicationBoundary remounts on account/session/org changes. UI presentation and Core HTTP validation are separate owners. Its nested propose routine is separately reviewed.

Fingerprint: `dba76f4c36da12d89d94d77d9466f3894a861252e3ceff276f4f3ad676c6ccd5`

## useOwnerCorrection > propose

Source: `apps/web/src/features/meri/memory-review/useOwnerCorrection.ts`

One correction submission transaction: capture the selected item and expectedUpdatedAt, persist a nonsecret uncertainty marker before POST, release only for definite refusal/non-dispatch or validated review receipt, otherwise preserve the hold. It never applies canonical memory locally or invents a reconciliation endpoint. Browser tests verify pending immutable input and unknown-result persistence across reload.

Fingerprint: `a3a8fec0ca263c102c5dad69388f9ba56109a6ec054c9b12a51987695df2dc32`

## useOwnerMemoryInbox

Source: `apps/web/src/features/meri/memory-review/useOwnerMemoryInbox.ts`

One owner inbox lifecycle combining paged reads with the same account-scoped decision journal and explicit terminal-status reconciliation. Page abort/cursor checks fence stale windows; verification is bounded to twenty existing IDs and requires a validated terminal receipt, never list absence. Presentation, wire projection and server authority are separate. The decision transaction is separately reviewed.

Fingerprint: `02356eb65a6d80ab6dc258c249dfd6184bdf42f976e43989a295d21f4b9a7300`

## useOwnerMemoryInbox > decide

Source: `apps/web/src/features/meri/memory-review/useOwnerMemoryInbox.ts`

One captured owner-decision transaction across addition and governed-version endpoints. It reserves a nonsecret ID before dispatch, binds the chosen candidate and decision, releases only on definite Core results or confirmed non-dispatch, and retains ambiguous writes for read-only status verification. No browser value grants owner/tenant authority, no automatic retry changes the action, and no active-memory state is fabricated.

Fingerprint: `0679f1b6ddbfc786a516641aa09edff1e5a3a3900d7f4faa3aafb6229b059a85`
