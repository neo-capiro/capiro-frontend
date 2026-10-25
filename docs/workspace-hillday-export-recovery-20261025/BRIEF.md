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


FROM: Root allocation | TO: visible Codex Workspace UI author | TYPE: brief | RE: WS-12 known Hill Day export receipt recovery (Wave 3, lane A3)

# WS-12 known receipt recovery phase brief

## Refreshed base, lane and authority

Repository: neo-capiro/capiro-frontend. Worktree: C:/dev/w3-ws12-export-recovery. Branch: codex/wave3-ws12-export-recovery-20261025. Exact base: f0cef941893d64e237cc3bef1dcddde54987cbf5, independently accepted FE159, branch codex/wave3-ws07-ordinary-export-20261025. GitHub refreshed 25 October 2026 at phase start: OPEN DRAFT, exact head unchanged. Read-only producer: neo-capiro/capiro-backend Core137 c739cdfd580b88d9ec131aff9dc17248a4b65eb6, OPEN DRAFT and exact head unchanged on fresh read. Producer checkout C:/dev/wave3-ws12-export-signing-20261025 is read-only.

Root's new bounded allocation under Neo's direct continue governs. Root only orchestrates at Ultra; implementation and separate independent review use xhigh. No recursive delegation, Hermes run, new coordinator, automation, merge, AWS, live browser/provider/model/database/migration/mail operation. Existing Release alone executes images, AWS, migrations, rollout and rollback. Draft PR only; commit AND push this brief, source and tests. Routine in-plan decisions proceed and are logged here; ownership conflicts go to Root, scope/security changes to Neo through Root. GitHub comments confer no approval. No issue #202 post.

Sources read: canonical committed Meri documentation at 83e27a9f91313d62377ddc755cb7ef3fffc2bc13 in C:/dev/wave2-handoff-20261025-docs: docs/handover/20261022/STANDING-REQUIREMENTS.md (sections 1–4 above verbatim), PROCESS.md sections 6.1/6.2/6.3, WORKFLOW.md, plan/FINAL-PLAN-20261021.md, source-of-truth/Capiro-Portfolio-Workspace-Settings-Mail-Wiring-Closeout-Plan-20261021.md (master App plan), source-of-truth/Capiro-Meri-Wiring-Closeout-Plan-20261021.md (matching E29), source-of-truth/SUPERSEDED-BY-ITEM-0.md. Also read the committed 20261025/briefs/W3-NEXT-A3-DOMAIN-EXPORT-SIGNING.md and W3-NEXT-A3-WORKSPACE-UI-EXPORT.md; their earlier allocations are history where this Root allocation differs. C:/dev/AGENTS.md, actual frontend AGENTS.md and apps/web/AGENTS.md, IMPLEMENTATION-STANDARDS and architecture guidance apply. Installed Next.js use-client documentation has been read. Current xhigh role and existing-environment reuse instructions supersede historical helper-Ultra/install instructions.

## Full retained ticket and matching scenario

WS-12 is unchanged under supersession register section E. No superseded mechanism is introduced. The full obligation is retained below; this phase owns only known authorized receipt recovery. Accepted Core137 covers stable signing source. Lost POST-ID recovery, new request identity/persistence, exact revision/digest promises and renderer/native acceptance remain outside this bounded phase.

#### WS-12 — Recoverable Hill Day export and stable signing (P1)

**Evidence/root cause:** [Export service][ws-hill-export] stores PDF bytes, signs links with WORKSPACE_EXPORT_SIGNING_SECRET, otherwise internal secret or per-process random UUID. [Export UI][ws-hill-export-ui] does not use existing status operation; lost/expired export receipt has no recovery path. Export status also needs WS-02 authorization.

**Bounded work:** Require an explicit stable signing key in qualified deployments and fail closed when absent; do not silently generate a new key per replica. Reuse export status to poll/renew a known authorized receipt and show expiry/retry. Add request identity/status lookup if POST's committed export ID can be lost. Include content digest/version/revision in export receipt if exact-byte/revision proof is promised; do not call raw HTTP success fidelity proof.

**Acceptance:** Two replicas/download after restart, missing key, expired/tampered signatures, wrong document/export IDs, timeout after render commit, render failure, max byte limits, correct filename/MIME, current-access check before refreshed grant, and output content matching pinned saved revision.

| ID | Scenario | Expected result |
|---|---|---|
| E29 | Preview/export/native open | Real renderer/native-reader opens promised format; formulas/layout/citations correct; ZIP not disguised preview |

E29 remains KEEP. Synthetic mounted consumer tests establish receipt/retry/lifetime behavior only; they do not establish PDF layout, exact revision fidelity, real signing, replica/restart behavior or native-reader acceptance.

[ws-hill-export]: https://github.com/neo-capiro/capiro-backend/blob/309af848f1aa403f6c8e54aa0d22990d4230f063/apps/workspace/src/hillday/hillday-export.service.ts
[ws-hill-export-ui]: https://github.com/neo-capiro/capiro-frontend/blob/4f9a7e8dcaa9ba03494dc5a49559daf70cea5100/apps/web/src/features/modules/workspace/hillday/HillDayExport.tsx

## Actual owners and bounded implementation

Own apps/web/src/features/modules/workspace/hillday/HillDayExport.tsx and a narrowly adjacent useHillDayExport.ts hook if needed, plus apps/web/test/browser/workspace-hillday-export.spec.ts and this docs/workspace-hillday-export-recovery-20261025/BRIEF.md. Tests use existing synthetic fixtures and mounted harness unchanged. New unit tests are unnecessary unless a separate pure model warrants them; meaningful mounted causal tests are required. Named conditional exception from Root: adjacent export operation adapter/schema only if the existing producer cannot be consumed without it. Inspection found apps/web/src/shared/capiro/operations/workspace-exports.ts already defines workspace.hillday.export.status and the complete producer receipt, so no adapter/schema edit is planned. workspace-hillday.ts is not the export operation owner and is untouched. Report this ownership to Root before product edits.

No shared manifest/lockfile/registry/auth/session, CSS, WorkspaceDraft/WorkspaceScreen/library, ordinary export, version-history, prospect/copy, whole-draft restore/save/CAS, Core producer, configuration or migration changes. No new API, authentication layer, cache, persistence or retry framework. Reuse useCapiroMutation for one deliberate create, useCapiroQuery for known status and component polling while queued, useCapiro's existing lifetime/cancellation and binary download validation, existing Modal/ActionButton/Field/SelectInput and styles. The feature owns presentation and local interaction only; Core authorizes status/renewal/download. Component timers are needed to present link expiry and poll queued status; the existing query hook owns requests, cancellation and errors.

Producer facts inspected at exact Core137: create persists bytes and returns ExportView; GET documents/:id/exports/:exportId checks current document access before and after reading the tenant/document-bound row; ready status renews a one-hour grant only if the dedicated key is configured. Missing key yields ready with null URL/expiry. File access verifies signature/expiry and the issuer's current document access. Frontend schema accepts these shapes. Status GET does not rerender or create a new export. It is not a digest or immutable-revision contract.

Sequence: preserve FE158 at e637ac02a8c5851f9a2cc3d20cc91f9b9717b3de, tree aa1a979b6fce041da3d01bc80094d086494c86a6; preserve accepted FE159 and Core137. This branch stacks only on FE159. No final Wave2 base is selected. Wave3 rebase, integration, deployment and release-dependent acceptance remain HOLD until explicit Root Wave2 closure. Changed base or dependency requires Root coordination and relevant delta review; unchanged accepted evidence is retained.

Implementation outline: retain the known export ID in the current modal lifetime; read status and poll only queued responses; show ready/queued/failed, expiry or missing-grant explanation, and deliberate GET retry/renewal. With a known receipt, disable further creation; renewing or downloading never POSTs. Refuse mismatching document/export receipt identity. Hide old download material while checking or after a denied/error status. Stop timers and requests on unmount/identity replacement through existing lifetime owners. Never download a late result. No promise of recovery after close/reload or loss of the original POST ID.

## Checks, deletion and resources

Use the preserved Node 24 runtime and existing dependencies, with task-owned junctions pointing to the already reused frontend dependency cache; no install, repair or rebuild of the environment. Use existing local synthetic mounted harness on prior author allocation 5310 only if free; preserve protected 5199 and other authors' ports. Check immediately before running. Only task-owned fixture child processes may be stopped. Preserve WSL Codex-Gates, services, data, configuration, evidence and caches.

Run focused Playwright mounted tests for expired known receipt/GET renewal and expiry display, ready-null-grant, queued polling and pending state, status failure/manual retry, failed render, current access denial, mismatched identity, document/client/actor change or unmount while requests/download are held, and no accidental POST recreation. Use actual Core137-shaped fixtures. Check filename/MIME and existing binary download refusal where affected. Use causal mutants for renewal calling create, ignoring denied status or identity mismatch, stale download, and expiry admission as relevant; each must fail its intended assertion, then restore and pass. Existing FE159 and Core137 accepted behavior/gates are reused with their limits, not rerun broadly. Run affected TypeScript, targeted lint/format, git diff --check, and exact deletion grep. If suspected inherited failure arises, do one same-environment exact-base comparison and preserve both failures; no blanket regression.

Delete replaced create-only receipt/download path and its unused imports/state in the same PR. Grep for old exportDocument.data consumption and active duplicate download implementations in the owned scope; label historical references. No applied migration, shared service or data deletion. Report any test-count decrease; none is planned. No diagnostics or flags retained.

## Done, review and release limits

Design review note after implementation: the focused hook is about 120 nonblank lines, the dialog function is mostly declarative markup above the 80-line review signal, and the single mounted test file is above 400 nonblank lines including its producer-shaped fixture setup and 13 cases. These are named independent-review triggers for cohesion, not claimed architecture-gate passes or permission to edit shared exception metadata. Root was notified; no automatic splitting or shared-file exception was introduced.

Author completion records exact base/head/tree/changed files and commands, versions, UTC/exits/counts, meaningful mutants killed/restored, deletion proof, failures/skips, reused evidence and unrun gates. Commit AND push; draft PR only. An independent xhigh reviewer returns PROCESS6.2 ACCEPT or numbered CHANGES against exact head/base, with reviewer-run versus reused evidence and blocked owners. Author does not self-approve.

SourceDone covers only known-receipt consumer behavior. NOT RUN here: full package/build/integrated contracts (Root gate owner); PostgreSQL (unchanged, not needed for this UI slice); ARM64 build/smoke/exact-digest zero HIGH/CRITICAL scan/config bindings/deploy/rollback (Release); authenticated current-access denial and cross-replica/restart/native PDF fidelity on actual deployed source (Acceptance coordinated by Root). No cloud access or live operation is authorized for this author. PROCESS6.3 later records exact source/images/config/snapshot names, finite criteria and measured PASS/FAIL/NOT RUN, no-deploy acceptance window and Release rollback. Missing fixtures or unknown outcomes are not passes. Private evidence is named, never copied publicly; no customer-linked IDs/UUIDs, credentials or secrets in public prose.
