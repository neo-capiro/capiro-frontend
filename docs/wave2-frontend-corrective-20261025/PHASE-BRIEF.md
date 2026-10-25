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

FROM: Root | TO: Integration | TYPE: PROCESS6.1 | RE: Wave2 accepted frontend corrective composition

Repository neo-capiro/capiro-frontend; branch codex/wave2-frontend-corrective-20261025; isolated worktree C:/dev/wave2-frontend-corrective-20261025. Exact base PR156 a05af12f8520a828959bec23a83391dface74d73/tree86e8c8c4ba3b25278f5407eb987596292d4b3356. No product adoption or registry edit before this brief. Standing c0411e2cd20c35b3a8619817a4fec25ef7047aba and instruction/engineering provenance loaded; current rules1-4 retained verbatim above.

How we work: Root Ultra orchestrates; Integration authors/adopts at configured xhigh; Primary and Tenant Settings supplied independent exact-source reviews. Release alone owns one final image build, AWS/migrations/rollout/rollback. Draft PR, commit and push; no main merge/deploy before Root's gate. In-scope composition proceeds without a new permission request. No subagents, live probes, browser/model/provider/effect actions or #202 post. Full Claude SDK harness, RuntimeV1/direct Bedrock, control tool gateway/Core, tenant isolation and durable personal/firm memory remain unchanged.

Accepted inputs, frozen:
- PR1524fa98196d6a7dd9d5d092c15c544ffb5df4273aa/tree48a5a63283d3f75e6a8151234a2ac499129b7c05: four enrichment fixture files. Primary ACCEPT; already in base ancestry.
- PR154fda3f418295dc53bd56b512fb4436a8e65230394/tree2d0a823132ddeaf079b331432fbec3f80e279ddb: native intents credential correction, regression and complete brief. Primary ACCEPT; already in base ancestry.
- PR1550e97502120aafa6f9aaf0acff54755244195a959/tree942f727f1eb789d63bf932175a575eec83ff2926: personal memory items wire schemaVersion repair, regression and complete brief. Tenant Settings ACCEPT. Adopt the complete delta from fda3 including its pre-code brief commit b6249bc80a34f92b02937a07dcd4cd1fd15df0de.
- PR156a05af12f8520a828959bec23a83391dface74d73/tree86e8c8c4ba3b25278f5407eb987596292d4b3356: routine cold-client/General canonical conversation resolution, retained recovery/lifetime, tests and complete brief. Primary ACCEPT sealed17:52:28UTC; base of this composition.
- PR157d7db026173e19811f088dc4b4a8dbf5d52edabf6/treeb1888ab6e45fb0e55f61c2c6351c05d094aeca3e: document same-conversation saved-run selection, regression and complete brief. Primary ACCEPT. Its base is deployed FE151dc536; adopt only the exact four-path delta, including pre-code brief1dc931a3d889e0c0b7f2fb740f4de1af6e50cedc, preserving152/154/155/156.

Dependency/source references remain Meri7eee7f7c358be9ae903169816ef68eb6e64ae1f3/Core43fdd8928e517b1ce3a7a039f0fabeb8cf5fc5dd for these frontend reviews. Later Core135 is separately owned/reviewed. Deployed FE31dc53633f0b8c4de6432f3840e4fc79ac2ffeb02a remains unchanged. W3 library metadata is explicitly excluded/future work; no latest-branch substitution.

Single-writer ownership and method

Integration owns this combined branch and frontend cohesion-review metadata for this Wave2 composition. Approved function records belong to scripts/architecture/reviewed-size-findings.json, the existing scanner's canonical function registry. Root's architecture-size-reviews.json allocation also includes that existing function-registry owner; docs/architecture-size-reviews.json is the older module-hash registry and is not edited unless a matching explicit approved module record actually requires it. No new registry or waiver mechanism. Preserve all other authors' worktrees and caches.

Adopt accepted source/test/doc commits unchanged; verify complete Git blob/mode equality for each input's delta and preserve all other entries. No overlaps exist among155/156/157 production paths. Adopt Tenant Settings' exact two155 records from personal-memory-pr155-size-review.json. For156, Primary explicitly authorizes exact changed production fingerprints for Connected and its nested issue callback as one cohesive wiring/lifetime owner; derive those fingerprints with the unchanged existing scanner and record Primary's exact-source cohesion verdict. PR157 helper is32nonblank lines/one caller; retain unchanged existing function reviews where bytes match. Do not invent a waiver, broaden approval or refactor to trim line counts. If a newly changed signal lacks independent coverage, report that concrete signal to its existing reviewer before adoption.

Implementation responsibilities remain existing domain owners: Core current authority; native token and opaque session transports; first-chat conversation receiving; routine recovery; memory strict projection; document transcript/history/session receiving. This composition adds no product behavior, DTO, transport, provider, policy, dependency, lockfile, flag or shared lifecycle abstraction. Temporary diagnostics are not added. Replaced callback/unpinned request/opaque intents bearer are already deleted in their accepted source changes; preserve those deletions. No resources or migrations are introduced or removed.

Checks planned at dispatch (NOT RUN here yet)

Verify exact accepted inputs, no source conflict, all accepted changed blobs retained, every other base entry unchanged except adopted paths/approved metadata/this brief. Run the existing architecture guard once on combined source after exact record adoption; retain all size findings and inherited unreviewed status, report any concrete new failure. Run scoped TypeScript across the composed changed production boundaries and affected tests with exact-candidate source aliases using retained Node24 dependencies. Check metadata/source diff whitespace and formatting only where this phase changes bytes. Reuse closed unit/browser/mutant/lint receipts for byte-identical accepted inputs; no duplicate whole-suite/build/browser run. No new executable behavior/test; additional mutation N/A. Existing accepted tests and killed mutants stay attached to their exact identical source.

Reused gates and honest limits

152:14browser+11distinctunitPASS.154:15distinctPASS/two mutants killed/scoped types/lint/formatPASS.155:54affectedPASS/version-drop mutant killed by two consumer cases; scoped gatesPASS.156:38distinctPASS/40executions, two mutants killed/scoped types/lint/formatPASS; initial source/scratch type failures retained.157:79FEcasesPASS/four mutants/full configured web types/touched lint/formatPASS. No summing these into a new executed combined-suite count. Exact review reports and author raw receipts remain in their existing lane outputs/work directories; no duplicated evidence framework.

Historical FE336PASS11FAIL, browser55PASS14old-fixtureFAIL and full-lint CLI exitUNKNOWN remain historical failures;152 resolves the bounded fixtures only. Untouched Meri document-authority2PASS6FAIL remainsFAIL, not live/backend qualification. Actions remainsUNKNOWN after bounded source/log trace: actual issued expiry and local expiry/access-loss reason absent; no lifetime change. Release's exact Control window0matches does not prove absent request/refusal. Routines and D1 fixes are proven source defects but observed HTTP-stage causes remain unproven. Memory deployment/lifecycle configuration remains Root/Release/Tenant Settings-owned. No live Actions/R1/D1/memory/model/effect acceptance, build/scan or deployment is claimed.

Definition of done: exact combined commit/tree/changed paths, accepted blob preservation, approved-record provenance, command/version/UTC/exit results including failures/unrun gates, clean pushed draft and Root/Release handoff. Existing independent source approvals are reused only where exact bytes match. Root nominates the coherent release; Release alone builds it once and conducts remaining release gates. No main merge or rollout action by Integration.

Resources: only own worktree/scratch/evidence and a node_modules junction to the retained qualified Wave2 Windows cache. No install, donor mutation, port/server/container/service/DB/AWS action. Preserve all shared worktrees/caches/services/tabs. Root/Primary notification uses the existing shared Integration STATUS because outgoing chat tools are absent; do not claim a direct send.

Sources of truth: current STANDING-REQUIREMENTS/PROCESS, host/repository/apps/web AGENTS, IMPLEMENTATION-STANDARDS/ARCHITECTURE and accepted complete briefs below; current plans and SUPERSEDED-BY-ITEM-0 apply. Historical held labels do not restore obsolete restrictions; only the already accepted narrow repair slices are adopted. The following bounded ticket and matching acceptance text is copied verbatim from their accepted briefs, without reopening whole-ticket scope.


Accepted PR154 bounded ticket text

#### MF-03 — Clear approval content on authority refusal (P0 before approvals activation)

- **Root cause / evidence:** Paging refusal currently retains existing rows at [`apps/web/src/features/meri/conversation/intents/useIntentList.ts:55–64`](https://github.com/neo-capiro/capiro-frontend/blob/4f9a7e8dcaa9ba03494dc5a49559daf70cea5100/apps/web/src/features/meri/conversation/intents/useIntentList.ts#L55-L64); access adapter classifies errors but has no host access-loss callback.
- **Bounded files/owner:** `conversation/intents/useIntentList.ts`, `useConversationIntents.ts`, `shared/meri-intents/access.ts`, relevant host lifetime boundary; new unit/browser regressions.
- **Implementation:** Classify published authority denials separately from transient unavailable errors. On ACCESS_DENIED/MEMBERSHIP_REVOKED/MEMBERSHIP_CHANGED or expired/revoked session as contract requires, clear sensitive rows, pending confirmation details and related derived caches; signal parent to retire exact session where appropriate. Preserve harmless pagination continuity only for retryable transport/service outages, visibly explain the distinction. Ignore stale completion from prior identity.
- **Dependencies / exclusions:** Use current intents error vocabulary; no blanket error suppression, no local authorization inference, no new backend grants.
- **Acceptance:** Load first page, revoke access, Load More → zero old proposal content/actions; same for refresh/decision denial and identity switch. Transient page failure keeps admitted rows only under still-valid authority and exposes retry. Out-of-order successful old reply cannot restore data.



Accepted PR155 bounded ticket text

#### ST-11 — Finish and qualify PR115 owner-memory slice without conflating it with governance (P1, HELD + CONFIG)

**Evidence.** Current PR115 contains owner inbox/status/decision/version decision/items/corrections and strict server proxies. Its preview source is deliberately null until a compatible Core public wire packet is admitted. Main has only the gated link. [Owner UI][st-pr115-inbox], [proxy][st-pr115-owner-proxy], [preview boundary][st-pr115-owner-route], [source gate][st-pr115-preview-config], [Core owner items][st-owner-core].

**Tasks.** Review current head rather than stale PR body; finish contract/public DTO parity and tests, then separately approve merge. For ordinary mode qualify exact /api Core base and native owner authority. For preview retain two gates and explicit source/target qualification; never make env alone defeat null source. Validate owner candidate list/status, accept/reject, version decision, correction with expectedUpdatedAt, and uncertain-dispatch readback. Preserve activeItemUnchanged/pending correction semantics.

**Tests.** Own vs other owner, tenant switch, status before/after immutable decision, stale version, six-digit timestamp behavior, held/unavailable produces no dispatch, write timeout distinguishes not-dispatched from unknown, correction cannot overwrite active item. Merge, deployment, flag enablement, and live certification are four separate receipts.

#### MM-05 — Complete owner review/correction contracts and exact outcome reconciliation (P1; ST-11 complement)

Evidence: [M producer L71–89, L145–186](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/control/memory/producer.mjs#L71-L89), [Core decision adapter M L1–44](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/control/memory/core-decisions.mjs#L1-L44), [Core owner items C L20–115](https://github.com/neo-capiro/capiro-backend/blob/309af848f1aa403f6c8e54aa0d22990d4230f063/apps/api/src/memory/memory-owner-items.service.ts#L20-L115), [Core version routes C L44–129](https://github.com/neo-capiro/capiro-backend/blob/309af848f1aa403f6c8e54aa0d22990d4230f063/apps/api/src/memory/memory-version.controller.ts#L44-L129).

Work: ST-11 publishes the exact compatible owner wire DTO and receives F115; do not confuse it with Meri's proposal journal. Correlate Meri candidate/hash/review ID to Core scoped publishedMemoryId; preserve clio: versus item: namespaces and different hash domains. Drain review pages even when decided/suppressed rows yield no visible candidates. After timeout, read exact status instead of recreating a proposal or declaring success. Close the known executor seam where definite post-claim Core refusal is flattened into command UNKNOWN without weakening genuinely uncertain outcomes.

Acceptance/tests: Own versus other owner, activeItemUnchanged pending correction, exact microsecond expectedUpdatedAt, stale target/key collision, correction TTL refused, duplicate approve/reject, immutable conflicting outcome, unavailable Core status versus empty inbox, source suppression before/after decision and no new submission from a read. Bound changes to memory producer/adapters/Core owner DTO and generic executor's typed-refusal seam; no alternate review store.

#### MF-17 — Receive memory and preferences through existing canonical projects (P1/P2, coordination only)

- **Root cause / evidence:** PR115 owner-memory held source is not governance; main narrow personal preferences persists but UI consumption incomplete. ST-07–19 already own these gaps.
- **Bounded files/owner:** PR115 memory route/home links and public packet receiver; `MeriPreferencesPanel`, `UserPreferencesHost/Form`; only scoped navigation/lifetime integration here.
- **Implementation:** PR115 source reception is complete. Attach Meri acceptance to ST-11 owner-memory source-packet release; verify exact microsecond revision token and activeItemUnchanged correction semantics from Core/MM. Do not enable null source. For ST-12 apply saved theme/density/timezone deliberately at agreed app boundary after reload. Route remaining preferences to canonical ST13–19 delivery or explicitly unsupported copy, including fake feedback receipt correction.
- **Dependencies / exclusions:** ST-07–11 governance/files/grants/notifications, ST-12–19 settings, MM. No second memory schema/governance center or settings backlog.
- **Acceptance:** Owner memory view only shows current authorized own/wall/governance-eligible items, denied items vanish, changed token conflict reloads without overwriting; preferences persist and intended consumers actually change; notifications/privacy/connectors/help never show false save/send outcomes.



Accepted PR156 bounded ticket text

#### MF-12 — Close legacy action/task-command approval and recovery handoffs (P1)

- **Root cause / evidence:** Ordinary auxiliary hosts prepare and request execution but cannot approve; blocked/indeterminate UI lacks a complete cross-reload readback handoff and forms use manual IDs.
- **Bounded files/owner:** `actions/MeriActionWorkflow.tsx`, `action-workflow-state.ts`, `ProposalPanel.tsx`; task-updates form/state/proposal; adapters/journals only where readback needed; canonical task route helper.
- **Implementation:** Preserve exact reviewed draft/command/hash and attempt identity through navigation/reconnect. Link to correct trusted approval surface where public contract supports it; otherwise give explicit waiting/review owner without fake approve. Add same-request check-recorded-result after unknown, not fresh execute. Link observed task receipt to canonical Workspace task; add authorized task selector/context handoff if schema permits. Distinguish omitted field from clear-date operation and add reset/new workflow only after terminal reconciliation.
- **Dependencies / exclusions:** MT same-owner task.create and task.update grant/executor qualification; WS task detail; MF-03/04 shared decision safety. Mail actions remain ML-05/06, not this task.
- **Acceptance:** Pending approval never executes on UI click alone; reload/drop response cannot create second task/update; identity/client change hides receipt; completed receipt deep-links exact canonical task; unsupported field clearing is disabled or correctly typed, not silently ignored.

#### MF-18 — Decide and implement workflows, routines and browser holders (P2 or explicit launch gate)

- **Root cause / evidence:** Workflow library/setup, browser activity/sign-in/permissions/download, model/skills and routine management are design fixtures, not ordinary consumers.
- **Bounded files/owner:** Only selected `screens/workflows/*`, `screens/browser/*`, `screens/routines/*` adapted into live routes/controllers after product decision; capability registry and sidebar.
- **Implementation:** Produce supported template/action inventory from real MT tool registry and MR runtime capability; choose which designed launchers to ship versus retire. Templates create permission-preserving typed requests with explicit scope and confirmation; do not claim connector authorization. Routine management uses durable owner-scoped schedule reads/mutations and correct timezone/next-fire/history. Browser operations require bounded authorized session/handoff/download receipts and honest manual sign-in holds. Keep unsupported choices disabled with reason.
- **Dependencies / exclusions:** MR routine standalone-owner gate, schedule firing/delivery and browser runtime; MT tool capability/read scopes; MM download custody; ST-14 connectors/ST-16 skills. Do not mount live screens solely because a private backend function exists.
- **Acceptance:** Each shipped launcher maps one-to-one to public allowed operation and durable receipt. Routine edit/pause/cancel survives completed source chat and reload after owner fix; timezone/DST and missed fire shown. Browser stop/sign-in/permission controls invoke only correct owner and cannot expand credentials silently. Unselected designs clearly remain examples.



Accepted PR157 bounded ticket text

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


Matching retained acceptance rows (verbatim)

| E05 | Session expiry and transient Core503 | Retryable unavailable differs from revoked identity; no unauthorized bytes or false success |
| E06 | Sign-out/tenant/client change with stored draft/intent | Old data/credentials/receipts cannot cross the new identity or client |
| E13 | Approval allow/reject/expiry/revoke | Captured decision persists before dispatch; exact command only; stale approval refuses |
| E14 | Approval response lost/reload/paging denial | Read-only reconciliation, no automatic repost, current-access cache invalidation |
| E17 | Unsupported task mutation | UI/tool does not imply success; no fallback to raw Core mutation |
| E23 | Memory recall after correction/revocation | Current revision/permission, prior content not reused incorrectly, provenance retained |
| E24 | Memory proposal approved/rejected/lost acknowledgment | Correct owner and durable outcome; four payloads retained/tombstoned coherently |
| E25 | New-surface Memory context | No fake conversation/client authority; held path stays503 until accepted contract exists |
| E27 | Artifact generation and publication | Valid content+version+hash+evidence; publish once; current Files/chat access |
| E28 | Six-format inspect/download | DOCX/TXT/XLSX/PPTX/PDF/ZIP exact receiver/MIME; invalid/expired/foreign references refuse |
| E29 | Preview/export/native open | Real renderer/native-reader opens promised format; formulas/layout/citations correct; ZIP not disguised preview |
| E32 | Routine create/update/stop/list from completed chat | Durable schedule management does not accidentally require an active foreground run; authority remains narrow |
| E34 | Consent revoked or Stop during routine execution | Current cancellation proof/retirement, durable unknown where required, truthful inbox status |
| E36 | Retention suppression→purge→restart/restore | Suppressed data stays inaccessible, class-specific deletion receipts, no restore resurrection |
| E43 | Mixed versions/frontends/contracts | Explicit version/source refusal or accepted backward compatibility; no silently misparsed approvals/output |
| E44 | Inaccessible/empty/stale provider data | Truthful unavailable/no-results distinction, no fabricated success/evidence |
| E45 | Canonical cross-module handoff | Portfolio/Workspace/Settings context preserved with entity IDs; effect appears in receiving module after reload |

Prepared before adoption 2026-10-25T17:54:49.452568+00:00

COMPOSITION QUALIFICATION UPDATE (2026-10-25): all accepted source/test/brief deltas applied without conflicts, 19 accepted paths byte/mode-identical. Three exact independently approved function records adopted (155 outer/nested;156 Connected); all other records and older module registry unchanged. Scoped TypeScript across six production and five affected test entrypoints plus transitive imports PASS, 17:56:27.313412-17:56:40.395668UTC,13.082s. Full existing architecture command 17:56:27.319866-17:56:32.209478UTC exit1:636size signals,505reviewed,18inherited-unreviewed,113blocking, zero boundary/record errors. All113 findings over84files have identical Git blobs/raw working bytes, corresponding review records and scanner inputs on deployed dc536, proven by direct comparison; no base-suite rerun or globalPASS. Zero blocking finding in changed candidate production. Preserve this existing globalFAIL without broad cleanup or a blanket waiver. Initial registry Prettier check failed; only the metadata file was formatted, JSON record semantics independently preserved, narrow final formatting check follows. Historical failures and all live/build/scan limits above remain. No source/test changes beyond exact accepted adoption; no new tests/mutants. Root/Release own disposition and one coherent build.
