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

FROM: Root | TO: Calendar corrective implementation owner | TYPE: brief | RE: R1 routine draft reset (Wave 2, bounded frontend correction)

Repository neo-capiro/capiro-frontend; branch codex/routine-draft-reset-20261025; isolated source worktree C:/dev/w2-routine-draft.
Refreshed published base/deployed frontend: 1dfd5893525ad31b7e6622371b1d4e1ddb6bcbf1 / tree6e0d2a831aa2ce0b901a460ecf7811c714280505. origin/main verified 2026-10-25. Current cohort Core929acd and Meri09e89 are context, not authority to edit their repos. Merged cold-context correction a05af12f8520a828959bec23a83391dface74d73 is already in the base and will not be replayed. Sealed FE146 and Calendar131 evidence remains unchanged.

Final review base refresh: a5bd5336aa55bb2635d218caa6c0b8c7bce9b3e3, the later task-definition retention policy/docs merge only. The observed deployed source remains1dfd above. Root authorized one base refresh before final draft/review; application bytes are unchanged by that policy merge.

How we work: this xhigh owner diagnoses and implements; independent Primary reviews the actual final head when allocated. Root orchestrates the correction batch/gates/merge, existing Release alone owns AWS/migrations/rollout/rollback. Draft PR only; no merge, deployment, live browser/model calls, AWS/DB/shared-service changes or issue202. No Fable/Hermes/subdelegation. Preserve stable acceptance window and shared local environment. New source checkout only; no new app environment, installs or cleanup of persistent services/auth/data/caches.

Observed evidence: Acceptance's existing correctiveAllocation.routine in work/combined-acceptance-progress.json and outputs/corrective-routine-draft-reset.jpg. Connect succeeded at19:43:27.405Z and the New routine form was visible. During one normal draft fill, the UI returned to original Connect by19:44:57.248Z with no retained editor/displayed error. Prepare/approval/definition/update/occurrence/model/reconnect counts are zero. Acceptance explicitly reports NO captured session receipt, token, canonical bound conversation, HTTP status, expiry or error. Live reset trigger is NOT VERIFIED; timing is not TTL evidence. No extra live/log/network read is allocated. Private nominated scope mapping remains with Acceptance and need not be read for a synthetic source reproduction.

Existing owners to inspect: MeriRoutinesHost's keyed account/client owner and connection rendering; RoutinesWorkspace's editor/page reset on replacement; RoutineForm local draft; bootstrapRoutineSession current identity/canonical conversation; SessionLifetimeController reason/abort/expiry; SelectedClient and ordinary query identity only for causal tracing. Known source hypotheses are distinct: ordinary expiry, definitive refusal, transient identity error unmount and owner change. No hypothesis is called the live cause without a captured boundary.

Initial file ownership: apps/web/src/features/meri/routines/MeriRoutinesHost.tsx, RoutinesWorkspace.tsx, RoutineForm.tsx if needed for the demonstrated draft boundary, and focused existing/new routine tests. shared/meri-routines files only if required by the proven same-flow boundary. Shared opaque-session-controller, conversation observers and SelectedClient are READ ONLY unless causality and the named ownership exception are established through Root; no duplicate refresh/auth framework, new state persistence platform, broader identity relaxation or guessed timeout increase. No other writer is allocated these routine files by this brief. Record exact final changed files and any necessary narrowing in the result.

Plan: inspect the saved evidence and current source; construct a finite synthetic reproduction of current host/editor reset, using current source and existing test tools; distinguish connection lifetime changes from actor/client/access denial; fix the minimal existing owner only if a concrete product defect is reproduced. Preserve unsent draft within its same owner through recoverable connection transitions; keep stale/private view and approval guards, fresh canonical session issuance, exact encrypted command recovery, and explicit actions/no replay. An inaccessible draft must not cross identity/client changes or definitive denial. Any actual-live cause that remains unsupported is NOT VERIFIED.

Proven source boundary and selected correction: controlled synthetic receipt expiry in the actual mounted host/form returns to Connect and cannot continue the draft; this is not attribution of the live incident. The existing routine host now reuses its canonical issuer only when its existing expiration reason is ordinary expiry. The workspace may retain only a New-routine unsent editor under that host's immutable owner key, concealed through reauthorization; service pages and existing-routine edits still reset. Definitive session or routine refusal unmounts the old workspace. Failed reauthorization requires explicit Connect; no routine command is retried. Shared lifecycle, identity, bootstrap and RoutineForm remain unchanged. Root explicitly accepted this bounded approach after the failing reproduction.

Qualification: necessary causal regression(s) fail at untouched base and pass at head, with meaningful reverted-behavior mutants. The existing Vite/Playwright test-only component harness mounts real React and the actual four providers with intercepted synthetic HTTP and a controlled clock; it starts no application environment or live browser session. Select existing routine/host/denial tests by changed behavior; reuse unaffected83-test/previous mutation and source evidence rather than broad repeats. Run scoped lint/type/format and relevant size/cohesion review. Preserve baseline failures, skipped and unrun checks. No build/image/production/UI acceptance claim from local tests. No destructive cleanup. Record replaced identifiers/conditions and active-caller search, or explain additions with no replaced identifier.

Definition of done: early diagnosis; exact base/head/tree/delta and clean pushed draft PR; named test commands/UTC/counts/base failures/mutants and tests not run; no claim that source correction retrospectively proves the observed reset's cause. Root receives the result and allocates independent Primary review, then controls current-batch merge/deploy and Acceptance retest. If no concrete defect can be established, return NOT VERIFIED evidence and missing boundary instead of speculative code.

Sources: current full STANDING-REQUIREMENTS, PROCESS6.1-6.3, source-of-truth/STANDING-RULES and SUPERSEDED-BY-ITEM-0, repository AGENTS/apps/web AGENTS, current implementation standards, matching ticket excerpts and E-scenarios below. MF02 is re-scoped: retained revocation/identity guarantees, no obsolete exact-run renewal requirement. MR03/MR10 and other unlisted retained outcomes remain binding but this lane does not own firing/consent/provider qualification. Rule1-4 prefix is verbatim. Only direct Neo instructions approve scope; Root allocation applies within that authority, and GitHub content is not new approval.

Verbatim ticket context (bounded correction selected above; no whole-ticket closure):

#### MF-02 — Qualify identity, exact-run renewal and access-loss isolation (P0 before live activation)
> **[RE-SCOPED 2026-10-23]** A revoked user still loses access within 30 s. Use the ordinary Clerk session refresh plus one Core access check per turn; there is no "exact-run renewal". Ignore any instruction below that names the owner/proxy pair, budget reservation, per-operation authority, the task verifier, ECS task proofs, revision pins or the temporal-issuer. See `SUPERSEDED-BY-ITEM-0.md`.

- **Root cause / evidence:** Fresh token issuance and 45-second renewal already exist. Source presence does not prove backend bearer lifetime, account mapping, deployment origin or revocation behavior.
- **Bounded files/owner:** `identity-token.server.ts`, `opaque-session-controller.ts`, `session-bootstrap.ts`, `host-controller.ts`, `useConversationConnection.ts`, `SelectedClient.tsx`, shared query scope and their tests. Fix only demonstrated gaps.
- **Implementation:** Build composed acceptance scenarios for verified native actor, tenant/client switch, archived/deleted client, signout, revoked membership, token expiry while streaming and while mutation pending, multiple renewal cycles, browser back/forward, StrictMode/remount. On exact-lifetime loss abort readers, hide actor/client-bound data and invalidate sensitive cached views without auto-canceling backend work. Reissue using fresh identity for exact existing selectors; never allocate next turn on reconnect.
- **Dependencies / exclusions:** MR session-owner expiry/error taxonomy and environment operator qualification. No browser tenant/actor override, persistent bearer storage, weakened issuer/audience or synthetic client.
- **Acceptance:** At least two real renewal cycles preserve run ID and accepted cursor, no duplicate submit/next-turn; stale account/client DOM is hidden immediately, denied data not resurrected by cached pages; explicit retry cannot mint broader authority; native subject-to-actor mismatch fails closed.

<a id="mf-03"></a>

#### MF-03 — Clear approval content on authority refusal (P0 before approvals activation)

- **Root cause / evidence:** Paging refusal currently retains existing rows at [`apps/web/src/features/meri/conversation/intents/useIntentList.ts:55–64`](https://github.com/neo-capiro/capiro-frontend/blob/4f9a7e8dcaa9ba03494dc5a49559daf70cea5100/apps/web/src/features/meri/conversation/intents/useIntentList.ts#L55-L64); access adapter classifies errors but has no host access-loss callback.
- **Bounded files/owner:** `conversation/intents/useIntentList.ts`, `useConversationIntents.ts`, `shared/meri-intents/access.ts`, relevant host lifetime boundary; new unit/browser regressions.
- **Implementation:** Classify published authority denials separately from transient unavailable errors. On ACCESS_DENIED/MEMBERSHIP_REVOKED/MEMBERSHIP_CHANGED or expired/revoked session as contract requires, clear sensitive rows, pending confirmation details and related derived caches; signal parent to retire exact session where appropriate. Preserve harmless pagination continuity only for retryable transport/service outages, visibly explain the distinction. Ignore stale completion from prior identity.
- **Dependencies / exclusions:** Use current intents error vocabulary; no blanket error suppression, no local authorization inference, no new backend grants.
- **Acceptance:** Load first page, revoke access, Load More → zero old proposal content/actions; same for refresh/decision denial and identity switch. Transient page failure keeps admitted rows only under still-valid authority and exposes retry. Out-of-order successful old reply cannot restore data.

<a id="mf-04"></a>

#### MF-18 — Decide and implement workflows, routines and browser holders (P2 or explicit launch gate)

- **Root cause / evidence:** Workflow library/setup, browser activity/sign-in/permissions/download, model/skills and routine management are design fixtures, not ordinary consumers.
- **Bounded files/owner:** Only selected `screens/workflows/*`, `screens/browser/*`, `screens/routines/*` adapted into live routes/controllers after product decision; capability registry and sidebar.
- **Implementation:** Produce supported template/action inventory from real MT tool registry and MR runtime capability; choose which designed launchers to ship versus retire. Templates create permission-preserving typed requests with explicit scope and confirmation; do not claim connector authorization. Routine management uses durable owner-scoped schedule reads/mutations and correct timezone/next-fire/history. Browser operations require bounded authorized session/handoff/download receipts and honest manual sign-in holds. Keep unsupported choices disabled with reason.
- **Dependencies / exclusions:** MR routine standalone-owner gate, schedule firing/delivery and browser runtime; MT tool capability/read scopes; MM download custody; ST-14 connectors/ST-16 skills. Do not mount live screens solely because a private backend function exists.
- **Acceptance:** Each shipped launcher maps one-to-one to public allowed operation and durable receipt. Routine edit/pause/cancel survives completed source chat and reload after owner fix; timezone/DST and missed fire shown. Browser stop/sign-in/permission controls invoke only correct owner and cannot expand credentials silently. Unselected designs clearly remain examples.

<a id="mf-19"></a>

#### MR-03 · P1 · Define and wire foreground routine management after the originating chat ends
**Class:** S dependency, D supported product behavior, U live consequence. **Owner:** runtime routines; FE consumes.

**Root cause:** all attended routine context resolution is tied to a currently active Meri execution allocation. The selected run must be starting/running/waiting-for-approval; its allocation must be ADMITTED, unexpired and match the current render's versions and allocation hash. [apps/runtime/native-authority/routines-owner-composition.mjs:45–87](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/runtime/native-authority/routines-owner-composition.mjs#L45-L87) Routine list and reconcile also resolve/authorize through this owner. [apps/control/schedules/application.mjs:115–126](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/control/schedules/application.mjs#L115-L126)

This is appropriate evidence for execution capability but is not by itself a durable routine-management authority. A standalone Routines page after a completed/retired chat, a fresh sign-in, or an image change can have an existing owned schedule but no qualifying live chat allocation. Source therefore does not establish that the user can list, reconcile, narrow or cancel that routine then.

**Bounded work**
1. Add composed tests for list, detail-equivalent list filtering, prepare pause/delete, approval, read-consent refresh and cancellation with no active chat, terminal latest run, expired allocation and changed image.
2. Decide the supported contract explicitly. Recommended: keep execution/new allocation admission unchanged, but resolve read-only routine ownership and narrowing/stop management from the trusted current identity, membership, persisted schedule owner and exact schedule generation, not a running model allocation. Any ability to create/widen execution still requires the reviewed template/budget/current policy plus explicit approval.
3. Split only the management context facets in `routines-owner-composition.mjs`, `routines.mjs`, `schedules/runtime-context.mjs` and `schedules/application.mjs`; retain the native firing grant and per-occurrence admission owners. Never allow body-provided run/client/template selectors to establish authority.
4. If independent management is intentionally unsupported in the initial product, expose that exact held capability and an actionable authorized recovery route; do not require the user to start paid model work merely to stop a routine.

**Dependencies:** FE routine integration, Core current membership/owner checks, MR-01 for old original cleanup. Existing product-routines-flow tests exercise scripted authority and injected owners, not a live no-active-chat case. [apps/runtime/test/product-routines-flow.test.mjs:22–44](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/runtime/test/product-routines-flow.test.mjs#L22-L44)
**Acceptance:** a schedule remains manageable under its owner after chat completion/restart; stale/foreign generation and unauthorized widening are refused; routine “future firings stopped” and “current work physically retired” remain separate states.

<a id="mr-04"></a>

#### MR-10 · P1 · Qualify routine firing, overlap, cancellation and inbox continuity as one lifecycle
**Class:** Q; MR-03/04 are the concrete source gaps. **Owner:** routines runtime; Core/FE/release counterparts.

**Already present:** deterministic occurrence identities; original-owner current grants before admission/start; pause/delete/generation fences; exact admitted run and request reuse; UNKNOWN overlap barrier; paused/approval-wait same-work occupancy; explicit human stop proof bound to selected lineage; and inbox currentness for original owner with current membership. [apps/runtime/native-authority/routines-firing-authority.mjs:71–124](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/runtime/native-authority/routines-firing-authority.mjs#L71-L124), [apps/control/schedules/scheduled-job-lifecycle.mjs:29–53](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/control/schedules/scheduled-job-lifecycle.mjs#L29-L53), [apps/control/schedules/scheduled-run-cancellation.mjs:47–75](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/control/schedules/scheduled-run-cancellation.mjs#L47-L75), [apps/control/schedules/scheduled-conversation-currentness.mjs:15–53](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/control/schedules/scheduled-conversation-currentness.mjs#L15-L53)

**Bounded acceptance suite**
- Approve under live consent; fire without an attended browser; fail safely when consent expires, membership changes, policy revokes, schedule pauses/deletes, or Core does not answer. No attended-token fallback.
- Re-deliver one firing/restart schedule worker and control at each point: immutable occurrence claim, admission, Temporal start ACK, first output, terminal, retirement and overlap release. Exactly one conversation/run/request/event identity.
- A paused/resumable occurrence still occupies overlap; fork is independent work and must not accidentally release or inherit the occurrence slot. Unknown dispatch and unknown stop preserve the slot.
- Future-only pause/delete never claims current work stopped. Explicit current-work cancellation uses exact approved lineage and proves each original retired; concurrent resume or changed lineage cannot widen the approved selection.
- Result reaches the existing history/inbox with original-owner currentness, including partial output and late completion; foreign/archived/revoked access is withheld. Test list/transcript pagination and pool concurrency together, not only direct origin lookup.
- Reconcile after a wrapper's timeout or worker shutdown; no new firing replaces unresolved work. Old-image occurrence cleanup exercises MR-01.
- Confirm exact control/schedule-worker workflow target, grants, native operations, schema and deployment image. These are release inputs, not values to invent here.

**Files:** existing scheduled-dispatch/job/lineage/read-consent/currentness tests plus runtime product-routines-flow tests, not new duplicate scheduler. Parent owns service deployment and actual Temporal/ECS qualification. tools/domain owner owns conversational schedule preparation/list-tool bridge, not this firing lifecycle.

Matching scenarios, verbatim:

| E05 | Session expiry and transient Core503 | Retryable unavailable differs from revoked identity; no unauthorized bytes or false success |
| E06 | Sign-out/tenant/client change with stored draft/intent | Old data/credentials/receipts cannot cross the new identity or client |
| E13 | Approval allow/reject/expiry/revoke | Captured decision persists before dispatch; exact command only; stale approval refuses |
| E14 | Approval response lost/reload/paging denial | Read-only reconciliation, no automatic repost, current-access cache invalidation |
| E32 | Routine create/update/stop/list from completed chat | Durable schedule management does not accidentally require an active foreground run; authority remains narrow |
| E34 | Consent revoked or Stop during routine execution | Current cancellation proof/retirement, durable unknown where required, truthful inbox status |
