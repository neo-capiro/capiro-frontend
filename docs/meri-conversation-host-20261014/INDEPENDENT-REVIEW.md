# Independent Meri host/UI/config review

Read-only review of root-owned pending source in `/workspace/capiro-production-data`, successor of frozen PR36 `7e170defb9442aa3ce0fd1d5b14060af831ce8d0`. Reviewed `shared/meri-conversations/{config,host-controller,query-journal}.ts`, canonical connection configuration, `features/meri/conversation/*`, MeriHome/page activation, canonical opaque-session owner, SDK conversation adapter and existing display projection. The reviewer authored the separate proxy slice; this review covers root host/UI/config only. No repository edits or live calls.

No blocking behavior finding for inspected current internal callers. Feature flag remains defaultfalse; enabling supplies a connection UI, not a native acceptance claim. HTTPS origin/path validation remains canonical config plus proxy admission. Home passes only current nonfetching/errorfree Core identity with actual tenant/native user UUID. The host compares opaque-session tenant/actor to that source-correlated account; existing session bootstrap checks exact client/conversation/run hints. Client/account keys remount the connection. Layout cleanup marks client unavailable before passive disposal; SDK owns current-context checks, receiving, retained commands, cursor/event lineage and Chat transport. A failed rebind does not select a replacement run.

No command runs on rendering or attaching. Connect, history/paging, subscribe/reconnect, submit/retry and durable cancel are explicit separate controls. Disposing a view stops observation and never invokes durable cancel. Nonsecret journals key exact tenant/actor/conversation/run/client and retain pending as unknown across view navigation; stored selection constrains the next issuance to the observed run. Cache entry identity fences writes from discarded canonical scope caches. No bearer is journaled. Unknown submit retries preserve the original request UUID/prompt; observed intent blocks unprovided new-turn UI. Cancel uncertainty remains explicitly disclosed.

Transcript renders only admitted events through the existing `buildWorkspaceView`, with plain React text and no synthetic fallback. It discloses omitted prefix and additional history; pagination is an observed page, not a claim of complete transcript. Stream end does not mark run completion. Existing native source/tool/approval/artifact display or effectful controls are not invented.

Accepted exact whole-function design reviews (record these fingerprints; do not waive signals):

| File/function | Lines | Fingerprint | Responsibility rationale |
|---|---:|---|---|
| `apps/web/src/features/meri/conversation/MeriConversationView.tsx` / `MeriConversationView` |111|`3187db64e7f4e9333a9ed07dc437d6b1dbf16b3f4bb17045cdb5f9fe65310e41`|One selected current conversation presentation owns explicit controls, prompt input and uncertainty/error text. Commands/journal/subscription handling are separate `useConversationActions`; admission and lifecycle are public SDK/session owners; transcript projection has its own component. No auth, persistence, provider execution or second conversation loop is added. Keeping availability/pending control decisions together is cohesive.|
| `apps/web/src/features/meri/conversation/useConversationActions.ts` / `useConversationActions` |98|`18b811fb227a9ca2d5f147cfe7a68f2aaeaa8dccd1d7262e60a153cd9e96e124`|One view-local explicit-command adapter owns pending/error feedback and exact nonsecret intent retention for the already-selected SDK port. It delegates command semantics, response/event admission, cursors and transport to the SDK, and scoped cache storage to the dedicated journal. Named handlers share one concurrency/alive fence rather than duplicating workflows. No native authority, auto retry, model loop or provider operation lives here.|

Architecture scanner: no boundary errors; these two new size reviews remain to be recorded.

Nonblocking robustness suggestions for focused tests: capture account tenant/actor scalars in host-controller construction rather than retaining externally mutable `options.account`; snapshot/freeze nested submit intent in journal writes. Current UI supplies fresh scalar-only account objects and fresh submit objects, so no observed internal mutation path was found.

Source SHA256 at inspection:

- config.ts `d7f2308b5f57e8688bfa9b5a6378b8d0c492d033fa9f305ce5698e92e9cb1e53`
- host-controller.ts `597e76c68a4ea5899e8be2663a393cf4b0f195dd3313ffa26d4dc60322cc005e`
- query-journal.ts `fc24b59fd104a95d2a43b06134e9f59dda5cbe5ad60aa7c5e8c14ea9fe5e733b`
- MeriConversationHost.tsx `8ba58da878038a86d9daa898557ff9e23808ce351350958333f24260e927c646`
- MeriConversationView.tsx `9ffca30cb38cbbd209187661f090b25ebccf25ea2a9421c78d974bf59a08b071`
- MeriConversationTranscript.tsx `1289a3d067d00e364bb0a9ea13dcd7bedb2e2c39582f3142370df20cee5f0b2b`
- useConversationActions.ts `09bb5f9fde3579ae35a3b8722a9931c1e71cc4ae25ce951905f0008f9bb2295e`.

Host/UI focused tests were upcoming at inspection. Required qualification: wrong account/client/run issuance, current scalar account mutation safeguards, expiration/revocation, no auto effects on mount/reopen, explicit history/partial pages and replay, same-input unknown submit/cancel recovery across navigation, held request/view/account/client replacement, no old response/journal installation after canonical cache replacement, fixture absence, keyboard/mobile/accessibility, existing action/document flag isolation. Source compatibility and configured feature flag do not qualify real issuer/native identity/database/Temporal/worker/model execution or deployment.

## Final incremental inspection 2026-10-14

Root hardening reviewed read-only. Host copies account scalars and validated hints before asynchronous bootstrap, captures callbacks/fetcher, and disposes the created SDK port if the binding callback throws or reentrantly withdraws admission. Journal writes now copy/freeze nested submit state, retaining original bytes even if caller mutates its input. Cleared cache identity prevents resurrection. Focused tests assert original input, account mutation, expired/reentrant refusal, exact selector rebind, and late bootstrap; browser tests explicitly settle held history after client replacement and exercise unknown-submit navigation with exact original request. These are meaningful synthetic source controls, not native activation evidence.

POST Observe is disabled once admitted cursor is nonzero; explicit GET reconnect resumes the SDK cursor. The view’s current run controls remain cohesive and source-truthful. Accept updated exact MeriConversationView size signal: 111 nonblank lines, fingerprint `4f7d23371aa45f6028be93332cfa4f40fb48bae60f263ddc973fadd33e0dc59c`; whole-function rationale above remains applicable. useConversationActions remains98/fingerprint `18b811fb227a9ca2d5f147cfe7a68f2aaeaa8dccd1d7262e60a153cd9e96e124`, accepted unchanged. Architecture report has zero boundary errors. No required extraction or blocking finding in this bounded delta.

Reviewed host SHA256 `39d3057c02b92781ed996b844193cd65b229c54a314b13b64de2f2e3fd027ec4`, journal `9277a86fea85089e58e63d5a596f2876cc1b7b0032566e87f6b0592ccb14e00f`, view `d848bd761aa7324af2b8b7287415aec36da08af6cf4ec59d8b4635a86f3980ee`. Neutral shell footer requires verified runtime and makes no unavailable/active claim. Proxy fills absent nosniff and enforces no-store; this is a confidentiality floor for credential-bound responses, not altered successful envelope or stream bytes. Test execution is parent-owned; this review did not rerun them.

Final alias/guard delta inspected: conversation catch-all exports the same `receive` function through named method aliases; preview admission remains its first work before route params/auth/proxy. Existing AST boundary test explicitly admits the complete five API paths and checks each handler; new route seam is limited to Clerk, preview policy, validated conversation config and fixed proxy. Negative tests preserve refusal of an extra per-operation route and unrelated feature/API imports. No behavior or authority expansion found. This incremental inspection supersedes prior route hash assumptions; final test/build receipts remain author-owned.
