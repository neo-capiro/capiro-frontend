# Public Meri adapter fixture packet

**50/50 pure receiver controls passed.** This is public package/source verification with synthetic JSON, not frontend adapter qualification, authenticated backend access, native task effects, approval, provider/model execution or deployment acceptance. No shared application file, dependency installation, server or browser was changed or started.

Inputs bind PR43 `83d1d8b2ae4604ca259be17461ae71ca60f5fb6e` and public `@capiro/meri-contracts` 0.1.1 tarball SHA-256 `0ca8d0552a2960157ebdf7b8cecf6cacdcda48ef91c475060a54f15192535651` (175,627 bytes). Receiver bytes, generated public types/schema and package export mapping were compared directly to that tarball. The control script imports the verified target of the **public** `@capiro/meri-contracts/action-application` export; it imports no private backend implementation. All three read-only GitHub test/type downloads match their exact Git blob IDs. `SOURCE-READS.json` pins source reads.

The canonical query, draft, prepare, approval-refusal, observed execution and replay are copied unchanged from the published synthetic `wire-fixtures.json`, Git blob `b2b795d2f321b1cba9f8de8e8135a6a21ac25edb`. This is also the input consumed by the producer's public receiver tests. The producer's independent test source references private synthetic backend constructors; it was **read only and never imported or executed**. This packet reuses its finite public assertion patterns and serialized wire output, not those constructors or backend implementation.

## Files and results

- `fixtures/*.json`: 50 small envelopes with route, HTTP status, response, expected receiver disposition and explanatory note. The six canonical chain cases also preserve their exact request bodies. `INDEX.json` maps every fixture to its actual result.
- `RECEIVER-RESULTS.json` and `receiver.log`: 24 accepted positive/error examples, 16 rejected corruptions, and 10 accepted envelopes that must still be refused by adapter request/context checks. Every accepted nested object is deeply frozen; returned content equals the submitted JSON.
- `CONTEXT.json`: stable tenant/actor/conversation/run/client, original and recovered bindings, selection, task, proposal, canonical hashes, historical test clock and full coverage/source/page assertions.
- `ADAPTER-CONTROLS.json`: explicit follow-up adapter tests for forged/cloned/cross-instance/disposed handles, held scope replacement, contextual mismatch and coverage presentation. These are requirements, **not receiver-proven adapter behavior**.
- `verify-fixtures.mjs`: reproducible pure receiver controls. It uses existing public `canonicalize` for synthetic test digest setup, not another receiving validator. No install is required in this workspace; absolute dependency paths are deliberate local evidence inputs and recorded in the source-read receipt.

## Correlation and hashes

The original chain preserves the producer's native source content hash, recommendation hash, query observation hash, draft hash and proposal command hash. The control independently recomputes the documented outer hashes through public canonical JSON hashing. It does not reconstruct or claim to authenticate the private native source-proof hash; that exact published value is preserved. Native source truth remains unverified.

The recovered-worker positive retains original draft binding A while proposal command binding B changes attempt/worker/fence, and updates the command digest accordingly. Stable tenant/actor/conversation/run/client remain unchanged. A matching synthetic execute receipt is separately provided. Increasing but nonadjacent event sequence numbers are accepted. Outer lookup and nested native-read argument hashes intentionally differ and are not forced equal.

Canonical dates are represented by a separate internally consistent draft/prepare/execute chain using `2026-11-02T00:00:00.000Z`; the original chain remains null-dated. Raw HTML date `2026-11-02` is deliberately rejected. The historical proposal is valid only within its supplied timestamp interval; use synthetic clock `2026-10-12T20:00:00.150Z` for deterministic adapter tests instead of current wall time. This is not a current approval token.

Receiver negatives include forged query digest/event handle/lineage, accepted-task claims, recommendation/action/task corruption, wrong draft/command digest, task substitution despite a recomputed command hash, stable-actor substitution, claimed approval, tenant-scope mismatch, observed failure and code/status confusion.

Ten other substitutions remain structurally and internally valid: foreign draft query reference, foreign supporting draft, coherent alternate task, and execute command/hash/idempotency/actor/title/client/date. The public receiver has no expected-host/request argument and correctly accepts these isolated envelopes. **The root adapter must reject them against its admitted handle, immutable request and current lifetime.** Receiver success alone is insufficient. Opaque handle forgery cannot be tested by JSON parsing; require zero dispatch for fabricated, cloned, cross-adapter and disposed handles.

## Coverage and errors

The original query contains a healthy complete page, `hasMore:false` and `totalIsExactForScope:true` alongside unknown overall enumeration, partial source status, unknown freshness, unsupported history, `absenceSupported:false` and `evidenceReady:false`. These assertions are retained together. Neither a healthy page nor an empty continuation proves exhaustive source coverage or accepted tasks. Recommendations remain recommendations.

The canonical approval-pending example is exactly HTTP409 `COMMAND_APPROVAL_REFUSED` plus `NOT_DISPATCHED`. A separate accepted `COMMAND_APPROVAL_REFUSED`/`UNKNOWN` variation proves that the code alone cannot authorize a pending/retry interpretation. UNKNOWN, RESULT_NOT_RELEASED, STORED_NOT_RELEASED, NOT_STORED and READ_UNAVAILABLE remain distinct dispositions. Cancellation of local observation does not cancel a durable operation.

No fixtures make a native connection or effect. Remaining work belongs to the root adapter and its caller: exact opaque-handle admission, current context/cancellation after hashing, bounded HTTP body/deadline, honest coverage projection, uncertainty retention and later deliberate native qualification.
