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

# D1 document context guidance — PROCESS6.1
FROM: Root | TO: Portfolio | TYPE: brief | RE: explain the saved-request prerequisite (Wave 2)

## Current bounded guidance allocation — before implementation

Root allocated a small presentation correction after accepting the diagnosis below: explain that document creation uses a saved request from this tab's current client chat, and Connect checks that context rather than starting a request. Add an explicit same-tab "Open client chat" link through existing scopedHref('/meri',clientId) only when the current client is authorized and the existing server-derived newConversation capability is on. Use the existing capability context and Next Link with prefetch disabled; do not introduce a new selector, authorization owner, bootstrap or model action. Opening the existing chat route retains its normal Core resolution; the Files page must not do that automatically.

Ownership for this correction is one existing production UI file, apps/web/src/app/meri/files/MeriFilesHost.tsx, plus this brief. Shared lifecycle, routing helper, capability producer, selection, session, wire contracts and proxy files remain unchanged. No inference from generic failure/404, alternative saved-history selection, Recent/General/C3 borrowing, automatic Send, new model invocation, backend repair or live action. Existing generic failure text remains accurate; the prerequisite is stated independently of failure classification.

Refreshed base: remote origin/main confirmed by git ls-remote as a5bd5336aa55bb2635d218caa6c0b8c7bce9b3e3 on25 October2026. Continue the isolated codex/w2-d1-context-20261025 branch from the published diagnosis head f3f31c818eaf617b32303c45a789ce4c8b195ba7; no app source was changed in that head. Current standing source rechecked at8acb394cf10782d1a7703fa2d0b8c926f14ab508; STANDING-REQUIREMENTS.md is unchanged fromb6bf5e90, so the full rules1–4 above remain current. Existing matching tickets/register/scenarios below apply only to this guidance slice.

Verification: inspect current client and server capability gating, existing scoped routing and ordinary chat entry; run affected existing routing/capability and Files session checks plus touched lint/format and diff checks. Static copy/link does not warrant a new mirror test or full suite; new executable regression tests0, mutation N/A. Reuse the retained positive/negative diagnostic reproduction as existing-owner behavior proof, not as a repaired regression. Record commands/UTC/counts/exits and relevant unrun browser/auth/live/model/build/deploy checks. Replace the vague prerequisite sentence, search that removed copy, preserve all existing refusal and session behavior. No new telemetry/resources.

Definition of done for this allocation: one production-file guidance change plus updated brief, commit AND push, draft PR against refreshedmain with exact base/head/tree and affected checks, then Root-allocated independent exact-head review. Root combines accepted Files/Routines/Actions changes for the next candidate; Release/Acceptance own later rollout and legitimate D1 entry. No AWS/live change or model budget consumed here. In-scope choices proceed; only actual ownership/security conflicts go to Root. The earlier diagnosis remains historical evidence: actual19:49 cause is still UNKNOWN and guidance does not close D1.

## Original diagnosis allocation and evidence

Current standing source: C:/dev/wave2-handoff-20261025-docs at b6bf5e90f8f4a55607106b8ee35c4098a6177c1b, STANDING-REQUIREMENTS.md and PROCESS6.1 read on 25 October 2026. Current roles and provenance qualification apply: Root orchestrates; this allocated author implements at xhigh; separate Primary/Supporting reviewers review the exact head. Release alone owns AWS, migration, rollout and rollback. No independent scope authority is inferred from engineering prose. Full Claude SDK harness, native tools and skills, direct Bedrock via Runtime V1, Core authority, user/firm memory and durable outcomes remain.

Repository frontend, branch codex/w2-d1-context-20261025, isolated worktree C:/dev/w2-d1-context. Refreshed exact base a5bd5336aa55bb2635d218caa6c0b8c7bce9b3e3/tree9d902061c62ec1e93a05eddb201bd4baba01b90b. Deployed FE1dfd5893525ad31b7e6622371b1d4e1ddb6bcbf1 contains PR157/d7db026; do not repeat that correction. Deployed Meri09e89db9b57c8fcb5b1aa15a4d1479074c8bbe16 and Core929acd023c29d9073cbf9d5c5105eba8c3252948. Current Meri0d07e1a3728c656f79477e774c95706c66efb3d0 and Core722f094cf60e40b2fb270bb5c1e06bf66d795c42 differ only by retention manifests and briefs; source behavior is the deployed behavior. Preserve earlier frozen worktrees and accepted evidence.

Observed failure: Acceptance's one D1 Connect at19:49:46.127Z yielded current document context could not be verified, recorded19:50:09.155Z. Accepted saved-run binding not established, creates0/model calls0/no retry. Screenshot corrective-document-context-unverified.jpg and existing Acceptance private ledger own observations. HTTP status, stage, exact binding and expiry were not captured. Earlier16:49 nativeDocuments ledger field is historical; do not relabel it as this corrective attempt. Source diagnosis cannot establish the missing live cause. Related Routines draft reset and Actions saved/uncertain then access clearing are separate facts; Actions actual effect remains UNKNOWN.

Ownership: MeriFilesHost.tsx, shared/meri-documents/session-context.ts and document-specific tests/receivers as required by a demonstrated mismatch. Investigate first-chat selection, native transcript verification, opaque issuance and saved history. Shared lifecycle/session/proxy/identity/next-run/contracts/lockfiles remain unallocated; report a concrete overlap to Root before editing. Calendar owns Routines and Settings owns Actions. Root coordinates findings as a batch. No external messages/#202/Fable/Hermes or recursive delegation.

Plan: read saved evidence and actual source owners; check whether a shared boundary is causative before a per-widget change. Use a narrow local reproduction against synthetic journals/HTTP responses where it can discriminate hypotheses. Do not infer TTL from elapsed timestamps. Make only a source-proven existing-owner correction; if the evidence cannot isolate a defect, report exact missing evidence and prerequisites with no speculative patch. Preserve current tenant/actor/client/wall checks and refusals; no arbitrary run fallback or unrelated origin borrowing.

Reuse: existing first-chat resolver, typed native history and session receipts, document session-context, opaque transport and lifetime controller, durable document journal. No new auth, diagnostic, replay or qualification framework. Existing application-specific context association is the owner; standard SDK APIs do not select a Capiro document origin. Reuse installed dependencies; no install/cache reset/service or database operation.

Sources: current standing/handoff, PROCESS6.1/6.2, frontend AGENTS/IMPLEMENTATION-STANDARDS/ARCHITECTURE, Capiro-Meri-Wiring-Closeout-Plan-20261021.md and SUPERSEDED-BY-ITEM-0.md. Bounded relevant tickets and matching E scenarios follow verbatim, with register disposition. MF-02 retains access isolation but removed per-operation authority/renewal mechanisms must not be recreated. MF-14/MM-08/MM-11 are document context/receiver slices, not generation/library redesign.

Real-path prerequisites: current native membership and Core client access, a legitimate saved request/run selected through its existing owner, matching typed contracts, current session and document operation configuration. A connection is not a generation/publication receipt. The existing native first-chat create-or-reuse can create a Core conversation; do not call the full Connect chain effect-free. Exact-run issuance now avoids implicit successor selection, but a fresh/unstarted conversation has no saved run.

Tests run at brief creation: none. Plan only necessary causal local regressions, base-versus-head proof and meaningful mutants for new executable tests; record original failures honestly. No new test if no executable change and no useful discriminating reproduction; mutation N/A in that case. Reuse accepted PR157 79 tests/4 killed mutants/type/lint as evidence for unchanged earlier repair, not proof of this live failure. Retained earlier Meri stale fixture failures remain explicit; no broad rerun without cause.

NOT RUN/owners: authenticated browser, fresh HTTP/log queries, DB/cloud/model, additional Connect/create/retry, document generation and six-format/native-open acceptance, build/scan/deploy. Stable Acceptance window and images stay fixed. Root/Acceptance/Release own subsequent authorized qualification. Source inspection/local synthetic tests alone cannot close D1.

Definition of done: concrete diagnosis or bounded minimal fix; exact base/head/tree/files, commands/UTC/counts/exits, base comparison, mutants and deletion evidence; no weakened tests or dead instrumentation. Draft PR only if code warrants one; commit AND push the reviewable brief/change, send exact head to Root for independent review. No merge/deploy. In-scope decisions proceed/log; actual scope/security/ownership conflicts go to Root. No new user permission flow for already allocated work. Cleanup only task-created disposable resources; preserve evidence, shared worktrees/caches/services.


## Verbatim ticket slices

#### MF-02 — Qualify identity, exact-run renewal and access-loss isolation (P0 before live activation)
> **[RE-SCOPED 2026-10-23]** A revoked user still loses access within 30 s. Use the ordinary Clerk session refresh plus one Core access check per turn; there is no "exact-run renewal". Ignore any instruction below that names the owner/proxy pair, budget reservation, per-operation authority, the task verifier, ECS task proofs, revision pins or the temporal-issuer. See `SUPERSEDED-BY-ITEM-0.md`.

- **Root cause / evidence:** Fresh token issuance and 45-second renewal already exist. Source presence does not prove backend bearer lifetime, account mapping, deployment origin or revocation behavior.
- **Bounded files/owner:** `identity-token.server.ts`, `opaque-session-controller.ts`, `session-bootstrap.ts`, `host-controller.ts`, `useConversationConnection.ts`, `SelectedClient.tsx`, shared query scope and their tests. Fix only demonstrated gaps.
- **Implementation:** Build composed acceptance scenarios for verified native actor, tenant/client switch, archived/deleted client, signout, revoked membership, token expiry while streaming and while mutation pending, multiple renewal cycles, browser back/forward, StrictMode/remount. On exact-lifetime loss abort readers, hide actor/client-bound data and invalidate sensitive cached views without auto-canceling backend work. Reissue using fresh identity for exact existing selectors; never allocate next turn on reconnect.
- **Dependencies / exclusions:** MR session-owner expiry/error taxonomy and environment operator qualification. No browser tenant/actor override, persistent bearer storage, weakened issuer/audience or synthetic client.
- **Acceptance:** At least two real renewal cycles preserve run ID and accepted cursor, no duplicate submit/next-turn; stale account/client DOM is hidden immediately, denied data not resurrected by cached pages; explicit retry cannot mint broader authority; native subject-to-actor mismatch fails closed.

#### MF-14 — Finish artifact library/detail consumers under WS-23/24 (P1)

- **Root cause / evidence:** Live artifact inspector is not file library: known-version input, event-derived versions and last10 local views; rich editor/previews/history/share remain fixtures. Merged PR115 adds all-format read receiver only; this reception is complete on current main.
- **Bounded files/owner:** Canonical WS-23/24 files plus `ConversationArtifacts.tsx`, `files/DocumentVersionPanel.tsx`, `MeriFilesWorkflow.tsx`, new read-only file detail/library views and route helpers. MM owns backend render/custody contracts.
- **Implementation:** Do not reimplement merged PR115 document-access0.1.0; qualify the received reader, then build authorized durable list/version index and deep links with typed source/provenance/status. Render only supported safe preview results; preserve signed-link redemption/hash validation, revoke object URLs and clear bytes on lifetime change. Add compare/revision/history UI only with exact-version contract. Keep edit/share/comments/rename/delete disabled until canonical owners provide semantics; do not fake save via local state.
- **Dependencies / exclusions:** WS-23 received-reader qualification, WS-24 file workspace, MM renderer/PDF/PPTX/ZIP/filing custody, MR writer authority. This ticket is consumer slice, not new duplicate file service.
- **Acceptance:** All six formats correctly discriminate supported preview/download/unsupported; exact bytes/hash checked; link expiry/revocation/cross-client substitution fail closed. Reload/another tab sees durable versions, not local10 list; missing renderer never claims native preview or successful edit.

#### MM-08 — Receive and qualify the existing artifact runtime composition (P1; main source gap / PR receiver)

Evidence: [main CLI M L55–70](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/runtime/cli.mjs#L55-L70), [receiver CLI M197 L55–71](https://github.com/neo-capiro/meri-greenfield/blob/cf634d4f70376c12ee6dd7b97ec22981dbd4cb2a/apps/runtime/cli.mjs#L55-L71), [M197 operation set L39–43](https://github.com/neo-capiro/meri-greenfield/blob/cf634d4f70376c12ee6dd7b97ec22981dbd4cb2a/apps/runtime/artifacts/run-options.mjs#L39-L43), [M197 intent preparers L28–95](https://github.com/neo-capiro/meri-greenfield/blob/cf634d4f70376c12ee6dd7b97ec22981dbd4cb2a/apps/runtime/artifacts/intent-preparers.mjs#L28-L95).

Root cause: Main calls composeDocumentsFamily without authorityPorts, leaving the ordinary configured store-only family. PR197 supplies Core current authority, native credential relay, four operation descriptors and derived per-call sessions for document/ZIP intents.

Work: Review the exact current M197 successor under the MX-02 source-reception ticket, preserving its received candidate11 changes. Verify authority.bind, run register/release, exact selected-client/native credential correlation, source/intent flags and actual executor paths together. Use existing S3/PG publication custody and canonical budget namespace. Compose only supported operations; absence must remain specific unavailable readiness, not globally healthy. Connect typed draft receipt into the existing event/history owner; general output is not a task approval.

Tests: Missing inputs yield no generator/IO; cross client/tenant/run, session switch/revoke, invalid grant, budget exhaustion, unknown create/commit, replay, terminal retirement and cleanup; PPTX/ZIP real bytes with exact SHA. Dependencies: shared source/image/DB qualification, MM-09/10/18, tools authority. No live claims from PR receipt.

#### MM-11 — Add durable artifact discovery, history and post-run read authority (P1; WS-24 canonical)

Evidence: [run options M L9–28, L89–118](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/runtime/artifacts/run-options.mjs#L9-L28), [registry M L88–103](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/runtime/prepared-run-registry.mjs#L88-L103), [immutable storage M L16–20](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/artifacts/storage/README.md#L16-L20).

Root cause: Version records persist, but no public list/full-history surface exists; ordinary document options rely on a live in-process run tuple released on retirement. Event/local recent versions are not a library or permanent read authority.

Work: Extend existing artifact owner with bounded owner/client/conversation list, detail, immutable version chain, cursor and exact-current-access DTOs. Define fresh read-only admission for a completed run's artifact or rehydrate the existing qualified read owner without reviving write allocation/old credential. Support reload/deep link/renamed title/retained original provenance. Explicitly define whether archive/delete/share/comments are supported; recipients, role/version visibility, revocation and audit receipts require a real contract. Same-actor authenticated download links are not share links. Reuse Portfolio filing links, not a second Files store.

Acceptance: More than ten versions; restart/terminal origin; no read budget reservation; hidden revoked/suppressed artifacts vanish from list and fail direct known-ID access; old scope facts never authorize; tampered cursor; independent current reader cannot rewrite original provenance. Dependencies: MM-07–10/14, UI consumer and WS-24.

## Supersession register dispositions

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

| E27 | Artifact generation and publication | Valid content+version+hash+evidence; publish once; current Files/chat access |
| E28 | Six-format inspect/download | DOCX/TXT/XLSX/PPTX/PDF/ZIP exact receiver/MIME; invalid/expired/foreign references refuse |
| E29 | Preview/export/native open | Real renderer/native-reader opens promised format; formulas/layout/citations correct; ZIP not disguised preview |
| E43 | Mixed versions/frontends/contracts | Explicit version/source refusal or accepted backward compatibility; no silently misparsed approvals/output |
| E45 | Canonical cross-module handoff | Portfolio/Workspace/Settings context preserved with entity IDs; effect appears in receiving module after reload |

Brief assembled UTC: 2026-10-25T19:59:07.5831250Z


## Diagnosis handback — 25 October 2026

Disposition: source-only diagnosis complete; the actual19:49 D1 failure cause remains UNKNOWN. No new production defect has been isolated from the saved evidence, so no backend/session correction is proposed or made. This does not close D1 acceptance. Shared lifecycle, proxy, native credentials, identity, contracts and deployed images remain unchanged.

The earlier fix is present by exact file comparison: MeriFilesHost.tsx, session-context.ts and meri-files-session.test.ts have zero diff from accepted PR157 d7db026 to a5bd5336. Original d7db026 is not a literal Git ancestor because the integrated correction has a different commit identity (aefe8db6); content equivalence, not ancestry, establishes inclusion. Deployed1dfd and basea5bd have no application/client source difference.

Observed boundary remains unspecified. The corrective ledger entry is correctiveAllocation.document: Connect19:49:46.127Z, recorded19:50:09.155Z, unverified context, creates0/model calls0/reconnects0, accepted binding NOT ESTABLISHED, raw HTTP status/code NOT CAPTURED. Historical nativeDocuments16:49 entry is not this attempt. Neither missing binding nor generic failure proves that the conversation was empty, expired or denied.

Source-proven selection behavior:
- Files uses window.sessionStorage (MeriFilesHost111) and resolveFirstChatConversation225. The first-chat record is keyed by account/client; no record allocates a fresh request identity (first-chat-intent115-128). Core bootstrap replays by tenant/actor/requestId; a fresh request creates a Core conversation plus its receipt (Core apps/api/src/meri/meri-conversation-bootstrap.ts59-110). It does not search for an unrelated saved conversation.
- Before opaque issuance, documentSessionContext reads the exact native transcript and refuses pending/cancelled/foreign context. The actual Meri history store refuses an absent owned conversation with CONVERSATION_NOT_FOUND and a valid registered zero-run conversation with NOT_FOUND; both map to404. Thus the initial Files Connect can create a Core context but cannot turn it into a saved document run.
- For an existing confirmed first-chat intent with an admitted saved run, the same code pins the run, validates the opaque receipt and reads session-bound history before exposing the document workflow. The lifetime owner maps any non-aborted initial issuance failure to unavailable; expiry after readiness maps to expired. The observed text is insufficient to locate the initial failure among identity/Core/native transcript/opaque issuance/history/receipt validation.
- Routines expiry and Actions uncertainty/clearing are separate findings. No common session failure or TTL cause is proved for D1. Native Recent list unavailability in saved S1 evidence is an adjacent observation, not causal attribution.

Product contract and normal entry:
- WS-24 describes typed create/revise; WS-23 preserves the narrower writer contract; E27 preserves valid content/version/hash/evidence and current Files/chat access. Neither says opening a fresh Files tab admits a chat run. The public document-application schema exposes deliveryId plus typed document content, not a chat prompt or run-admission operation.
- Current Meri apps/runtime/artifacts/core-authority.mjs93-99 explicitly reads the session's saved run and refuses absent/cancelled/mismatched run or scopes. Typed new document content is self-contained; earlier chat prompt/evidence/assets are not adopted. The frontend additionally requires an accepted saved request/history. Do not weaken these checks to make a cold tab connect.
- The existing normal supplier is the current client conversation at /meri with clientId and without an explicit conversationId in the SAME tab. MeriConversationHost110-119 and182-199 resolve the same first-chat intent/storage. An explicit legitimate user Send reaches the existing native initial-input acceptance owner; Meri conversations/service.mjs94-119 writes the accepted run/request through originalPorts.accept or nextRuns.accept. Same-tab Files navigation preserves client with scopedHref, then resolves that same first-chat intent. This is source expectation, not live verification or authorization to consume a model slot.
- Opening an arbitrary Recent conversation with a conversationId bypasses first-chat resolution and does not replace its stored intent; Files accepts no conversation selector. It is not a verified document-origin handoff. No General/other-client/C3 borrowing, automatically selected history, new bootstrap or model invocation is recommended.

Separate presentation gap, identified only: existing Files guidance says a currently admitted document context is required but does not explain the saved-request prerequisite. A minimal truthful static explanation would be: "Document creation requires a saved request in this tab's current client conversation. Connect checks that context; it does not start a request." An optional same-tab "Open client conversation" link can use existing scopedHref('/meri',clientId), without sending anything. It must not assert that a generic denial/404 means no saved request. This is guidance, not a repair or attribution of the unknown live failure; no product copy/link was changed in this diagnosis.

Qualification performed20:01UTC (local synthetic data only):
1. npm run test --workspace @capiro/web -- tests/d1-context-diagnostic.test.ts,20:01:39.662–20:01:45UTC,exit0,2/2PASS. Actual unchanged FE bootstrap, typed receivers and SessionLifetimeController; synthetic Core replay ledger and HTTP responses. Empty-tab case creates one synthetic Core context, then native404 produces initial unavailable, expirationReason undefined and no port/session/history/document/model call. Same account/client with confirmed saved intent reaches ready with exact run, no synthetic new Core context. This demonstrates a possible boundary and successful comparator, not live-cause evidence or actual Core/DB integration.
2. node work/d1-history-store-repro.mjs,20:01:55.414UTC,exit0,2 asserted cases PASS against actual deployed Meri09e89 history store with injected synthetic SQL rows. Core-only context: CONVERSATION_NOT_FOUND after1 synthetic read; registered zero-run context: NOT_FOUND after2. Real DB/model/cloud calls0. First authoring attempt failed because the harness read error.code instead of the canonical productFailure branded receiver; corrected the harness and retained both logs. No product assertion was weakened.
3. PR157 production/test content comparison: zero diff. Live1dfd versus basea5bd application/client comparison: exit0. Prior79 tests/four mutants/type/lint are reused only for the unchanged earlier fix, not rerun or claimed as current live evidence.

Versions actually observed: Node24.22.1, npm11.19.1, Vitest4.1.11. Reused existing dependency cache; the three imported conversation client source files match cached package source exactly. No dependency installation, lock/config or service change.

Tests NOT RUN: authenticated connection/live diagnosis, real Core/PG/native admission, D1 generation/publication/uncertainty recovery, renderer/native Office opening, access-revocation integration, full suite/typecheck/build/scan/deployment. No application source changed, so none is presented as a required new-code gate. Retained earlier Meri fixture failures remain as previously reported. New persistent executable tests0; mutation N/A because this is a diagnosis/documentation change, not a new regression or fix. Two temporary diagnostic assertions and two backend cases test existing behavior; they are retained in task scratch and not added to product suites.

Deletion/cleanup: no production identifiers or resources replaced. The temporary apps/web/tests/d1-context-diagnostic.test.ts was copied into task-owned work evidence and removed from the isolated checkout; no instrumentation remains. No processes/containers/cloud/database resources were started. Preserve worktree, dependency junction, earlier evidence and shared environment.

Next evidence needed, not performed or allocated here: identify which of the existing chain's crossings failed, its HTTP status/allowlisted error code, and whether the exact first-chat intent selected the legitimate D1 saved request. Root coordinates existing Acceptance/Release owners after the stable window. Keep identities/credentials private; booleans or a private ledger reference suffice. If that evidence is unavailable, retain UNKNOWN; no blind retry or diagnostic framework follows. Primary/Supporting review is required for any later code fix, not implied by this author handback.

Evidence: task work/d1-context-diagnostic.test.ts, d1-context-repro-cases.txt, d1-context-repro.log, d1-history-store-repro.mjs, d1-history-store-repro.log (initial harness failure), d1-history-store-repro-final.log. No customer-linked identifiers or credentials copied into shared report. Root received the initial trace, reproduction result and exact product-prerequisite/navigation findings.


## Additional verbatim product-contract ticket references

#### WS-23 — Receive current all-format artifact access correctly (P1, open-PR supplemental)

**Evidence/root cause:** Main [artifact access][ws-meri-access]/[transport][ws-meri-transport] consumes frozen document-application read shapes for docx/txt/xlsx. Actual PR115 head switches inspect/download to public document-access-application 0.1.0 (donor provenance Meri PR192, already received by current Meri PR197 at `cf634d4f70376c12ee6dd7b97ec22981dbd4cb2a`) and supports docx/txt/xlsx/pptx/pdf/zip. Writer remains the narrower contract.

**Bounded work:** Review/receive the existing coordinated frontend PR115 and Meri PR197 changes after current-head checks and public-contract acceptance; do not reimplement the adapter, merge historical donor94, or separately merge donor192. Pin the generated public artifact provenance/hash/version, verify byte equivalence at the chosen PR197 receiver, and qualify that receiver’s actual runtime mounting/configuration against the matching read application. Keep create/revise on the existing write contract and preserve unknown/runtime-held states. Inspect/download is not native rendered preview or successful creation qualification.

**Acceptance:** All six formats, old3 compatibility, wrong version/client/session, bad SHA/size/MIME, expired link, unavailable nativeOpen/render/recalc flags remain unavailable, and no new write operations enabled. Check PR head changed files, not stale body prose. Production remains unqualified until separately evidenced.

#### WS-24 — Meri file workspace/upload/preview/history consumer boundary (P1 missing consumers; intentional holds)

**Evidence/root cause:** [Meri Files][ws-meri-files] creates/revises typed documents, shows recent local versions or a known ID, and verifies inspect/download; no published workspace-wide artifact list, upload/extraction, file-to-client, share or full history consumer. [Preview implementation][ws-meri-preview-owner]/[runtime][ws-meri-runtime] already supports publish/read via qualified renderer/custody with session/retention checks. Those private/opt-in owners are not automatically a public frontend contract. Fixture save/share/comment sheets are not production handlers.

**Bounded work:** Inventory current public contract gaps per action; extend the Meri public application surface only for list/history/preview/upload/file/share actually approved for product. Reuse immutable artifact storage, retention, signed downloads, existing preview renderer/custody and exact-parent revisions. Expose explicit preview publication (a write) separately from read. Upload/extraction requires scoped storage/object ownership, allowlisted MIME/limits, scanning/extraction receipt and provenance before use as evidence. No browser-supplied tenant grants or fake conversion. Graduate fixture controls only after these contracts; otherwise keep clearly unavailable.

**Acceptance:** Retention suppressed/revoked artifacts disappear from list and fail direct history/preview/download; preview source digest matches exact version; renderer unavailable/unsupported TXT honest; read never reserves generation budget; upload cannot cross client or become trusted model instruction; no local dialog suggests durable save/share. Broader PDF/PPTX generation requires its own qualified owner, not merely a read-format expansion.
