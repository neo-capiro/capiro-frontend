# Received closed allocation

Root's exact bounded allocation supersedes the proposed split in BRIEF.md. The following is the received allocation, retained for ownership and review.

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




# WS10 Hill Day UI receiver allocation

Root allocates the next bounded consumer slice after independent acceptance of the frozen producer source and its fixture preparation. Actual PostgreSQL execution remains a release gate; source acceptance does not imply live readiness.

Owner: existing Ordinary Atomic Save thread, now sequentially reassigned after FE178 acceptance/freeze. Preserve its prior checkout/branch and PR178. Reuse or create an isolated frontend checkout following repository instructions, record path/branch before writing, never reset another owner's tree. Base exact accepted FEa76baa609302db93faf8d038096b7877e6890464/tree6aa6501b5253b9546e0ca24635587cdc95edee65. Producer Core143head6f4f82145f797a9a1a4fffb4c33ee4c1a260c882/tree067b3660550b6aef306fc9275f40b8307f7b0458; product is d408-identical and independently accepted subject to native PG. Root W3-WS10-UI-RECEIVER-TRACE.md is the exact contract/path/counterexample packet; W3-WS10-FIXTURE-CORRECTION-REVIEW.md records current gate.

## Explicit closed ownership transfer

Root transfers only these seven FE source paths to this one consumer author for this slice. Integration retains package manifests/locks/public exports/registries/size policies and final composition. Its current FE179 newsletter work does not change these preimages; trace verifies a76→9eb→3901 paths identical.

- apps/web/src/features/modules/workspace/hillday/HillDayGeneration.tsx
- apps/web/src/features/modules/workspace/hillday/HillDayWizard.tsx
- apps/web/src/features/modules/workspace/hillday/HillDayMeetings.tsx (saved-selection seed only)
- apps/web/src/features/modules/workspace/WorkspaceScreen.tsx (named HillDay resume host splice only)
- apps/web/src/features/modules/workspace/workspace-route.ts (validated HillDay document/phase destination only)
- apps/web/src/shared/capiro/operations/workspace-hillday.ts (generation/latest/retry/cancel request and response contract only; preserve Library query owner)
- apps/web/src/shared/capiro/operations/workspace-schemas.ts (only already-produced saved resume fields actually needed)

Dedicated affected tests and one HillDay-local state helper are allowed if existing owners cannot express the glue. Reuse existing identity lifetime, recovery journal, operation registry and known-ID poller. Do not add another browser ledger, queue, serializer, transport or framework. Shared recovery/journal implementations stay frozen: if their existing API cannot retain this exact request without a contract change, return that precise required handoff and continue independent UI work. No Core/schema/migration, editor/export, newsletter, runtime, provider, send, ordinary creation or unrelated shared source changes.

## Required behavior

1. Retain the original UUID/document/current identity before generation POST; lost acknowledgement/reload replays only that exact command. Terminal replay is valid. Latest job discovery alone is not proof that an uncertain request committed.
2. On saved document entry, read current-authorized latest job and attach existing known-ID polling without generating. Distinguish null, unavailable and refusal. Preserve existing polling termination and lifetime cleanup.
3. Retain acknowledged document/client and validated wizard phase in existing navigation. Bootstrap authorized saved meetings/context before editing. Reload must not create another document or replace saved selections with empty arrays. Unacknowledged document-create recovery is explicitly outside this contract.
4. Align local receiver with exact producer lifecycle/unit states, timestamps and terminal generate replay; no invented DTO.
5. Deliberate retry uses the current job's retry endpoint and preserves completed/manual content. Unknown provider outcomes are visible and require an explicit choice; no automatic retry or new generate masquerading as retry.
6. Cancellation-requested remains distinct from actual cancelled. Observe the returned job until terminal; unknown acknowledgement is not success. Late callbacks cannot cross actor/client/document selection.

## Evidence and handoff

Use existing targeted mounted/unit infrastructure and already qualified resources. Six trace counterexamples are the finite affected scope, plus one pending lifetime-switch witness. Retain failing-before evidence for the actual missing receiver seam and a narrow meaningful mutation of request retention or retry routing; reuse unchanged Core223 and FE166 export/poll/renewal/lifetime evidence. No broad campaign, author build/install/download, actual DB/cloud/provider/live prompt. Missing precise dependencies go to Release.

Return full-standing handoff with exact base/head/tree and source blobs, direct test commands/UTC/exits, mutation/restoration, any inherited failures and exact new size/import fingerprints requiring separate review. Push one draft PR and attach it. No self-waiver, merge or deployment. Final independent review and Integration composition occur once. WS10 remains open through real PG and deployed UI acceptance.

## Verbatim WS10 ticket

## Verbatim WS10 ticket
#### WS-10 — Hill Day durable job lifecycle and resume (P1)

**Evidence/root cause:** [Generation service][ws-hill-generation] uses an in-process Set and setImmediate. If an active DB job is absent from that process's Set it treats it as interrupted, so another replica may invalidate/restart live work. [UI][ws-hill-run-ui] retains job ID locally; wizard selection is not durable navigation.

**Bounded work:** Reuse existing [durable generation-worker][ws-worker] lease/claim pattern for WsHillDayJob; add lease owner/expiry/heartbeat or equivalent conditional DB claim, persisted phase/unit progress and exact start request identity. Add authorized latest-active-job read, reload/resume, deliberate failed-unit retry and cancellation with honest “requested” state if provider work cannot stop. Persist wizard document ID/phase in route; read authoritative saved selections on entry.

**Acceptance:** Two replicas race one start, restart during unit execution, worker lease expiry, browser reload/close, start timeout-after-commit, partial failure and retry only failed units. No duplicate provider charge from a second process assuming the first stopped. Preserve successful content/manual edits on retry.




Begin this finite next consumer implementation now; no user confirmation needed under existing autonomous instruction. Preserve accepted FE178 source. User asks simple efficient work, so reuse owners/evidence and avoid extra audits. Output handoff in your existing outputs and notify Root.
