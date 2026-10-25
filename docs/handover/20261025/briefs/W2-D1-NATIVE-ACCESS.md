## 1. Claude handles the harness

The quality bar is Claude's own. Answer quality comes from the whole harness, not only the model: its system prompt, built-in tools, subagents, skills, context management and compaction, and session handling.

- Run `@anthropic-ai/claude-agent-sdk` with its **full harness** and the Claude Code system-prompt preset, plus a short Capiro/Meri append. Don't replace the preset with our own prose.
- Do not rebuild what the SDK or AWS already does: model calls, retries, streaming, the tool loop, context management and compaction, session resume/fork, per-run turn and spend limits, AWS credentials.
- The real Claude SDK calls Bedrock directly using its narrowly scoped AgentCore runtime IAM role. Preserve the full preset, native tools, subagents and all 14 skills.
- Capiro data reaches Claude as **tools** (rule 4), not as a custom retrieval layer around the model.

Spec and plan: `phases/wave2/WAVE2-00-CLAUDE-NATIVE-HARNESS-SPEC.md`. It is **Wave 2 item 0**, and it comes before every other item that touches the runner, the proxy or authority.

## 2. Simple, standard architecture

```text
browser -> control (current access, conversation/run ownership, durable events)
        -> AgentCore Runtime V1 (isolated conversation session; actual Claude SDK) -> Bedrock
                                      -> tool gateway -> Core
control -> existing durable SDK SessionStore and artifact owners
control -> Temporal for required durable runs, schedules and background work
```

- **Core is the gatekeeper for Capiro data.** Tenant, member, client and wall rules remain server-side in Core. Check current access at admission and actual tool/data/artifact access; revocation must also prevent use of previously loaded privileged context. Do not duplicate policy in the harness.
- Reuse one isolated environment only for the same immutable tenant/actor/conversation and approved General/client scope. Serialize turns; stop idle compute and restore exact SDK transcripts and artifacts from their durable owners. A Runtime session ID is not authorization or durable storage.
- Keep the SDK's per-run turn/spend limits and one canonical tenant cap/usage owner. Preserve required durable runs, schedules, consent, outcomes and uncertain-write fences; neither SDK Task tools nor a warm process replaces Temporal durability.
- **No custom warm pool, per-turn ECS task requirement, model proxy, duplicated per-hop authority, credential-minting service or spend-reservation ledger.** Use standard Runtime V1; no V2 snapshot machinery or second SDK implementation.
- Before adding a mechanism, identify the standard feature or existing owner it uses. Before deleting a wrapper, prove the retained lower-layer behavior with meaningful positive/negative tests. Do not remove canonical authorization, idempotency or durable outcomes as “extra security.”

## 3. Leave no dead code behind

A change is not done until what it replaced is gone.

1. **Delete in the same PR** everything the change makes unused: code, tests, fixtures, docs, config keys, env vars, feature flags, IAM statements, ALB rules, secrets, task definitions, CloudFormation resources, kit steps, alarms and metric filters. Applied database migrations are history: never edit them. Drop tables only through a separately reviewed forward migration after a snapshot; this hosting migration does not itself authorize schema/data removal.
2. **Temporary diagnostics come out before merge** of the fix they were added for. A log line stays only as named product telemetry that someone reads.
3. **No code behind a flag nothing turns on.** The "source-complete, activation-held" status is retired for code we don't intend to ship. Dark features need an owner and a date, or they are deleted.
4. **No** commented-out code, `legacy` or `_old` copies, compatibility shims for removed things, or "superseded" stubs.
5. **Show proof in the PR:** list the identifiers, files and resources deleted, with a search proving no executable/active caller remains; label immutable historical references, and explain any drop in test count.
6. **Old plan tickets for removed mechanisms are closed as superseded**, not implemented and left dormant. See `source-of-truth/SUPERSEDED-BY-ITEM-0.md`.
7. **Reuse before write.** Use SDK, AWS and library features first. Custom code needs one line saying what the standard option couldn't do.

## 4. Capiro data must keep working

- Capiro data is served to Claude as tools. Core remains the source: today's read families call Core at `/api/clio/tools/<operation>`, and the new tools call the same endpoints.
- Tools are hosted by **control** (the existing tool gateway) so the runner never holds the Core service secret (`x-internal-service-secret`). The runner gets only a short-lived per-run token for control, scoped to tenant, user, client, conversation and run.
- Reuse the existing read handlers under `apps/gateway/sources/*` and their typed schemas. Delete the authority, relay and measurement wrappers around them.
- Parity: every read family that works today must be reachable as a tool with the same results and the same permission outcomes. A parity checklist is part of the item 0 spec.
- Negative tests are mandatory: another tenant's data, another client's data, and walled data must not be retrievable, through chat or through tools. A General chat reads across the clients the user can already see, with each client's wall enforced per result (FINAL-PLAN decision 2).
- The original read-only first cut is historical. Neo subsequently authorized preview client-record writes and autonomous Wave 2 completion. Activate accepted writes through their existing authenticated domain/intent owners and receipts, with the actual route/configuration and effect semantics verified. This does not authorize the assistant to send external mail without the user's specific send instruction.

# D1 native access-loss investigation — PROCESS6.1
FROM: Root | TO: Portfolio | TYPE: brief | RE: legitimate D1 access loss (Wave 2)

Standing source: Meri documentation checkout8acb394cf10782d1a7703fa2d0b8c926f14ab508, current STANDING-REQUIREMENTS and PROCESS6.1/6.2. Full rules1–4 are above. Root orchestrates; this allocated implementation/diagnosis owner uses xhigh; separate reviewers review exact heads. Runtime owns Meri candidate/context and telemetry; Release alone owns AWS/migration/deploy/rollback. No inference of new scope authority from engineering text. Preserve full Claude SDK/native harness/tools/skills, Runtime V1/direct Bedrock, Core current authorization, user/firm memory, durable outcomes and uncertainty fences.

Repository frontend. Isolated successor C:/dev/w2-d1-native-access, branch codex/w2-d1-native-access-20261025, exact parent/base4f10476063cd9ef52d341fc597f0a6cdc8c694f7/treecf1041ea24596781b489667e8825ef31d5d935fd (independently accepted PR164, frozen). Remote main reverifieda5bd5336aa55bb2635d218caa6c0b8c7bce9b3e3. PR164 differs in Files guidance only; native FE paths equal live1dfd5893525ad31b7e6622371b1d4e1ddb6bcbf1. Deployed Meri09e89db9b57c8fcb5b1aa15a4d1479074c8bbe16/Core929acd023c29d9073cbf9d5c5105eba8c3252948. Subsequent Meri/Core retention/handoff commits are documentation/manifest changes, not a new observed app deployment. No edit toaccepted164, another lane's checkout or shared service.

Saved evidence: Acceptance's fresh nominated-client tab entered /meri?clientId without conversationId and initially had no saved turns. One legitimate document request Send20:16:48.287Z; Running/schema-check20:17:00.885Z; native access unavailable/transcript cleared20:17:26.547Z; same-tab Files20:17:37.603Z, one Connect20:17:42.702Z, context unverified20:17:50.463Z. One model submission/one requested creation; actual creation UNKNOWN, no raw receipt/artifact/version/hash/download. Never recast as zero effect or reattempt. Evidence names: corrective-d1-native-access-unavailable.jpg and corrective-d1-native-context-unverified.jpg in Acceptance outputs; exact private binding/status/code not captured. Earlier19:49 zero-create Connect remains a separate event. No D1 Runtime capture was allocated; Runtime explicitly holds no additional D1 typed error/status/stage receipt. Actual trigger remains UNKNOWN.

Ownership coordination before edits: Root notified of candidate native FE paths; Settings confirms no overlap and frozen PR163b3c1bea8b37862e542a82aa8fab4ec7e913e6b93 only changes actions workflow/state plus tests/brief. Runtime confirms no FE edits and retains Meri telemetry/candidate owner. Prospective native FE owners: shared/meri-conversations/host-controller.ts and session.ts; features/meri/conversation/useConversationConnection.ts, useRunObservation.ts and their direct native read/completion composition; packages/meri-client conversation-client/network/observation. Report concrete proposed file scope before mutation. Shared opaque-session-controller/session-bootstrap, identity-token/proxy, contract/lock/package distribution changes remain unallocated until named overlap coordination. Meri producer edits stay with Runtime. No recursive delegation or extra chat.

Investigation: trace the existing native initial-input/current-access/read/poll/completion paths and document writer prerequisites against saved observations. Discriminate ordinary renewal/expiry, native transcript refusal, opaque request refusal, stale completions and permitted transient upstream failure. Inspect source classifications rather than inferring TTL fromelapsedtime. Use existing tests/fixtures/handlers and a bounded synthetic local reproduction with controlled clocks only if it establishes a producer/consumer or lifetime mismatch. Reuse the real typed receivers and exact-run owners. Do not change behavior absent a concrete counterexample. No duplicate auth, selector, bootstrap, refresh loop or qualification framework. Browsers do not grant authority; denied private content must stay hidden while exact existing work retains its durable owner/fence.

Provisional source trace, not cause: ConversationNetwork revokes on HTTP401/403 and signals host. The host distinguishes natural timer expiry from access loss. Separately, useSelectedHistory revokes the same connection when a native transcript read is401/403 or MEMBERSHIP_CHANGED. Existing native session and history readers have distinct auth paths. One generic access-unavailable screen does not identify which crossing refused. Current Meri opaque owner already marks transient authority failure separately and retains a session only under fresh subsequent checks; do not recreate a previously fixed classification bug.

Sources/tickets: current plans, supersession register, MF02 identity/access isolation, MF05 observation, MF06 Stop/readiness, MF07 durable draft/request recovery, MF08 run-status truth, MR08 integrated lifecycle (Runtime dependency), MM08 artifact-runtime integration (document-owner boundary only), and matching E01–07/E27/E43/E45 below verbatim. Apply register overrides; no removed pair, per-operation authority, old checkpoint, issuer or budget reservation machinery. These tickets select guarantees; they are not permission to broaden this bounded diagnosis.

Tests run at brief creation: none for this phase. Retain earlier diagnostic2FE+2Meri cases and guidance44PASS as distinct unaffected evidence, not proof of native access-loss cause. Plan affected existing native lifetime/host/history tests, narrow new regression only for a demonstrated defect, base-vs-head behavior and meaningful mutants for any new executable tests. If no correction is warranted, explicitly record no production changes and mutationN/A. Reuse existing dependency caches and candidate client package source; verify package/source correspondence if changing compiled client code. No install/lock/cache reset.

NOT RUN / ownership: any new live browser/HTTP/log query/DB/AWS/model/SDK invocation or retry, document effect reconciliation, further Connect/Send, deployed acceptance, full-suite/build/scan/deploy. Root/Acceptance/Runtime/Release own later allocated checks; this lane uses saved evidence/local synthetic tests only. Do not consume model budget or weaken the UNKNOWN fence.

Definition of done: concrete bounded diagnosis, or minimal existing-owner fix only if reproduced; full exact base/head/tree/files, commands/UTC/counts/exits, inherited failures and tests not run, meaningful mutant/deletion evidence, commit AND push. Draft PR only for a justified code change, with accepted PR164 dependency explicit and separate exact-head review. Root integrates after batch; no merge/AWS/live claim. In-scope work proceeds/logs; actual ownership/security conflicts go to Root. Preserve shared worktrees/caches/environment. Remove only verified task-owned temporary test/instrumentation files from product source; retain ordinary evidence. No #202 or external messages.


## Bounded investigation result — 2026-10-25

No new frontend defect was reproduced. Product code, contracts, compiled packages, shared session owners and accepted PR164 remain unchanged. This phase produces a diagnosis only, not a fix or live acceptance. Document creation and the access-loss trigger remain UNKNOWN.

The actual consumer has two denial paths. `packages/meri-client/src/conversation-network.ts` revokes the active connection on HTTP401/403 after checking caller/currentness; it does not classify HTTP503 or a clean observation-window end as access loss. `shared/meri-conversations/history-queries.ts` separately classifies native transcript401/403 or MEMBERSHIP_CHANGED as denied; `features/meri/conversation/useConversationSession.ts` then revokes the same host and hides private history. These use different credentials at the existing Next route: native cookie-derived identity for transcript, opaque session for conversation observation. The screenshot alone cannot select the failing request or identify which upstream owner refused.

The existing lifetime owner distinguishes renewal/expiry from denial, and the hook automatically reopens only renewal/expiry on the exact retained binding. `MeriLiveConversation.tsx` refreshes native history after a validated finished transition. That is a possible path to another access check, not evidence that D1 reached this transition. The canonical Meri next-run journal still admits the latest exact completed binding for reads; completion alone does not revoke it. Meri's current session owner already distinguishes marked transient authority unavailability from definitive refusal. No new TTL, retry or authority mechanism is justified by this investigation.

The actual document authority (`apps/runtime/artifacts/core-authority.mjs` at deployed09e8) requires a saved run with matching binding/scopes, refuses a cancelled run, and accepts self-contained typed document content. A requested document is not an effect receipt. Neither a runtime completion record nor the later failed Files Connect establishes tool dispatch, publication or absence of an effect.

Local verification (Node24.22.1/npm11.19.1/Vitest4.1.11, Windows, reused dependencies):

- At20:34:59Z, `npm run test --workspace @capiro/web -- tests/meri-conversation-reconnect.test.ts tests/meri-m1-identity.test.ts tests/meri-history-not-started.test.ts tests/meri-session-history-not-started.test.ts`: exit0, four files, 26 tests PASS. Covers bounded initial retry, exact binding, early renewal deferred during pending reads, hard expiry, denial, stale read abortion and distinct empty-history outcomes.
- At20:40:26Z, temporary `tests/d1-native-boundary-diagnostic.test.ts` through the same Vitest runner: exit0, four tests PASS. Actual source ConversationNetwork and observation loop with synthetic fetch/clock: 30-second clean window then503 then successful reread preserves access;401 and403 while an observation is active abort its private reader and revoke exactly once; late401 after caller abort cannot revoke the current connection. No real network or model calls. These discriminate behaviors; they do not reproduce the live cause.
- Eight source/dist files for conversation network/client/chat/observation are byte-identical between this candidate and the dependency-junction target `C:/dev/wave2-local-tenant-settings-fe-20261025`. Existing host tests therefore use the same checked-in package code. No package rebuild, install or shared-cache mutation.
- Ordinary evidence retained in Portfolio `work/d1-native-existing-tests.log`, `work/d1-native-boundary-diagnostic.test.ts`, and `work/d1-native-boundary-diagnostic.log`. The temporary product-test copy was removed after the run; no test-only product changes remain. No production fix/new regression; mutation and base-vs-fix comparison N/A. Full suite, typecheck/build, browser/live, AWS, DB, model, document readback and retry were not run.

New saved evidence supersedes only the brief-creation statement that no D1 log capture existed. After Acceptance sealed, Root allocated Runtime one finite existing-log capture20:16:46Z–20:18:20Z. Runtime reports collection20:32:39.451112Z, exit0, pagination ended: Core592/Control11/AgentCore8 events, one stream each. Manifest SHA256babbf0657a539705de1da0279aa54a22291a520faab7e805be39b73a10bc0115; private selected receipt SHA256e0ff8736271770566a671a76946b12ef6aaa5f01e8cd18fc2f6d48455c959f6c. Portfolio consumed the saved report only, with no new query. One common Control/AgentCore candidate completed at20:17:26.749Z, with47 runner owner calls/all2xx; exact UI ownership was not established. There is no typed access error/create_word failure, canonical document/delivery receipt, or Control terminal summary. No document/artifact/file/intent endpoint match among589 Core metrics is not evidence of no dispatch/effect. Aggregate Clerk cache counts cannot diagnose this user's session. Missing/late/unemitted log coverage remains unproven.

The remaining causal fact is the failed native browser request's route, HTTP status/typed code and owning conversation/run, or a canonical producer refusal receipt correlated to that exact request. Independently, the original creation needs its existing durable delivery/artifact outcome. The current capture supplies neither. Root owns any next bounded evidence allocation; this handback authorizes no extra model request, reattempt, broad log query, DB/browser readback or instrumentation. Preserve UNKNOWN and the original write fence. Do not combine this failure with Actions or M1 without causal evidence.

Deletion proof: no replaced implementation and no permanent diagnostic code. Only this standalone brief differs from accepted PR164 after temporary-test cleanup. Existing worktrees/services/configuration/caches remain intact. Branch publication is documentation only; no PR is warranted for an unproven code correction.

## Verbatim bounded tickets

#### MF-02 — Qualify identity, exact-run renewal and access-loss isolation (P0 before live activation)
> **[RE-SCOPED 2026-10-23]** A revoked user still loses access within 30 s. Use the ordinary Clerk session refresh plus one Core access check per turn; there is no "exact-run renewal". Ignore any instruction below that names the owner/proxy pair, budget reservation, per-operation authority, the task verifier, ECS task proofs, revision pins or the temporal-issuer. See `SUPERSEDED-BY-ITEM-0.md`.

- **Root cause / evidence:** Fresh token issuance and 45-second renewal already exist. Source presence does not prove backend bearer lifetime, account mapping, deployment origin or revocation behavior.
- **Bounded files/owner:** `identity-token.server.ts`, `opaque-session-controller.ts`, `session-bootstrap.ts`, `host-controller.ts`, `useConversationConnection.ts`, `SelectedClient.tsx`, shared query scope and their tests. Fix only demonstrated gaps.
- **Implementation:** Build composed acceptance scenarios for verified native actor, tenant/client switch, archived/deleted client, signout, revoked membership, token expiry while streaming and while mutation pending, multiple renewal cycles, browser back/forward, StrictMode/remount. On exact-lifetime loss abort readers, hide actor/client-bound data and invalidate sensitive cached views without auto-canceling backend work. Reissue using fresh identity for exact existing selectors; never allocate next turn on reconnect.
- **Dependencies / exclusions:** MR session-owner expiry/error taxonomy and environment operator qualification. No browser tenant/actor override, persistent bearer storage, weakened issuer/audience or synthetic client.
- **Acceptance:** At least two real renewal cycles preserve run ID and accepted cursor, no duplicate submit/next-turn; stale account/client DOM is hidden immediately, denied data not resurrected by cached pages; explicit retry cannot mint broader authority; native subject-to-actor mismatch fails closed.

#### MF-05 — Resume run observation after approval or external state change (P1)

- **Root cause / evidence:** Paused/waiting-for-approval is treated settled; decisions only `await refresh()` intents ([`apps/web/src/features/meri/conversation/intents/useConversationIntents.ts:180–182`](https://github.com/neo-capiro/capiro-frontend/blob/4f9a7e8dcaa9ba03494dc5a49559daf70cea5100/apps/web/src/features/meri/conversation/intents/useConversationIntents.ts#L180-L182)), while run observation starts once per mounted port.
- **Bounded files/owner:** `ConversationPanels.tsx`, `useConversationIntents.ts`, `useLiveRun.ts`, `useRunObservation.ts`, `conversation-view.ts`, `RunStatus.tsx`.
- **Implementation:** Expose a narrow decision-settled/status-may-have-changed callback that requests authoritative run history then resumes event observation only if current status warrants. Add explicit Refresh run status for paused/waiting/unknown; bounded visibility/focus refresh or server event mechanism for external approver. Separate terminal from temporarily quiescent state. Do not resubmit prompt, infer resumed status, or repeatedly poll an expired session.
- **Dependencies / exclusions:** Runtime lifecycle/approval continuation gates and fresh target-session requirements; MF-02/03/04.
- **Acceptance:** Approve same tab and another reviewer tab: current run eventually shows real resumed/completed/refused state without navigation or token renewal. No duplicated submit/decision; denied refresh clears stale data; paused remains paused until authority says otherwise; no busy infinite loop.

#### MF-06 — Expose Stop retirement and next-turn readiness honestly (P1)

- **Root cause / evidence:** Stop fence acknowledgement precedes physical retirement; next-turn can correctly conflict. Frontend retry window is150s, whereas backend cleanup can outlast it. Existing history/new-chat/next-turn consumers must be preserved.
- **Bounded files/owner:** `RunStatus.tsx`, `ConversationHistoryStatus.tsx`, `useConversationSession.ts`, `turn-journal.ts`, first-chat/bootstrap/next-turn integration tests.
- **Implementation:** Display separate Stop requested, fence recorded, run terminal and next-turn readiness/cleanup pending where public evidence supports them. Exhausted turn-conflict retry becomes retryable not-ready, not a new conversation/run request. Reconcile same source reservation after reconnect; keep original intent/request identity. For accepted-but-not-started input show recover/readback action rather than a new Send. Avoid unbounded spinner and explain cancellation receipt versus cleanup.
- **Dependencies / exclusions:** MR retirement/current-render fix and readiness/readback semantics. Do not extend frontend timers as substitute for backend recovery or reinterpret409 as permission to allocate.
- **Acceptance:** Stop during tool/provider work, dropped cancel receipt, cleanup delayed beyond150s, fresh deployment and repeated next-turn click all converge to at most one successor; no overlap before retirement; approved prompt preserved and no claim of physical stop without evidence.

#### MF-07 — Design durable drafts and request recovery across reload (P1)

- **Root cause / evidence:** Unsent drafts are React state; QueryClient journals preserve SPA navigation only. `turn-journal.ts` explicitly warns hard reload loses intent identity; clearing a next-turn composer before successful reservation can lose visible text on reload.
- **Bounded files/owner:** `useConversationSession.ts`, `MeriLiveConversation.tsx`, `MeriComposer.tsx`, `query-journal.ts`, `turn-journal.ts`, first-chat intent helper; a small versioned per-scope journal, not broad local persistence.
- **Implementation:** Define retention for unsent drafts separately from dispatched immutable requests. Save permissible draft text per tenant/actor/client/conversation (or explicitly state drafts not saved); restore only to exact scope and clear on signout/retention expiry. Persist minimal non-secret request identity before mutation if permitted, then use server readback/reservation on reload. Unknown submission must not create new logical request. Distinguish edited newer draft from acknowledged text and preserve IME/blocked-enter behavior.
- **Dependencies / exclusions:** Privacy/retention ST-18; MR durable admission/readback owner; MF-04 journal conventions. Never persist bearer/session credentials or trust restored bytes as authority.
- **Acceptance:** Reload before dispatch, after dispatch/before ACK, after ACK, during next-turn409, offline, storage-full and account/client switch: no accidental resend, no cross-scope draft, no unexplained loss of accepted request. Hard-reload outcome recovered from durable server state, not guessed from local cache.

#### MF-08 — Preserve and qualify merged run-status truth correction (P1 regression gate, source already complete)

- **Root cause / evidence:** Earlier main stalled copy said the run continues; exact fix is now on current main through merged PR115 [`apps/web/src/features/meri/conversation/RunStatus.tsx:111–124`](https://github.com/neo-capiro/capiro-frontend/blob/7fda299e2264d17a5a88c1dad50b08633ba862ae/apps/web/src/features/meri/conversation/RunStatus.tsx#L111-L124).
- **Bounded files/owner:** Current-main `RunStatus.tsx` and `tests/meri-run-status.test.ts`; merge provenance/release tests only. No new copy implementation is owed.
- **Implementation:** The current reviewed delta is already merged. Preserve its tests and qualify it in the deployed ordinary environment. Keep observing/reconnecting/stalled/outcome-unknown separate; page departure stops watching, not execution. Audit auxiliary workflow errors for same optimistic wording.
- **Dependencies / exclusions:** PR115 merge verified at `24316f9`; deployment qualification controlled by release plan. No duplicate implementation or merge task, no flag enabling.
- **Acceptance:** Disconnect or proxy timeout never states backend is running/completed/cancelled; reconnect action rereads accepted cursor; source pin in release receipt proves the current delta is present.

#### MR-08 · P1 · Qualify the complete admission-to-next-turn lifecycle, not only happy-path endpoints
> **[RE-SCOPED 2026-10-23]** Keep the behavioural crossings (duplicate submit, ACK loss, Stop repeated, stream reconnect with cursor, next turn after a failed or cancelled turn, deploy between turns, pause/resume/fork). Drop crossings that exist only for kickoff claim/lease, allocation and grants, native currentness or terminal usage capture. Ignore any instruction below that names the owner/proxy pair, budget reservation, per-operation authority, the task verifier, ECS task proofs, revision pins or the temporal-issuer. See `SUPERSEDED-BY-ITEM-0.md`.
**Class:** Q. **Owner:** runtime supplies the semantic cases; release coordinator owns integrated test/release execution.

**Bounded work:** turn §4 into a composed regression suite at the exact release commit and packed contracts. Retain existing unit/protocol tests and add missing crossings of process boundaries, real transaction ACK loss, identity renewal, native currentness and provider terminal evidence. No parallel workflow/model loop.

Minimum crossings:
- initial input allocation/admission/submit duplicates and ACK loss before/after run acceptance and Temporal start;
- kickoff claim/lease expiry, task replacement, queued cancellation before allocation and durable foreclosure;
- load/currentness outage, SDK init failure, mirror append ACK loss, restored transcript/session key mismatch;
- stream disconnect/reconnect with strict cursor, duplicate event ID, late output after Stop/hold/suppression;
- terminal usage followed by capture/publication loss; completion observed but physical task not yet retired;
- Stop repeated after caller disconnect, control restart, Temporal NOT_FOUND and reconciliation exhaustion;
- next turn after completed/failed/cancelled source, with and without an older completed checkpoint, reserved before deploy and accepted after;
- steer/pause/approval wait/capture/resume/fork including retained original during fork and fresh target session;
- process-local session renewal after bearer expiry/control restart, same exact binding, with no implicit next-turn reservation or Stop.

**Evidence basis:** existing semantic tests cover many individual boundaries, including terminal events, hold failure, lifecycle commands and image continuity, but use scripted/native test owners. [apps/worker/conversation/test/terminal-settlement.test.mjs:1–22](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/worker/conversation/test/terminal-settlement.test.mjs#L1-L22), [apps/worker/conversation/test/completion-activity.test.mjs:1–15](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/worker/conversation/test/completion-activity.test.mjs#L1-L15), [apps/worker/conversation/test/lifecycle-activity.test.mjs:36–48](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/worker/conversation/test/lifecycle-activity.test.mjs#L36-L48), [apps/runtime/test/conversation-survives-deploy.test.mjs:22–49](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/runtime/test/conversation-survives-deploy.test.mjs#L22-L49)

**Acceptance evidence:** each case records actual source/target bindings, exact image/SDK/CLI/contracts, request/control/event identity, journal transitions, allocation/task/grant disposition, checkpoint lineage and sanitized error/outcome. Require absence assertions for duplicated provider calls or unintended actions. A mock pass cannot be labeled physical stop, real SQL durability, deployed SDK compatibility or live currentness.

#### MM-08 — Receive and qualify the existing artifact runtime composition (P1; main source gap / PR receiver)

Evidence: [main CLI M L55–70](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/runtime/cli.mjs#L55-L70), [receiver CLI M197 L55–71](https://github.com/neo-capiro/meri-greenfield/blob/cf634d4f70376c12ee6dd7b97ec22981dbd4cb2a/apps/runtime/cli.mjs#L55-L71), [M197 operation set L39–43](https://github.com/neo-capiro/meri-greenfield/blob/cf634d4f70376c12ee6dd7b97ec22981dbd4cb2a/apps/runtime/artifacts/run-options.mjs#L39-L43), [M197 intent preparers L28–95](https://github.com/neo-capiro/meri-greenfield/blob/cf634d4f70376c12ee6dd7b97ec22981dbd4cb2a/apps/runtime/artifacts/intent-preparers.mjs#L28-L95).

Root cause: Main calls composeDocumentsFamily without authorityPorts, leaving the ordinary configured store-only family. PR197 supplies Core current authority, native credential relay, four operation descriptors and derived per-call sessions for document/ZIP intents.

Work: Review the exact current M197 successor under the MX-02 source-reception ticket, preserving its received candidate11 changes. Verify authority.bind, run register/release, exact selected-client/native credential correlation, source/intent flags and actual executor paths together. Use existing S3/PG publication custody and canonical budget namespace. Compose only supported operations; absence must remain specific unavailable readiness, not globally healthy. Connect typed draft receipt into the existing event/history owner; general output is not a task approval.

Tests: Missing inputs yield no generator/IO; cross client/tenant/run, session switch/revoke, invalid grant, budget exhaustion, unknown create/commit, replay, terminal retirement and cleanup; PPTX/ZIP real bytes with exact SHA. Dependencies: shared source/image/DB qualification, MM-09/10/18, tools authority. No live claims from PR receipt.

## Supersession register

### B1. Tickets

| Ticket | Disposition | Keep as acceptance | Dropped |
|---|---|---|---|
| **MR-01** historical stop-only retirement | **SUPERSEDED** | A Stop sent for a run that began before a deploy works (E10) | The config-SHA / facts-hash pins the ticket repairs no longer exist |
| **MR-02** transient-authority classification in the control pump | **SUPERSEDED** | A transient Core outage retries with bounded backoff inside the run deadline; a definitive refusal fails at once | The authority-availability marker and the per-operation authority layer |
| **MR-06** durable lifecycle outcome readback | **RE-SCOPED** | Outcome readback and recovery after process or request loss | Temporal plus the conversation DB are the durable record; drop the prepared-run registries |
| **MR-07** checkpoint / dormant-original continuity | **SUPERSEDED** | The next turn after a deploy continues the conversation. An SDK upgrade needs the transcript-recap handover first (O103). An incompatible state shows a clear message | Admitting render, reserved successor, mirror append and dormant-original states |
| **MR-08** admission-to-next-turn lifecycle suite | **RE-SCOPED** | Behavioural crossings: duplicate submit, ACK loss, Stop repeated, stream reconnect with cursor, next turn after a failed or cancelled turn, deploy between turns, pause/resume/fork | Crossings that exist only for kickoff claim/lease, allocation and grants, native currentness, terminal usage capture |
| **MR-09** provider terminal accounting and unresolved-liability recovery | **SUPERSEDED** | Each run's cost comes from the SDK result and is recorded once. The tenant cap is enforced. A turn is never failed because accounting is uncertain | Reservations, UNKNOWN liability, quarantine, CountTokens basis |
| MT-01 installed capability set as release truth | **RE-SCOPED** | The tool list a user's run can call is the release truth, served by the tool gateway | "Measured installation", discovery through "the actual pinned proxy" |
| MT-02 selected-read composition (PR197) | **DONE / RE-SCOPED** | Read handlers stay | The authority composition around them |
| MT-03 to MT-09, MT-16 read families | **RE-SCOPED** | Same behaviour and acceptance, implemented as tools on the tool gateway | Extending native-authority or the relays |
| MT-10, MT-11, MT-12 task and schedule actions | **RE-SCOPED** | Approval, durable receipt, no blind redispatch | Approvals go through the SDK permission callback plus Core intents; no per-operation grant minting |
| MM-01, MM-13 "current-authority reads" | **RE-SCOPED** | Memory and attachment reads are scoped to the current actor, client and permissions | Core decides on each tool call; no authority receipt layer |
| MO-10 complete-job cost, context integrity, fair capacity | **RE-SCOPED** | Cost ceilings, context integrity, fair capacity | SDK limits plus one tenant cap, SDK compaction and standard Runtime session/compute limits |
| MO-11 retire obsolete runtime code | **KEEP, now** | Item 0 step 5 is its largest instance. Do it with item 0, not at L4 | — |
| MF-02 identity, exact-run renewal, access-loss isolation | **RE-SCOPED** | A revoked user loses access within 30 s | Ordinary Clerk session refresh plus one Core access check per turn; drop "exact-run renewal" |
| MF-10 public lifecycle consumer | **RE-SCOPED** | Pause, resume and fork controls | Consume item 0's lifecycle DTOs |
| MX-05 exact image and capability measurement | **RE-SCOPED** | Exact-digest image scan and source-to-image proof | "Capability measurement" of the removed registry |
| MX-06 topology, readiness, control scale | **RE-SCOPED** | Readiness/control scale and measured Runtime V1 session reuse, idle stop and restore; no custom warm pool | Pair and issuer topology |
| MX-07 material expiry, renewal, PKI rotation | **RE-SCOPED** | Expiry and rotation for the secrets that remain (Core service secret, Temporal credential, Clerk) | Pair mTLS PKI and issuer tokens |
| MX-09 latency, cost, resource measurement | **RE-SCOPED** | Measure on the new path against the targets in `../STANDING-REQUIREMENTS.md` §6 | "Without duplicating P1/P2" (they are gone) |
| MX-02 receive existing source once | **DONE** | — | — |

Unlisted Meri tickets (MG, MB, MO except MO-10/11, MF except MF-02/10, MT-13 to MT-15, MM except MM-01/13, MR-03/04/05/10, MX-01/03/04/08 and 10 to 14) are unchanged. MR-04 (routine read consent) must be implemented against the tool gateway's run token.

### B2. Scenarios E01–E45

| Scenario | Disposition | Note |
|---|---|---|
| E09 image-only release after a completed turn | KEEP | The conversation continues after a deploy |
| **E10** deploy or rotation while an old run is in flight | **RE-SCOPED** | Stop works and the run closes or resumes cleanly. No pins |
| **E11** SDK, CLI or format incompatibility | **RE-SCOPED** | A clear message and a recap or new-chat choice (O103); no silent session loss |
| **E18** read active-set and revoked operation | **RE-SCOPED** | The tools a user can call are those Core allows for that user and client; a revoked tool refuses |
| **E39** owner/proxy partner replacement | **SUPERSEDED** | There is no pair |
| **E40** budget / terminal usage missing or contradictory | **SUPERSEDED** | Replaced by: record available canonical SDK usage once, preserve unknown accounting explicitly without fabricated usage or failing a completed answer, and enforce the tenant cap through its existing owner |
| **E42** forward rollback and schema compatibility | **RE-SCOPED** | Drop "retained liabilities"; keep forward rollback and receipts |
| All others | KEEP | |

### B3. Sections and rules

| Where | Disposition | Replacement |
|---|---|---|
| "Architecture to preserve" items 3 and 4 (worker → "allocation/claim/lease"; gateway/domain owner → "budget/liability and receipt") | **SUPERSEDED** | Runtime V1 hosts the actual SDK; tools go through the existing gateway to Core |
| Trace table rows "Chat / follow-up" (`run/claim/SDK model proxy`) and "Read/search" (`one-use delegated Core or retained authority … budget settlement/current release`) | **RE-SCOPED** | Chat: control → Runtime V1 conversation session (SDK) → Bedrock → durable native session/events. Read: tool gateway → Core with the run token; Core enforces scope |
| Stage B "Close authority, durable receipt and recovery foundations" (its runtime bullets) | **SUPERSEDED** | The frontend, commands, memory and QA bullets stay |
| Operator gate O3 "PKI material" | **RE-SCOPED** | Only for the secrets that remain |
| Definition of done #3 "Fresh tenant/actor/client/run authority through every hop" | **SUPERSEDED** | Core enforces tenant, actor and client scope on every data call; the harness doesn't re-verify at each hop |
| Definition of done #5 "UNKNOWN with read-only reconciliation" | **RE-SCOPED** | Applies to writes and external effects, not to model spend |
| R-06 "native SDK deferred discovery through the actual pinned trusted proxy" | **RE-SCOPED** | SDK tool discovery directly against Bedrock |
| RG-08 "actual-proxy compatibility" | **RE-SCOPED** | Compatibility against Bedrock through the SDK |
| REL-05 "first runtime/proxy checkpoint" | **RE-SCOPED** | The spike in item 0 step 1 |
| "Performance/cost: 100% attempt usage including failures" | **RE-SCOPED** | Usage comes from the SDK result |

---

## C. `plan/FINAL-PLAN-20261021.md`

| Item | Disposition | Note |
|---|---|---|
| **S1** (P1 table, P2 PR-A) | **SUPERSEDED** | P2 PR-A (#196) is merged and shipped. P1 #200 and C9 #203 were closed unmerged. MX-08 dashboards stay |
| **S2** (P2 PR-B, authority-lite) | **SUPERSEDED** | P2 PR-B #199 was closed unmerged; S2 #213 is merged and shipped. Replaced by one Core access check per turn |
| **S3** warm runner pool | **RE-SCOPED 2026-10-24** | Delete the custom pool mechanism. Retain latency/cost/cleanup acceptance on standard V1 conversation sessions and durable idle restore. |
| **S4** | **SUPERSEDED** | |
| **M1** | **RE-SCOPED** | MR-01, MR-02, MR-09 are superseded; MR-06, MR-08 are re-scoped. E01–E12 and E40 follow B2 |
| **MP** | **RE-SCOPED** | The Claude API path is an SDK provider setting, not a proxy feature (see the MP brief) |
| **M3** | **RE-SCOPED** | Read families become tools on the tool gateway |
| **M4** | **RE-SCOPED** | Approvals via the SDK permission callback plus Core intents |
| **L1** | **RE-SCOPED** | MX-05/06/07/09 follow B1; the release packet no longer includes pair or issuer material |
| Lanes R and D | **RE-SCOPED** | Lane D's `apps/proxy` ownership ends when item 0 deletes it |
| §7 rows ADR P3 / P4 | **SUPERSEDED** | |
| §8 | Decisions 13–17 (23–24 October 2026) | Current V1 migration/full autonomous completion supersede obsolete hosting and approval steps. |

## D. `source-of-truth/STANDING-RULES.md`

"Architecture to preserve" items 3 and 4, the Chat and Read trace rows, owner-map rows for P1 and P2 and for action-session authority, and Definition of done #3 and #5 are rewritten there in the same way as B3.

## E. App plan (Portfolio, Workspace, Settings, Mail)

No ticket is superseded. Where it says "canonical Meri context contract", read context (tenant, client, entity ids) and not an authority token. "Do not implement competing authority DTOs" now means: don't build authority machinery for Meri entry points.

## Verbatim matching scenarios

| E01 | Authenticated selected-client first chat | One admission/run, real response, durable transcript and correct current actor/client |
| E02 | Reload/new tab after completion | Same messages/citations/artifacts, correct ordering and no prompt redispatch |
| E03 | Double click and lost submit acknowledgment | Same request identity reconciles to one accepted effect/run; no duplicate |
| E04 | Transport disconnect before/after first text | Cursor replay neither drops nor duplicates durable events; browser close does not silently Stop |
| E05 | Session expiry and transient Core503 | Retryable unavailable differs from revoked identity; no unauthorized bytes or false success |
| E06 | Sign-out/tenant/client change with stored draft/intent | Old data/credentials/receipts cannot cross the new identity or client |
| E07 | Stop at queue/load/start/model/tool/output phases | Logical stop fence and physical cleanup/unknown status are distinguishable; no later unauthorized effect |
| E27 | Artifact generation and publication | Valid content+version+hash+evidence; publish once; current Files/chat access |
| E43 | Mixed versions/frontends/contracts | Explicit version/source refusal or accepted backward compatibility; no silently misparsed approvals/output |
| E45 | Canonical cross-module handoff | Portfolio/Workspace/Settings context preserved with entity IDs; effect appears in receiving module after reload |

Brief assembled UTC: 2026-10-25T20:31:29.5745849Z
