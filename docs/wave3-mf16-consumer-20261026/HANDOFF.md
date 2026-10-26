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

# MF16 native bill-source and recorded-usage consumer checkpoint

Consumer UI and fixed native reads are implemented against Release's qualified contracts0.1.15/ui-stream0.1.5 physical installation. **Author source and affected local checks are complete, including the real generated-package SSE case and the bounded host-copy correction. Final Integration composition and independent acceptance remain with Root. This is not deployed acceptance.** Base4d75c8d882e6ab7590f03bdef31c48099bb79b53, tree8dba548e645f2c827a462f801a149dc918a3c1eb. Branch codex/w3-mf16-consumer-20261026 at C:/dev/w3-mf16-consumer-20261026. Integration committed qualified archive/manifest/lock adoption as 0b5ab9d86ac9e181ca0943908d3af7dd8a7b54b1 on this branch. Exact frozen author head/tree are recorded in the external handoff after the source checkpoint commit.

## Implementation and reuse

ConversationPanels mounts one feature-local ConversationEvidence alongside the existing panels. The conversation fold now accepts the published ConversationEvent union, preserves native source events separately and gives only legacy UIEvent values to the unchanged workspace projection. Saved legacy TurnSources remains unchanged. The port composes current reads under its existing signal/isCurrent/onAccessLost lifetime. Request/response admission uses the actual public conversation-sources and conversation-usage receivers. Source reads bind the original eventId and exact conversation/run; usage binds conversation/run only.

The existing native history proxy now shares its unchanged native credential, configuration, same-origin, byte/deadline and no-store handling with the two exact current-read operations. The existing Next catch-all selects those operations through that same proxy owner. No second login flow, authority store, route registry, cache, model call or run admission was added. The exact two paths were added to the existing preview allowlist; Integration retains the package-version pin lease.

Opening a saved page performs one current read. Closing, selection/lifetime replacement, loading, stale/denied and invalid responses withhold content and links. Late results cannot restore them. Plain text remains selectable/inert, the current response alone supplies an external link, and saved/fetched times and partial positive UTF-16 offsets remain distinct. No unsaved next-page action or claim mapping exists.

Recorded usage separates this-run delta from cumulative model/provider/pricing basis and recorded tool hooks. Missing, unavailable and numeric zero remain distinct, as do zero and unknown duration. Omitted hook counts/partial coverage are shown without UI tool/source correlation, per-model run money, provider-billing or external-effect claims.

Existing SourceCard, StateMessage, StatusPill, FieldTable, LinkAction and v2 surface/phone styles are reused. The existing external.svg is nonempty with16x16 intrinsic dimensions and unchanged DesignIcon rendering. Fresh high-fidelity context/screenshots came from Figma fileIXJzJUkXcUTkySHir5JNea nodes1064:146774,3027:28786,3026:27991,3026:27744,1064:149158 in read-only sessiona7b34159-fc87-4351-94db-6eb284bad625. No design changes. m3 visual review is still required.

## Verified behavior and preserved failures

-49 affected unit tests pass: current reads, existing native history proxy and existing conversation host. Public source/usage request-response checks, current native bearer routing, wrong binding, oversized/malformed/private responses, denial and late lifetime rejection are covered.
-7 distinct mounted browser cases pass. After correcting two inherited parent-style overrides, only the desktop/narrow and strengthened late-identity cases were repeated:3/3 pass. Four scoped axe scans report0 violations and0 incomplete checks. Native history carries the genuine saved event; exact page/positive offsets/current link, keyboard open/close/focus, unsafe link, missing/unavailable/zero, multi-model delta/cumulative and partial hooks, stale/denied clearing, late closed/identity results and completed-run reload without prompt/reserve are covered.
-One deliberately faulted lifetime mutant fails the late-result assertion (resolved instead of rejected). Exact original source bytes were restored; receipt SHA256 matches the retained source. No mutant code remains.
-Touched source/tests lint and formatting pass. Consumer-only scoped typecheck passes; adding the actual host/API closure retains one TS2339 projectionVersion diagnostic in unchanged workspace-newsletter-staging.ts under the retained Core package. A read-only baseline compiler host using exact4d75c8d8 source blobs in the same runtime confirms that same diagnostic. The original baseline additionally fails the new native event union; the authored fold fixes that. The initial broad typecheck's eight unrelated Core/newsletter errors are retained, not hidden or reported as a full-graph PASS.
-The first source fixture used an invalid revision ID. Actual public receiving rejected it (3PASS/2FAIL); correcting the synthetic fixture to the published UUID shape yields PASS. An initial desktop run used a fallback font because Vite rejected the donor font path; those captures were superseded by actual Geist-loaded captures. A policy rejection prevented replacing the local font junction, so a byte-identical task-local font and scratch harness path were used instead; donor modules were untouched.
-The **live native SSE browser case failed** against the base generated adapter: legacy validateUIEvent rejects source.native-bill-text. The saved-history cases do not qualify streaming. This genuine failing test, screenshot, trace and error context are retained without skips or relaxed assertions. Root then explicitly granted the adjacent source lease. conversation-chat.ts now selects the actual public receiveNativeBillTextSourceEvent only for BILL_TEXT_SOURCE_EVENT and retains validateUIEvent for every legacy/unknown value. The existing guard is generic over the validated event type with UIEvent as its unchanged default; observation accepts the published ConversationEvent union. Chunk identity, frame restrictions, public cursor admission and all lifetime checks remain intact. The package no-emit typecheck passes. The author tracked dist remains unchanged; Release generated and qualified the actual package separately, as recorded below.

Commands use Node24.22.1, retained Vitest/Playwright/Chrome, Vite development mode on task-owned port5337, actual public receivers from Release's physical installation, and the existing browser harness with only a scratch local-font path override. No package install/build/codegen, cloud, provider, database, merge or deployment. Port5337 has been reaped after each run and is clear.

## Remaining owned gates

Integration owns vendor/archive/manifest/lock adoption and package pins; its 0b5ab9d8 commit is included. Exact qualified archives and hashes are in Release outputs/W3-MF16-0A0869CE-PUBLIC-PACKAGES.txt. This author has not changed those paths. The adjacent source lease covers packages/meri-client/src/conversation-chat.ts, conversation-observation.ts and guarded-transport.ts plus affected tests. Release generated this package once from cf3675f9 and qualified all four allocated transport suites76/76, including nine native-source cases. The preserved mounted live-source case now passes using that actual public distribution. No source alias, generated stand-in or unchanged seven-case browser repeat was used. Integration retains the final generated-output adoption/composition. The existing previewMeriContractsPackageVersion in apps/web/src/shared/preview/meri-conversation-route.server.ts still says0.1.14 and remains Integration's pin update.

The architecture allowlist still lacks the two actual public exports conversation-sources/conversation-usage; its six import findings are adoption metadata work, not a package privacy violation. There is no new route-owner import after retaining the established history-proxy entry. One product function needs independent size/responsibility review: RecordedUsageView.tsx UsageDetails,92 nonblank lines, fingerprint1c68f807fa864d386dc51e4460025e81d553e987e3d4c75968bbfbd17df70da1. It presents the separate delta/cumulative sections of one admitted usage record; no accounting or transport lives there. No registry self-waiver was made. Prior inherited review findings remain with Root.

Root retains independent source/responsibility acceptance and final coherent adoption. m3 accepted the new cards/layouts and requested one host-copy correction; that correction and the retained corrected capture are detailed below for its visual addendum. Existing source/projection/native/package producer qualification is reused; authenticated deployed behavior remains Release/Root work. Author187/190 branches are untouched. Task-local scratch under work/mf16 is untracked and retained with the finite check evidence.


## Adjacent adapter verification and Release handoff

The new packages/qualification-transport/conversation-native-source.test.mjs uses the existing real SDK/public-package fixture and the existing synthetic typed source record. Its nine cases cover mixed native/legacy POST stream, native reconnect, unknown event, unknown native field, invalid page, wrong run, outer ID mismatch, nontransient payload and native arrival after lifetime replacement. Against the unchanged generated distribution, the two success cases reproduce rejection; six admission-negative cases pass. The corrected lifetime assertion passes separately: the canonical client clears observation and enters unavailable when isCurrent becomes false. Earlier test-draft assertions incorrectly expected a retained cursor and then disposed; those failed logs are preserved. All nine subsequently passed against Release's actual rebuilt distribution, as part of its76/76 affected transport result.

Author verification commands from checkout root: node node_modules/typescript/bin/tsc -p packages/meri-client/tsconfig.json --noEmit (exit0); node --test --test-timeout=15000 packages/qualification-transport/conversation-native-source.test.mjs (expected native success failures against old dist; preserved); node scripts/architecture.mjs (exit1, six missing adoption export entries plus existing size-review signals); git diff --check (exit0). Touched web Prettier check passes. No new adapter size-review signal was introduced; UsageDetails remains the one new product function signal.

Release completion: one existing TypeScript5.9.3 build from frozen cf3675f9 emitted24 source-bound files at C:/dev/w3-release-mf16-client-cf3675f9-20261026/packages/meri-client/dist. Its four allocated transport suites passed76/76 with zero failed/skipped/cancelled. Actual public-package provenance is in Release outputs/W3-MF16-CF3675F9-CLIENT-DISTRIBUTION.txt (SHA256e2214e572edd8147d443a31f3f52ee5b106613abe3d319eb503efa014d5b86ad), with generated-files.json SHA2562a61406c853199b147d178e3e578170668615554c5c59e4e3b88f8224463230f. Author verified all24 file hashes/sizes both before and after the mounted checks. The task-owned meri-client junction now resolves to that real package; its prior junction is retained as meri-client-before-release-cf3675. Release output/donor files and author tracked dist were untouched.

Integration: add only the actual published conversation-sources and conversation-usage exports to scripts/architecture/dependencies.mjs and update the existing preview package pin. Root: independent source/responsibility review and m3 visual comparison of the retained actual-Geist desktop/narrow captures. This source checkpoint is not a claim that any pending gate passed.


## Frozen source checkpoint

Author head: cf3675f9d6af2e26dde67bab27807a06da4e75eb.
Tree: a611df7c5034668c508419b6fadf1e95d8c45987.
Branch: codex/w3-mf16-consumer-20261026.
Checkout: C:/dev/w3-mf16-consumer-20261026.
Parent: Integration adoption0b5ab9d86ac9e181ca0943908d3af7dd8a7b54b1, based on accepted FE4d75c8d882e6ab7590f03bdef31c48099bb79b53.

All21 authored source/test/handoff files are committed. The sole untracked path is owned work/mf16 scratch retained for Release's distribution and the pending mounted verification. No generated package output, adoption manifest or lock was authored here. No push/PR/merge/build/install/cloud/provider/database action was performed. Initial commit lacked local Git identity; the retry used the same command-scoped author identity as this author's prior PR190, without changing shared Git configuration. The source checkpoint is frozen for independent review and Release regeneration.


## Host-copy correction and completed mounted checkpoint

Root granted the minimal ConversationTurn/empty-copy seam after m3 identified a native-only run claiming that no source references were provided. ConversationTurn now mounts the unchanged legacy TurnSources when populated legacy references exist or when no native page exists. Thus actual legacy lists and their incomplete-history qualification remain intact, and a run with neither source type retains the original no-reference message. Native records remain separate; no DTO conversion, authority, prompt, read or Figma change was added. Only ConversationTurn.tsx and the existing meri-current-reads.spec.ts change after cf3675f9, plus this handoff.

The existing1440px saved-page case now asserts that both legacy empty statements are absent for genuine native history, then checks the original no-reference state after history without either source type. The same assertion was exercised against exact cf3675f9 ConversationTurn bytes: child exit1, observed count1 rather than0, proving the original contradiction is caught. Corrected host bytes were restored exactly (SHA25624f62f06dad677879fa32c9616d033c34cc23b4e86984d0fa1b561ee14bd51ab). The baseline-check wrapper's final console-print hit Windows cp1252 encoding after restoration and evidence writing; no test or source-restoration failure resulted. Raw child output, failure screenshot/trace/context and restoration receipt are retained.

Actual generated-distribution mounted run at2026-10-26T08:17:07.474Z:2/2PASS in23.104s, zero unexpected/skipped/flaky. Exact selection: live native source event reaches the existing conversation viewer; native saved page and separate run usage at1440px. The source card test also retained source text/offset/link checks, keyboard/focus, unchanged usage rendering, no prompt/reservation effects and its two scoped axe scans (zero violations/incomplete). No other six unchanged browser cases or narrow variant were repeated. Commands used the existing owned harness and retained Node24.22.1/Chrome/Vite development mode on5337. Public-resolution evidence confirms the real generated meri-client/conversation export and qualified physical contracts0.1.15 source/usage exports. The source package requires no further build for this host-only correction.

Corrected evidence: outputs/mf16-frontend-evidence/release-mounted-correction/. two-mounted-results.json and release-two-mounted.txt preserve the successful run; conversation-1440.png is the one corrected full-host capture requested by m3, SHA256f0cf341d8b8014d8773376ac6f95e7d096d66cd62b9ec88a8de6c7c543b2e53e. It was visually inspected: the native saved-page card follows the answer without the contradictory legacy-empty sentence. Bill-source and usage region captures are retained beside it. All prior failure and original desktop/narrow evidence remains unchanged.

Touched host/test lint and formatting pass; git diff --check passes. Architecture reports no new ConversationTurn size signal; the same six import findings pending two Integration-owned export allowlist entries and existing independent size-review signals remain. No author package generation/install, donor mutation, PR, merge, cloud, database or provider action. Port5337 is reaped. Integration owns the two actual public export allowlist entries, preview package pin, generated package output and final composition/PR. Root owns final source review and m3 correction acceptance. Author source/test checkpoint is complete.
