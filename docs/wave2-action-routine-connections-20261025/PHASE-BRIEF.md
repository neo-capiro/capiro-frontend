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

FROM: Root | TO: Integration | TYPE: PROCESS6.1 | RE: Actions/Routines connection diagnosis and proven routine bootstrap repair

Standing revision loaded: c0411e2cd20c35b3a8619817a4fec25ef7047aba, including instruction/engineering provenance. Rules1-4 unchanged. Neo retains full Claude Agent SDK harness on AgentCore Runtime V1 direct to Bedrock; control tool gateway to canonical Core; tenant isolation and durable user/firm memory. No SDK/hosting replacement, broad orchestration rewrite or new approval gate.

Exact FE base fda3f418295dc53bd56b512fb4436a8e65230394/tree2d0a823132ddeaf079b331432fbec3f80e279ddb (PR154), verified local/remote before checkout. Isolated branch codex/wave2-action-routine-connections-20261025, worktree C:/dev/wave2-action-routine-connections-20261025. Meri reference exact deployed7eee7f7c358be9ae903169816ef68eb6e64ae1f3; Core reference43fdd8928e517b1ce3a7a039f0fabeb8cf5fc5dd; deployedFE31dc53633f0b8c4de6432f3840e4fc79ac2ffeb02a. PR154 remains independently reviewed separately; preserve both its credential correction and accepted PR152 fixtures. No source edit before this brief.

How we work: Root Ultra orchestrates; Integration authors/xhigh, Primary independently reviews exact head/xhigh; Release alone AWS/migration/images/rollout/rollback; Acceptance alone any Root-allocated diagnostic UI action and corrective-release acceptance. Draft PR only, commit/push this brief with source. No self-acceptance, merge, AWS/browser effect/model/probe/retry by author, private identifiers/credentials, #202 posts or subagents. In-plan proven repair proceeds without another Root approval; unresolved actual scope/security choice goes Neo.

Bounded observations: retained Actions connect16:46:54.026Z, query-click attempt16:47:58.668Z, unavailable view16:48:14.763Z, querySubmitted=false. Routines connect16:49:53.076Z, reset16:50:24.192Z, definitions/updates/modelSubmissions0. Retained routine screenshot confirms client scope, no IDs copied. There is no captured response/status/issued TTL and no saved-journal-state proof for these observations. Do not claim observed401 or live attribution from text. Original failures retained.

Producer/receiver trace: FE action proxy uses native token for session issuance and opaque token for action/routine operations; deployed owners correctly resolve opaque sessions. No equivalent of the intents bearer defect here. Actions bootstrapTaskRecoverySession resolves a Core first-chat conversation when no saved context, then issues an exact-conversation session. Routines bootstrapRoutineSession only resolves General; for client/no saved routine it omits conversationId. Meri native-authority/identity-context.mjs withAuthority requires string hints.conversationId and an explicit clientId; context-adapter.resolve also requires exact conversationId/clientId. Thus the client cold-connect omission is a concrete source defect independent of unknown live HTTP. No Meri port change is needed.

Actions limitation: SessionLifetimeController sets expiry to session.expiresAtMs and clears the port at that cap, while Actions does not opt into early renewal. Existing meri-action-host tests explicitly require this behavior. Its unavailable UI can mean expiry or authority loss; no submitted query preceded the observation. Time elapsed is compatible with expiry but does not prove actual receipt TTL or reason. Preserve current lifetime/auth behavior; do not lengthen validity or invent automatic renewal/replay. Need existing/new separately Root-authorized safe receipt TTL/status/hint-presence and local expiry-vs-refusal correlation to classify the observed loss. No speculative Actions product edit allocated by this finding.

Allocated repair paths (one writer):
- apps/web/src/shared/meri-routines/session.ts
- apps/web/src/features/meri/routines/MeriRoutinesHost.tsx
- apps/web/tests/meri-routines.test.ts (callback rename and existing host fixture boundary only)
- apps/web/tests/meri-routine-session-bootstrap.test.ts (dedicated cold-connect/negative regressions)
- docs/wave2-action-routine-connections-20261025/PHASE-BRIEF.md (explicit required brief)
Read-only, not claimed: shared meri-actions/proxy.ts, opaque-session-controller.ts, conversations/session.ts; intents proxy under Primary review; Documents/artifact ports under Portfolio; memory reads under Settings; Hermes read-context/gateway files; diagnostics/events. Meri tasks/routines product ports remain unchanged unless a demonstrated new cause is separately documented. Early ownership/no-collision relay recorded in Integration STATUS.md because outgoing chat tools are unavailable.

Implementation: use one resolveConversation callback for any unsaved routine scope; preserve saved original conversation selection without pinning an expired run. Existing host calls resolveFirstChatConversation with actual selectedClientId and current tenant/actor; client uses existing firstChatCoreOperationKey/v1, General uses existing firstChatV2OperationKey/v2 and its current feature gate. The canonical resolver retains current receipt checks and stored first-chat intent. Explicit Connect only; no query/prepare/approval/routine creation or model call is introduced. Correct the obsolete resolveGeneral name everywhere in allocated callers/tests. No compatibility fallback, new schema/config/authority mechanism or weakening of identity/client/session/receipt validation.

Tests planned NOT RUN at dispatch: dedicated cold client and General bootstrap with real bootstrapConversationSession receiver, exact requested context, no effects; wrong account and mismatched session context refuse; saved routine context still bypasses cold resolution and omits expired run via existing regression. Existing host lifetime/revocation/reconnect tests retain assertions; their non-UUID historical routine fixture cannot represent a new Core-bootstrap receipt, so mock that unchanged canonical resolver boundary there and keep new cold bootstrap checks separate and explicit. Run affected routine file, dedicated new cases and scoped type/lint/format only. No full frontend/browser/whole-wave repeat. Mutant: restore client omission and require new client boundary failure; mutating receiver scope must fail corresponding new negative. New executable cases must have meaningful killed witnesses or explicit retained-owner evidence. Reuse unchanged Core resolver/Meri session gate proofs; no copies of those policies in production/tests.

Definition of done: exact head/tree/base and changed paths; command/version/UTC/exit/count results including failures and NOT RUN; meaningful mutants killed/restored; deletion search for old callback in owned active code; accepted source/fixture blobs preserved; committed/pushed draft and exact-head independent review request. Actions remains separately unproven if no decisive evidence; report precise missing observation and bounded next step. Full workflow acceptance awaits corrective release, not a local test claim.

Resources: retained Node24/dependencies through task-owned junction and candidate source aliases; no install, package/lockfile repair, service/port/container/DB or AWS action. Preserve donors/caches/services/tab state. Own only new worktree/local scratch/outputs and temporary mutants, restored on exit. No broad scan/flag inventory, new framework or extra gate. Root's ordinary Files scan-policy correction is independent and not a prerequisite.

Sources: current STANDING-REQUIREMENTS, PROCESS6.1/6.2, host/repository/apps/web AGENTS, IMPLEMENTATION-STANDARDS and ARCHITECTURE; source-of-truth closeout plan and SUPERSEDED-BY-ITEM-0 register. Existing native identity/session/Core gates are retained; removed proxy, minting, reservation and obsolete run mechanisms are not restored. Full matching source tickets below constrain behavior, not whole-ticket rewrites.


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

| E05 | Session expiry and transient Core503 | Retryable unavailable differs from revoked identity; no unauthorized bytes or false success |
| E06 | Sign-out/tenant/client change with stored draft/intent | Old data/credentials/receipts cannot cross the new identity or client |
| E17 | Unsupported task mutation | UI/tool does not imply success; no fallback to raw Core mutation |
| E32 | Routine create/update/stop/list from completed chat | Durable schedule management does not accidentally require an active foreground run; authority remains narrow |
| E34 | Consent revoked or Stop during routine execution | Current cancellation proof/retirement, durable unknown where required, truthful inbox status |
| E43 | Mixed versions/frontends/contracts | Explicit version/source refusal or accepted backward compatibility; no silently misparsed approvals/output |
| E44 | Inaccessible/empty/stale provider data | Truthful unavailable/no-results distinction, no fabricated success/evidence |

Initial state: source/tests/mutants/publication NOT RUN; diagnostic observation remains distinct from a proven source counterexample.

PRE-PUBLICATION UPDATE:38 distinct affected tests pass (34retained+4new);2host tests repeated only after typed scope/operation discrimination correction,40candidate executions. Both scoped mutants killed and source restored. Scoped type/lint/format/whitespace checks pass; initial type failure retained (two source union-shape errors corrected plus missing Next CSS declarations in scratch config). No new live/SDK/effect run. Acceptance's diagnostic plan stopped0/4before action due unsupported status/error/correlation capture. Actions expiry-vs-refusal remains unproven; do not claim its repair or change lifetime. PR154 independently ACCEPTED by Primary at exact base fda3; no repeated review/tests requested. Required standing c0411e2/provenance loaded.
