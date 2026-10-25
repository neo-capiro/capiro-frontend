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

# D1 corrective document context diagnosis — PROCESS6.1
FROM: Root | TO: Portfolio | TYPE: brief | RE: second D1 connection failure (Wave 2)

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
