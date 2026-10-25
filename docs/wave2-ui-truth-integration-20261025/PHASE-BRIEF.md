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

# Wave 2 frontend UI recovery and guidance composition — PROCESS 6.1

FROM: Root | TO: Integration | TYPE: brief | RE: one source-only combined frontend candidate

Repository: neo-capiro/capiro-frontend. Integration target: normal `main` only. Fresh fetched and remote-verified base `a5bd5336aa55bb2635d218caa6c0b8c7bce9b3e3`. Owned branch `codex/wave2-ui-truth-integration-20261025`; isolated checkout `C:/dev/wave2-ui-truth-integration-20261025`.

Root orchestrates at Ultra; implementation/independent-review helpers at xhigh under current standing rules. Integration is the sole writer of this composition and its registry adoption. Primary independently accepted PR162; File Workflows independently accepted PR163; Root reports PR164 source ACCEPT. Existing Release alone handles AWS/migrations/deployment/rollback. Root gates and merges later. Draft source candidate only; no merge, image rebuild, deployment, #202 post or expanded live diagnosis is allocated here.

## Accepted inputs and ownership

PR162 head `48ddc9d010f19ac350b3bf76cf92afc65bae7719`, tree `19fd0532218497de1e8a01e19e8daf324877495a`, base `a5bd5336aa55bb2635d218caa6c0b8c7bce9b3e3`; complete accepted delta:

- `apps/web/src/features/meri/routines/MeriRoutinesHost.tsx`
- `apps/web/src/features/meri/routines/RoutinesWorkspace.tsx`
- `apps/web/tests/browser/routine-draft-harness.tsx`
- `apps/web/tests/browser/routine-draft.html`
- `apps/web/tests/browser/routine-draft.spec.ts`
- `docs/handover/20261025/routine-draft-reset/PHASE-BRIEF.md`

PR163 head `b3c1bea8b37862e542a82aa8fab4ec7e913e6b93`, tree `badb3682cf450fe0e113503abe5eb07502b7ea2e`, base `a5bd5336aa55bb2635d218caa6c0b8c7bce9b3e3`; complete accepted delta:

- `apps/web/src/features/meri/actions/MeriActionWorkflow.tsx`
- `apps/web/src/features/meri/actions/action-workflow-state.ts`
- `apps/web/test/action-workflow.test.mjs`
- `apps/web/tests/meri-action-recovery-view.test.ts`
- `docs/handover/20261025/ACTIONS-RECOVERY-BRIEF.md`

PR164 head `4f10476063cd9ef52d341fc597f0a6cdc8c694f7`, tree `cf1041ea24596781b489667e8825ef31d5d935fd`, base `a5bd5336aa55bb2635d218caa6c0b8c7bce9b3e3`; complete accepted delta:

- `apps/web/src/app/meri/files/MeriFilesHost.tsx`
- `docs/handover/20261025/briefs/W2-D1-CORRECTIVE-CONTEXT.md`

All13 paths are disjoint. Integration replays every accepted commit, including author briefs, without semantic edits. The only additional changed paths are this brief and `scripts/architecture/reviewed-size-findings.json`. No other shared file, contract, package/lock, authority, journal or deployment configuration is allocated. Frozen source and review checkouts remain untouched. If any unexpected overlap or source-head change appears, preserve evidence and resolve that narrow integration issue before proceeding.

PR162 preserves same-owner unsent routine drafts across ordinary expiry while retaining denial/identity/saved-command clearing. PR163 distinguishes recovery checks from a confirmed saved task and preserves explicit uncertain-command fences. PR164 explains the saved-request prerequisite in Files and offers the existing client-chat route. These UI repairs do not establish the actual19:44 routine reset cause, solve native D1 admission, or determine the effect/cause of the earlier uncertain Actions query. Runtime/M1/D1 source diagnoses continue under their existing owners. No live retry or acceptance is added here.

## Registry adoption and design

Use the existing canonical size scanner and registry. Adopt verbatim the two Primary records in `wave2-visible-review/outputs/fe-pr162-cohesion-records.json` for Connected and RoutinesWorkspace, and the File Workflows `cohesionRecord` in `wave2-visible-file-workflows-ui/outputs/actions-pr163-independent-review.json` for ConnectedWorkflow. Required fingerprints respectively: `daa937f215f8cf64bb9939e287af815b91708f750d5c6002c89ed7ac268cba03`, `dffbd9bc74029f6458073a4cbbaa3f0f6160ae56765e200a2f7a708336e18ede`, `e4ee7a975a0f73aeda07d58a8a9ca82231f507b874eb537b98cc7c12c104547b`. Preserve the existing row-renderer record `2995b98c471e14dfb7df04a86d23aae28fd5b27ad7f051670d7af2153bf6e7d7`, all unrelated size records and module-review metadata. No blanket architecture waiver or whole-architecture PASS is implied.

The existing UI controllers, workflows, session issuance, domain transports and recovery journals retain their responsibilities. This composition introduces no new mechanism or extraction. Replaced behavior/dead-path cleanup is exactly the accepted author deltas; no extra shim or temporary product diagnostic is added. Existing installed Next.js client-component guidance was read; no client/server boundary changes are authored by Integration.

## Current rules, retained tickets and supersession

Standing1–4 above are verbatim from canonical Meri main docs merge83e27a9f91313d62377ddc755cb7ef3fffc2bc13 (checkpoint19:38:40). PROCESS6.1 and current WORKFLOW govern. The following exact master excerpts apply only to this accepted narrow UI slice through item0/RuntimeV1 supersession. The complete author briefs retained in the input deltas carry their additional ticket/scenario context; this composition does not allocate those entire products again. Historical per-operation authority, exact-run renewal and retained-liability mechanisms do not return to scope. Core remains data authority; SDK/RuntimeV1 and durable domain owners remain canonical.

#### MF-02 — Qualify identity, exact-run renewal and access-loss isolation (P0 before live activation)
> **[RE-SCOPED 2026-10-23]** A revoked user still loses access within 30 s. Use the ordinary Clerk session refresh plus one Core access check per turn; there is no "exact-run renewal". Ignore any instruction below that names the owner/proxy pair, budget reservation, per-operation authority, the task verifier, ECS task proofs, revision pins or the temporal-issuer. See `SUPERSEDED-BY-ITEM-0.md`.

- **Root cause / evidence:** Fresh token issuance and 45-second renewal already exist. Source presence does not prove backend bearer lifetime, account mapping, deployment origin or revocation behavior.
- **Bounded files/owner:** `identity-token.server.ts`, `opaque-session-controller.ts`, `session-bootstrap.ts`, `host-controller.ts`, `useConversationConnection.ts`, `SelectedClient.tsx`, shared query scope and their tests. Fix only demonstrated gaps.
- **Implementation:** Build composed acceptance scenarios for verified native actor, tenant/client switch, archived/deleted client, signout, revoked membership, token expiry while streaming and while mutation pending, multiple renewal cycles, browser back/forward, StrictMode/remount. On exact-lifetime loss abort readers, hide actor/client-bound data and invalidate sensitive cached views without auto-canceling backend work. Reissue using fresh identity for exact existing selectors; never allocate next turn on reconnect.
- **Dependencies / exclusions:** MR session-owner expiry/error taxonomy and environment operator qualification. No browser tenant/actor override, persistent bearer storage, weakened issuer/audience or synthetic client.
- **Acceptance:** At least two real renewal cycles preserve run ID and accepted cursor, no duplicate submit/next-turn; stale account/client DOM is hidden immediately, denied data not resurrected by cached pages; explicit retry cannot mint broader authority; native subject-to-actor mismatch fails closed.

#### MF-12 — Close legacy action/task-command approval and recovery handoffs (P1)

- **Root cause / evidence:** Ordinary auxiliary hosts prepare and request execution but cannot approve; blocked/indeterminate UI lacks a complete cross-reload readback handoff and forms use manual IDs.
- **Bounded files/owner:** `actions/MeriActionWorkflow.tsx`, `action-workflow-state.ts`, `ProposalPanel.tsx`; task-updates form/state/proposal; adapters/journals only where readback needed; canonical task route helper.
- **Implementation:** Preserve exact reviewed draft/command/hash and attempt identity through navigation/reconnect. Link to correct trusted approval surface where public contract supports it; otherwise give explicit waiting/review owner without fake approve. Add same-request check-recorded-result after unknown, not fresh execute. Link observed task receipt to canonical Workspace task; add authorized task selector/context handoff if schema permits. Distinguish omitted field from clear-date operation and add reset/new workflow only after terminal reconciliation.
- **Dependencies / exclusions:** MT same-owner task.create and task.update grant/executor qualification; WS task detail; MF-03/04 shared decision safety. Mail actions remain ML-05/06, not this task.
- **Acceptance:** Pending approval never executes on UI click alone; reload/drop response cannot create second task/update; identity/client change hides receipt; completed receipt deep-links exact canonical task; unsupported field clearing is disabled or correctly typed, not silently ignored.

#### MF-14 — Finish artifact library/detail consumers under WS-23/24 (P1)

- **Root cause / evidence:** Live artifact inspector is not file library: known-version input, event-derived versions and last10 local views; rich editor/previews/history/share remain fixtures. Merged PR115 adds all-format read receiver only; this reception is complete on current main.
- **Bounded files/owner:** Canonical WS-23/24 files plus `ConversationArtifacts.tsx`, `files/DocumentVersionPanel.tsx`, `MeriFilesWorkflow.tsx`, new read-only file detail/library views and route helpers. MM owns backend render/custody contracts.
- **Implementation:** Do not reimplement merged PR115 document-access0.1.0; qualify the received reader, then build authorized durable list/version index and deep links with typed source/provenance/status. Render only supported safe preview results; preserve signed-link redemption/hash validation, revoke object URLs and clear bytes on lifetime change. Add compare/revision/history UI only with exact-version contract. Keep edit/share/comments/rename/delete disabled until canonical owners provide semantics; do not fake save via local state.
- **Dependencies / exclusions:** WS-23 received-reader qualification, WS-24 file workspace, MM renderer/PDF/PPTX/ZIP/filing custody, MR writer authority. This ticket is consumer slice, not new duplicate file service.
- **Acceptance:** All six formats correctly discriminate supported preview/download/unsupported; exact bytes/hash checked; link expiry/revocation/cross-client substitution fail closed. Reload/another tab sees durable versions, not local10 list; missing renderer never claims native preview or successful edit.

Applicable supersession rows (verbatim):

| Ticket | Disposition | Keep as acceptance | Dropped |
| --- | --- | --- | --- |
| MT-10, MT-11, MT-12 task and schedule actions | **RE-SCOPED** | Approval, durable receipt, no blind redispatch | Approvals go through the SDK permission callback plus Core intents; no per-operation grant minting |
| MM-01, MM-13 "current-authority reads" | **RE-SCOPED** | Memory and attachment reads are scoped to the current actor, client and permissions | Core decides on each tool call; no authority receipt layer |
| MF-02 identity, exact-run renewal, access-loss isolation | **RE-SCOPED** | A revoked user loses access within 30 s | Ordinary Clerk session refresh plus one Core access check per turn; drop "exact-run renewal" |

Matching scenarios (verbatim; retained guarantees, not new live allocations):

| ID | Scenario | Required outcome |
| --- | --- | --- |
| E05 | Session expiry and transient Core503 | Retryable unavailable differs from revoked identity; no unauthorized bytes or false success |
| E06 | Sign-out/tenant/client change with stored draft/intent | Old data/credentials/receipts cannot cross the new identity or client |
| E14 | Approval response lost/reload/paging denial | Read-only reconciliation, no automatic repost, current-access cache invalidation |
| E16 | Task.create commits then visibility revoked | Durable tenant-bound effect recorded once; current result access denied; no duplicate retry |
| E22 | Mail/task provider mutation uncertainty | Existing provider/command intent owns no-resend/reconciliation; no false receipt |
| E27 | Artifact generation and publication | Valid content+version+hash+evidence; publish once; current Files/chat access |
| E43 | Mixed versions/frontends/contracts | Explicit version/source refusal or accepted backward compatibility; no silently misparsed approvals/output |

## Qualification, resources and definition of done

Reuse existing exact-head author/reviewer behavior evidence and its failures/skips/limits. PR162's accepted mounted lifetime/denial/identity evidence and causal mutants are retained. PR163 reuses46 focused cases/3 inspected mutants; its adjacent35PASS/1 inherited transport failure remains a failure. PR164 is the accepted guidance-only change, not a new document admission or generation guarantee. No author evidence is relabeled as a new combined test run or live success.

New finite checks: prove all13 source/test/brief blobs and modes match the accepted heads; prove the complete resulting tree equals the fresh base plus those disjoint deltas, exactly3 supplied registry records and this brief; run the existing scanner only on the5 changed production files to match the approved records and preserved row renderer; validate registry shape, unchanged unrelated records, formatting and Git whitespace. No behavioral integration test is needed unless an actual overlap is found. Do not add blanket broad tests, full architecture census, repeat reviews, builds or deployment. No new executable repository tests are authored by Integration; mutation N/A for composition, author mutants reused.

Return exact base/head/tree, changed paths, UTC/commands/results and any inherited or setup failures, source/metadata preservation evidence, tests run/not run, and a draft main-targeted PR. Root owns later gates/merge and Release owns a coherent release. Deployed FE image source remains1dfd5893525ad31b7e6622371b1d4e1ddb6bcbf1 until a separately qualified rollout. Preserve cached dependencies/checkouts and active services. This work creates no process/server/cloud/DB resource requiring cleanup; retain owned source/evidence.

Prior bounded adoption audit remains22 close-as-incorporated /1 keep-open: Meri253's unadopted `apps/runtime/test/product-mount.test.mjs` change stays open pending Root disposition. Docs245 merged separately and is excluded; Wave3 remains excluded. No further PR-state change or repeated product audit occurs in this composition.
