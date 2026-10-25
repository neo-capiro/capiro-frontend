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

FROM: Root | TO: Settings / Actions corrective author | TYPE: PROCESS6.1 brief
RE: Wave2 Actions query/uncertainty/recovery diagnosis,25October2026

Repository neo-capiro/capiro-frontend. Branch codex/actions-recovery, isolated worktree C:/dev/w2-actions-recovery. Fresh normal origin/main base a5bd5336aa55bb2635d218caa6c0b8c7bce9b3e3; fetched and verified. Its app code matches deployed1dfd5893; only task-definition retention policy/docs differ. Existing FE154 native intent credentials fix fda3f418295dc53bd56b512fb4436a8e65230394 is in this base; do not repeat it. Author owns this branch only; preserve all earlier worktrees/dependencies/environment. Record this brief before executable changes and commit/push it first.

Current evidence, not cause
Actual cohort reported by Root: FE1dfd/Core929acd/Meri09e89. Actions Connect19:50:35.569Z succeeded to query control; Find recommendations clicked ONCE19:50:41.540Z. Next accessibility state: A task request is saved / Outcome uncertain; exact retry NOT clicked. Later screenshot19:51:32.587Z: Current action access unavailable, former workflow details cleared. Effect UNKNOWN, not assumed absent. S1 General approval panel unavailable too. No captured HTTP status/expiry/error enum/exact request-run binding. Retained Acceptance private ledger is chronology; corrective-actions-access-cleared-after-unknown.jpg shows later state only; corrective-s1-completed.jpg is separate. Do not infer TTL or permission cause from elapsed time/copy.

Scope and owners
Trace Actions/Intents query and recovery from existing UI controller through existing adapter, fixed proxy/public receiver and deployed Meri owner as needed for contract understanding. Start with a meaningful local causal counterexample; fix only demonstrated in-scope defects. Existing Actions query state/recovery presentation and request/receiver own their concerns. Shared opaque-session lifecycle or Meri contract edits require concrete finding and Root ownership allocation; do not preempt parallel R1 CalendarRecovery or D1 Portfolio work. R1's source-proven ordinary-expiry defect is separate, not evidence of this Actions failure. No new framework, authority layer, blanket error suppression, guessed timeouts, retry owner or broad refactor.

Working method and questions
Root Ultra orchestrates; allocated author and separate exact-head reviewer use current xhigh roles, overriding historical AGENTS role text. Author prepares source/tests/draft PR; Root composes real fixes after the current batch; independent review follows exact actual head. No merge, cloud/DB/browser/model/new query/retry/reconnect/discard/approval/task mutation/deploy. Stable live window and unknown attempt remain untouched. M1/M2 preparation frozen; Acceptance alone executes after its gates. No #202, Fable, Hermes or external messages. Routine implementation proceeds without a user question; report concrete shared-owner/scope conflicts to Root. Only direct Neo instruction changes scope/security; comments are not approval.

Sources and plan refresh
Current STANDING-REQUIREMENTS1–4 above verbatim; current handoff, WORKFLOW delivery lessons, FINAL-PLAN section0 and retained master tickets/scenarios below. Qualification guarantees and methods are distinct; matrices select affected checks, not a full rerun. Supersession: MF02 uses ordinary Clerk/current Core access, not exact-run authority machinery; MT10 keeps approval/durable outcomes/no blind redispatch through existing SDK permission/Core intent owners; unlisted MF03/04/12 and E03/05/06/13/14/16/17 behavior remains. No removed proxy/pair/leases/grants/checkpoints resurrected. Existing canonical release/module bindings stay unchanged.

Implementation outline, provisional until repro
Use existing request, receiving, journal and controller boundaries. Correlate a saved task to real retained task custody, distinguish a query problem from a known saved preparation, preserve unknown outcomes and sensitive-data clearing on actual current-access loss. Inspect native credential routing independently of the already-fixed intent proxy. Do not claim a presentation repair fixes the underlying live request. If a different contract failure is proven, amend this bounded outline before its code change; shared owner changes go to Root.

Validation and mutation policy
Read applicable AGENTS, implementation/architecture rules and installed Next guide before code. Reuse existing dependencies; do not install/rebuild services. Select existing Actions controller/adapter/proxy/transport and directly affected Intents tests by actual change. New behavioral tests must fail on untouched base; each new executable behavior gets a meaningful reverted-condition/removed-field mutant, restoring product bytes afterward. Preserve base failures; one relevant same-environment comparison suffices. Focused strict types/lint/format/diff and applicable architecture size responsibility review; no broad suites/image/build/live gate here. Docs-only checks have no mutants. No need to rerun passed unaffected proof.

Expected completion
Concrete causal source finding/repro or explicit unresolved cause, smallest existing-owner diff, replaced path/dead-code search, exact commit/tree/base/changed files, commands/UTC/counts/run-and-not-run/inherited failures/mutants, scoped checks and independent-review needs. Push draft PR and attach it; no merge/deploy claim. New function/file size signals require specific independent review; author does not self-edit shared size registry. Private live material stays in existing private owner files; public prose has no customer-linked IDs/UUIDs/secrets. Existing source/no-live limits remain explicit. No test resources beyond owned scratch; preserve shared services, caches and persistent clone.

Verbatim bounded tickets and scenarios (historical mechanisms filtered as above)

Canonical documentation snapshot: b6bf5e90f8f4a55607106b8ee35c4098a6177c1b.

#### MF-02 — Qualify identity, exact-run renewal and access-loss isolation (P0 before live activation)
> **[RE-SCOPED 2026-10-23]** A revoked user still loses access within 30 s. Use the ordinary Clerk session refresh plus one Core access check per turn; there is no "exact-run renewal". Ignore any instruction below that names the owner/proxy pair, budget reservation, per-operation authority, the task verifier, ECS task proofs, revision pins or the temporal-issuer. See `SUPERSEDED-BY-ITEM-0.md`.

- **Root cause / evidence:** Fresh token issuance and 45-second renewal already exist. Source presence does not prove backend bearer lifetime, account mapping, deployment origin or revocation behavior.
- **Bounded files/owner:** `identity-token.server.ts`, `opaque-session-controller.ts`, `session-bootstrap.ts`, `host-controller.ts`, `useConversationConnection.ts`, `SelectedClient.tsx`, shared query scope and their tests. Fix only demonstrated gaps.
- **Implementation:** Build composed acceptance scenarios for verified native actor, tenant/client switch, archived/deleted client, signout, revoked membership, token expiry while streaming and while mutation pending, multiple renewal cycles, browser back/forward, StrictMode/remount. On exact-lifetime loss abort readers, hide actor/client-bound data and invalidate sensitive cached views without auto-canceling backend work. Reissue using fresh identity for exact existing selectors; never allocate next turn on reconnect.
- **Dependencies / exclusions:** MR session-owner expiry/error taxonomy and environment operator qualification. No browser tenant/actor override, persistent bearer storage, weakened issuer/audience or synthetic client.
- **Acceptance:** At least two real renewal cycles preserve run ID and accepted cursor, no duplicate submit/next-turn; stale account/client DOM is hidden immediately, denied data not resurrected by cached pages; explicit retry cannot mint broader authority; native subject-to-actor mismatch fails closed.

#### MF-03 — Clear approval content on authority refusal (P0 before approvals activation)

- **Root cause / evidence:** Paging refusal currently retains existing rows at [`apps/web/src/features/meri/conversation/intents/useIntentList.ts:55–64`](https://github.com/neo-capiro/capiro-frontend/blob/4f9a7e8dcaa9ba03494dc5a49559daf70cea5100/apps/web/src/features/meri/conversation/intents/useIntentList.ts#L55-L64); access adapter classifies errors but has no host access-loss callback.
- **Bounded files/owner:** `conversation/intents/useIntentList.ts`, `useConversationIntents.ts`, `shared/meri-intents/access.ts`, relevant host lifetime boundary; new unit/browser regressions.
- **Implementation:** Classify published authority denials separately from transient unavailable errors. On ACCESS_DENIED/MEMBERSHIP_REVOKED/MEMBERSHIP_CHANGED or expired/revoked session as contract requires, clear sensitive rows, pending confirmation details and related derived caches; signal parent to retire exact session where appropriate. Preserve harmless pagination continuity only for retryable transport/service outages, visibly explain the distinction. Ignore stale completion from prior identity.
- **Dependencies / exclusions:** Use current intents error vocabulary; no blanket error suppression, no local authorization inference, no new backend grants.
- **Acceptance:** Load first page, revoke access, Load More → zero old proposal content/actions; same for refresh/decision denial and identity switch. Transient page failure keeps admitted rows only under still-valid authority and exposes retry. Out-of-order successful old reply cannot restore data.

#### MF-04 — Make approval decisions reload-safe and expiry-aware (P1 before approvals activation)

- **Root cause / evidence:** Only uncertain markers are stored; pending state dispatches before persistence and unmounted results are dropped ([`apps/web/src/features/meri/conversation/intents/useConversationIntents.ts:25–64`](https://github.com/neo-capiro/capiro-frontend/blob/4f9a7e8dcaa9ba03494dc5a49559daf70cea5100/apps/web/src/features/meri/conversation/intents/useConversationIntents.ts#L25-L64), [`apps/web/src/features/meri/conversation/intents/useConversationIntents.ts:150–180`](https://github.com/neo-capiro/capiro-frontend/blob/4f9a7e8dcaa9ba03494dc5a49559daf70cea5100/apps/web/src/features/meri/conversation/intents/useConversationIntents.ts#L150-L180)). Clock expiry has no refresh timer.
- **Bounded files/owner:** `useConversationIntents.ts`, `intent-view.ts`, `ConversationIntents.tsx`; bounded per-tab decision journal helper and tests.
- **Implementation:** Before dispatch, synchronously retain an immutable non-secret decision identity: tenant/actor/client/conversation, delivery/proposal/hash/choice and attempt phase/version. Restore pending as unknown, reconcile durable list first, permit only exact same decision request while unresolved. Handle blocked storage explicitly or use an approved durable recovery owner; do not silently claim reload safety. Clear resolved markers only after correlated durable evidence. Recompute expiry at deadline/visibility return and after each refresh.
- **Dependencies / exclusions:** Published list/decide idempotency remains server authority. Retention/privacy decision for journal; no credential or full sensitive proposal persistence. MR/MT receipt semantics if list cannot resolve a state.
- **Acceptance:** Reload/unmount immediately after dispatch, dropped response, two tabs, expired proposal, changed hash/reviewer and storage failure cannot produce a contradictory replacement decision or false success. Exact replay is accepted once by backend; settled receipt clears journal; expiry disables action without relying on another click.

#### MF-12 — Close legacy action/task-command approval and recovery handoffs (P1)

- **Root cause / evidence:** Ordinary auxiliary hosts prepare and request execution but cannot approve; blocked/indeterminate UI lacks a complete cross-reload readback handoff and forms use manual IDs.
- **Bounded files/owner:** `actions/MeriActionWorkflow.tsx`, `action-workflow-state.ts`, `ProposalPanel.tsx`; task-updates form/state/proposal; adapters/journals only where readback needed; canonical task route helper.
- **Implementation:** Preserve exact reviewed draft/command/hash and attempt identity through navigation/reconnect. Link to correct trusted approval surface where public contract supports it; otherwise give explicit waiting/review owner without fake approve. Add same-request check-recorded-result after unknown, not fresh execute. Link observed task receipt to canonical Workspace task; add authorized task selector/context handoff if schema permits. Distinguish omitted field from clear-date operation and add reset/new workflow only after terminal reconciliation.
- **Dependencies / exclusions:** MT same-owner task.create and task.update grant/executor qualification; WS task detail; MF-03/04 shared decision safety. Mail actions remain ML-05/06, not this task.
- **Acceptance:** Pending approval never executes on UI click alone; reload/drop response cannot create second task/update; identity/client change hides receipt; completed receipt deep-links exact canonical task; unsupported field clearing is disabled or correctly typed, not silently ignored.

#### MT-10 · Qualify the existing task.create approval and effect chain (P1, CONFIG/QUAL)
> **[RE-SCOPED 2026-10-23]** Approval, durable receipt and no blind redispatch stay. Approvals go through the SDK permission callback plus Core intents; no per-operation grant minting. Ignore any instruction below that names the owner/proxy pair, budget reservation, per-operation authority, the task verifier, ECS task proofs, revision pins or the temporal-issuer. See `SUPERSEDED-BY-ITEM-0.md`.

**Root cause / current state.** Task creation already has actual runtime authority composition, immutable proposal/decision and exact Core effect dispatch. Some source comments still say no production owners or sourceEnabled cannot be true, but current CLI/config code supplies/permits them. Do not open a duplicate rebuild ticket or mark creation unsupported from stale prose.

**Bounded change and owner.** Keep apps/runtime/native-authority/execution-composition.mjs, apps/control/intents/{mount,approval,http}.mjs and current Core exact task-create receiver as owners. Add route-level integration tests through actual CLI composition; correct misleading comments as a bounded documentation task. Wire current FE recovery through MF and present draft/approval/dispatch/unknown/confirmed receipt distinctly. Persist/reconcile the same original command identity, never manufacture a second proposal to recover a lost response.

**Dependencies.** MT-01; Core exact command receipt/approval issuance and durable storage; MF pending-decision recovery and rendering; Portfolio task grants.

**Acceptance / tests.** Approve/reject exact hash, wrong approver, expiry, changed rights, simultaneous same/opposite decisions, predispatch crash, post-Core-effect lost response, late release refusal, duplicate delivery, restart reconciliation, cross-run replay denied. Prove one business task and one canonical effect receipt for accepted retries, and zero task writes for rejected or NOT_DISPATCHED states. Source-enabled/owner flags are qualifications, not evidence of live execution.

**Pinned evidence.** [apps/runtime/cli.mjs:64-70](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/runtime/cli.mjs#L64-L70), [apps/runtime/config.mjs:91](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/runtime/config.mjs#L91), [apps/runtime/native-authority/execution-composition.mjs:127-176](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/runtime/native-authority/execution-composition.mjs#L127-L176), [apps/control/intents/approval.mjs:126-159](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/control/intents/approval.mjs#L126-L159).

| E03 | Double click and lost submit acknowledgment | Same request identity reconciles to one accepted effect/run; no duplicate |
| E05 | Session expiry and transient Core503 | Retryable unavailable differs from revoked identity; no unauthorized bytes or false success |
| E06 | Sign-out/tenant/client change with stored draft/intent | Old data/credentials/receipts cannot cross the new identity or client |
| E13 | Approval allow/reject/expiry/revoke | Captured decision persists before dispatch; exact command only; stale approval refuses |
| E14 | Approval response lost/reload/paging denial | Read-only reconciliation, no automatic repost, current-access cache invalidation |
| E16 | Task.create commits then visibility revoked | Durable tenant-bound effect recorded once; current result access denied; no duplicate retry |
| E17 | Unsupported task mutation | UI/tool does not imply success; no fallback to raw Core mutation |
