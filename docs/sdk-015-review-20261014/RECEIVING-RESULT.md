# SDK 0.1.3 → 0.1.5 compatibility decision

**No adapter/wiring change is required for existing consumers.** Keep the current frontend 0.1.3 pins. This is an actionable contract result, not an SDK adoption, lifecycle activation or release qualification. Reviewed frontend: `72b6e1279506f0a38d7d34794c7cc9ba17744043`; actual [Meri PR76](https://github.com/neo-capiro/meri-greenfield/pull/76) head: `f855af6e1096894909b201603b2f77e5e6230f5f`.

## Exact compatibility findings

- Current 0.1.3 artifact: 358366 bytes/SHA256 `dc1a4c09b0e5f1f6b09f9df1ce2846b24b24abe401c84a8f448c3e58d585ad1b`. The 0.1.5 public candidate found at PR76 `docs/qualification/candidates/native-docx-flow-20261013/root/capiro-meri-contracts-0.1.5.tgz`: 375812 bytes/SHA256 `bb387dcae8c86f9268a5eff3204902b37ecdff5cf156c1a85957e4b615926e60`.
- **19 existing members byte-identical, no removals.** All existing UI-event/action/document/conversation implementation, schema and type members retain their exact bytes. Existing export targets, runtime dependencies and Node requirements retain their behavior. No breaking request/receipt/cursor/auth/header/limit/type change was found for current consumers.
- Four changed members are package metadata/version, README and conversation/document source-metadata JSON. The two updated server-source hashes match the actual PR76 conversation service and document-current source. No private server implementation is copied into this frontend.
- Four added members supply `conversation-lifecycle` implementation/schema/types/metadata, introduced in 0.1.4. Its new export is additive. Subcontract versions remain their original introductions; lifecycle metadata saying 0.1.4 inside package 0.1.5 is intentional. Do not invent a new wire version or rewrite current receiver version checks.
- Every one of the 22 candidate distribution members matches the exact PR76 Git blob. Thus the comparison binds the archive to the requested actual source, not only an older report or version string.

Existing `packages/meri-client` composes `conversation-application` with upstream Chat, guarded transport, immutable view/cursor observation and scoped lifetime. Current app action/document adapters import their existing exports. The root graph deliberately also retains 0.1.0 for legacy qualification/UI stream; it is not a global-upgrade target. Package peer/dev pins in `packages/meri-client/package.json` and the app dependency are exact 0.1.3. A future adoption must update the app/client peer/dev/vendor/root-lock graph coherently and preserve a single receiver instance per view/cursor chain. Installing 0.1.5 only at one leaf is not qualified adoption.

## PR76 API ownership and genuine remaining receiving work

Actual `apps/control/conversations/http.mjs` still mounts authenticated POST submit/history/cancel/events and GET event reconnect. Existing closed bodies, opaque Bearer session, selector admission and resume header remain compatible. No new browser execution endpoint is needed.

Actual `apps/runtime/native-authority/execution-http.mjs` mounts `/v1/execution/start`, `/v1/execution/poll`, `/v1/runner/runtime` and `/v1/readiness` with separate trusted control/task capability digests. These are protected runtime/broker routes, **not browser APIs**. Leave product SDK/model/provider ownership unchanged.

The additive public lifecycle surface has real POST `/api/conversations/control` and `/api/conversations/checkpoints/inspect` receiving. Steer/pause/approval-wait/resume/fork need explicit caller/lifetime/reconciliation integration; package adoption alone does not implement them. A lifecycle receiver consumes a current view from the same conversation-receiver instance. A target receipt is a selector, not a new credential; get its fresh session through the existing trusted owner. Unknown effects cannot auto-resend. Existing session, lifecycle and broker implementations are present; their deployed composition/authority/persistence remains unverified.

Ordinary `MeriComposer` is still a disconnected synthetic fixture, as already disclosed in the previous receiving handoff. The actual current client adapter exists. Its deliberate connected host/proxy composition requires the approved serving Core/Meri origin/image, existing opaque-session bootstrap and server-selected active conversation/client context, current grant/lifetime mapping and persisted worker configuration from the owners. This is a real integration dependency, not a claimed missing session API. No speculative bootstrap DTO, token, browser capability route, new provider loop or UI feature was introduced during compatibility review.

## Focused evidence and independent review

The existing 63 receiving/lifetime/recovery controls pass at current 0.1.3 **and** with temporary Node module resolution to the exact extracted 0.1.5 receiver. They execute the actual current production adapter and AI SDK Chat. The same 63 cases are not counted as 126 distinct cases. Existing assertions cover cursor provenance, frame admission, source/run/scope mismatch, pending/unknown replay, expiry/replacement/disposal and subscription versus durable cancel. No source assertion or installed package resolution changed. [Bound source/member comparison](COMPATIBILITY.json), [installed controls](013-consumer.log), [candidate controls](015-consumer.log) and [executed temporary resolver](resolve-reviewed-015.evidence.mjs) preserve the bounded result. The resolver path is historical local evidence; reconstruct the exact archive location before replaying it.

Independent Codex reviewer `/root/outreach_review` agreed that existing consumers need no adapter change, the lifecycle surface is separate adoption work, and PR76 capability routes must not be exposed to the browser. No code edits or live tests by that reviewer.

No full qualification rerun, package/lock change, model/provider operation, live test, security/credentials/AWS change, merge or deployment was made. The accepted consolidated candidate and deployed frozen PR25 remain separate and untouched. Classic merge requirements remain unverified; no protection-read retry/bypass was attempted. Native acceptance remains open.
