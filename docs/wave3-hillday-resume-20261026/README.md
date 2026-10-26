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

# WS10 Hill Day resume receiver — author handoff

Status: implemented with focused local evidence; independent exact-head/source and seven size-finding review pending. Root owns integration and Release owns shipping. This consumer does not close WS10.

## Boundary and implementation outline

Base `a76baa609302db93faf8d038096b7877e6890464`, tree `6aa6501b5253b9546e0ca24635587cdc95edee65`. Branch `codex/wave3-hillday-resume-20261026`. The received [closed allocation](ALLOCATION.md) supersedes the proposed split in the earlier [receiver trace](BRIEF.md). The seven source paths and one feature-local helper are the complete product scope; Library query ownership, shared recovery, Editor/Export, package/lock/export/registry and Core remain unchanged.

Producer Core PR143 `6f4f82145f797a9a1a4fffb4c33ee4c1a260c882`, tree `067b3660550b6aef306fc9275f40b8307f7b0458`; product is correction2 `d408607c151905fd194f943984e58c42fc211bda` identical. Consume the existing generate/latest/known-job/retry/cancel routes, including cancelled lifecycle, unknown units, unit timestamps, cancellation timestamp and terminal start replay.

The existing operation registry owns transport validation; Core owns current access, idempotency, job state, persistence and provider work. The shared identity lifetime, recovery journal and command lock remain the existing owners. One Hill Day helper composes those APIs to reserve the exact generation request before dispatch, retain an acknowledged job, and retire only after exact-command acknowledgement plus a bound job read. It implements no storage, encryption, serializer, queue, transport or authorization policy. The existing query reload/timer remains the known-job poller.

Native Workspace navigation now carries the acknowledged document, canonical client and validated wizard phase. The resume host reads the authorized saved document before mounting the requested phase. Saved meetings seed calendar IDs, manual rows, week and timezone; existing Context owns its saved record. Core's manual-event prefix and setMeetings' all-row response are consumed directly; the prior duplicate manual-row append is removed. Unacknowledged document creation remains outside this contract.

Generation rendering owns explicit recovery, failed/unknown unit retry, provider uncertainty acknowledgement and cancellation-requested wording. Latest discovery never retires a retained start. Control acknowledgement loss requires deliberate progress readback before another control. Current identity/document/client and shared lifetime guards discard late results.

## Focused evidence

All fixtures are synthetic and network access is restricted to the local harness. Node24.22.1, npm11.19.1, Vitest4.1.11, Playwright1.61.1, TypeScript5.9.3, ESLint9.39.2, Prettier3.8.1; qualified existing dependency junctions, Chrome and allocated port5323. No installation, build, database, provider call or cloud execution.

Commands run from repository root unless stated otherwise. Browser commands used `CAPIRO_BROWSER_TEST_PORT=5323` and `CAPIRO_TEST_CHROMIUM=C:/Program Files/Google/Chrome/Application/chrome.exe`. UTC times are completions on2026-10-26.

| Command / stage | UTC | Exit / result |
| --- | --- | --- |
| `npm run test:browser:modules --workspace @capiro/web -- workspace-hillday-resume.spec.ts`, original unmodified product | 03:34:19.6455588Z | 1, intended missing receiver failure: saved generate URL has no Refresh progress/latest polling |
| `npm run typecheck --workspace @capiro/web`, untouched base | 03:34:31.1394182Z | 2,38 diagnostics |
| Same browser command, implemented receiver | 03:47:57.2540774Z | 0,8 passed |
| `npm run test --workspace @capiro/web -- tests/workspace-hillday-resume.test.ts tests/workspace-route.test.ts tests/workspace-screen-navigation.test.ts tests/workspace-hillday-admission.test.ts` | 03:48:31.5827625Z | 0,74 passed; no skips |
| Touched-file `../../node_modules/.bin/eslint.cmd <paths>` from apps/web | 03:49:34.7159851Z | 0, one inherited next/no-img-element warning in Wizard's unchanged image |
| `npm run typecheck --workspace @capiro/web`, final product | 03:49:37.8082876Z | 2,the same38 diagnostic lines; exact comparison has no difference |
| Browser command plus `--grep 'lost start survives'`, request-ID replacement mutant | 03:51:09.1145135Z | 1,intended failure to reattach the completed original job |
| Same narrow browser command after restoration | 03:52:06.2552172Z | 0,1 passed |
| Canonical-LF architecture comparison using existing scanner/policy | 03:52:25.6183704Z | Collector0; base gate1/head gate1, no boundary/import/cycle errors; seven affected review findings remain pending |
| Touched-file `prettier --check` | 03:52:45.5151011Z | 0 |
| `npm run test --workspace @capiro/web -- tests/workspace-screen-navigation.test.ts`, strengthened immediate acknowledged-phase assertion | 03:53:53.4194038Z | 0,13 passed; included in74 distinct unit cases |

The eight mounted cases cover saved latest discovery without POST and terminal polling stop; lost start/reload with unrelated latest job and exact original UUID/terminal replay; ordered context and nonempty saved meetings reload without create; same-job unknown-unit retry plus lost-acknowledgement readback; requested cancellation until observed terminal; unavailable and refused latest reads distinct from null; pending-start actor-lifetime replacement. Unit cases cover all phase routes and invalid combinations, exact wire shapes, immutable recovery identity and job binding; existing navigation/admission cases remain passing. The strengthened existing navigation assertion verifies receipt client/phase immediately after create acknowledgement for same, changed and pending-changing sponsor inputs.

Mutation replaced only `body: { requestId: original.requestId }` with a fresh UUID. Original/restored SHA256 both `40784ca2e08c495bce08678ab13862e9f4a8f4d34ceb726f86185952a5d599a7`; restoration ran in finally and the narrow witness passed. Initial author typecheck introduced one optional-state typing error, corrected before final; formatting initially found one test-file layout issue, corrected; architecture collector initially used an invalid Windows ESM import URL, corrected before the successful assessment. These preparation failures are not hidden passes.

## Architecture disposition requested

[SIZE-REVIEW.json](SIZE-REVIEW.json) records every affected source preimage/postimage Git blob, canonical source SHA256, function fingerprint, import and dependency edge. No approval registry or scanner policy changed. Base648 findings/503 reviewed/18 inherited-unreviewed/127 blocking; candidate650/498/18/134. Seven affected findings require independent disposition:

| Owner / signal | Nonblank | Responsibility and review reason |
| --- | ---: | --- |
| WorkspaceScreen function |233| Existing route host receives one named Hill Day resume branch; no journal or job logic added. |
| GenerationSession function |191| One generation panel and mutually constrained command/result controls; transport and persistence remain outside rendering. |
| HillDayMeetings function |225| Existing picker gains only persisted selection/week/timezone seed and removal of duplicate manual append. |
| HillDayWizard file |408| Existing wizard and its small authorized saved-document receiver stay together; all other phase components remain separate owners. |
| HillDayWizard function |232| Existing wizard phase orchestration gains native destination callbacks and saved document/meeting initialization. |
| workspace-hillday operation file |447| Existing Hill Day transport catalog gains four producer-bound job descriptors and updated generate shape; no competing registry or Library rewrite. |
| useHillDayGeneration function |296| One domain command lifetime coordinates retained start and known-job reads through existing journal/query APIs; local helper has no independent storage or authorization framework. |

These are author rationales for review, not self-approval. The closed allocation permits one local helper; splitting cohesive callbacks merely to evade thresholds would obscure the same lifecycle. Independent reviewer/Integration owns exact record adoption.

## Replacement and preservation

The old local-only jobId/start flow, params-only generation request and whole-generation retry action are deleted in the owning diff. New start, retained recovery and job retry are distinct. The old saved-selection empty initializers and duplicate manual-row append are replaced. No prior test is deleted, no count is reduced, and no unused feature flag or parallel implementation is retained.

Shared recovery journal/crypto, HTTP/gateway, registry, packages, Editor/Export and other owners have no diff. FE178 remains frozen separately. Polling keeps its2.5s timeout/cleanup; known-ID export/status/renewal/lifetime evidence from FE166 `83806222558a9d0ab779152e5f8a1c5f890df657` (reported13 mounted cases and four intended mutants) is reused with original attribution. Core correction2's223 passing units/compiler and prior mutants are reused through the accepted producer review; they were not rerun here and do not prove native database outcomes.

## Remaining gates and cleanup

Independent exact-head/source/size review, Integration composition, real PostgreSQL qualification and deployed UI acceptance remain open. The producer fixture review is ACCEPT-run-preparation only:25 native PG cases were NOT RUN in that received packet. This author did not execute them. No new claim about provider deduplication under replicas, actual PostgreSQL locks, deployed lifecycle, unacknowledged document-create recovery, lost export-ID recovery, PDF fidelity or WS11 editor coverage.

All author test processes exited and the allocated browser server closed. No user/customer data or identifiers are used. Preserve this checkout/cache and the prior accepted FE178 checkout; previously rejected baseline cleanup was not retried. Scratch evidence stays under the original chat's work/; the final published exact head/tree/PR and local handoff are provided under its outputs/.
