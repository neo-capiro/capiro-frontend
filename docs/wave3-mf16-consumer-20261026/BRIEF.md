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




# MF16 bill-source and recorded-usage frontend consumer allocation

FROM Root TO Library UI owner. Implement the two accepted current-read consumers in existing Meri conversation UI, using Figma3.4 and the actual accepted public artifacts. Meri main0a0869cefb3157e90f3d902ed3e7d7ab0d0da0da/tree d14c4d07b57bd1cbd51a69e258f89b34942844c3 includes native bill-reference273 and runusage274. Root source/native reviews are complete. Release is qualifying actual contracts0.1.15+ui-stream0.1.5 archives now. Before that handoff, do only bounded host/operation preparation; do not copy unpublished DTOs or install/build. Integration/Release own archive/manifest/lock/installation provenance. Freeze187/190. Fresh FE worktree based on actual currentmain4d75c8d882e6ab7590f03bdef31c48099bb79b53; later compose unchanged unrelated source.

Read Root outputs/W3-FIGMA34-MF16-VIEWER-BRIEF.md and CONTEXT; saved native bill page/denied/stale/current access and UTF16positiveoffset rules remain exact. Its older 'usage unavailable' and earliercontracts-tree statements are superseded ONLY by274 and independent outputs/W3-MF16-USAGE-PR274-REVIEW.md. Actual final contracttree05257855afe58a343b5dd13ae574aa50cbc586e3; ui-streamtree3828c7e6a5454004e63f132b736fcca94dfbf2bd. Existing card3027:28786 within3027:28579 supports run-level Recorded usage and separately labelled Recorded tool hooks. No newFigma node required unless concrete absentstate emerges; m3 sole designwriter.

Own feature-local native source/usage view and hooks, fixed source-read and usage proxy/operations through existing Meri HTTP/authentication owner, and minimal actual conversation host insertion. First inspect exact current transport patterns; no new authentication/route registry/state store. Source list uses genuine native source event.eventId only, never promotes legacyrefs/assistantprose. Explicit open reads exact savedpage with existing current-auth bearer; no prompt/admission/resume/reservation or implicit newpage. Inertplaintext, current admittedlinkonly, distinguishsaved/fetched timestamps. Loading/denied/stale/identity/run/reference changes clear privilegedcontent/links; late results cannot restore. Respectexistingconversation lifecycle, no stale identity cache.

Usage is exact conversation/run-level read; absent/unavailable/zero distinct; runDelta estimates separately from cumulative models/resume/fork/subagents. Preserve provider/pricing basis and nullable duration, hookpartial/omitted qualification. No providerbilledUSD claim, repricing, per-modelrunmoney, toolUseId/UIrequestId correlation or external-effect inference. Do not map nativewire into genericdemoDTO by cast. Reuse existing cards,StatusPill,StateMessage,LinkAction,localv2 tokens/Geist; functionallayoutand390px keyboard/focus matchcanonicalMeri context. Existing legacy sourcepresentation remains unchanged.

Onceactualarchivequalificationreceived, implement with exactinstalledpublicreceivers. Targeted finite mounted tests using existing toolchain: successfulsavedpage+positiveoffset, stale/deniedclear, lateidentityswitch, completedrun reload withoutprompt/reserve, malformed/boundresponse refusal, explicitcurrentlink; usage missing/unavailable/zero/multimodel cumulative+delta/partialhooks/private-stripping/nojoin. One meaningful binding/lifetime mutant if needed to prove customboundary; don't repeat producer/nativewholecampaign. Actualdesktop/narrow captures and scopedaccessibility for changedviews, retain failures. Required independent source/responsibility and m3visualreview beforeRootmerge. New source files must be cohesive; no broadsource-editor redesign, hearing/media/claimmapping, billingornewmeter. Release26Octowns build/deploy; no authorpackagebuild/install/cloud/DB/provider. Return exactfrozen source/handoff and minimalonehostpatch ifsharedhostleaseconflicts.

