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


# D1 document connection repair — PROCESS6.1
FROM: Root | TO: Portfolio implementation owner | TYPE: brief | RE: Wave 2 D1 connection

Standing source: Meri docs c0411e2cd20c35b3a8619817a4fec25ef7047aba, including the 25 October provenance correction. Numbered engineering rules retain their current force; a document label is not independent human approval of new scope. Full Claude Agent SDK harness, Runtime V1, direct Bedrock, Core tools, tenant isolation and durable user/firm memory remain.

Exact bases: frontend dc53633f0b8c4de6432f3840e4fc79ac2ffeb02a (tree 114b64fb063f38bd46c9c57b6db57b2943fd223e), Meri 7eee7f7c358be9ae903169816ef68eb6e64ae1f3 (tree a87135487d6c48d579b3fdfc3845e975b1d56567). Preserve both frozen batch checkouts. Frontend successor codex/wave2-d1-document-connection-20261025 in C:/dev/wave2-d1-document-connection-20261025. No Meri branch until a Meri edit is justified.

How we work: Portfolio authors the bounded change at xhigh; separate xhigh reviewer reviews the exact head. Root orchestrates; Release alone owns AWS, migration, rollout and rollback. Draft PR only, no merge, no issue 202 post, no live browser/model/effect/cloud mutation. D1 stays unused until corrective release and explicit finite acceptance. Do not substitute an unrelated, cancelled or unstarted run as artifact origin.

Observed failure: Acceptance's one Connect document service at 2026-10-25 16:49:06.598 UTC returned “The current document context could not be verified.” Final batch at 16:51:10.405 UTC: zero document creates, zero D1 model calls/effects, D1 slot unconsumed. The real HTTP stage/status was not captured. Existing flags/routes have been compared; do not repeat that inventory. Sources: Acceptance acceptance-status.txt, wave2-live-acceptance-matrix.txt, acceptance-checklist.txt; Integration WAVE2-BOUNDARY-REPAIR-BRIEF.txt. No source-only test closes live acceptance.

Ownership: MeriFilesHost.tsx, a cohesive existing/new document session helper under apps/web/src/shared/meri-documents only if needed, and apps/web/tests/meri-files-session.test.ts plus a narrowly named document connection regression test. The existing document/artifact session producer/receiver is allocated if a real mismatch requires repair. Shared action/session/proxy, conversation identity/next-run factories, contract distribution or lockfile changes require a named overlap exception before editing. Integration owns Actions/Routines; Settings memory; Hermes read-context/native-read-context/tool-dispatch; Runtime diagnostics; polling lane conversation events; Release infrastructure. No generation redesign, token owner, framework, speculative config or schema change.

Initial trace (source counterexample, not attribution of live failure): Files resolves first-chat context, issues an opaque session with conversation/client but no runId, then requires saved run history. Meri nextRunOwner.selectRun reserves a successor after a completed latest run when no exact runId is supplied. That new reservation has no saved request. A fresh tab can instead resolve an unstarted conversation. Reproduce before selecting repair; keep unknown live-stage evidence explicit. Core remains canonical for current account/client/wall and conversation access, and Meri remains canonical for run identity/eligibility.

Reuse: existing typed history/session/document receivers, current access owners, opaque session transport, SessionLifetimeController and durable journals. No SDK or standard library supplies the application-specific association between this Files view and its admitted saved run; use the existing public contracts for that association. No arbitrary fallback to another conversation/run and no browser authority.

Qualification plan: reproduce completed-run selection crossing on the unchanged deployed sources using synthetic local journals; exercise positive existing-run connection and negative missing/cancelled/foreign/stale/expired/aborted/unknown outcomes; prove connect never creates a document, dispatches a model or silently reserves a new turn after the correction. Run only the document session tests and directly affected typed receiver/type/lint checks. Every new executable regression must fail on the original behavior and kill a meaningful altered behavior. Preserve base failures, report any test limitations. No real PG/SDK/model/provider/cloud effects in this lane.

Tests run at brief creation: none. Tests not run: targeted tests, type/lint checks, mutation checks, browser/real authenticated connection, publication/UNKNOWN recovery, six-format inspect/download/hash/length/MIME/filename/native open, real revocation, build/scan/deploy. Live acceptance is owned by Acceptance after Root/Release handoff. Mutants: planned exact-run omission, wrong context acceptance and pending/unstarted run acceptance where applicable. Deletion: remove replaced implicit session selection and any helper made unused in the final change; search active callers; retain historical evidence; no applied migration changes. If diagnosis alone yields no code, explicitly report no executable tests and mutation N/A.

Definition of done: commit and push brief plus bounded source; draft PR with exact base/head/tree/files and UTC commands/counts/exits; base-vs-head result; mutants killed; deletion search; preserved failures; tests NOT RUN and their owners. Independent exact-head review before release. In-scope choices proceed and are logged; actual scope/security decisions go to Neo via root. Owned scratch/processes are cleaned; shared caches, worktrees and local services remain.

## Verbatim retained tickets (this phase is only their D1 connection slice)
<a id="mf-02"></a>
#### MF-02 — Qualify identity, exact-run renewal and access-loss isolation (P0 before live activation)
> **[RE-SCOPED 2026-10-23]** A revoked user still loses access within 30 s. Use the ordinary Clerk session refresh plus one Core access check per turn; there is no "exact-run renewal". Ignore any instruction below that names the owner/proxy pair, budget reservation, per-operation authority, the task verifier, ECS task proofs, revision pins or the temporal-issuer. See `SUPERSEDED-BY-ITEM-0.md`.

- **Root cause / evidence:** Fresh token issuance and 45-second renewal already exist. Source presence does not prove backend bearer lifetime, account mapping, deployment origin or revocation behavior.
- **Bounded files/owner:** `identity-token.server.ts`, `opaque-session-controller.ts`, `session-bootstrap.ts`, `host-controller.ts`, `useConversationConnection.ts`, `SelectedClient.tsx`, shared query scope and their tests. Fix only demonstrated gaps.
- **Implementation:** Build composed acceptance scenarios for verified native actor, tenant/client switch, archived/deleted client, signout, revoked membership, token expiry while streaming and while mutation pending, multiple renewal cycles, browser back/forward, StrictMode/remount. On exact-lifetime loss abort readers, hide actor/client-bound data and invalidate sensitive cached views without auto-canceling backend work. Reissue using fresh identity for exact existing selectors; never allocate next turn on reconnect.
- **Dependencies / exclusions:** MR session-owner expiry/error taxonomy and environment operator qualification. No browser tenant/actor override, persistent bearer storage, weakened issuer/audience or synthetic client.
- **Acceptance:** At least two real renewal cycles preserve run ID and accepted cursor, no duplicate submit/next-turn; stale account/client DOM is hidden immediately, denied data not resurrected by cached pages; explicit retry cannot mint broader authority; native subject-to-actor mismatch fails closed.


<a id="mf-14"></a>
#### MF-14 — Finish artifact library/detail consumers under WS-23/24 (P1)

- **Root cause / evidence:** Live artifact inspector is not file library: known-version input, event-derived versions and last10 local views; rich editor/previews/history/share remain fixtures. Merged PR115 adds all-format read receiver only; this reception is complete on current main.
- **Bounded files/owner:** Canonical WS-23/24 files plus `ConversationArtifacts.tsx`, `files/DocumentVersionPanel.tsx`, `MeriFilesWorkflow.tsx`, new read-only file detail/library views and route helpers. MM owns backend render/custody contracts.
- **Implementation:** Do not reimplement merged PR115 document-access0.1.0; qualify the received reader, then build authorized durable list/version index and deep links with typed source/provenance/status. Render only supported safe preview results; preserve signed-link redemption/hash validation, revoke object URLs and clear bytes on lifetime change. Add compare/revision/history UI only with exact-version contract. Keep edit/share/comments/rename/delete disabled until canonical owners provide semantics; do not fake save via local state.
- **Dependencies / exclusions:** WS-23 received-reader qualification, WS-24 file workspace, MM renderer/PDF/PPTX/ZIP/filing custody, MR writer authority. This ticket is consumer slice, not new duplicate file service.
- **Acceptance:** All six formats correctly discriminate supported preview/download/unsupported; exact bytes/hash checked; link expiry/revocation/cross-client substitution fail closed. Reload/another tab sees durable versions, not local10 list; missing renderer never claims native preview or successful edit.


<a id="mm-08"></a>
#### MM-08 — Receive and qualify the existing artifact runtime composition (P1; main source gap / PR receiver)

Evidence: [main CLI M L55–70](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/runtime/cli.mjs#L55-L70), [receiver CLI M197 L55–71](https://github.com/neo-capiro/meri-greenfield/blob/cf634d4f70376c12ee6dd7b97ec22981dbd4cb2a/apps/runtime/cli.mjs#L55-L71), [M197 operation set L39–43](https://github.com/neo-capiro/meri-greenfield/blob/cf634d4f70376c12ee6dd7b97ec22981dbd4cb2a/apps/runtime/artifacts/run-options.mjs#L39-L43), [M197 intent preparers L28–95](https://github.com/neo-capiro/meri-greenfield/blob/cf634d4f70376c12ee6dd7b97ec22981dbd4cb2a/apps/runtime/artifacts/intent-preparers.mjs#L28-L95).

Root cause: Main calls composeDocumentsFamily without authorityPorts, leaving the ordinary configured store-only family. PR197 supplies Core current authority, native credential relay, four operation descriptors and derived per-call sessions for document/ZIP intents.

Work: Review the exact current M197 successor under the MX-02 source-reception ticket, preserving its received candidate11 changes. Verify authority.bind, run register/release, exact selected-client/native credential correlation, source/intent flags and actual executor paths together. Use existing S3/PG publication custody and canonical budget namespace. Compose only supported operations; absence must remain specific unavailable readiness, not globally healthy. Connect typed draft receipt into the existing event/history owner; general output is not a task approval.

Tests: Missing inputs yield no generator/IO; cross client/tenant/run, session switch/revoke, invalid grant, budget exhaustion, unknown create/commit, replay, terminal retirement and cleanup; PPTX/ZIP real bytes with exact SHA. Dependencies: shared source/image/DB qualification, MM-09/10/18, tools authority. No live claims from PR receipt.


<a id="mm-11"></a>
#### MM-11 — Add durable artifact discovery, history and post-run read authority (P1; WS-24 canonical)

Evidence: [run options M L9–28, L89–118](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/runtime/artifacts/run-options.mjs#L9-L28), [registry M L88–103](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/runtime/prepared-run-registry.mjs#L88-L103), [immutable storage M L16–20](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/artifacts/storage/README.md#L16-L20).

Root cause: Version records persist, but no public list/full-history surface exists; ordinary document options rely on a live in-process run tuple released on retirement. Event/local recent versions are not a library or permanent read authority.

Work: Extend existing artifact owner with bounded owner/client/conversation list, detail, immutable version chain, cursor and exact-current-access DTOs. Define fresh read-only admission for a completed run's artifact or rehydrate the existing qualified read owner without reviving write allocation/old credential. Support reload/deep link/renamed title/retained original provenance. Explicitly define whether archive/delete/share/comments are supported; recipients, role/version visibility, revocation and audit receipts require a real contract. Same-actor authenticated download links are not share links. Reuse Portfolio filing links, not a second Files store.

Acceptance: More than ten versions; restart/terminal origin; no read budget reservation; hidden revoked/suppressed artifacts vanish from list and fail direct known-ID access; old scope facts never authorize; tampered cursor; independent current reader cannot rewrite original provenance. Dependencies: MM-07–10/14, UI consumer and WS-24.


## Verbatim supersession register B1/B2
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


## Verbatim matching E scenarios
| E27 | Artifact generation and publication | Valid content+version+hash+evidence; publish once; current Files/chat access |
| E28 | Six-format inspect/download | DOCX/TXT/XLSX/PPTX/PDF/ZIP exact receiver/MIME; invalid/expired/foreign references refuse |
| E29 | Preview/export/native open | Real renderer/native-reader opens promised format; formulas/layout/citations correct; ZIP not disguised preview |
| E43 | Mixed versions/frontends/contracts | Explicit version/source refusal or accepted backward compatibility; no silently misparsed approvals/output |
| E45 | Canonical cross-module handoff | Portfolio/Workspace/Settings context preserved with entity IDs; effect appears in receiving module after reload |

Brief assembled UTC: 2026-10-25T17:31:48.7631544Z


## Implementation handback — 25 October 2026

Correction: MeriFilesHost obtains the same resolved conversation's native typed transcript before opaque issuance. The new cohesive session-context helper correlates account/client/conversation, refuses pending or cancelled context, and supplies its exact saved runId to the existing session receiver. The subsequent session-bound history receiver remains in place to catch changed bindings, cancellation, expiry and access loss. No shared wiring, Meri code, contracts, schema, flags or dependency changes.

The original first-chat create-or-reuse remains unchanged: a new/unstarted conversation still cannot pass document connection. This repair is not arbitrary cross-tab discovery or a fallback to another saved conversation. Connect must not be called a side-effect-free inspection of the entire first-chat path; this change specifically prevents implicit next-run selection by the session request. The original acceptance HTTP failure stage remains UNKNOWN. No new live diagnostic click occurred, and D1 remains unconsumed.

Origin boundary: deployed Meri apps/runtime/artifacts/core-authority.mjs canonicalRun reads the exact saved binding/scopes and rejects cancelled runs. Typed document content is self-contained in the new request; no old chat prompt, evidence or assets is adopted. Core checks the operation and request SHA at admission/effect/release. Existing frontend DocumentWorkflow.create captures the actual content in a fresh deliveryId/request, and receipt adoption checks tenant/actor/conversation/run/version identity. A connected context is not a document result, publication receipt, new model run or D1 origin claim. All generation behavior stays unchanged; live D1 needs its own legitimate request and provenance.

Design review note: document eligibility is kept in one 35-line domain helper. The existing bootstrap still owns the sequential identity/session/history transaction; its additional call does not introduce a second policy or generation owner. The Files route does not gain a transcript UI or a new service. No shared ownership exception needed.

Verification (all local synthetic data, Node24.22.1; Vitest4.1.11, TypeScript5.9.3, ESLint9.39.2, Prettier3.8.1):
- Deployed Meri selector reproduction: actual createNextRunOwner with a synthetic journal; completed source plus exact runId => no reservation; omitted runId => one new successor, no accepted request. PASS. This is a concrete source counterexample, not PostgreSQL or live-failure attribution. Scratch log d1-selection-repro.log.
- First attempted older recovery-fixture reproduction failed SDK_SESSION_DEADLINE because the fixture uses historical expiry. Preserved diagnostic; no product check claimed from it. Replaced the scratch harness with the minimal actual-selector/synthetic-journal reproduction above, not a weakened product test.
- Untouched frontend base: npm run test --workspace @capiro/web -- tests/meri-files-session.test.ts, 17:36:14 UTC, exit0,20/20PASS.
- New session suite on original MeriFilesHost source: same command,17:37:59–17:38:02 UTC,exit1,22FAIL/13PASS. Head source restored byte-for-byte. Several failures also reflect the newly required transcript crossing; the explicit completed-run and changed-run tests demonstrate the behavioral defect.
- Head: npm run test --workspace @capiro/web -- tests/meri-files-session.test.ts tests/meri-document-adapter.test.ts,17:39:03 UTC,exit0,79/79PASS (35 session,44 existing adapter). Existing adapter coverage retains new-content capture, foreign binding rejection and uncertain-write fences. Session count20→35 (+15); no tests deleted.
- Four session-context mutants,17:38:13–17:38:29 UTC: omit runId4FAIL/31PASS; skip account/client correlation3FAIL/32PASS; admit pending successor1FAIL/34PASS; admit cancelled transcript1FAIL/34PASS. Each killed, exact helper bytes restored; final79PASS run follows restoration.
- node node_modules/typescript/bin/tsc --noEmit --incremental false -p apps/web/tsconfig.json: exit0, no diagnostics, started17:36:28 UTC and completion observed before17:37:59 UTC.
- Touched ESLint and Prettier checks: exit0. Initial ESLint invocation at repository root lacked the app config; corrected invocation from apps/web passed. Initial updated test fixture treated byte-array request as a string (8FAIL/13PASS); corrected fixture reads BodyInit via Response.json, then35PASS. These are retained authoring failures, not base defects.
- git diff --check: PASS.

Retained base failure: node --test --test-concurrency=1 apps/runtime/artifacts/test/core-authority.test.mjs on untouched deployed Meri7eee,17:39UTC,exit1,2PASS/6FAIL. Four tests still supply the removed authorityPorts credential shape (ARTIFACT_AUTHORITY_CONFIGURATION); another expects old runOptions.authorityPorts readiness; composition supplies an obsolete argument (INVALID_COMMAND). The configuration-only document-owners test is not a replacement for these integration assertions. No Meri file was changed or failing assertion weakened. Root receives this evidence; backend composition qualification remains an explicit gap for its existing owner, not a claimed pass. Log d1-meri-contract-tests.log.

Deletion proof: the unpinned {conversationId,clientId} session request in MeriFilesHost was replaced; no active unpinned call remains in that host. The new helper has one production caller. Existing typed receivers and all generation code remain used. No config/resource deletion or migration applies; historical rules/evidence remain. No dead temporary production instrumentation was added.

Environment: reused the already installed exact frontend dependency cache via a task-worktree junction; no install, package/lock change, cache reset, WSL/service/database change. Donor and frozen checkouts remain intact. Mutant files restored. Scratch logs are retained evidence; no server, container, cloud resource or model process was started.

NOT RUN: authenticated browser connection and observed-failure attribution; D1 generation/publication/recovery and legitimate-origin acceptance; full six-format/native-open acceptance; real PostgreSQL/Core/object store/renderer/model; build/scan/deployment. Root/Release/Acceptance own those subsequent steps. This is a draft source repair awaiting independent exact-head review, not a Wave2/D1 pass. No new architecture or scope authorization is claimed.
