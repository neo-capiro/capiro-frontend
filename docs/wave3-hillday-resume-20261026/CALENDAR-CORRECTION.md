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

# FE182 saved-week boundary correction

Author response to Root's concrete P2 allocation and independent `W3-WS10-FE182-REVIEW.md`. Previous head `25a17ded4b3112356c73f085f18a0500f55fa9f1`, tree `7b4ed452bfadcf539c39292e4163a3ce85d9f213`, remains immutable original evidence. Continue the same `codex/wave3-hillday-resume-20261026` branch and draft PR182. This is a correction awaiting independent delta review, not self-acceptance or WS10 closure.

## Exact correction

Only one product line changes: `HillDayMeetings` parses the saved date at `T00:00:00` instead of `T12:00:00`. This uses the same browser-local midnight boundary as the existing new-week `mondayOf` path. The saved date, timezone request argument, week navigation and seven-day end calculation remain unchanged. No date framework or unrelated UI change is introduced.

The browser fixture now serves a saved Monday09:00 event and filters it against the actual `query.from <= startsAt < query.to` interval, matching Core's `hillday-source.service.ts:398` predicate. The added mounted UTC witness requires that morning checkbox to render selected, checks midnight Monday through midnight next Monday, reloads and confirms selection retention, then saves the same event/week/timezone. The existing saved meetings/context case uses the corrected range-sensitive fixture too. No existing assertion is weakened or case deleted.

## Executed affected checks

Same qualified Node24.22.1/Playwright1.61.1/Chrome/cache and port5323 as the original handoff; all data synthetic. Browser environment: `CAPIRO_BROWSER_TEST_PORT=5323`, `CAPIRO_TEST_CHROMIUM=C:/Program Files/Google/Chrome/Application/chrome.exe`.

| Check | Completion UTC on2026-10-26 | Result |
| --- | --- | --- |
| New mounted witness against original noon product: `npm run test:browser:modules --workspace @capiro/web -- workspace-hillday-resume.spec.ts --grep 'saved week retains Monday'` |04:06:51.2744736Z| Exit1, intended missing selected-checkbox failure because Monday09:00 is excluded. |
| Corrected product, from apps/web: `node ../../node_modules/@playwright/test/cli.js test --config test/browser/playwright.config.ts workspace-hillday-resume.spec.ts --grep 'saved week retains Monday\|saved meetings and context'` |04:07:57.4879760Z| Exit0,2 passed; new range witness plus existing saved meetings/context case. |
| Touched three-file ESLint and Prettier check |04:07:42.4292423Z| Both exit0. |
| Existing source scanner on old/new HillDayMeetings only |04:09:05.774Z| Imports identical; same225-nonblank function; exact changed fingerprint recorded below and in SIZE-REVIEW.json. |

The original noon preimage is the executed negative control; it fails the same assertion that passes after the one-line fix. Root's independent actual-component failure at04:04:47UTC is preserved in its review; this author additionally reproduced the failure through the mounted receiver. Original generation retention mutation and restored-byte evidence remain unchanged. No redundant mutation or broad campaign was run.

Prior74-unit/8-browser evidence retains its exact original attribution. The original8 include the existing saved-selection case now rerun; the new case is one additional distinct browser witness. This correction does not claim that all9 were rerun together. The prior full typecheck's same38 inherited diagnostics remain preserved; no full typecheck/build/install/database/provider/cloud/deployed acceptance was rerun for this one-line correction.

## Exact changed binding and scope

HillDayMeetings Git blob changes `52d758c5daf2598ae70af307f876402f2ed4e71d` → `2e8c908c674c8744e464944725326530a5a293df`. New canonical-LF source SHA256 `d2c44c8889228c0b7c4b20c2d6b6ffa0ad697da4b661f6f15ba6e4feec7aed1f`. The225-nonblank function fingerprint changes `e70f5cafe3d3c9cbf79eeb03085b8bef4176c7d9284807d918ddb9d2466e0354` → `6493a133ac7255442c1cd0d52f4e6fed02565c740428b2b3ffdf5b020f0deeda`. All imports and the other six size-record fingerprints remain unchanged. Integration/independent review owns adoption; no registry/policy waiver is added.

The correction touches only HillDayMeetings, the dedicated browser fixture/spec, this correction handoff and the existing size packet. The remaining seven product postimages—including generation, operation/schema, route/host/wizard and the journal-composing helper—remain at the reviewed original head. Shared journal, producer, Editor/Export, package/lock and other owners have no delta.

Test processes/server exited. Preserve all existing checkouts/caches and original failure logs; no rejected cleanup was retried. Root's minimal independent delta review and Integration/Release gates remain pending. Exact correction commit/tree and local evidence receipt are returned in the original chat outputs after publication.
