# Meri 0.1.3 receiving integration outline

This is a distinct successor to the frozen acceptance repair source ae8da60e6d63d02b65a6ff9eb71c90554f213a10. Its implementation starts after that checkpoint. The user authorized receiving integration and affected cross-repository checks, with no native activation, paid/model/provider work, deployment or security/database changes.

## Exact input

Meri source 93845774d352fc9a0ad12cc7bc8bd3d4612a322c, tree 3bd7fcd0b87f81ee331b9c3cd1fa53916730b872. Offline npm packing of that Git source produces capiro-meri-contracts-0.1.3.tgz,358366bytes, SHA256 dc1a4c09b0e5f1f6b09f9df1ce2846b24b24abe401c84a8f448c3e58d585ad1b. PACKAGE-PROVENANCE.json records the exact reproduction and17 unchanged prior runtime/schema/declaration/notice members. Existing0.1.0 and0.1.2 artifacts remain preserved; action/document behavior must remain compatible.

## Canonical ownership and dependency direction

- The public conversation-application export owns request/response/event receiving, exact run binding/scopes, branded views/cursors, limits and reconnect metadata. No private service/store/worker DTO or implementation enters frontend production source.
- AI SDK7.0.137 and @ai-sdk/react4.0.140 own stream parsing, Chat and React subscription. The existing MeriGuardedTransport remains the event admission boundary, and ConversationProjection remains display state and immutable duplicate/conflict handling. No alternate SSE parser, Chat implementation or agent loop is introduced.
- A cohesive receiving adapter composes the published views/cursors with that existing guard/projection. Current identity/session/client lifetime remains owned by the shared frontend boundary. Validation never establishes authority.
- Any network boundary must bound response allocation, validate original UTF-8 before SDK decoding, honor cancellation/current lifetime, and preserve exact route/method/auth behavior. Stream termination is observation cleanup; durable cancellation is a separate explicit request.
- Root owns shared source, manifests/lockfile, public artifact bindings, integration and qualification. The existing reviewer provides read-only boundary review; no simultaneous source editing.

## Required behavior

An admitted submit receipt starts the observed cursor at0 even when lastSequence advertises stored events. A partial admitted history page advances only through its contiguous observed nextSequence; unseen lastSequence cannot initialize or advance the cursor. Projection hydration must preserve actually observed bytes and reject unsupported missing-prefix initialization. Accepted duplicates must remain byte/identity consistent and cannot consume another public cursor. Gaps, foreign run/attempt/worker/fence/scopes, conflicting immutable IDs and malformed outer frame identity must fail before SDK observers/display admission. Cursor provenance must not be replaced by shape-compatible objects or caller-supplied numbers.

Post-subscribe uses the published view.subscribe command. Reconnect uses the actual SDK default GET path and x-meri-resume-sequence derived from acknowledged events. No prompt is replayed during observation/resume. Session replacement/expiry/revocation and disposed views cannot publish late data. Reaching a bounded observation limit must retain the accepted cursor for deliberate recovery rather than imply durable run completion.

The receiving slice must report remaining host/session/native activation requirements precisely. Existing unavailable product actions remain truthful until their complete current authority and execution path are composed; package availability alone does not activate them. No unrequested feature flag or connection is enabled.

## Verification

Preserve existing guard/projection/transport and action/document controls. Add observable regressions using the real packed public receiver, real pinned SDK transport/Chat and the exact Meri receiving mount under synthetic identity/store fixtures in a separate cross-repository qualification harness. Exercise POST subscription, actual GET reconnect, partial history continuation, immutable replay/conflict, selector/binding/scope refusal, original UTF-8/body limits, current lifetime, interrupted observation, cleanup versus explicit cancellation, and response/error correlation. Verify existing action/document runtime bytes and behavior, public package hash/export admission, types, lint/format and architecture. Record exact candidate and backend source for all results; owner reports and the frozen defect batch do not qualify the new receiving source.

## Receiving successor allocation

The published defect checkpoint is1da8a551b00bba0f98e87954ef0a87566db236e6. This successor owns the public conversation receiver composition in packages/meri-client: bounded authenticated network observation, current session/context lifetime, JSON request/receipt admission and exact interrupted submit intent, observed history/cursor state, and the existing guarded AI SDK Chat. These are separate cohesive modules, with public DTOs/validators imported from0.1.3. The legacy factory and its tests remain unchanged in behavior.

The receiving API accepts the canonical opaque-session lifetime through an injected current-context/fetch boundary; it does not create authority, sessions or provider work. This slice qualifies actual subscription/reconnect/partial-history interoperability against the exact native Fetch mount under synthetic identity/store/dispatcher fixtures. Ordinary Meri host activation, a persistent navigation journal and deployed authenticated proxy streaming remain separate native/product work; the disconnected sample stays truthful. No placeholder host, unused app route, second parser or backend implementation is introduced.

App action/document consumers resolve0.1.3 deliberately to verify compatibility of the identical prior members; historical artifacts remain preserved. Cursor brands stay within the owning client instance, with no public receipt/cursor injection or dependence on cross-package WeakMap identity.
