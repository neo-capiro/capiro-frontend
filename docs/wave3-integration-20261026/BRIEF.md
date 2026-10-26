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

# Wave3 frontend accepted-source composition

FROM: Integration | TO: Wave3 Root / independent reviewer | TYPE: status/handoff | RE: accepted deltas on current default

Prepared 2026-10-26T01:16:01.081375+00:00. Branch `codex/wave3-frontend-integration-20261026`; exact base `d285e659f2bfbc00bfbd464b8c6f07dfba898d5d`. Product composition head `b55c9f343d131e4f8cd04cd1a86f58fe5dc9914c`, tree `2502b58fba70eab3e37e0e2b981b7470b5ca42da` before this brief/registry/status commit; final PR head/tree are supplied in the task handoff. Author commits remain in the per-PR provenance commit messages. Draft only; source composition is not independent integrated acceptance or release qualification.

## Source and ownership

- [140](https://github.com/neo-capiro/capiro-frontend/pull/140): `e478e4d73132bd1566b3945d63c5e0a3a1306cc1` → `6ea4af20ac539c6da7f31ed657754ca530143f99`.
- [153](https://github.com/neo-capiro/capiro-frontend/pull/153): `6ea4af20ac539c6da7f31ed657754ca530143f99` → `33283081866c25de9b71327cb8d7a457e1cf290d`.
- [158](https://github.com/neo-capiro/capiro-frontend/pull/158): `33283081866c25de9b71327cb8d7a457e1cf290d` → `e637ac02a8c5851f9a2cc3d20cc91f9b9717b3de`.
- [159](https://github.com/neo-capiro/capiro-frontend/pull/159): `33283081866c25de9b71327cb8d7a457e1cf290d` → `f0cef941893d64e237cc3bef1dcddde54987cbf5`.
- [166](https://github.com/neo-capiro/capiro-frontend/pull/166): `f0cef941893d64e237cc3bef1dcddde54987cbf5` → `83806222558a9d0ab779152e5f8a1c5f890df657`.
- [141](https://github.com/neo-capiro/capiro-frontend/pull/141): `e478e4d73132bd1566b3945d63c5e0a3a1306cc1` → `7b613a8a3f8472e24296a01f7e8c2758e97f774e`.

The accepted source stack is140→153, parallel158/159,166 after159, plus141. Current Fable167–170 changes remain intact. The only shared source combination is browser/main.tsx: it equals d285e65 plus159's single test-only StrictMode opt-in. All43 other paths, including accepted deletions, match the latest accepted owner blob. No package, public barrel, lockfile, source algorithm or production configuration changed.

Four exact function/catalog size records are adopted from explicit independent design verdicts: DocumentsLibrary and workspace-hillday catalog (W3-LIBRARY-PR158-REVIEW.txt,25October17:59:48.7001381UTC); ExportDialog and useHillDayExport (W3-UI-PR166-REVIEW.md,25October21:09:35UTC). The latter report counts120 lines for the hook module; the canonical scanner counts112 for its function. Unrelated registry entries are preserved.

The lightweight existing scanner on20 changed production paths has zero dependency errors and zero malformed-record errors. Twelve size signals:4 accepted records,8 unresolved. Six changed signals need exact disposition: DraftEditor193, WorkspaceDraft87, WorkspaceScreen194, HillDayWizard214, compareSavedVersions82 and workspace.module.css805. DocumentCanvas81 and DocumentEditor221 are byte-unchanged functions from current main and retain existing inherited review debt; do not label them new product changes. No mass approval or whole-architecture pass is claimed. Root's existing independent reviewer owns disposition; the two Draft functions will change again with the separately reviewed Save correction.

PR171 head7043a3ad2746bb681506e053f4f083a2c96daa7d is excluded: review CHANGES identifies unknown-save unlock on missing journal, loss of another tab's unsent edits and stale read-only content after adopt. Its existing author corrects those cases. The legitimate public canonicalWorkspaceSnapshot import is already exported by the installed owner; the precise new-owner allowlist and final size records await the written final disposition. No active Save checkout/source was edited. FE172/Core139 and Fable carryover source remain excluded. WS20 list refresh is a separate allocated delta.

Reused evidence:140 reported59units/5syntheticbrowser;153 reviewer24/24 with2 mutants and6/6browser under later-read limits;158 author18units/13browser/7validmutants plus final2affected browser cases, independent source/design ACCEPT (final typecheck receipt attributed; raw typecheck-final.log absent);159 final reviewer6PASS/18unselected, prior29/29 and author7mounted plus actual development mutant;166 author13mounted/4mutants inspected by reviewer;141 accepted citation/status presentation only. Counts describe different scopes and are not summed. Full tickets, authentic producer/consumer, architecture/build/typecheck and real browser/current-access/PDF/source-link/usage acceptance remain open with Root/Release/Acceptance.

## Checks and limits

Integration ran ordinary Git base/head/path and blob comparisons, explicit overlap comparisons, current-default preservation checks and `git diff --check`, all PASS. Source proof uses Git blobs and does not normalize away product differences. No product behavior test was newly executed; accepted unchanged owner evidence is reused. No new executable product test, so mutation N/A for this composition. Source/record inspection scripts are task-local, not a new repository qualification framework. The exact commands and source comparison output remain in the existing Integration work/output directories.

No dependency install, service/cache mutation, shared port, build, PostgreSQL, migration, image, cloud, model call, provider operation or deployment occurred. Existing environments/checkouts remain preserved. Required affected integration review is NOT RUN at this new head; Root allocates the existing independent reviewer and necessary gate owner. Release owns build/image/smoke/scan, protected database actions, deployed configuration, rollout and rollback; Acceptance owns bounded authenticated real-path checks. Missing or unknown observations are not PASS. No external send or public coordination comment is requested.

Standing requirements, current Wave3 brief/lane plan, PROCESS6.1–6.3, implementation standards, supersession and actual WS05/06/07/12, ML24, MT09 and MF16 tickets/scenarios were read. Item0 removes obsolete per-hop authority mechanisms; Decision11/O143 removes Workspace approvals while retaining sharing/current authorization and durable receipts. Root remains the sole orchestrator; helpers xhigh. In-scope decisions proceed without new approval ceremony. Full SDK/RuntimeV1/Core walls, durable session/artifact/user/firm memory and retained Temporal guarantees remain intact.

## Changed paths

- `apps/web/src/features/meri/cited-answer.module.css`
- `apps/web/src/features/meri/conversation/ConversationTurn.tsx`
- `apps/web/src/features/meri/screens/sources/TurnSources.tsx`
- `apps/web/src/features/modules/workspace/LibraryClientFilter.tsx`
- `apps/web/src/features/modules/workspace/WorkspaceDraft.tsx`
- `apps/web/src/features/modules/workspace/WorkspaceLibrary.tsx`
- `apps/web/src/features/modules/workspace/WorkspaceScreen.tsx`
- `apps/web/src/features/modules/workspace/hillday/HillDayEditor.tsx`
- `apps/web/src/features/modules/workspace/hillday/HillDayExport.tsx`
- `apps/web/src/features/modules/workspace/hillday/HillDayWizard.tsx`
- `apps/web/src/features/modules/workspace/hillday/useHillDayExport.ts`
- `apps/web/src/features/modules/workspace/library-query.ts`
- `apps/web/src/features/modules/workspace/ordinary-export/OrdinaryDraftExport.tsx`
- `apps/web/src/features/modules/workspace/ordinary-export/ordinary-export.ts`
- `apps/web/src/features/modules/workspace/version-history/VersionHistory.tsx`
- `apps/web/src/features/modules/workspace/version-history/version-history.ts`
- `apps/web/src/features/modules/workspace/workspace-route.ts`
- `apps/web/src/features/modules/workspace/workspace.module.css`
- `apps/web/src/shared/capiro/operations/workspace-documents.ts`
- `apps/web/src/shared/capiro/operations/workspace-hillday.ts`
- `apps/web/test/browser/main.tsx`
- `apps/web/test/browser/meri-citations.spec.ts`
- `apps/web/test/browser/server.mjs`
- `apps/web/test/browser/workspace-hillday-export.spec.ts`
- `apps/web/test/browser/workspace-library-query.spec.ts`
- `apps/web/test/browser/workspace-navigation.spec.ts`
- `apps/web/test/browser/workspace-ordinary-export.spec.ts`
- `apps/web/test/browser/workspace-ownership-state.spec.ts`
- `apps/web/test/browser/workspace-version-history.spec.ts`
- `apps/web/tests/meri-citations.test.ts`
- `apps/web/tests/prospect-rich-workspace-render.test.ts`
- `apps/web/tests/workspace-held-recovery.test.ts`
- `apps/web/tests/workspace-hillday-admission.test.ts`
- `apps/web/tests/workspace-library-query.test.ts`
- `apps/web/tests/workspace-ordinary-export.test.ts`
- `apps/web/tests/workspace-route.test.ts`
- `apps/web/tests/workspace-screen-navigation.test.ts`
- `apps/web/tests/workspace-version-history.test.ts`
- `docs/wave3-m3-citations-20261025/BRIEF.md`
- `docs/wave3-m3-citations-20261025/CORRECTION.md`
- `docs/workspace-hillday-export-recovery-20261025/BRIEF.md`
- `packages/qualification-elements/promotion-pins.json`
- `packages/ui/provenance.json`
- `packages/ui/src/ai-elements/sources.tsx`
- `scripts/architecture/reviewed-size-findings.json` — four accepted records only.
- `docs/wave3-integration-20261026/BRIEF.md` — this source handoff.

## Accepted composition review and WS20 follow-up — 26 October 2026

This section supersedes the earlier pending six-signal/FE174 statements. W3-FE173-COMPOSITION-REVIEW.md independently ACCEPTS the original exact composition atcb5c41b08975a5319f337375768788a48a4a1755/treec3afd7164c8ddbee394589baef9c49cc4d06ba5f, verifies the four existing records and individually accepts six exact changed design fingerprints. Those six records are now adopted without altering their source. No approval is transferred to a future PR171 replacement body.

W3-WS20-PR174-REVIEW.md,26October01:27:41.3940556UTC, ACCEPTS afae4e1ea9d1634bd8a3ce08a45aa5a54f6fb57d/tree4efc8715c276e0f4f67cdf5051b3a9721ef39c8c on FE159f0cef941893d64e237cc3bef1dcddde54987cbf5. The exact three-file delta is cherry-picked with original author/source provenance: templates/TemplateDetails.tsx, TemplateStudio.tsx and browser/workspace-template-settings-refresh.spec.ts. Both existing preimages equal the reviewed base, the new test is absent there, and all three resulting blobs equal174. All other product paths remain identical to accepted173. No conflict or semantic rewrite occurred.

The acknowledgement now reaches the existing detail query reload and the outer list.reload callback, with the detail keyed by selected template ID. No optimistic success, new cache, durable receipt or automatic retry. Reuse five mounted cases plus the intended outer-list-callback mutant failure and restored green; affected type/lint and final format evidence remain attributed. The initial selector failure/four-unrun and formatting warning are retained, not converted to product passes. No accepted product suite was rerun by Integration.

Two additional exact design records adopt174's independent rationale: TemplateDetails86-line body (new threshold crossing, not inherited as the author's initial statement suggested) and TemplateStudio289-line body. Existing UseTemplate125 is byte-unchanged versus current base and remains unapproved inherited debt. The two HillDayEditor functions remain likewise unchanged/unapproved. No file-wide template approval or broad fingerprint refresh is made.

Current lightweight scan:22 changed production paths,0 dependency errors,0 record-validation errors;15 signals,12 exact accepted records,3 unregistered unchanged inherited signals (DocumentCanvas81, DocumentEditor221, UseTemplate125). The scanner still reports those three as blocking; no green whole-architecture gate is claimed. There are no unreviewed changed size signals in this current source. Eight record objects changed in this follow-up (six from173 and two from174), all others preserved.

PR171 remains excluded pending final independent correction acceptance. Its existing public canonicalWorkspaceSnapshot export needs no package/barrel change; only the exact ordinary-save/ordinary-save.ts single-symbol allowance is approved for eventual adoption. The two current Draft fingerprints must be reconciled against that final source, never blindly reused. No import-allowlist, package, lock, CSS, schema, source contract or WS15 artifact change here. Actual WS15 package build/pack/bundle remains with Release, paired consumer source with its assigned owner, and Integration owns eventual artifact/pin/lock adoption. FullWS20 and deployment acceptance remain open.

## Accepted Ordinary Save composition — 26 October 2026

This section supersedes earlier PR171-pending and pre171 Draft record statements. The independent W3-UI-PR171-CORRECTION-REVIEW.md ACCEPT at01:34:00 UTC covers ff46015bf872155182d7df5f862fa005b03d460c, tree a20199004166ce296a6bd82de6867a650917938d, on FE159 f0cef941893d64e237cc3bef1dcddde54987cbf5. Original7043a3ad2746bb681506e053f4f083a2c96daa7d and correctionff46015 are cherry-picked as2fca3435 and8a7338b0 with provenance onto prior1738dce1a2b1470a3f0d342e627cd60dcebb91bcc7f. All22 actual PR paths have exact reviewed-base preimages and accepted final postimages. No manual source combination was needed. Every other path from prior173 remains unchanged apart from the precise policy/test/registry adoption and this brief; accepted174 and current default/Fable fixes are preserved.

The shared review covers HTTP and gateway errors, workspace-documents operations, new ordinary-save error decoder, journal and journal-crypto. Only the fixed Workspace POST /drafts/:id/save native409 codes gain recognition. The state/save schemas bind the existing operation owner. Guarded refusal retirement stays in the canonical journal, validating the retained request identity and conflict outcome. HTTP, gateway and existing journal preimages also equal deployed default d285e659; workspace-documents already contains accepted Workspace source on prior173 and exactly matches the reviewed FE159 preimage. No competing transport/recovery edits or private imports were combined.

The correction retains known submitted intent when storage is absent/different, preserves another tab's unsent editor state until positive exact disposition and deliberate rebase, and renders currentDraft.documents after current read. These are accepted source behaviors; authenticated integrated acceptance remains open.

Integration adopts only canonicalWorkspaceSnapshot as a single named public @capiro/shared import from the exact ordinary-save/ordinary-save.ts owner. Existing command/objective exceptions remain exact. The existing boundary test is extended for the new owner, broader import forms and adjacent unauthorized owner; before the policy change it fails for the intended ordinary-save rejection (6 pass/1 fail), and after it all7 pass. Initial --import invocation failed at setup because Windows absolute paths require a file URL; it is retained separately and is not behavioral evidence. Only retained TypeScript was supplied by a task-local loader; candidate scanner/policy/tests were executed, with no installation or checkout dependency link.

Six exact independent size records are adopted: useOrdinaryDraftSave module495/function428; DraftEditor184; WorkspaceDraft98; workspace-documents module403; journal module529. The two previous Draft records are replaced, not duplicated or retained as stale approvals; four records are added. All other records remain identical. Canonical scoped scan of30 changed production paths reports0 dependency errors,0 record errors,19 signals/16 reviewed/3 blocking. DocumentCanvas81, DocumentEditor221 and UseTemplate125 match current-default function fingerprints and remain unapproved inherited debt. No changed size signal lacks an independent disposition. No whole-architecture PASS is claimed and no broad LF/CRLF fingerprint refresh occurred.

Reused author/reviewer evidence retains its attribution: final20/20 browser (5 corrections+15 save),30/30 export/held-recovery unit cases,42 unchanged unit cases, final6-path lint and8-path format. Earlier27/27 browser selection included8 exports before the final missing-disposition case and is not additive to final20. Intended pre-fix failures and absence-as-settlement mutant failure/restored bytes remain recorded; the unsupported body fixture setup failure is excluded from behavioral evidence. Saved typecheck is FAIL,33 exact-base/final diagnostics with zero delta. Saved whole architecture is FAIL,637 total/312 reviewed/18 inherited-unreviewed/307 blocking plus the pre-adoption import error;180 status changes across163 unchanged paths remain attributed to raw LF/CRLF records. Integration did not rerun accepted product/browser suites or full type/build/architecture. New execution is limited to the changed architecture boundary tests, source proof, scoped scan and diff checks.

WS15 actual package/distribution adoption stays separate from this source candidate. No package, lock, vendor artifact, barrel, schema or deployment change. Core141 and Meri270 are source-merged at d68024dc62edddb0784f79b4e5ca50335dd1ca89 and1ae4fbcc6b9cbce39a5d10eb458c8d63ea852c63 with exact accepted trees. Release retains build/pack/bundle/image/cloud/DB/deploy ownership; full WS05/WS07/E45 and authenticated FE/Core two-editor, timeout, reload and revocation acceptance remain open.

Root's new Fable handoff is pending independent review and excluded: Meri2719ad0d3a2b2327685ad60d19d4f28768c01b9f943 (3files); FE17537025c7b4a60aeba20ed680081e238ee2a499459 (2files, native Clerk token fix); revisedFE172f223c44b1ebd70222d56d790017231f442fb8ecf (6files, narrower lost-run recovery with explicitly reported stale-history race); Core139 docs-only follow-up5d20033636068e166f970bbb2f7787999a6361b8 atop a2b827d7, unchanged health source/tests. Fable reports2 additional General next-run reservations via probes and no prompts. This is reported state, not independent acceptance or deployment. Existing source remains unchanged pending verdicts.
