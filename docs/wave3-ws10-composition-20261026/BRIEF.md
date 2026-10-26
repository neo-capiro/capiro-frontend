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

# Compose reviewed Hill Day resume and exact size dispositions

Saved Hill Day documents resume through the existing authorized document, native route and retained generation owners. The candidate preserves FE179's accepted atomic newsletter save, saved projection staging and qualified Shared artifact, while adding accepted FE182 source including the corrected saved-week midnight boundary. Root owns final composition disposition; backend143's actual PG result23/25 still has two outcome dispositions pending. This is not end-to-end WS10 or deployed acceptance.

## Exact source union

Current frontend main is `ce09fe306e2374074d11821319e7d89e2505dc1a`, tree `bd3133c7cc9fe4b4d31f49eba754dab6915df409`. Author base is `a76baa609302db93faf8d038096b7877e6890464`. Accepted FE182 is `a170e058f1aa10c98ff78a6479dafe99a2149049`, tree `5886fd232fb4b559ea62437397f2a7ec61f26bc6`. Normal `git merge-tree --write-tree` exits0 without conflicts and gives source-union tree `0354c2072a66cc227fd30d8facddb474d822b769`. The author changes17 paths; current FE179 changes40 paths from the common base. Their path intersection is empty. All17 author preimages equal current; all17 candidate postimages equal accepted source. All40 existing FE179 postimages are preserved in the source union. The local composition branch adopts the two author commits through normal Git cherry-pick, producing that same tree. No manual source overwrite or shared-host/schema conflict resolution was needed.

Eight accepted production files retain exact Git blob/SHA/import/edge bindings from the corrected committed packet. Four accepted tests/fixtures and five allocation/evidence documents are also exact accepted source. Integration adds only this brief and the existing reviewed-size-findings registry adoption. The root/consumer manifests, lock, vendor artifact and provenance, shared recovery/journal, editor/export, architecture policy and existing public-export guard remain unchanged.

## Seven independently accepted records

Root's W3-WS10-FE182-CORRECTION-REVIEW.md accepts the exact calendar correction and refreshed Meetings fingerprint, retaining lifecycle_trace's six other exact responsibility dispositions in W3-WS10-FE182-REVIEW.md. This adoption is not self-review.

| Record | Nonblank | Exact fingerprint |
| --- | ---: | --- |
| apps/web/src/features/modules/workspace/WorkspaceScreen.tsx / WorkspaceScreen | 233 | `88a3237b8a043fca61e48043e0dc199359131daba44ab99162fb03cf99c3bd9c` |
| apps/web/src/features/modules/workspace/hillday/HillDayGeneration.tsx / GenerationSession | 191 | `4e82485d8141a0b5be3eb81f92e3644b34cde8eac458536bd93b41749c74a416` |
| apps/web/src/features/modules/workspace/hillday/HillDayMeetings.tsx / HillDayMeetings | 225 | `6493a133ac7255442c1cd0d52f4e6fed02565c740428b2b3ffdf5b020f0deeda` |
| apps/web/src/features/modules/workspace/hillday/HillDayWizard.tsx / <module> | 408 | `cfda643256a8a4b21c2e112b38d0fd9839401db6228d4d6fd95547462dd9926d` |
| apps/web/src/features/modules/workspace/hillday/HillDayWizard.tsx / HillDayWizard | 232 | `48c9322228f45ae6664ba0fdf251e6c65dc412eed6c9fb599bfc869e3b166e92` |
| apps/web/src/shared/capiro/operations/workspace-hillday.ts / <module> | 447 | `b3a076a4adf3c4bf31174770b03423bd634a1c5a579e2bb8efb0a9d7f02506c3` |
| apps/web/src/features/modules/workspace/hillday/hillday-generation-state.ts / useHillDayGeneration | 296 | `a072efca8083d0d0ddcd8b3973db34cb93d522e29e09e6ca93be5fd179aa97f8` |

Three existing exact-symbol records are replaced: WorkspaceScreen, HillDayWizard function and workspace-hillday module. Four records are added: GenerationSession, HillDayMeetings, HillDayWizard module and useHillDayGeneration. The old HillDayGeneration symbol had no registered record to retire. All445 unrelated records remain semantically exact and in order, including FE179's accepted newsletter/staging bindings. Registry count448→452.

A finite eight-file parse-only scan reproduces the accepted source, imports, dependency edges and seven fingerprints. After adoption it must report7 reviewed,0 blocking,0 record/dependency/scoped-cycle errors for this named scope. This is not a full architecture census or approval of inherited debt. No scanner or policy change.

## Evidence reused with its actual limits

Original author74unit/8browser passes remain attributed to25a17ded4. The calendar correction's noon negative control fails at the intended Monday-morning omission, and corrected source passes2 affected mounted cases: the new midnight boundary witness plus existing saved selection/context case. These are not a rerun of all9 distinct browser cases. Request-ID mutation/restoration, lifecycle and prior FE166 evidence remain with their original sources. Root independently accepted only the allocated source/delta.

The inherited full typecheck has the same38 diagnostics, exit2; no full typecheck PASS is claimed. Prior whole architecture findings remain outside this finite adoption. Integration performs no product suite, build, install, browser, DB or provider/cloud work. Backend143 PG23/25 and final source composition disposition remain Root gates; no frontend default merge, deployment or authenticated UI acceptance is claimed.

Exact source/merge preview, all17 source bindings, all40 current bindings, before/after scoped scan and record adoption receipts are retained in the Integration chat under `work/ws10-distribution/`.
