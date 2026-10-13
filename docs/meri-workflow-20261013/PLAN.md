# Meri recommendation workflow — isolated UI implementation

Frontend base: `d4be41e60516e576c74afa304b50ed67da15cb93`. Backend PR42 was freshly read at `f1df1bc20b8f5ef06495c50d885b18ce2af73eb1`; the PR16 handoff comment names prior publication `69226d1d4223a333e2dc8bdc5b42363aa55c9b5b`. The latest addition records publication and the verified frontend handoff; accepted runnable bytes are reported unchanged. Raw connector reads are retained in `/tmp/capiro-meri-workflow-evidence/handoff`.

## Ownership and boundary

- This lane owns `apps/web/src/features/meri/actions`, bounded new tests, and this handoff. Existing workspace/event projection, Home, shared shell, auth/session/client, manifests, adapters and architecture registries stay with their canonical owners.
- The UI consumes an injected presentation port, not HTTP JSON. Selection, draft and proposal objects are opaque handles owned by that port. Display models are local presentation contracts, not backend DTOs or replacement validators. Dependencies remain feature → adopted UI controls/React; no private backend import.
- Root owns the separately authenticated JSON adapter and trusted host lifetime integration. It must use a governed public action-result validation/types artifact, retain exact immutable wire objects, enforce validation/lineage before projection, and replace the UI lifetime on actor/session/tenant/client changes. The frozen public0.1 UIEvent validator/stream remains unchanged.
- PR42 still exports only public0.1 contracts; its README explicitly excludes private additive candidates. Action-result validation is a reported dependency, not something this lane may invent. Root was asked for the exact sanctioned public package/ref/hash/export. Until resolved there is no production route activation or browser-to-backend authority claim.

## Implementation outline before coding

1. Define small presentation models and a port for query, editable-draft validation, preparation and explicit execution. It provides no approve method, credential, source URL or authority hints. Query is the handoff's bounded recommendation lookup, not a newly invented natural-language endpoint.
2. Keep local request/state ownership in one controller: synchronously prevent duplicate actions, capture input before requests, abort local observation on disposal, fence late results, clear former data after lost access, and retain immutable prepared display/handle pairs. No effect is inferred from transport completion or a thrown error.
3. Render recommendation coverage and selection, local title/date edits, service-validated draft review, an immutable pending proposal, then a verified observed receipt or explicit uncertainty/withheld state. Preparing is never called execution or approval. Pending stays pending after execution refusal. Execution/replay only follows a separate deliberate button action; no poll, retry, effect-driven dispatch or browser approval control.
4. Reuse the existing adopted Button and Meri tokens/geometry. Responsive stacked panels, explicit labels, keyboard focus, status/error regions and escaped text are required. No unprovided Figma target or complete fidelity claim is invented.
5. Add lightweight controller tests for duplicate clicks, held requests, immutable pending review, refusal, exact-handle replay, uncertainty/known-stored failures, lost authority, client/actor lifetime replacement and disposal. Browser/loopback controls remain queued until root grants a lease after PR17's priority gate; no install/build/browser/server is authorized now.

## Verification and limits

No borrowed dependency graph may be changed. No commits before root review. Runtime activation, native identity/policy/approval, real provider/task effects, durable recovery, deployment/AWS and paid calls are outside this lane. A test-only synthetic loopback host may use deliberate backend test interfaces only after the contract boundary and runtime lease are agreed. Its external fixture approval must remain outside browser authority. Source-level unit results and synthetic browser results will be reported separately from backend/native acceptance.

## Public receiver adoption — root, 13 October 2026

PR43 head83d1d8b2ae4604ca259be17461ae71ca60f5fb6e publishes distribution0.1.1 (artifact publication08ba900965f54d4f0cd3776a9bb2158877e76dfd). The exact175627-byte archive has SHA2560ca8d0552a2960157ebdf7b8cecf6cacdcda48ef91c475060a54f15192535651. Independent verification covered all15 entries, eight provenance source hashes and unchanged legacy exports. The earlier receiving-package blocker is closed; consumer/runtime qualification remains open.

Root will consume only the deliberate @capiro/meri-contracts/action-application export for query/draft/prepare/execute. Public receiving validates primitive bounded JSON text and returns frozen wires. The adapter retains immutable opaque handles and binds responses to captured request/proposal lineage and current host lifetime, including after asynchronous hashing. UIEvent stream and JSON action endpoints keep separate governed interfaces. No HTTP approve route or browser approval authority is introduced.

The existing immutable0.1.0 meri-ui-stream artifact requires the exact0.1.0 contracts peer. Preserve that peer graph; add the new action receiver as an explicit web consumer dependency, allowing npm to install its0.1.1 package separately. Do not alter immutable upstream metadata, force peers or silently upgrade legacy contracts. Full clean installation/public closure and unchanged transport tests must verify this bounded package integration after the PR17 runtime lease.

Adapter responsibilities include UTC date-only conversion, bounded streaming text/deadline/cancellation, exact selection and task/proposal binding, accurate source coverage and first-page limitations, precise approval-refusal outcome mapping, known-stored/unknown fences and cache/editor disposal on genuine access loss. A response receiver does not supply current trusted session context. The normal host authentication/context activation contract is under review; retain visible unavailability wherever that dependency is absent.

## PR47 host composition — root, 13 October 2026

The PR47 bootstrap and mounted host source now exist at84c2ca01d0bce025a0003b6e724d675a05f2975a. Root composes the bounded same-origin session/four-action paths through an off-by-default `MERI_ACTION_WORKFLOW_ENABLED` setting and existing validated MERI_API_BASE_URL; the backend URL and native capiro-template token never come from browser authority. The action bearer stays distinct and memory-only. Source opt-in is not deployment activation or native qualification.

`shared/meri-actions` owns receipt validation, fixed transport, exact immutable handle correlation and request disposal. A thin app host composes that port with feature presentation, the existing application QueryClient and verified client selection. QueryClient stores only nonsecret pending/uncertain dispositions, not credentials or wire payloads. Current principal/client replacement continues to be owned by ApplicationBoundary; host context/expiry replacement destroys handles and old views. Bootstrap and all action sends remain explicit, with no automatic reissue. The shared shell supplies the action destination without replacing the original disconnected chat/workspace.

Session errors remain a separate contract. Proxy failures do not invent a remote NOT_DISPATCHED disposition. Full native authority endpoints/current admitted-run owner, process affinity, activation, browser/native acceptance and shipping remain separately unqualified. Targeted receiver/adapter tests precede actual host/browser and full clean-source qualification.
