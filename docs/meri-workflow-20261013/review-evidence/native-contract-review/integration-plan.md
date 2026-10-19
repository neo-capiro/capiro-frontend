# PR47 frontend integration plan

**Bootstrap/session and same-origin mounting source exist and are accepted in the published handoff.** This review reads exact `neo-capiro/meri-greenfield@84c2ca01d0bce025a0003b6e724d675a05f2975a`. Remaining live source dependencies are Capiro's two authority endpoints and Meri's actual admitted-run lifecycle owner; this is not a missing-bootstrap finding.

[Backend relay](https://github.com/neo-capiro/meri-greenfield/pull/47#issuecomment-6138126976) and [frontend relay](https://github.com/neo-capiro/capiro-frontend/pull/16#issuecomment-6138127711) were read directly. Exact final Git blobs, both comment bodies, retained execution receipts and observed frontend hashes are saved beside this plan. No source edits, dependencies, tests, builds, servers, browser, native/provider/model calls or PR17 changes occurred.

## Fixed HTTP contract

All frontend action traffic must reach the same application origin and retained process-local host owner. These are literal POST paths, not a configurable arbitrary URL or a browser-to-Capiro authority bridge:

| Path | Caller credential | Closed request / accepted response |
| --- | --- | --- |
| `/api/action-followthrough/session` | Existing native identity bearer | `{}` or optional UUID `conversationId,runId,clientId` hints. 200 exactly `{credential,expiresAtMs,context:{tenantId,actorId,conversationId,runId,selectedClientId}}`. |
| `/api/action-followthrough/query` | Returned opaque action bearer | `{request}` containing the canonical lookup intent; governed lookup read delivery. |
| `/api/action-followthrough/draft` | Opaque action bearer | `{selection,edits?}`; canonical draft. |
| `/api/action-followthrough/prepare` | Opaque action bearer | `{draft}`; approval-required wrapper with immutable proposal/supporting draft. |
| `/api/action-followthrough/execute` | Opaque action bearer | `{proposal}`; observed or indeterminate result. It does not accept an approval decision. |

Session HTTP owner `apps/control/action-host/session/http.mjs:8–29` is blob `11aaf4cde044c54abf1ecd22d306d8a1dfc5ab04`; receipt owner `session/owner.mjs:12–15` is blob `9ec0c2970949f1c66eb790aa53c2170a00c8a581`. Success is at most4096 UTF-8 bytes, opaque credential grammar `action_session_[A-Za-z0-9_-]{43}`, future safe-integer expiry and exact context keys. Session errors are a separate `{error:{code}}` contract; do not feed them into the four-action receiver or infer a dispatch outcome from arbitrary error text. Requests/response JSON are bounded, no-store and nosniff; no permissive CORS is provided. Query strings, compressed requests and authority extras are refused.

Use the existing governed native bearer flow; the relay explicitly forbids a token/template change. Existing Capiro forwarding uses the Clerk `capiro` template. Signed `sid` must be present for the new owner check; if absent, fail closed and report compatibility rather than switching to a new token flow. The native token is not an action credential and must never substitute for one. Keep returned action credentials only in memory, not storage, URLs, logs or rendered errors. Capiro's server Clerk key stays with Capiro.

## Root-owned frontend composition

The feature port already exists at `apps/web/src/features/meri/actions/action-workflow-port.ts`; `MeriActionWorkflow.tsx` and `action-workflow-state.ts` own presentation and local observation, not HTTP authority. The inspected frontend base is `d4be41e60516e576c74afa304b50ed67da15cb93`; those feature files/test are current uncommitted owner work. Their exact observed hashes are recorded, not falsely attributed to the base commit.

1. Add the governed same-origin bootstrap/transport adapter under root's shared integration ownership and inject an `ActionWorkflowPort`. Keep the thin Meri route/feature composition separate from credentials and wire validation. `apps/web/src/app/meri/page.tsx` currently renders MeriHome; no action route activation or new adapter filename is presumed by this plan.
2. Validate session HTTP output against its documented canonical minimal contract at the boundary; do not import private Meri server modules. Use the already published `@capiro/meri-contracts/action-application`0.1.1 receiver for query/draft/prepare/execute. Preserve the frozen0.1.0 UIEvent/meri-ui-stream peer graph. Private `action-authority-0.2` is server-to-server vocabulary, not a browser dependency.
3. Retain exact validated selection/draft/proposal wires behind opaque handles, bind each reply to captured request lineage and the current lifetime even after async hashing, and project only display data. Browser context is a server-selected receipt, not a scope, grant, run admission, fence or approval. Backend actorId is TenantContext.userId; do not equate it with the Clerk subject. Selected client/conversation/run hints can only match the already bound host context.
4. Reuse `shared/session/ApplicationBoundary.tsx` disposal on Clerk user/session/org and selected-client replacement. Add the returned server conversation/run/context and credential expiry to the action adapter/feature lifetime. Clear the credential, cached wire handles, former details and queued observations on sign-out, access loss, replacement or expiry. Keep no-session/unconfigured/unadmitted states visibly unavailable.
5. Use bounded streamed UTF-8 JSON, explicit deadline and cancellation, no redirects/cache/automatic retry. Disposal aborts local observation and fences late results; it does not cancel durable work or prove remote effects stopped. Preserve UNKNOWN/RESULT_NOT_RELEASED/STORED_NOT_RELEASED/NOT_STORED/READ_UNAVAILABLE distinctions. Preparation is not approval or creation; execution remains a separate deliberate action. No new HTTP approve endpoint or automatic reissue/retry is authorized.

## Backend mounting and current authority

`application-adapters/mount.mjs` blob `e915f0557faa850193ba655bf7798806a4d92c0c` composes `createApplicationActionHost({services,client,currentRun,hostPorts,now,limits,sessionLimits,enabled:false})` → `{app,close,status}`. hostPorts remains exactly reserveLookup/issueLookupCredential/issueExecution. Borrowed services/current-run/pools are not closed. Both mount and authority client are off by default.

`authority-http.mjs` blob `baf528e5c2a7eca61090c6dd83e7650ce92e250e` calls only these fixed HTTPS Capiro routes with the existing native bearer, omit ambient credentials, no-store, no redirect/retry and bounded body:

- `POST /api/clio/application-authority/identity`: `{}` → fresh principal, identityRevision, checkedAtMs, expiresAtMs.
- `POST /api/clio/application-authority/context`: identitySha256/conversationId/clientId → independently current principal/identityRevision, exact conversation/selectedClient, contextRevision and times.

Capiro must reuse verified claims/current membership, active owned conversation, nonarchived client and ethical-wall owners. Require an existing matching **nonnull** stored conversation client. Actor/run/fence/grant/approval authority cannot come from hints or a hash echo. Existing any-status conversation GET and broad profile GET are insufficient substitutes.

The SDK supplement establishes `clerkService.backend.sessions.getSession(verifiedClaims.sid)` on locked Clerk backend1.34.0. Capiro must correlate sid/subject, require active/unexpired session, bound by original JWT/session/impersonation expiry, use stable security revisions excluding activity timestamps, and refuse revocation, absence, outage or timeout. No new key, access expansion, refresh or session mutation is needed or authorized.

`context-adapter.mjs` blob `7a06ec8c8f1bb32d87214ca25d350bc4c0b91eec` joins these facts to server-prebound commandContext. Canonical `currentRun(binding,{signal})` must return a JSON string containing full binding, policyRevision, deadlineMs and checkedAtMs, freshly checked **before and after** native context authorization. The shortest original deadline wins; changed principal, revision, policy, fence, client or binding refuses. Qualification registries/research telemetry cannot substitute for the admitted product run owner.

Sessions are process-local, maxTTL300000ms, refreshed authority checked at each authenticate/current-read and expiry only shortened. Revocation/removal clears retained native credential. Restart/close/different-process routing loses sessions and refuses; same-origin URL alone does not provide distributed persistence. Mounting must preserve affinity to the same owner, or separately qualify an explicitly new ownership contract.

## Coverage and activation boundary

Retained backend receipts report245/245 checks, zero failures/skips/cancellations, at `6dfc050e...`; separate two-listener replay passed at `97299694...`. Final84c2 source and recorded qualification are individually pinned in this packet. Historical author `1afbb5a5...` is named by the accepted handoff but its direct GitHub file fetch returned404 (“No commit found”); independent accepted-author-to-final blob comparison was therefore not completed. This does not remove the directly read final source.

Coverage includes disabled/no-call behavior; exact routes/bearers; malformed/oversized/redirected responses; parked fetch/body/run cancellation; principal/hash/client/revision/fence/policy mismatch; original expiry; session issuance; native bearer denied on action; query/draft/prepare; unapproved NOT_DISPATCHED with zero effects; explicit fixture approval; one synthetic task effect; same-proposal replay without second effect; revocation401; closed mount503 and zero owned sockets/sessions.

The replay used a synthetic authority listener and synthetic current-run/source/persistence ports. It explicitly reports nativeIdentity:false, nativeDatabase:false, liveCapiro:false, tlsQualified:false and providerCalls:0. The91 identity +91 context +182 currentRun checks are composition evidence, not performance evidence. Existing frontend controller tests cover held inputs, duplicate prevention, exact-handle replay, uncertainty, access loss and disposal; this review inspected source only and ran none.

**Admissible now:** root can implement/package and fixture-qualify this source-backed frontend seam with honest synthetic labels. **Live activation remains closed** until the two Capiro endpoints, real admitted Meri run owner, trusted allocator/broker/services composition and source-bound browser/native/deployment gates are qualified. PR47 does not activate source descriptors, supply full chat/workspace runtime, close G1 or admit G2–G7. Preserve PR17 and the139-capability accounting.

