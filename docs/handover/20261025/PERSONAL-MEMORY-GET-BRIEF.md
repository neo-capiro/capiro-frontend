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

FROM: Root | TO: Settings implementation owner | TYPE: brief | RE: Personal-memory GET repair (Wave 2, Settings)
# Personal-memory GET repair brief

## Sources, authority and sequencing

Standing rules above are copied verbatim from Meri `c0411e2cd20c35b3a8619817a4fec25ef7047aba`, including the current attribution/provenance correction in the source. Engineering translations and an approved label are not independent Neo approval. Apply current PROCESS6.1–6.3, current handoff, FINAL-PLAN and the supersession register at that exact documentation revision. Earlier model/relay/#202 and null-source status language is historical; retained behavior contracts remain binding. Root directly allocated diagnosis and repair of the demonstrated personal-memory GET boundary under the standing Wave 2 authorization.

Repository: `neo-capiro/capiro-frontend`. Branch: `codex/wave2-personal-memory-get-20261025`. Preserved isolated worktree: `C:/dev/wave2-personal-memory-get-20261025`.

Exact author base: accepted FE PR154 `fda3f418295dc53bd56b512fb4436a8e65230394`, tree `2d0a823132ddeaf079b331432fbec3f80e279ddb`; PR154 is stacked on accepted PR152 `4fa98196d6a7dd9d5d092c15c544ffb5df4273aa`. Deployed Core read-owner source inspected: `43fdd8928e517b1ce3a7a039f0fabeb8cf5fc5dd`, tree `50c1214d60c17d29d9a61e5bbfea450489baa286`. FE deployed revision31 is the observed cohort, not a claim that this successor is deployed.

Commit AND push this brief before product or test edits. Author implements/tests at xhigh; separate xhigh reviewer reviews the exact final head. Root only orchestrates at Ultra; existing Release alone executes AWS, migrations, deploy and rollback. Draft PR only; no merge, AWS or live probe by this lane. Integration owns combined FE sequencing and has been notified of this exact base and file claim. Coordinate changed dependencies before rebasing; changed source requires relevant review. Preserve all accepted base/fixture work and all other lanes.

## Demonstrated boundary and bounded decision

Existing route: ordinary signed-in browser GET `/api/memory/owner/items?limit=25` -> existing FE server proxy using native server-acquired authentication -> canonical Core owner-items GET -> existing browser decoder. Core owns tenant/owner/wall/lifecycle filtering and durable storage. Its public response includes `schemaVersion: 1`. The FE proxy validates with `receiveOwnerCorrectionPage` but serializes its internal `{items,nextCursor}` result. Browser `useOwnerCorrection.readPage` invokes the same strict decoder, which requires schemaVersion1, so a valid Core200 empty or nonempty page deterministically becomes unavailable.

Preserve the validated projection and explicitly restore the existing wire schema version in this items-only response. Reuse the current receiver and route; no second DTO/parser/store/framework is needed. This fixes wire preservation in the existing owner, not schema, authorization or architecture.

Retained acceptance at 16:51:10.405Z reports pending0 and current unavailable, without HTTP status/error/reached-Core/correlation metadata. Its live root cause remains unproven. Independently, Release's retained Core14 task metadata has no MEMORY environment entries, secret references or environmentFiles; lifecycle enforce is absent and selected-tenant binding UNKNOWN. That separate configuration prerequisite stays with Root/Release/Tenant Settings. No inference of current tenant membership and no configuration change by this author. Acceptance stopped its allocated diagnostic before action because supported full HTTP capture was unavailable. Source qualification is not live acceptance.

## File ownership and exclusions

- Product exception: only the `items` response branch in `apps/web/src/features/meri/memory-review/owner-review-proxy.server.ts`.
- Regression owner: `apps/web/tests/meri-memory-owner-review-proxy.test.ts`, exercising actual proxy output through actual browser receiver.
- This brief and a concise owned result addition; no unrelated source, dependency, lockfile or fixture changes.
- Four memory WRITE route admissions remain exclusively FileWorkflows; do not change decision, version-decision, correction or candidate-write admission. Core services, lifecycle helper, RLS, tenant/user policy and migrations remain unchanged.
- No model/provider/role/fixture effects, credential export, private content reads, live HTTP probes, new telemetry framework, memory layer or hosting rewrite. Preserve actual full Claude Agent SDK on Runtime V1 directly to Bedrock, control gateway to canonical Core and durable personal/firm isolation.

Supersession register: MM-01/MM-13 authority wrappers are re-scoped to current Core access; do not recreate them. MM-05, MF-17 and ST-11 retained owner/wire behavior applies only to this bounded repair. E23–25 and E36 retained outcomes remain binding, without reopening full memory governance/retention work. Ticket text below is verbatim; historical HELD/config labels do not restore superseded preview source restrictions.

## Tickets, verbatim
#### ST-11 — Finish and qualify PR115 owner-memory slice without conflating it with governance (P1, HELD + CONFIG)

**Evidence.** Current PR115 contains owner inbox/status/decision/version decision/items/corrections and strict server proxies. Its preview source is deliberately null until a compatible Core public wire packet is admitted. Main has only the gated link. [Owner UI][st-pr115-inbox], [proxy][st-pr115-owner-proxy], [preview boundary][st-pr115-owner-route], [source gate][st-pr115-preview-config], [Core owner items][st-owner-core].

**Tasks.** Review current head rather than stale PR body; finish contract/public DTO parity and tests, then separately approve merge. For ordinary mode qualify exact /api Core base and native owner authority. For preview retain two gates and explicit source/target qualification; never make env alone defeat null source. Validate owner candidate list/status, accept/reject, version decision, correction with expectedUpdatedAt, and uncertain-dispatch readback. Preserve activeItemUnchanged/pending correction semantics.

**Tests.** Own vs other owner, tenant switch, status before/after immutable decision, stale version, six-digit timestamp behavior, held/unavailable produces no dispatch, write timeout distinguishes not-dispatched from unknown, correction cannot overwrite active item. Merge, deployment, flag enablement, and live certification are four separate receipts.

#### MM-05 — Complete owner review/correction contracts and exact outcome reconciliation (P1; ST-11 complement)

Evidence: [M producer L71–89, L145–186](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/control/memory/producer.mjs#L71-L89), [Core decision adapter M L1–44](https://github.com/neo-capiro/meri-greenfield/blob/bce707763f2cbabe1a73a99aee7b7ec206fa6996/apps/control/memory/core-decisions.mjs#L1-L44), [Core owner items C L20–115](https://github.com/neo-capiro/capiro-backend/blob/309af848f1aa403f6c8e54aa0d22990d4230f063/apps/api/src/memory/memory-owner-items.service.ts#L20-L115), [Core version routes C L44–129](https://github.com/neo-capiro/capiro-backend/blob/309af848f1aa403f6c8e54aa0d22990d4230f063/apps/api/src/memory/memory-version.controller.ts#L44-L129).

Work: ST-11 publishes the exact compatible owner wire DTO and receives F115; do not confuse it with Meri's proposal journal. Correlate Meri candidate/hash/review ID to Core scoped publishedMemoryId; preserve clio: versus item: namespaces and different hash domains. Drain review pages even when decided/suppressed rows yield no visible candidates. After timeout, read exact status instead of recreating a proposal or declaring success. Close the known executor seam where definite post-claim Core refusal is flattened into command UNKNOWN without weakening genuinely uncertain outcomes.

Acceptance/tests: Own versus other owner, activeItemUnchanged pending correction, exact microsecond expectedUpdatedAt, stale target/key collision, correction TTL refused, duplicate approve/reject, immutable conflicting outcome, unavailable Core status versus empty inbox, source suppression before/after decision and no new submission from a read. Bound changes to memory producer/adapters/Core owner DTO and generic executor's typed-refusal seam; no alternate review store.

#### MF-17 — Receive memory and preferences through existing canonical projects (P1/P2, coordination only)

- **Root cause / evidence:** PR115 owner-memory held source is not governance; main narrow personal preferences persists but UI consumption incomplete. ST-07–19 already own these gaps.
- **Bounded files/owner:** PR115 memory route/home links and public packet receiver; `MeriPreferencesPanel`, `UserPreferencesHost/Form`; only scoped navigation/lifetime integration here.
- **Implementation:** PR115 source reception is complete. Attach Meri acceptance to ST-11 owner-memory source-packet release; verify exact microsecond revision token and activeItemUnchanged correction semantics from Core/MM. Do not enable null source. For ST-12 apply saved theme/density/timezone deliberately at agreed app boundary after reload. Route remaining preferences to canonical ST13–19 delivery or explicitly unsupported copy, including fake feedback receipt correction.
- **Dependencies / exclusions:** ST-07–11 governance/files/grants/notifications, ST-12–19 settings, MM. No second memory schema/governance center or settings backlog.
- **Acceptance:** Owner memory view only shows current authorized own/wall/governance-eligible items, denied items vanish, changed token conflict reloads without overwriting; preferences persist and intended consumers actually change; notifications/privacy/connectors/help never show false save/send outcomes.

## Matching master scenarios, verbatim

| E23 | Memory recall after correction/revocation | Current revision/permission, prior content not reused incorrectly, provenance retained |
| E24 | Memory proposal approved/rejected/lost acknowledgment | Correct owner and durable outcome; four payloads retained/tombstoned coherently |
| E25 | New-surface Memory context | No fake conversation/client authority; held path stays503 until accepted contract exists |
| E36 | Retention suppression→purge→restart/restore | Suppressed data stays inaccessible, class-specific deletion receipts, no restore resurrection |

## Necessary qualification, deletion and completion

New executable regression: feed actual proxy responses into the production browser decoder for an empty page and a populated/paginated page. Verify exact microsecond revision and cursor, server-token forwarding, no extra dispatch, and no unvalidated extra fields exposed. Run these new tests before product change to demonstrate the broken base. Existing tests cover malformed upstream pages, wrong scope, unavailable/held outcomes, spoofed inputs, authentication and write-uncertainty fences; preserve and run the affected existing suites.

Meaningful mutant: remove only the restored schemaVersion from the fixed items response while valid Core200 setup remains; both browser-consumer cases must fail. Restore exact fixed bytes, then confirm focused checks. Run existing relevant owner proxy/receiver/route tests, scoped lint/format/types where supported, and git diff checks. Record commands/UTC/counts/exits, initial failures, exact source and any inherited failures. Reuse unchanged accepted Core authorization evidence; this FE repair does not prove tenant isolation by itself.

NOT RUN by this lane: full production build/container, model, AWS, PostgreSQL, migration, authenticated live owner list/correction/recall/firm governance/retention, and E23/E24/E25/E36 integrated outcomes. Root/Release/Acceptance own current material binding and final deployed verification. No new services/resources, no fixture mutation and no cleanup of shared environment. Reuse retained exact-lock dependencies. Temporary mutants are restored before commit. No obsolete mechanism is introduced or replaced; deletion is limited to the erroneous unversioned serialization expression, with no obsolete callers/flags/resources and no test-count reduction.

Definition of done: brief committed/pushed before edits; exact final head/tree and changed files; proven baseline/fix/mutant checks with scrubbed evidence; draft PR and separate exact-head review handoff to Root; explicit remaining live/config prerequisites. No #202 post. Private evidence is referenced by name only, never private identifiers, values or credentials. In-scope decisions proceed and are logged; only direct Neo chat approves scope/security changes.


## Author result (25 October 2026; source qualification only)

Brief committed and pushed before edits as `b6249bc80a34f92b02937a07dcd4cd1fd15df0de`. Product delta is one items-only serialization hunk; the existing strict projection, privacy/no-store headers, authorization, route, upstream status handling and all writes are unchanged. Two new consumer-boundary cases cover empty and populated pages, and the prior exact-wire assertion now includes the required version. No tests removed. Existing test file exceeds the repository's 400-nonblank-line review trigger; it retains one cohesive owner-proxy responsibility, with no new module/domain. Exact-head reviewer should assess that bounded extension; unrelated splitting would expand this repair.

Environment: retained Windows Node24.22.1, Vitest4.1.11, TypeScript5.9.3, Prettier3.8.1 and existing ESLint; direct Node tool commands used. Ambient npm11.19.1 differs from repository11.9.0 guidance, but npm/install was not used. Dependency lock SHA256 `8a17eb3b8cf2c333403fe94bafb62d3791daaead4d57d8c945acba0a60b7db04c` matches the donor exactly. Task-local node_modules junction reuses preserved same-host dependencies; no install or lock change.

| Check | UTC start | Result |
| --- | --- | --- |
| New consumer cases against unchanged product | 2026-10-25T17:35:15.3221835Z | Expected FAIL:2/2 Invalid memory item page;14 unselected (exit1) |
| Five owner proxy/route/current-access/paging/decision-hold suites | 2026-10-25T17:35:26.8844928Z | PASS54/54,5 files,0 skipped (exit0) |
| Remove restored wire schemaVersion only | 2026-10-25T17:35:48.327051+00:00 | Killed:2/2 new cases fail;14 unselected (exit1) |
| Restored fixed consumer cases | 2026-10-25T17:37:32.7720238Z | PASS2/2;14 unselected (exit0) |
| Scoped existing ESLint | 2026-10-25T17:36:05.586112+00:00 | PASS,0 errors/warnings (exit0) |
| Scoped existing Prettier | 2026-10-25T17:36:09.442131+00:00 | PASS (exit0) |
| Scoped two-file/transitive TypeScript | 2026-10-25T17:36:09.817406+00:00 | PASS (exit0) |
| git diff --check | 2026-10-25T17:36:11.124641+00:00 | PASS (exit0) |

Commands and complete synthetic logs are retained under Settings `work/personal-memory-get` by check name. Focused test command: `node node_modules/vitest/vitest.mjs run --root apps/web tests/meri-memory-owner-review-proxy.test.ts tests/meri-memory-owner-review-route.test.ts tests/meri-memory-current-access.test.ts tests/meri-memory-owner-inbox-pagination.test.ts tests/meri-memory-owner-decision-hold.test.ts`. Baseline/mutant/restored select only the two new cases with `-t 'delivers a'`. Lint/format target the two changed source/test paths; types uses a scratch tsconfig extending the existing web config with those two entry files and retained node type roots. Initial scratch console output hit Windows UnicodeEncodeError after saving the expected mutant failures; `finally` restored the source. The retained failure log was inspected and the console encoding was corrected without a second mutation run. Final source matches the exact base plus only the intended hunk.

No product-test failure remains in the selected54 cases. This is not a whole-suite/build/live pass. Full production build, browser, model, AWS, DB and integrated E23/E24/E25/E36 acceptance remain NOT RUN. The16:51 live HTTP cause and current Core memory lifecycle/tenant selection remain unverified prerequisites with Root/Release/Acceptance. No runtime/telemetry/fixture resources created. No dead flag/caller/resource introduced; replaced unversioned serialization is removed in this same change. Core and all other frontend product paths remain byte-identical to the parent. Draft publication and independent exact-head review follow; merge/deployment remain separate.
