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

FROM: M3 citation author / root correction dispatch | TO: Same independent reviewer / root | TYPE: brief | RE: PR141 P2 incomplete saved-history tool-result correction

Prepared before product/test edits, 2026-10-25 13:22 UTC. Repository neo-capiro/capiro-frontend; branch codex/wave3-m3-citations-20261025; preserved checkout C:/dev/wave3-m3-citations-20261025. Correction starts at independently reviewed head 5d5dc2b4e3d637376cab2f69d9e5f3f169cb27e5, tree d9ca3001885617e9f06e4c1d40e83c96a0d23cba; PR base remains e478e4d73132bd1566b3945d63c5e0a3a1306cc1. Remote candidate/base were read back unchanged at 13:22:04 UTC. Meri dependency 51b059063629cf7b7a1370ae54ae9a82624a3bff and public 0.1.14 are unchanged.

Root allocates only the P2 from the PROCESS6.2 CHANGES verdict: completed run metadata with incompleteHistory may precede an unloaded tool.completed event, so missing resultReference cannot imply no result was recorded. Existing exact-source review/counterexample lives in root work/wave3-citations-review/REVIEW.md and partial-tool.test.ts. Retain the actual savedTurns fold in the regression.

How we work: author builds at xhigh; same independent xhigh reviewer reviews the exact correction; root only orchestrates/gates/merges; Release alone ships. Draft PR141 only. No recursive delegation, new API/outcome inference/current-access claim, copied DTO, cache, feature phase, shared-file change, install/repair, browser listener, database/provider/cloud/auth-session change, merge, deploy or public coordination/#202 post. Wave2 has priority and remains open; full MF-16/live acceptance remains open.

Sources of truth: full standing rules above, host/repository/app AGENTS already read, the committed original phase BRIEF.md with its pinned PROCESS6.1/6.2/6.3, WORKFLOW, FINAL-PLAN, Meri/App masters and supersession-register links, and the independent exact-head verdict. MF-16 is unchanged/unlisted; E02/E31/E44 remain binding; E18 is re-scoped. No removed mechanism is revived. Direct current role/scope instructions override older helper-Ultra language.

Owned edits: the existing ConversationTurn.tsx result label, the existing meri-citations.test.ts presentation regression, and this correction record. If a result reference exists, retain neutral recorded-result wording. If history is incomplete or its prefix omitted, qualify the missing result as absent from loaded updates. With complete history retain terminal no-result and active awaiting-result behavior. Reuse canonical completeness flags; do not add state or a helper framework.

Checks: reproduce the new savedTurns regression against unchanged product code, apply the minimal label branch, run existing citation/conversation focused tests, then remove the completeness qualification as one meaningful mutant and require the new regression to fail. Restore source and rerun the affected suite; targeted lint/format/type checks are permitted. Pins are unchanged and their accepted evidence is reused. No repeat broad browser/build/architecture checks without a new risk. Preserve the inherited architecture FAIL and original browser/axe limits.

Delete the unconditional terminal-only missing-result presentation in the same change; no replaced path/flag/test is retained. Report old/new exact commit/tree/delta, positive/negative counts/exits, retained failure logs, reused evidence and NOT RUN gates. Commit/push the same draft, update its description to the corrected behavior, and return a standalone exact-head delta brief to the same reviewer. In-scope decisions proceed/log; unresolved scope/security questions go to root for Neo. Only direct Neo chat approves new scope.

Current retained ticket (verbatim):
#### MF-16 — Expose citations, evidence and truthful tool/usage details (P1)

- **Root cause / evidence:** Live turn renders plain text, tool name/state and source count; rich cited answer/evidence/coverage/tool/usage screens are fixtures or IDs only.
- **Bounded files/owner:** `ConversationTurn.tsx`, `conversation-view.ts`, workspace projection, new safe rich-answer/source drawer and read adapters; existing SourceCard/evidence UI reused as presentation only.
- **Implementation:** Define typed citation mapping to exact admitted source receipt/version/location; show accessible excerpt and canonical source link only after current access check. Preserve unavailable/withheld/stale state, source date/coverage and failure reason; do not turn arbitrary model text into trusted source URL. Expose bounded tool detail and checkpoint/usage references where public reads exist. Sanitize markdown/links and never execute generated content. Distinguish estimated/recorded/provider usage.
- **Dependencies / exclusions:** MM durable research receipts/artifacts, MT source-read capability truth, MR checkpoint/run details, ST-15 usage. Missing backend read packets are explicit dependencies.
- **Acceptance:** Citations resolve correct source after reload, denied source not leaked through cache/excerpt, invalid links inert, markdown safe, sparse/no sources clearly labeled; tool failure never shown Done as success merely because finished; usage totals attributed to authoritative units.

## Correction handoff — 2026-10-25 UTC

### 1. Stopping point and behavior

The bounded P2 correction is implemented for exact-head review. Missing tool results now say `Result not in loaded updates` when either canonical history-completeness flag is set. An existing result reference still says `Result recorded · outcome unavailable`; complete terminal history still says `No result recorded`; complete active history still says `Awaiting result`. No outcome, current access, new API, or additional source capability is inferred.

### 2. Actual owners and delta

The correction changes only `apps/web/src/features/meri/conversation/ConversationTurn.tsx`, `apps/web/tests/meri-citations.test.ts`, and this record. It reuses the saved-turn projection's existing `incompleteHistory` and `omittedPrefix` flags. The test uses the existing admitted fixture and actual `savedTurns` fold: the first page contains a tool start, a later page contains its matching completion, and completed run metadata is unchanged across both views. It also covers the omitted-prefix qualifier. Complete terminal/active tests remain intact.

The named original three-file shared exception remains exactly unchanged: Sources type adaptation, its provenance entry and generated promotion pins. No new dependency or shared ownership exception is used in this correction. The original nine-file slice and its historical evidence remain in BRIEF.md.

### 3. Deletion and reuse proof

Removed the unqualified terminal-only missing-result branch immediately after the result-reference check. Its old executable shape is absent; the completeness qualification precedes the terminal fallback. No old implementation, temporary product diagnostic, flag, alternate wrapper, or new state is retained. Existing `No result recorded` remains only as the valid complete-history fallback. One unit case was added; no tests were deleted, skipped in the full run, or weakened. A direct source-shape search and the removal mutant record this deletion in `work/correction-deletion.json` and `work/correction-mutant.log`.

### 4. Actual affected checks and falsification

Commands use Node 24.22.1, Vitest 4.1.11, TypeScript 5.9.3, ESLint 9.39.2 and Prettier 3.8.1 through the existing task-local preserved-dependency overlay. No setup, install, donor edit or listener was required. This is local source evidence, not a clean production build.

| Check / command | Result and retained evidence |
|---|---|
| From apps/web: `node ../../node_modules/vitest/vitest.mjs run tests/meri-citations.test.ts -t 'qualifies a missing result'` before the product correction | Expected FAIL, exit 1, 1/1 selected regression at 13:25:54 UTC; assertion forbids the false `No result recorded` claim. Eight nonselected tests are skipped only by this filter. `work/correction-before.log`. |
| From apps/web: `node ../../node_modules/vitest/vitest.mjs run tests/meri-citations.test.ts tests/meri-conversation-live.test.ts` after correction | PASS 26/26, exit 0 at 13:26:10 UTC; nine citation cases plus 17 existing conversation cases, no skips. `work/correction-focused.log`. |
| `node work/check-correction-mutant.mjs` | PASS falsification runner, exit 0; removes only the new completeness branch. Selected regression FAILS with the intended assertion, exit 1. Source restored byte-for-byte in finally. `work/correction-mutant.log`, `work/correction-mutation-results.json`. |
| Same full focused Vitest command after restoration | PASS 26/26, exit 0 at 13:26:45 UTC, no skips. `work/correction-restored.log`. |
| From apps/web: `node ../../node_modules/eslint/bin/eslint.js src/features/meri/conversation/ConversationTurn.tsx tests/meri-citations.test.ts` | PASS, exit 0. `work/correction-lint.log` is empty on success. |
| From apps/web: `node ../../node_modules/typescript/bin/tsc --noEmit --pretty false` | PASS, exit 0. `work/correction-types.log` is empty on success. |
| `node node_modules/prettier/bin/prettier.cjs --check apps/web/src/features/meri/conversation/ConversationTurn.tsx apps/web/tests/meri-citations.test.ts` and `git diff --check` | PASS, exit 0; exact touched files only for formatting. |

### 5. Reused evidence and preserved limits

The same independent reviewer previously ran 25/25 units, 11/11 event/assets cases, app/UI types, pin check and inverse provenance/runtime checks on 5d5dc2b4e3d637376cab2f69d9e5f3f169cb27e5, and inspected the original seven mutant logs and browser proof. This correction changes only the qualified missing-result label, one regression and this record; unchanged pins/provenance are not regenerated or rerun. Existing source/keyboard/reload/inert-content/mobile/conversation-denial browser evidence is reused. No browser run is claimed for the corrected label.

Retain the original browser limit: desktop axe reported 0 violations, 48 passes, 1 incomplete contrast check on an unchanged sidebar link, and 42 inapplicable; mobile reported 0 violations, 46 passes, 0 incomplete and 44 inapplicable. This is synthetic conversation-denial evidence, not source-specific revocation or live authorization proof. The original inherited architecture FAIL remains: 0 boundary errors and identical 299 size-review blockers on exact base/head (632 signals, 315 reviewed, 18 inherited-unreviewed). No broad scan or unrelated repair was repeated.

### 6. Remaining gates and owners

NOT RUN for this correction: browser/axe, event/assets Node suite, UI typecheck, source pins/provenance, owned client rebuild and architecture; their unchanged reviewed evidence is reused as stated. NOT RUN for the full candidate: clean install/full production build, full distribution/Elements qualification, ARM64 image smoke/scan, release integration, real authenticated citation/source-opening/reload/revocation, tenant/client/wall checks, source stale/withheld states, authoritative outcome/usage and hearing playback.

Full MF-16 and E-scenario/live acceptance remain OPEN. D-data must supply accepted exact-version/location/current-access responses; canonical tool-outcome/usage owners must supply public truthful outcomes and units; shared UI/media/design owners retain adoption and design prerequisites. Root assigns integration/qualification/acceptance, with Wave2 priority; Release alone deploys. Wave2 remains open.

### 7. Preserved resources

No listener, database, cloud/provider, live application, user-authentication/session, dependency, shared cache or donor tree was changed. Only owned source/test/docs and untracked evidence under `work/` were written. No active process is left by the correction checks. No recursive delegation, public coordination post, merge or deployment occurred.

### 8. Publication

Commit and push this correction on the same branch and update existing draft PR141, retaining exact base e478e4d73132bd1566b3945d63c5e0a3a1306cc1. The standalone `work/CORRECTION-DELTA-REVIEW.md` will record the resulting exact commit/tree and old-to-new three-file delta after freeze. This document's pre-edit dispatch remains the historical starting point, not a claim of a future commit ID.

### 9. Next action

The same independent xhigh reviewer checks only this bounded P2 correction and the new regression/mutant against the refreshed exact head, reusing unchanged evidence. Root retains the gate/merge/Release decision. No new feature phase or deployment is requested.
