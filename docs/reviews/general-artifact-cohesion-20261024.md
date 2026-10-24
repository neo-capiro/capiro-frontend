# Independent frontend cohesion review

Accepted all eight exact size findings across the six frozen files. No substantive responsibility split is needed for this delta. This is an exact-source design review, not a size exemption or deployment/behavioral acceptance. The architecture scanner, thresholds, boundary rules and inherited findings remain unchanged.

Scope: A frozen cohesion-frozen.json, base c836741f0f1d3b6a803ecb318770a7fac475313a; all six working-byte hashes and all eight fingerprints independently matched architecture-final.json. Read-only review; no product/index/registry edits, installs, browser or AWS actions. Read AGENTS, implementation standards and architecture ownership rules (sparse documents read from Git).

## Findings and responsibility decision

### apps/web/src/features/meri/MeriHome.tsx — MeriHome

One Meri landing-page composition: current identity/client-or-General presentation, capability-gated conversation host, and links to existing workspaces. Identity, session authority, bootstrap, approvals and workflow behavior remain delegated. The 81 nonblank lines are mainly explicit JSX; extracting fragments solely to cross the threshold would not create a new responsibility boundary.

Fingerprint: `f6a15e0d845644a231b551a8f63cee6567a71e4e97c09496c305ce08305c3cff`.

### apps/web/src/features/meri/conversation/MeriConversationHost.tsx — MeriConversationHost

One conversation selection and mount boundary: malformed URL refusal, enabled/current-account state, client eligibility, explicit General selection, and keyed lifetime replacement. Core bootstrap and session ownership remain in existing resolver/controller modules; browser selection is not authority. The branches choose presentations of the same connection, not separate domain workflows. Existing ConnectedConversation and notice helpers already isolate meaningful subresponsibilities.

Fingerprint: `d828701139e3fc586f28062fc6f61859cf54780f38b9eeb327c2545ec512589f`.

### apps/web/src/features/meri/conversation/MeriConversationHost.tsx — CoreResolvedConversation

One cancellable Core bootstrap attempt and its pending/ready/error presentation. It delegates durable request identity, receipt/principal validation and conflict recovery to resolveFirstChatConversation, first-chat-intent and useBeginNewChat. The effect cleanup prevents obsolete completion from mounting a session; retry and New Chat update this same attempt. Splitting its effect from its render state would distribute one lifecycle without reducing responsibility.

Fingerprint: `5434dc180235c9a7fbd4cf2e7144145403e7052d3fab965db8614f3ea6584102`.

### apps/web/src/features/portfolio/calendar/mutations.ts — useSaveMeeting

One meeting-save attempt: bind the initiating identity and meeting snapshot, validate existing DTO/receipt, dispatch one POST/PUT, retain uncertainty, and invalidate the same meeting caches on known success. useDispatchGuard, meeting-save schemas and the API owner retain access, wire validation and transport. The pending/unknown fences and post-response currentness must remain consistent in this hook; this is not a generic mutation framework or a second authorization service.

Fingerprint: `e94d4f86aaa4b8cd4159d2b84c5b513de5c8d6f452d405d58f4bc011df84c69a`.

### apps/web/src/features/portfolio/index/portfolio.module.css — <module>

One Portfolio index screen stylesheet shared only by its local cards/results, summary, filters/navigation, owner filter and create-profile chooser. Rules are scoped CSS-module selectors with explicit screen markers for the few global selectors. It contains presentation/responsive cascade, no business or state owner. Splitting by arbitrary line count would scatter the coordinated card/header/mobile layout; no cross-feature responsibility warrants extraction in this delta.

Fingerprint: `41cce5eafc0f5d19ffcbc26c9777077bf5ade748556928f20b634798c11174a3`.

### apps/web/src/shared/meri-documents/workflow-adapter.ts — <module>

One generated-document workflow lifetime: branded version handles, immutable receipt correlation, read/create/revise orchestration, and one shared busy/unknown attempt journal. Public package receivers own schemas and byte verification; workflow-transport owns fixed HTTP/credential lifetime; the journal owns persistent local uncertainty. The native-file union is explicitly refused as a generated revision target rather than assimilated into a second workflow. No provider, renderer, server authority or unrelated feature is added.

Fingerprint: `f3377dfce3f36a3cc93d59e0174a780c09270b524006e8a1de9287207e49edfd`.

### apps/web/src/shared/meri-documents/workflow-adapter.ts — write

One create-or-revise transaction over the same document attempt: preflight, retain delivery identity and intent fingerprint before dispatch, receive/correlate, adopt, and settle known/unknown outcome with cleanup. The ordered checks prevent a lost ACK or stale session from becoming another write. Transport/receiver and journal are existing separate owners. A generic transaction abstraction or several stateful fragments would obscure the effect boundary and error disposition.

Fingerprint: `a8422381bb47a1af29131d19ddd005c91d7349ccc4898638c5b81c543233299b`.

### packages/meri-client/src/conversation-client.ts — <module>

One public conversation connection state machine: retained initial/input admission identity, submit reconciliation, history binding, cancellation receipt and attachment of the current observation. ConversationNetwork owns credential/HTTP/deadline disposal, ConversationObservation owns cursor/event projection, conversationChat owns upstream UI transport, and public contracts own wire admission. Initial and next-input methods share the exact retained intent and uncertainty state; separating them into competing owners would weaken reconciliation. General only extends context correlation with the canonical actor-private scope; no model loop or server authorization is reproduced.

Fingerprint: `1e1797b909c9c16285f8624b6f85462d0003df1afb72d59e54f8d702dd67edfa`.

## Caller and boundary checks

- Meri page -> MeriHome -> MeriConversationHost; CoreResolvedConversation delegates to the existing Core request/receipt and intent-storage resolver. ConnectedConversation mounts useConversationSession and ConversationView. Existing preview client eligibility remains unchanged; this review does not claim all-client rollout.
- MeetingForm calls useSaveMeeting; meeting-save and access/useDispatchGuard retain parsing/receipt and current-session checks. Mutations and Portfolio CSS are byte-identical to this checkout base despite changed registry fingerprints, so this is a fresh responsibility review rather than a claimed new behavior change.
- Portfolio CSS has nine imports, all within features/portfolio/index. No application-wide style override or unrelated domain owner was introduced.
- MeriFilesHost composes DocumentWorkflow with OpaqueSessionController, fixed document transport and QueryClient journal. It is the generated-document/client editor; native conversation files use the separate artifact-access path. The native-revision refusal therefore preserves this boundary.
- ConversationHostController constructs createMeriConversation from the canonical session receipt and supplies artifact/intents access separately. The client uses public contract exports; network and observation remain dedicated existing owners.

## Verification and limits

Reviewed all six complete sources, their relevant callers/helpers, exact base diffs and meaningful existing General/session, document-adapter and conversation-transport controls. No tests were executed for this read-only cohesion assessment. Existing architecture report has zero boundary errors, 556 total size signals, 530 reviewed, 18 inherited-unreviewed and these 8 blocking review obligations. Applying only the eight proposed records should resolve these obligations; A/root must run the canonical scanner and preserve all other records. No claim of full General/artifact/MP behavior, production build, browser or live acceptance is made.

proposed-review-records.json contains only these eight exact records for root review and A import. Any changed fingerprint requires another review.

## Frozen source hashes

- `apps/web/src/features/meri/MeriHome.tsx`: `eab487113a33f2410eff878f7fb4ede972e0b24da63c19dfa80c2483e7a8bc5b`.
- `apps/web/src/features/meri/conversation/MeriConversationHost.tsx`: `ae52548aa8bdf871d23c8cfd0f9efe5980b6e8abaab9539d3f424fca9b3b8708`.
- `apps/web/src/features/portfolio/calendar/mutations.ts`: `197f34a5a0e19d783fc89b32386d5a1f5fff20665fe38a4867c1f53c9070e80b`.
- `apps/web/src/features/portfolio/index/portfolio.module.css`: `3cb6ea689e387f4ace00a8a62d3c723b5c62841764a982c34ca4c511a9f04dff`.
- `apps/web/src/shared/meri-documents/workflow-adapter.ts`: `142b616d494e55e52b465dd5f2277f50316466124a2b8c506bcc6e2e61456481`.
- `packages/meri-client/src/conversation-client.ts`: `36a355d22693e7c181d75d5e7f8497e16adf541c053b6089b8c5348f9cdffa62`.
