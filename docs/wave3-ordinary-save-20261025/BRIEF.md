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

FROM: Root | TO: fresh ordinary-save implementation owner | TYPE: brief | RE: A3 ordinary saved-document atomic save consumer

# W3 ordinary save continuation — ready for Root dispatch

Prepared 2026-10-25 20:27:45 UTC; read-only remote heads reverified by git ls-remote. Root assigns a separate ordinary-save author at xhigh and a separate Wave3 reviewer. The existing Workspace Library author is now allocated WS12 Hill Day export-receipt recovery; this phase is parallel only on the disjoint paths listed below. This is one finite WS-05/WS-07 source slice, not full ticket closure.

## Repository, exact base and sequence

Repository: neo-capiro/capiro-frontend. Stack a NEW branch on accepted FE159 `f0cef941893d64e237cc3bef1dcddde54987cbf5`, tree `38515f94533fbf7ea3ef2765f7725512dfd903eb`. Suggested new branch/worktree: `codex/wave3-ordinary-save-20261025` / `C:/dev/wave3-ordinary-save-20261025`; author verifies absence and records actual allocation before writing. Preserve accepted FE159 branch and checkout `C:/dev/wave3-ws07-ordinary-export-20261025` and all evidence. Do not continue editing FE158 or159.

Accepted read-only producer: Core137 `c739cdfd580b88d9ec131aff9dc17248a4b65eb6`, tree `2bbfade0de5227f8fe064ebf2b92d1b9b5f2c23a`, containing accepted Core129 atomic-save implementation `45eaba1b720849e914052fcf3d7003ac73ac27cd`. Reference checkout `C:/dev/wave3-ws12-export-signing-20261025`. Remote PR137/129 heads matched these exact SHAs at preparation. FE158 library consumer `e637ac02a8c5851f9a2cc3d20cc91f9b9717b3de` was also reverified: it is an independent sibling, not part of FE159 or permission to reimplement library work. Root freshly confirmed all relevant Wave3 PRs OPEN DRAFT/unmerged; this brief does not create a new hosted state observation.

Earlier export-only brief withheld save adoption from that phase. This new Root allocation explicitly permits an isolated consumer of the already accepted Core129 contract. It does not adopt an unknown final Wave2 contract or lift final integration/deployment hold. Wave2 source/release files remain read-only; Root will supply actual completion and fresh pins for final integration, affected delta review, build and deployment.

## Proven remaining gap and supported producer

At exact FE159 `apps/web/src/features/modules/workspace/WorkspaceDraft.tsx`, ordinary `save()` still calls `workspace.draft.update` then `workspace.draft.snapshot`. If the second request fails, saved content and UI result may disagree. Prospect save and basic NewsletterWorkflow are separate branches; this phase does not alter either.

The accepted producer is sufficient for an EXISTING ordinary draft's supported title/section edits:

- `apps/workspace/src/drafts/drafts.controller.ts`: authenticated GET `/drafts/:id/state` and POST `/drafts/:id/save`.
- `ordinary-draft-save.ts` current-state response: `{schemaVersion:1,tenantId,draftId,clientId,stateHash,hashFormat:'workspace-ordinary-draft-state-v1',draft}`. State hash is Core's opaque saved-baseline token. Current owner/client/wall role checks remain server-side.
- `dto/save-draft.dto.ts`: request `{requestId,expectedStateHash,expectedClientId,label?,draft?,documents?}`. For this slice send only `draft.docTitle` plus `draft.config.sectionContent`, optional supported section names only if preserving current editor semantics requires it, and the fixed manual-save label. No documents mutation or association mutation is necessary. Respect producer UUID/hash/length/byte bounds; expectedClientId is explicit UUID or null.
- POST atomically saves requested fields and creates one immutable version with ID=requestId; current authorization and client identity are checked before replay. Same actor/request/exact payload returns the original version receipt, even if the original response was lost. Different payload at same ID conflicts. A stale expectedStateHash conflicts before writing. It does not provide a separate request-status endpoint.
- Response `{schemaVersion:1,replayed,receipt}` binds operation `save_ordinary_draft`, tenantId/draftId/actorId/requestId/requestHash/clientId/stateHash/versionId/savedAt/snapshotHash and hashFormat `workspace-snapshot-canonical-json-v1`. RequestHash uses SHA256 of canonicalWorkspaceSnapshot({operation,tenantId,draftId,actorId,input:JSON.parse(JSON.stringify(input))}). Reuse the existing public `@capiro/shared` canonicalWorkspaceSnapshot helper and browser SHA256 if validating this request binding; do not invent a hash format. Do not claim snapshot-content proof from a hash whose full producer snapshot the UI did not receive.
- `drafts.service.ts` merges supported config changes into current config under the accepted save transaction. Omit untouched documents/config fields; never round-trip a narrowed UI projection as the whole stored record. Core rejects prospect drafts on these two routes. It has not supplied whole-draft exact restore or create+save receipts in this slice.

Read those exact files before implementation, including current DTO/default/hash details; these observations are a bounded handoff, not a substitute for inspection.

## Bounded implementation and one-writer ownership

1. Add fixed, typed `workspace.draft.state` and `workspace.draft.save` operations against those existing routes. Use strict request shapes and validated producer responses. Bind state and receipts to the actual authenticated tenant, Clerk actor, draft and current client scope; caller-supplied IDs or cached data do not establish access. Inspect existing operation distribution/registration and reuse it without adding a generic transport or authority layer.
2. Replace only ordinary editor's PATCH+snapshot sequence with ONE atomic POST. Load and bind the producer state before accepting a save; edits made since that baseline retain that baseline. Never fetch a newer hash at submit and silently apply old editor contents over it. Freeze the submitted input while pending and prevent double dispatch. Keep the successful saved-version/export presentation already accepted in153/159.
3. Reuse the existing scoped durable recovery journal (`apps/web/src/shared/session/recovery/*`) and ordinary hooks/controls. Retain the exact original request ID/body and minimal local edit data before dispatch. On transport loss or invalid receipt, show an unconfirmed state and retain edits; no automatic retry, no fresh request ID. Explicit retry replays the exact original body and request ID. Current-state read is a distinct action and cannot establish that an earlier save succeeded. Offer explicit adopt-current or rebase-retained-edits after reviewing the new baseline, only after the prior request has a definite outcome. Rebase is user-directed; never change a retained unknown request's body or baseline. Reuse existing journal guards and identity checks; do not introduce another persistence/recovery framework.
4. On CAS conflict, retain title/sections, show current saved content separately, and require deliberate adopt/rebase. A receipt belongs to the request, not necessarily the latest revision after another editor changes it. Reconcile the bound receipt and authoritative read without replacing unsaved edits silently. Clear/acknowledge retained recovery only after its outcome is known. Remount/session/client/draft changes must not expose another scope's retained text or apply a delayed result to the new view. A current-access refusal hides inaccessible content and never retries under a new actor.
5. Keep unsupported block bodies and unknown rich fields untouched. Prospect/copy authority and newsletter paths retain their existing owners. Do not add create, section/tab create/delete/reorder, document-status/delete, whole-draft restore, autosave, rich-newsletter save, share, sender, or backend/migration behavior. Copied-Core-brief drafts must not gain whole-draft restore or lossy body hydration.

Owned existing paths:

- `apps/web/src/features/modules/workspace/WorkspaceDraft.tsx`: ordinary host integration only; prospect/basic-newsletter branches remain behaviorally unchanged.
- `apps/web/src/shared/capiro/operations/workspace-documents.ts`: additive typed state/save operations and only required ordinary schemas/types. Preserve saved-version schema/operations and other consumers. This is the explicit shared-file exception for this phase.
- New cohesive `apps/web/src/features/modules/workspace/ordinary-save/` modules for the bounded input/receipt/recovery hook and UI; prefer a small composition of existing primitives.
- New focused `apps/web/tests/workspace-ordinary-save.test.ts`, adjacent contract fixture/test if the established Capiro harness requires it, and `apps/web/test/browser/workspace-ordinary-save.spec.ts` with an owned synthetic fixture if needed. Existing ordinary-export/history tests are read-only unless a directly affected fixture must be adjusted and reported.

Read-only: Core producer; `@capiro/shared`; shared recovery/session/auth implementation; prospect/copy/newsletter code; DocumentsLibrary and workspace-hillday.ts; accepted ordinary-export/version-history modules; manifests/lockfiles, shared CSS, architecture registry and package exports. Existing Root/UI author ownership is reassigned only for the two listed shared host/operation paths. If unavoidable shared edits are discovered, give Root exact filenames and reason before editing; do not broaden scope yourself. No dependency install or library replacement is expected. Remove replaced ordinary-only multiwrite code/imports and tests that encode it; keep update/snapshot operations if other active consumers still use them, and prove those remaining callers rather than deleting shared functionality.

## Required evidence, proportionate to this change

Start with the actual mounted ordinary-editor request path and typed operation boundary; test the real consumer shape against inspected Core producer fixtures. Reuse Core129's accepted transaction/receipt/CAS/PG evidence and unchanged FE153/159 history/export evidence. No broad producer rerun or new qualification framework is requested.

Focused cases: one user save emits one atomic POST and zero ordinary PATCH/snapshot requests; duplicate click one request; stale baseline conflict preserves local text; timeout after simulated committed response plus explicit exact replay keeps one identity/body and accepts a matching replay receipt; changed-payload replay refused; mismatched tenant/actor/draft/client/request/hash/version receipt never shows Saved; current read alone never claims original save success; remount recovers the exact pending request; actor/client switch and delayed responses cannot expose/apply old scope; supported formatted sections survive, unrelated unknown config/body is omitted/preserved; pending controls prevent mutation of the submitted snapshot; current access revoked is refused. Test deliberate adopt/rebase separately from exact unknown replay. Keep prospect and NewsletterWorkflow selection unchanged.

Use focused Vitest/Capiro operation tests and the mounted synthetic browser witness needed for visible recovery. New executable tests require a meaningful failing original counterexample or product mutant and restored pass. At minimum catch reintroduced PATCH+snapshot, silent baseline refresh, changed replay identity/body, and accepting a foreign/mismatched receipt with the assertion intended to fail. This is not a mutation campaign across unchanged features. Record exact commands, versions, UTC, exit/counts and inspected versus run evidence. Existing script definitions: apps/web `test`=vitest run, `test:capiro` uses src/shared/capiro/vitest.config.mts, `typecheck`=tsc --noEmit, and `test:browser:modules` uses test/browser/playwright.config.ts. Select touched files; verify scripts on the allocated base. Run affected type checking and targeted lint/format/diff check using available tooling. For inherited failures make one exact-base comparison in the same environment and retain both; do not repeat unrelated full suites.

Root owns isolated browser/port or other scarce-resource allocation. No port is granted by this brief; use a previously allocated author-owned harness only if Root confirms it remains available. No shared service restart, environment repair, reset, cache deletion, clone/live DB or cloud action. The source author may request the smallest missing gate allocation; missing checks remain NOT RUN with owner.

Later real producer/consumer integration and authenticated receipt recovery require reviewed FE+Core deployed together, an ordinary draft fixture, two authorized editors and explicit Wave2 completion/final pins. Those are not source-fixture claims. Release owns exact ARM64 image/config/deploy/rollback; Acceptance owns real UI/Core crossings. This slice's acceptance does not close whole WS05/07 or authorize integration/deployment.

## Canonical inputs and process

Read current `C:/dev/wave2-handoff-20261025-docs/docs/handover/20261022/{STANDING-REQUIREMENTS.md,WORKFLOW.md,PROCESS.md}`, `source-of-truth/STANDING-RULES.md`, `source-of-truth/SUPERSEDED-BY-ITEM-0.md`, both master closeout plans and `plan/FINAL-PLAN-20261021.md`; then the current20261025 handoff and predecessor W3 briefs. Read applicable host/repository AGENTS and implementation standards; FE apps/web/AGENTS requires relevant installed Next.js docs before framework edits. Current Root-only orchestration, helpers xhigh and Release-only cloud roles override older repository Ultra/AWS wording.

Register §E says no app ticket is superseded; WS05/07 requirements below remain. The present allocation is their existing-document atomic-save consumer only. FINAL-PLAN decision11/O143 removes Workspace approval workflows; this brief adds none. Native Claude SDK/RuntimeV1, Core authority, user/firm memory and all other product obligations remain unchanged.

Root orchestrates and merges; the author builds a draft PR, commits AND pushes, and a separate xhigh reviewer reviews the exact head under PROCESS6.2. No author merge, AWS, external send, #202 post, new chat or recursive agent. Routine in-scope choices proceed and are logged; only direct Neo chat approves actual scope/security changes. Public evidence contains counts/booleans and private evidence names, never customer-linked IDs/UUIDs/secrets or text. Preserve all prior worktrees/evidence and local WSL/services/data/auth/config/caches. Clean only newly owned disposable resources after verifying absolute paths and ownership.

Return exact branch/base/head/tree/changed files; dependency pins; commands/UTC/versions/results/limits; base-versus-head failures; mutants killed and restored pass; deletion/search evidence with active shared callers preserved; named NOT RUN gates/owner; remaining ticket acceptance. Source ACCEPT is separate from integration, images, deployment and acceptance. Independent reviewer supplies exact-head ACCEPT/CHANGES, concrete findings and affected evidence once. At release, PROCESS6.3 records source/image/revisions/config binding, DB/snapshot names if any, finite real-path PASS/FAIL/NOT RUN and rollback owner. This phase changes no schema and allocates no migration.

## Tickets verbatim — the finite allocation above does not erase the rest

#### WS-05 — Atomic ordinary draft/newsletter save and concurrency (P1)

**Evidence/root cause:** [Ordinary save][ws-draft] is PATCH + version POST; [newsletter save][ws-newsletter-save] is document PATCH + draft PATCH + snapshot, after a separate create. [Draft][ws-draft-service]/[document services][ws-document-service] are last-write-wins for ordinary content. Hill Day first-page CAS exists, section edits omit it. Successful first writes followed by failures can be presented as a failed save or version unrelated to submitted content.

**Bounded work:** Add a bounded atomic save-and-version operation to the existing owner, with expected revision/state hash and durable request ID+payload hash. Persist all supplied title/body/config and exactly one immutable snapshot in one transaction. Reuse prospect/copy receipt and recovery discipline, not their special authority. Resolve ordinary create plus primary document atomically. Expose read-current/adopt/rebase and exact original replay after unknown outcome; never allocate new request IDs automatically. Use expectedUpdatedAt for all Hill Day edits.

**Acceptance:** Two editors, stale baseline, failure between every former write, timeout-after-commit, retry same/different payload, remount/session switch, body/title consistency, and one receipt/one snapshot. Retain local text until the bound receipt and current read are reconciled. No optimistic “saved” on partial success.

#### WS-07 — Ordinary document lifecycle, content editing and version use (P1)

**Evidence/root cause:** [Draft editor][ws-draft] exposes title, known sectionContent, save and metadata-only history; arbitrary WsDocument blocks without section names render read-only. Rich formatting/preview/export exists only on prospect branch. [Documents][ws-document-service], [Versions][ws-version-service] and [ExportController][ws-exports] already own much of the missing capability. Backend restore skips removed documents and leaves extra current documents, so it is not an exact whole-draft restore despite earlier “lossless” wording.

**Bounded work:** Add ordinary manual create, safe section/tab create/rename/reorder/remove, section formatting/preview reuse, saved PDF/DOCX export with explicit all/main/tab choice, document status and recoverable delete where product semantics allow. Add version detail and compare using exact saved snapshots, then a clearly defined restore-as-new-version transaction with CAS. Preserve unsupported block JSON without lossy round-trip; show read-only reason until a typed editor exists. Do not enable whole-draft restore on a copied-Core-brief draft.

**Acceptance:** Imported source draft with block bodies, unknown rich fields, formatted/plain content, tab add/delete/reorder, malformed/oversized content, version detail authorization, restore with deleted/new tabs and ordinal changes, export saved vs unsaved warning. No data deletion hidden inside editor hydration.

## Matching master scenario retained

| ID  | Scenario                       | Expected result                                                                                                 |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| E45 | Canonical cross-module handoff | Portfolio/Workspace/Settings context preserved with entity IDs; effect appears in receiving module after reload |

E45 is retained for the receiving draft/reload boundary; it is not a request to requalify unrelated Portfolio/Settings flows. WS05/07 acceptance above supplies the directly affected two-editor, receipt, remount and preservation cases. No product tests were run in this read-only brief preparation; no executable tests added; mutation N/A.

## Assigned implementation outline — 2026-10-25

Allocated branch `codex/wave3-ordinary-save-20261025`, worktree `C:/dev/wave3-ordinary-save-20261025`. Base FE159 f0cef941893d64e237cc3bef1dcddde54987cbf5/tree38515f94533fbf7ea3ef2765f7725512dfd903eb; Git remote frontend159/158 and Core137/129 matched the dispatch pins at intake. Accepted frontend checkout was tracked clean and new branch/path were absent before creation. Core remains read-only.

Root dispatch grants synthetic browser port5323 only after a free-port check, with existing harness/dependencies and no signed-in/live testing. This supersedes the prepared brief's unallocated-port paragraph. No listener may be stopped to claim the port.

Composition: typed operations remain in workspace-documents; ordinary-save contract helpers bind current Core me/state/receipts, a cohesive save hook composes the existing retained-intent journal/command lock, and a small recovery panel renders explicit read/replay/adopt/rebase controls. WorkspaceDraft keeps its existing presentation and prospect/newsletter owners. The ordinary baseline comes from the state initially hydrated for editing; authorization rechecks never replace it. Pending and unknown requests retain their exact immutable body and request identity. Current content and retained edits remain distinct until explicit resolution. Request hashes use the existing public canonicalWorkspaceSnapshot helper with Web Crypto SHA256; snapshot hashes are receipt metadata, not a full-content proof.

Custom code is limited to the existing ordinary-save HTTP contract and its editor state transitions: no library currently binds that producer contract to this retained-intent editor. Existing journal, request lifetime, typed gateway, SectionEditor, safe previews, history and export own their unchanged behavior.

Before dispatch, reserve the exact request under the shared execution/storage locks. A validated receipt is reconciled against an authorized current read without silently replacing local edits. Only confirmed outcomes can release recovery. A native state conflict permits explicit adopt/rebase after current read; unknown, malformed, request-conflict and client-conflict results stay fenced. Scope/access changes hide retained text and prevent late-result application.

Root approved the exact prepared five-file exception on 2026-10-25 before application: `apps/web/src/shared/capiro/http.ts`, `gateway-errors.ts`, new `workspace-ordinary-save-errors.ts`, and `apps/web/src/shared/session/recovery/journal.ts`, `journal-crypto.ts`. Ownership is limited to the existing bounded 409 relay and ordinary-save CAS refusal retirement. All three codes were verified in Core137's `ordinary-draft-save.ts`: STATE, REQUEST, and CLIENT conflict. Only a genuine STATE conflict recorded for the immutable original request can retire after explicit adopt/rebase, a fresh matching identity/current-state check and the existing execution lock. Unknown outcomes and foreign receipts remain fenced. No broader auth, persistence or gateway refactor is authorized. Root will read local progress because the app blocks outbound chat messaging; the ownership question is resolved.

Author owns the new worktree and its disposable fixture outputs only. Dependencies, accepted branches, services and all prior evidence remain preserved. Final review belongs to the allocated independent reviewer via Root. Source completion does not close whole WS05/07, Wave2, real producer integration, images, deployment or authenticated acceptance.
