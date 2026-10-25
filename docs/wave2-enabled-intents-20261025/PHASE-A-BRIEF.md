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

FROM: Root | TO: Integration | TYPE: PROCESS6.1 sealed Phase A brief | RE: approval native-token repair

Allocation received 2026-10-25: proceed with Phase A only of the complete WAVE2-BOUNDARY-REPAIR-BRIEF.txt. Root seals frontend base 4fa98196d6a7dd9d5d092c15c544ffb5df4273aa (tree 48a5a63283d3f75e6a8151234a2ac499129b7c05), verified locally and against origin/codex/wave2-enrichment-fixture-20261025 before checkout. Isolated branch codex/wave2-enabled-intents-20261025; worktree C:/dev/wave2-enabled-intents-20261025. Preserve all accepted PR152 fixture fixes and frozen FE151. Core Phase B belongs to File Workflows; do not edit Core. The architecture attachment is read-only review, not a feature freeze. Scanner/provider setup is independent and is not a prerequisite for this credential correction.

How we work: Integration authors; Primary independently reviews the exact candidate; Root orchestrates gates/merges; existing Release alone owns AWS/images/rollout/rollback. Current direct xhigh allocation supersedes historical role/model text. Draft PR only, commit and push this standalone brief with source. No self-acceptance, merge, AWS, browser effect, model/provider request, Core/Meri edits, #202 post or subagents.

Scope and existing owners
- apps/web/src/shared/meri-intents/proxy.ts
- apps/web/tests/meri-intents-proxy.test.ts
- docs/wave2-enabled-intents-20261025/PHASE-A-BRIEF.md: this explicitly requested dispatch brief; documentation exception to the two code/test paths. No package, lockfile, route, config or fixture edits.

Concrete defect: the proxy obtains a server native token but forwards the opaque action session to the intents product-access route. Exact deployed Meri7eee7f7c358be9ae903169816ef68eb6e64ae1f3 product-applications:103 / product-ports/intents:125/129 invokes native conversationMembership, through product-access/http:57 and Core native identity. Core43fdd8928e517b1ce3a7a039f0fabeb8cf5fc5dd requires a Clerk JWT. The opaque credential is not exchanged by that receiver. Existing history-proxy native-token forwarding is the precedent. Current proxy test incorrectly asserts opaque bearer. The observed live panel failure's HTTP/cause remains unproven; the source mismatch is independently established.

Implementation: forward the already obtained nativeToken for list and decide, and correct false comments and test expectations. Keep the opaque header presence precondition, browser lifetime fencing, same origin, native authentication, fixed typed routes/requests, no-store, deadlines and unchanged refusal/uncertain-outcome behavior. Browser bearer remains rejected. No new auth layer, credential minting, fallback, generic forwarding framework or change to other opaque-session owners.

Focused verification: run existing proxy and access tests only (valid list/decide, pre-dispatch refusals, lifetime/contract refusal, uncertain forwarding); add an empty-list native admission and current-authority denials. Synthetic credentials and fixtures only. A meaningful mutant restores opaque bearer forwarding and the new native-boundary test must fail. Preserve unrelated assertions and explain any rename or assertion change. Scoped lint/format checks; no broad suite or closed browser/type/build rerun. Exact commands, UTC, exit/counts, mutant result and tests NOT RUN must be recorded. No existing external fixture access or real decision is required.

Sequencing/resources: one writer for these files. Reuse the retained Node24 dependency environment, mapping workspace aliases to this exact worktree; no install, shared dependency repair, service/port/DB/container operation. Root re-seals any changed base and Primary reviews affected changes. Integration owns only the new worktree and its local output/scratch. Keep donor/frozen worktrees, caches, services and Acceptance tabs. No cleanup of shared resources. The read-only grouped comparison and Release's storage findings remain separate.

Definition of done: exact base/head/tree and three-path diff; affected tests/commands/results, inherited failures retained and unrun gates explicit; meaningful mutant killed with production source restored; deletion search confirms false opaque-forwarding expectation/comments gone without altering canonical session handling; accepted fixture blobs unchanged; committed/pushed draft PR with brief; independent Primary review is pending until separately returned. Author reports to Root and requests review, never declares independent acceptance. No new broad review or telemetry framework.

Sources of truth: current canonical rules 1-4 above; local host/repository/apps/web AGENTS; docs/IMPLEMENTATION-STANDARDS.md and ARCHITECTURE.md; installed Next route-handler guide; PROCESS.md 6.1/6.2 in the current Meri handoff; source-of-truth/Capiro-Meri-Wiring-Closeout-Plan-20261021.md MF-03 and matching scenarios below; source-of-truth/SUPERSEDED-BY-ITEM-0.md. The register forbids recreating removed model proxy/per-operation minting/reservation mechanisms. Existing browser action sessions and Core authorization remain. Historical plan references constrain retained behavior; this allocation does not reopen the entire MF-03 ticket.

Applicable ticket and acceptance scenarios (verbatim):

#### MF-03 — Clear approval content on authority refusal (P0 before approvals activation)

- **Root cause / evidence:** Paging refusal currently retains existing rows at [`apps/web/src/features/meri/conversation/intents/useIntentList.ts:55–64`](https://github.com/neo-capiro/capiro-frontend/blob/4f9a7e8dcaa9ba03494dc5a49559daf70cea5100/apps/web/src/features/meri/conversation/intents/useIntentList.ts#L55-L64); access adapter classifies errors but has no host access-loss callback.
- **Bounded files/owner:** `conversation/intents/useIntentList.ts`, `useConversationIntents.ts`, `shared/meri-intents/access.ts`, relevant host lifetime boundary; new unit/browser regressions.
- **Implementation:** Classify published authority denials separately from transient unavailable errors. On ACCESS_DENIED/MEMBERSHIP_REVOKED/MEMBERSHIP_CHANGED or expired/revoked session as contract requires, clear sensitive rows, pending confirmation details and related derived caches; signal parent to retire exact session where appropriate. Preserve harmless pagination continuity only for retryable transport/service outages, visibly explain the distinction. Ignore stale completion from prior identity.
- **Dependencies / exclusions:** Use current intents error vocabulary; no blanket error suppression, no local authorization inference, no new backend grants.
- **Acceptance:** Load first page, revoke access, Load More → zero old proposal content/actions; same for refresh/decision denial and identity switch. Transient page failure keeps admitted rows only under still-valid authority and exposes retry. Out-of-order successful old reply cannot restore data.

| E05 | Session expiry and transient Core503 | Retryable unavailable differs from revoked identity; no unauthorized bytes or false success |
| E06 | Sign-out/tenant/client change with stored draft/intent | Old data/credentials/receipts cannot cross the new identity or client |
| E13 | Approval allow/reject/expiry/revoke | Captured decision persists before dispatch; exact command only; stale approval refuses |
| E14 | Approval response lost/reload/paging denial | Read-only reconciliation, no automatic repost, current-access cache invalidation |
| E43 | Mixed versions/frontends/contracts | Explicit version/source refusal or accepted backward compatibility; no silently misparsed approvals/output |
| E44 | Inaccessible/empty/stale provider data | Truthful unavailable/no-results distinction, no fabricated success/evidence |

At dispatch: implementation/tests/mutants/publication NOT RUN; independent review and deployed acceptance remain separate.
