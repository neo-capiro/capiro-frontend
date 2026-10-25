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

FROM: Root | TO: Frontend | TYPE: brief | RE: Wave 2 model notice after conversation access loss

Repository neo-capiro/capiro-frontend. Base e478e4d73132bd1566b3945d63c5e0a3a1306cc1, published branch codex/wave2-frontend-e478e4d-20261025. Fresh git ls-remote confirmed this exact base at 2026-10-25 12:47:19 UTC. Planned isolated worktree C:/dev/wave2-ui-model-access-notice-20261025, branch codex/wave2-ui-model-access-notice-20261025. Preserve frozen C:/dev/wave2-a-frontend-integration and all other source/services/dependencies.

How we work: root orchestrates only; implementation and independent exact-head reviewer use xhigh, overriding historical helper Ultra. Existing Release alone owns cloud, migrations, rollout and rollback. No recursive delegation. Author implements, commits, pushes a draft PR stacked on the published base, and reports exact checks/mutation/head. Root allocates independent review and batches proven release fixes before build/deploy. No merge, deployment, AWS, #202 or other coordination post.

Actual finding: useConversationSession passes !accessLost to useModelCatalog. That hook hides its document and reports not loading when disabled. SessionComposer currently labels this intentional suppression Model choices unavailable and offers Reload models; a successful reload cannot expose the document while access remains lost. Eight assertions against the unchanged hook establish this presentation defect. It does not establish the cause of retained admission refusal or a model endpoint outage.

Write allocation: apps/web/src/features/meri/conversation/ConversationView.tsx; existing presentation owner apps/web/tests/meri-m1-identity.test.ts; this phase handoff at docs/handover/20261025/W2-UI-MODEL-ACCESS-NOTICE.md. No other product file is allocated. Task-local scratch may contain bounded runner configuration/results. Do not modify the session/admission/history/selection/default-model gates, dependencies, service configuration or shared tooling. Suppress only model failure/reload presentation during access loss; after access is available, genuine catalog failure and retry remain visible. Add denied, genuine failure and recovered-access regression assertions, preserving Send disable/private-content hiding.

Sources of truth: C:/dev/AGENTS.md; frontend AGENTS.md; apps/web/AGENTS.md; current canonical STANDING-REQUIREMENTS, PROCESS6.1/6.2, W2-ACCEPTANCE-OWNER, item 0 native harness plan, Runtime migration plan and supersession register. Full accepted excerpts are included below as context; only the narrow finding above is allocated. Register rulings: MF-02 re-scoped; MR-07 superseded except retained continuity/clear refusal; MR-08 re-scoped; MF-06/07/09 and MX-11/12 retain behavior without removed mechanisms; E11 re-scoped. No historical helper/owner settings or removed architecture is revived.

Latest backend context relayed by root: the older retained entry emitted INITIAL_BINDING_CONFIGURATION_CHANGED; original saved run absent, and stale original binding plus retained exact run hint likely prevents the existing safe unused-binding rebind. This is separate from a fresh stopped-run reload/readback failure under Runtime investigation. Frontend source confirms retry retains original run hints. Neither backend issue authorizes an admission/selection change in this correction.

Checks planned: use preserved compatible read-only dependency donors through task-local previously absent paths; no dependency install, environment repair, service startup or browser/auth/provider/cloud probes. Run the focused existing presentation suite. First show the new regression fails against the old rendering condition (the meaningful mutant), then passes with the guard restored. Run formatting/lint checks relevant to the two files if available without repair. Required broad image/deployment/live checks remain with root/Release and are NOT RUN here. Reuse unchanged exact-source gates rather than broaden this small fix into full qualification.

Definition of done: one minimal source guard plus existing-owner regression; exact base/head/tree/files; focused commands, UTC, versions and exits; killed guard-removal mutant; all failures/unrun checks explicit; no stale replaced code, new flags or compatibility scaffolding. Commit and push draft stacked on the published base; attach PR and hand exact head to root for independent review. Only direct Neo chat approves scope; no customer-linked IDs, UUIDs, private prompts or secrets in artifacts/PR. Retain original frozen checkout and persistent environment. Task-created scratch and local dependency links are owned here, donors remain untouched.

Applicable accepted tickets and E-scenarios (verbatim; bounded by allocation above):
#### MF-02 — Qualify identity, exact-run renewal and access-loss isolation (P0 before live activation)
> **[RE-SCOPED 2026-10-23]** A revoked user still loses access within 30 s. Use the ordinary Clerk session refresh plus one Core access check per turn; there is no "exact-run renewal". Ignore any instruction below that names the owner/proxy pair, budget reservation, per-operation authority, the task verifier, ECS task proofs, revision pins or the temporal-issuer. See `SUPERSEDED-BY-ITEM-0.md`.

- **Root cause / evidence:** Fresh token issuance and 45-second renewal already exist. Source presence does not prove backend bearer lifetime, account mapping, deployment origin or revocation behavior.
- **Bounded files/owner:** `identity-token.server.ts`, `opaque-session-controller.ts`, `session-bootstrap.ts`, `host-controller.ts`, `useConversationConnection.ts`, `SelectedClient.tsx`, shared query scope and their tests. Fix only demonstrated gaps.
- **Implementation:** Build composed acceptance scenarios for verified native actor, tenant/client switch, archived/deleted client, signout, revoked membership, token expiry while streaming and while mutation pending, multiple renewal cycles, browser back/forward, StrictMode/remount. On exact-lifetime loss abort readers, hide actor/client-bound data and invalidate sensitive cached views without auto-canceling backend work. Reissue using fresh identity for exact existing selectors; never allocate next turn on reconnect.
- **Dependencies / exclusions:** MR session-owner expiry/error taxonomy and environment operator qualification. No browser tenant/actor override, persistent bearer storage, weakened issuer/audience or synthetic client.
- **Acceptance:** At least two real renewal cycles preserve run ID and accepted cursor, no duplicate submit/next-turn; stale account/client DOM is hidden immediately, denied data not resurrected by cached pages; explicit retry cannot mint broader authority; native subject-to-actor mismatch fails closed.


#### MF-06 — Expose Stop retirement and next-turn readiness honestly (P1)

- **Root cause / evidence:** Stop fence acknowledgement precedes physical retirement; next-turn can correctly conflict. Frontend retry window is150s, whereas backend cleanup can outlast it. Existing history/new-chat/next-turn consumers must be preserved.
- **Bounded files/owner:** `RunStatus.tsx`, `ConversationHistoryStatus.tsx`, `useConversationSession.ts`, `turn-journal.ts`, first-chat/bootstrap/next-turn integration tests.
- **Implementation:** Display separate Stop requested, fence recorded, run terminal and next-turn readiness/cleanup pending where public evidence supports them. Exhausted turn-conflict retry becomes retryable not-ready, not a new conversation/run request. Reconcile same source reservation after reconnect; keep original intent/request identity. For accepted-but-not-started input show recover/readback action rather than a new Send. Avoid unbounded spinner and explain cancellation receipt versus cleanup.
- **Dependencies / exclusions:** MR retirement/current-render fix and readiness/readback semantics. Do not extend frontend timers as substitute for backend recovery or reinterpret409 as permission to allocate.
- **Acceptance:** Stop during tool/provider work, dropped cancel receipt, cleanup delayed beyond150s, fresh deployment and repeated next-turn click all converge to at most one successor; no overlap before retirement; approved prompt preserved and no claim of physical stop without evidence.


#### MF-07 — Design durable drafts and request recovery across reload (P1)

- **Root cause / evidence:** Unsent drafts are React state; QueryClient journals preserve SPA navigation only. `turn-journal.ts` explicitly warns hard reload loses intent identity; clearing a next-turn composer before successful reservation can lose visible text on reload.
- **Bounded files/owner:** `useConversationSession.ts`, `MeriLiveConversation.tsx`, `MeriComposer.tsx`, `query-journal.ts`, `turn-journal.ts`, first-chat intent helper; a small versioned per-scope journal, not broad local persistence.
- **Implementation:** Define retention for unsent drafts separately from dispatched immutable requests. Save permissible draft text per tenant/actor/client/conversation (or explicitly state drafts not saved); restore only to exact scope and clear on signout/retention expiry. Persist minimal non-secret request identity before mutation if permitted, then use server readback/reservation on reload. Unknown submission must not create new logical request. Distinguish edited newer draft from acknowledged text and preserve IME/blocked-enter behavior.
- **Dependencies / exclusions:** Privacy/retention ST-18; MR durable admission/readback owner; MF-04 journal conventions. Never persist bearer/session credentials or trust restored bytes as authority.
- **Acceptance:** Reload before dispatch, after dispatch/before ACK, after ACK, during next-turn409, offline, storage-full and account/client switch: no accidental resend, no cross-scope draft, no unexplained loss of accepted request. Hard-reload outcome recovered from durable server state, not guessed from local cache.


#### MF-09 — Add conversation management only after its public contract (P1 core history; P2 optional destructive actions)

- **Root cause / evidence:** Recent list/transcript/new conversation exist; search/title/rename/archive/delete/restore are fixture-only, and public history family offers no such mutations.
- **Bounded files/owner:** New `shared/meri-conversations/management-*` receiver/proxy only after published contract; `ConversationRecents`, history/management screens and ordinary routes. Backend conversation owner owns schema/mutations.
- **Implementation:** Decide title ownership/autotitle versus user title; search scope/index; archive versus retention deletion; recovery/trash and active-run semantics. Publish owner-scoped paginated searchable summary and revision/idempotency-protected mutations. Then mount real history/search/palette and management actions with loading/empty/denied/error/uncertain/reload states. Preserve conversation/client/run routing and clear removed records from all lists.
- **Dependencies / exclusions:** MR/backend owner contract; ST-18 deletion/retention; PF/ST28 context. Do not use fixture state as durable truth or relabel archive as deletion.
- **Acceptance:** Rename/archive/restore survives reload and another tab; search/filter/pagination respects wall/client/actor; conflicting revision safely refreshes; delete requires chosen recovery semantics and explicit confirmation, active run policy enforced server-side, uncertainty reconciles same request.


#### MR-07 · P1 · Publish a precise checkpoint/version and dormant-original continuity contract
> **[SUPERSEDED 2026-10-23: do not implement]** The dormant-original, admitting-render, reserved-successor and mirror machinery is replaced by SDK `resume`. Keep only: the next turn after a deploy continues the conversation; an SDK upgrade needs the transcript-recap handover first (O103); an incompatible state shows a clear message. See `SUPERSEDED-BY-ITEM-0.md`.
**Class:** D + Q, not permission to relax current refusal. **Owner:** runtime compatibility, release/adoption gate, FE messaging.

**Evidence:** SDK and CLI are pinned; the original admission remains tied to its admitting render. Completed-conversation next turns survive image-only changes but refuse SDK/CLI changes; pre-existing successor reservations adopt the accepting image only when compatibility holds. [apps/worker/conversation/options.mjs:20–33](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/worker/conversation/options.mjs#L20-L33), [apps/runtime/test/conversation-survives-deploy.test.mjs:71–104](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/runtime/test/conversation-survives-deploy.test.mjs#L71-L104)

**Bounded work**
- Document separate states: admitted but unrun original; running original; retired completed turn; failed/cancelled turn with older completed checkpoint; reserved successor; pause/resume/fork checkpoint; SDK mirror append uncertainty.
- For each, specify image-only update, SDK/CLI/opaque-format update, policy/client change, rollback and expiry outcomes. Preserve current denial on incompatible SDK/format.
- Decide supported remediation: retained compatible runtime / explicit migration owner / explicit new conversation with clearly disclosed lack of session continuation. PR178 approved configuration adoption remains its own decision and must not silently become checkpoint migration.
- Add typed user-visible reasons for incompatible continuation vs transient service failure, without exposing private configuration or claiming a new conversation resumes the old SDK session.
- Do not silently replace an admitted-but-unrun original or recompute its expiry on refresh; any explicit replacement requires proof of no authority and a separate approved identity transition.

**Files:** `prepared-candidate.mjs`, `prepared-run-configuration.mjs`, checkpoint compatibility validators/session factory and generated public errors where needed; deployment docs and FE are separate owners.
**Acceptance:** image-compatible continuity retains conversation, prompt identity, original source checkpoint and monotonically increasing writer fence; incompatible change produces zero reservation/admission/model calls; cleanup MR-01 still works even when execution is incompatible.


#### MR-08 · P1 · Qualify the complete admission-to-next-turn lifecycle, not only happy-path endpoints
> **[RE-SCOPED 2026-10-23]** Keep the behavioural crossings (duplicate submit, ACK loss, Stop repeated, stream reconnect with cursor, next turn after a failed or cancelled turn, deploy between turns, pause/resume/fork). Drop crossings that exist only for kickoff claim/lease, allocation and grants, native currentness or terminal usage capture. Ignore any instruction below that names the owner/proxy pair, budget reservation, per-operation authority, the task verifier, ECS task proofs, revision pins or the temporal-issuer. See `SUPERSEDED-BY-ITEM-0.md`.
**Class:** Q. **Owner:** runtime supplies the semantic cases; release coordinator owns integrated test/release execution.

**Bounded work:** turn §4 into a composed regression suite at the exact release commit and packed contracts. Retain existing unit/protocol tests and add missing crossings of process boundaries, real transaction ACK loss, identity renewal, native currentness and provider terminal evidence. No parallel workflow/model loop.

Minimum crossings:
- initial input allocation/admission/submit duplicates and ACK loss before/after run acceptance and Temporal start;
- kickoff claim/lease expiry, task replacement, queued cancellation before allocation and durable foreclosure;
- load/currentness outage, SDK init failure, mirror append ACK loss, restored transcript/session key mismatch;
- stream disconnect/reconnect with strict cursor, duplicate event ID, late output after Stop/hold/suppression;
- terminal usage followed by capture/publication loss; completion observed but physical task not yet retired;
- Stop repeated after caller disconnect, control restart, Temporal NOT_FOUND and reconciliation exhaustion;
- next turn after completed/failed/cancelled source, with and without an older completed checkpoint, reserved before deploy and accepted after;
- steer/pause/approval wait/capture/resume/fork including retained original during fork and fresh target session;
- process-local session renewal after bearer expiry/control restart, same exact binding, with no implicit next-turn reservation or Stop.

**Evidence basis:** existing semantic tests cover many individual boundaries, including terminal events, hold failure, lifecycle commands and image continuity, but use scripted/native test owners. [apps/worker/conversation/test/terminal-settlement.test.mjs:1–22](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/worker/conversation/test/terminal-settlement.test.mjs#L1-L22), [apps/worker/conversation/test/completion-activity.test.mjs:1–15](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/worker/conversation/test/completion-activity.test.mjs#L1-L15), [apps/worker/conversation/test/lifecycle-activity.test.mjs:36–48](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/worker/conversation/test/lifecycle-activity.test.mjs#L36-L48), [apps/runtime/test/conversation-survives-deploy.test.mjs:22–49](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/runtime/test/conversation-survives-deploy.test.mjs#L22-L49)

**Acceptance evidence:** each case records actual source/target bindings, exact image/SDK/CLI/contracts, request/control/event identity, journal transitions, allocation/task/grant disposition, checkpoint lineage and sanitized error/outcome. Require absence assertions for duplicated provider calls or unintended actions. A mock pass cannot be labeled physical stop, real SQL durability, deployed SDK compatibility or live currentness.

#### MX-11 · Prove cross-boundary denial, revocation and uncertain-outcome safety
**Priority / type:** P0 before affected capability activation; controlled future security qualification.

**Evidence and root cause:** The actual chain spans FE native identity, Meri action session, Core live authority, run/currentness, delegated read or governed command, artifact/Memory release and UI recovery. Passing one handler's mocks cannot prove the entire boundary. This audit identifies source risks and missing receipts; it does not claim a live exploit.

**Bounded work:** Independent reviewer derives cases from MF/MR/MT/MM tickets and exact contracts using synthetic principals/clients and disposable DBs. Test tenant/client/account substitution, revoked membership/approval/consent, old/new run lineage, expired credentials, malformed canonical bytes/paths, one-use token replay, lost acknowledgment after commit, cancellation at each external await, hostile source text, forged citation/artifact references, oversized/unsupported payloads and currentness changes after work but before output. Keep output/history/artifact access rechecks and canonical DENIED/UNAVAILABLE/UNKNOWN distinctions.

**Dependencies:** Source fixes first; MX-04/05 narrow-role/native setup; actual production adversarial probes only if separately approved.

**Acceptance:** No forbidden bytes/effect or cross-client/tenant existence leak in selected cases; denied/unavailable operations do not fall back to ungoverned service secrets or raw provider clients. Exactly-once effect or durable UNKNOWN with read-only reconciliation is demonstrated under worker death and acknowledgment loss. Numeric revocation target is explicitly approved and measured, not assumed from an old plan's suggested30s.


#### MX-12 · Verify restart, retention, restore and forward rollback as one recovery story
**Priority / type:** P0 data/authority recovery before affected release.

**Evidence and root cause:** EX-04 rollback is a fresh forward render/deploy of prior image inputs, not UpdateService to an old revision, because revisions/material are pinned. MR distinguishes completed checkpoint continuity from in-flight historical cleanup. MM retention spans metadata and object bytes; MT command receipt/liability must survive loss of response. Source existence does not prove a restored database/object pair is coherent.

**Bounded work:** Use existing lifecycle journals/<del>issuers/</del>retention watermark and source/image ledger. Define scenario-specific expected durable facts and cleanup obligations for control restart, runner crash, Temporal outage, Core503, <del>owner/proxy replacement</del>, deploy mid-turn, stop during deploy, object-write/DB-commit loss, and restore from backup. MM owns purge/tombstone semantics; MT owns domain effect reconciliation; MR owns original/next-turn retirement. Release owner composes them into a bounded disposable-native rehearsal, then an approved live drill if required. Define operator RPO/RTO and retention restoration policy; do not invent a second event store or repair mutable history manually.

**Dependencies:** MR continuity and Stop gates; MX-04–07; external effects stay held until exact receipt/reconciliation passes.

**Acceptance:** Restoration never revives revoked grants, deleted memory/artifact content or <del>spent/UNKNOWN budget as available</del>; no duplicate task/mail/provider effect after restart. A prior compatible checkpoint resumes only under current authority; incompatible runtime versions refuse without persistence. Forward rollback retains current schema compatibility, prior image evidence and existing <del>conversation liabilities</del>. Backups/restore/deletion of product data require separate approval.


## Applicable E-scenarios (verbatim)

| ID | Scenario | Expected result |
|---|---|---|
| E01 | Authenticated selected-client first chat | One admission/run, real response, durable transcript and correct current actor/client |
| E02 | Reload/new tab after completion | Same messages/citations/artifacts, correct ordering and no prompt redispatch |
| E05 | Session expiry and transient Core503 | Retryable unavailable differs from revoked identity; no unauthorized bytes or false success |
| E06 | Sign-out/tenant/client change with stored draft/intent | Old data/credentials/receipts cannot cross the new identity or client |
| E08 | Failed/cancelled turn after completed checkpoint | Next allowed turn uses <del>last valid published checkpoint</del>, not failed partial state |
| E09 | Image-only release after completed turn | Existing conversation and <del>pending reserved successor</del> continue under <del>candidate11-compatible rules</del> |
| E11 | **[RE-SCOPED]** SDK/CLI/format incompatibility | Closed refusal before persistent successor acceptance; clear recovery/new-chat choice |


## Implementation result and review handoff — 2026-10-25

The model panel now renders only while conversation access is available. ConversationView.tsx adds one condition to its existing model-panel rendering; no hook, scope, selection, admission, Send, authorization, model choice, history or service owner changed. No new module/state/configuration was added. The existing SessionComposer remains the presentation owner; its existing large-function review is a review concern, not a reason to split a one-condition correction into new abstractions.

The existing meri-m1-identity.test.ts denied-view fixture now supplies the current skill-selection field and suppressed-catalog state. It verifies expired, connecting and unavailable denied states still hide private content and disable Send while omitting the false model notice/reload. One added presentation case verifies an actual catalog failure with available access still shows the active Reload models button; a successful catalog remains hidden while access is lost, then its picker returns when access returns. This is static React presentation coverage, not a live UI or network test. Existing scope/renewal/private-read tests in the same file remain enabled. Test count increases from 6 to 7; no tests or assertions were removed.

### Exact focused verification

Base: e478e4d73132bd1566b3945d63c5e0a3a1306cc1. Product changes: ConversationView.tsx and meri-m1-identity.test.ts only. Phase documentation: this file. The source/test commit is supplied with the pushed PR; review its exact head against the published base branch.

Tooling: Windows Node v24.22.1, Vitest 4.1.11, Vite 8.3.4, React/React DOM 19.3.0, TypeScript 5.9.3, Next 16.4.1, React Query 5.104.1, Zod 4.6.5, ESLint 9.39.2, Prettier 3.8.1. Versions read from the preserved compatible donor. A task-owned node_modules junction reads that donor. work/notice-vitest.config.mts pins current-worktree UI/client source exports plus contracts, UI stream and shared packages extracted from this base's exact committed vendor archives; its Vite cache is task-local. No install, dependency change or donor mutation was requested. The installed Next use-client guide was read before editing.

Command from owned worktree: `node node_modules/vitest/vitest.mjs run --config work/notice-vitest.config.mts --configLoader runner`.

| Check | Result | UTC / evidence |
|---|---|---|
| New regression against original model rendering | Expected FAIL: 1 failed, 6 passed; denied state incorrectly contained Model choices unavailable | 12:50:51 start; work/notice-before.log |
| Corrected focused suite | PASS: 7/7, exit 0 | 12:52:33; work/notice-after.log |
| Meaningful mutant: remove only !session.accessLost from the model-panel condition; filter to denied-view regression | KILLED: expected exit 1, 1 failed/6 intentionally skipped by filter | 12:53:05 start; work/notice-mutant.log and notice-mutant-result.json; source restored byte-for-byte |
| Restored focused suite | PASS: 7/7, exit 0 | 12:53:30; work/notice-restored.log |
| Final suite after strengthening successful-catalog access-loss/recovery assertions | PASS: 7/7, exit 0 | 12:54:29; work/notice-final.log |
| Two-file ESLint and Prettier check | PASS: exits 0/0 on first final-code check; final added assertions checked again before commit | work/static-checks.txt, work/static-final.txt |
| git diff --check | PASS, exit 0 | before commit |

Lint command from apps/web: `node ../../node_modules/eslint/bin/eslint.js src/features/meri/conversation/ConversationView.tsx tests/meri-m1-identity.test.ts`. Format command: `node ../../node_modules/prettier/bin/prettier.cjs --check src/features/meri/conversation/ConversationView.tsx tests/meri-m1-identity.test.ts`.

Deleted-path/flag cleanup is N/A: this replaces one incorrect rendering condition in place, with no retired owner, dependency or executable branch left dormant. `git diff` shows that the old unconditional model-panel condition is replaced by the access-gated condition. Genuine model failure copy and reload callback remain in that same sole rendering owner. No temporary diagnostics entered product source. Only the three allocated files are committed; scratch runners, extracted public packages, caches and logs remain local for exact-head review.

NOT RUN: broad product suite, full TypeScript build, architecture census, browser/visual/live authenticated checks, image build/scan, model/provider/data/cloud probes and deployed acceptance. These unchanged broader gates remain with root/Release; the narrow correction is not a fix or acceptance claim for retained admission or stopped-run restoration. Independent exact-head review is pending root allocation. Hold image/deployment until root batches confirmed release fixes. No merge or #202 post is authorized.

No template exists at .github/pull_request_template.md in this frontend base; the draft PR records scope, tests, mutation result, cleanup and pending review/release explicitly. The frozen original checkout and shared development environment remain preserved. No browser/auth/service/branch in that checkout was changed.

Publication note: the first local staging/commit attempt exposed inherited sparse-checkout exclusion for the new handoff path and missing Git author configuration. No commit or push occurred. The exact document path was staged with git add --sparse; the existing repository Codex author identity was supplied only to the commit command. No shared Git configuration or sparse-checkout rules were changed.
