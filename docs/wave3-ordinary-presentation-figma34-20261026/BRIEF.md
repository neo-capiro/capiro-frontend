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

# Ordinary document presentation — implementation brief

New isolated checkout `C:/dev/w3-ordinary-ui-20261026`, branch `codex/wave3-ordinary-presentation-figma34-20261026`, base `1b676415f640ba46d6e097dfa4dc2ef205e00933`, tree `cd505b5cee4f1e8f4de54a687198cfe4c73be63e`. PR185 remains frozen at5426a3910f11e5119e57e58353534fea74ef3b30. The original longer checkout path did not complete; a shorter path with command-local long-path support completed successfully. No shared Git configuration changed.

Root leases WorkspaceDraft.tsx presentation/header, ordinary-export/OrdinaryDraftExport.tsx, ordinary-save/OrdinaryDraftSave.tsx, version-history/VersionHistory.tsx presentation, a dedicated scoped stylesheet and focused presentation/mounted evidence. ExistingNewsletterSave's reused recovery rendering must be captured; its owner is unchanged. Save/export/history state owners, receivers, journal, shared controls/workspace CSS, packages and locks stay outside the edit scope.

Read Root's W3-FIGMA34-ORDINARY-PRESENTATION-BRIEF.md and W3-FIGMA34-ORDINARY-RICH-CONTEXT.md. Figma design-to-code skill and high-fidelity contexts/screenshots read for file zGvvF6V6hh7yweoplCdpdE nodes3146:115934,3146:115961,1064:257658,1176:297781. Code Connect maps for the header, reconciliation and history target are empty. File session8e51103b-fabd-4c6b-a892-cf4f6a3466e0. m3_scope remains sole design writer.

Implement a flexible title/action header with separate saved-export card; contain existing recovery state explanations/actions and explicit readback; replace history tabs/raw diagnostic identifiers with compact saved rows and contained inspection/comparison. Reuse canonical controls, modal and tokens wherever they can express the target. Retain all accepted qualification text, event/receipt selection, existing action gates, no automatic writes, original-save retry semantics, readback/adopt separation, immutable saved export and current-access refusal behavior. No inferred title/author/time or publication status.

Verify focused affected unit/mounted semantics, desktop/narrow layouts, keyboard/focus/scroll, action states, actual saved export selection, unknown/readback and shared newsletter recovery rendering. Use the existing development browser harness to honor the no-build instruction; no install/build/native database/cloud/provider or full test campaign. Return actual evidence, exact head/tree, draft PR and mechanical size-registry effects for independent ownership.

