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



FROM: Wave 3 Root | TO: existing OrdinarySave author | TYPE: PROCESS6.1 | RE: existing basic-newsletter atomic save

Author implementation outline: branch `codex/wave3-newsletter-atomic-save-20261026`, checkout `C:/dev/wave3-newsletter-atomic-save-20261026`, exact base504add2/treea389274 below. Preserve PR171 checkout. Add the bounded newsletter request variant in the released operation owner and use a typed editor model with the SAME ordinary-save hook; manual sections retain their model. The newsletter model captures primary ID, full body, title and NewsletterBody against the authenticated baseline, preserves unrelated body/block fields, and refuses conflicting unsupported body content. Existing newsletter presentation composes that hook and its recovery controls; creation remains the existing separately tracked flow. No staging or shared journal edit. Test the mounted one-POST path first against original source, then exact recovery, conflict/rebase, independent tabs, preservation and scope loss; reuse unchanged producer evidence. Reuse the existing local dependency cache and previously allocated author port5323 after a free-port check, with no installation or service restart.

Your WS13 prerequisite trace is accepted as the finite implementation map. FE171 is merged through FE173: current frontend default504add2eb594180c8c28d1ee9d025769af1a594a/treea389274a0d8fbc326925937c2575aa81bb807d64. Create a new author branch/checkout from that exact base, preserving frozen PR171. Implement ONLY existing basic-newsletter save reuse now. Core producer d68024 already accepts bounded documents in atomic save; no new backend save endpoint or shared public serializer is needed.

Own newsletter/use-newsletter.ts, minimal existing newsletter save presentation and directly related tests; existing ordinary-save/ordinary-save.ts and useOrdinaryDraftSave.ts typed payload specialization; shared/capiro/operations/workspace-documents.ts only the released atomic-save payload variant. Root explicitly allocates this shared file and existing lifecycle owner to you. The rich-newsletter adapter/operations/controller/actions/preview belong to Library, and package/export/lock/registry belongs to Integration. Do not edit shared durable/session journal. Minimal directly related newsletter model helpers are allowed if needed for capture/hydrate/rebase.

Add a bounded newsletter payload variant to the same ordinary-save lifecycle. Preserve the existing Manual section variant, request identity/hash binding, missing-storage fence, cross-tab unsent edits, scope lifetime and explicit adopt/rebase. Capture exact primary document ID, full saved body and canonical client UUID/null with baseline. Core replaces body wholesale: preserve unrelated full-body fields or refuse unsupported content. Replace existing-draft metadata/body/snapshot triple mutation with one existing atomic save/version. Local undo/redo and intentional save remain. Lost response remains UNKNOWN and uses exact recorded request/receipt, never current-state-as-success or a replacement request.

Do not claim new-newsletter creation solved: ordinary create has no request-bound recovery yet. Keep that separate producer prerequisite visibly tracked, and avoid modifying creation semantics in this slice. Do not start projection/staging changes: a separate Core producer is implementing explicit projection identity; that consumer allocation follows its reviewed public contract.

Actual d680 public artifact has been qualified; Integration is adopting it separately for WS15. Existing canonicalWorkspaceSnapshot import is already accepted in this base. Preserve public boundaries; consume actual installed artifact for any newly required type, no DTO copy/backend import. Coordinate only a concrete dependency need through Root.

Read applicable AGENTS/standards and canonical PROCESS6.1–6.3/WORKFLOW/standing/supersession. Reuse unaffected171 evidence. Run focused existing-newsletter one-request/one-version, body preservation, stale baseline, lost-ack exact recovery, independent-tab unsent content, scope/revocation and existing manual-save compatibility. New meaningful assertions need intended red/mutant and restored green, no broad repeated campaign. No model/provider/live prompts/send, deployment or build images.

Commit/push a draft PR and return exact base/head/tree, files/deletions, real commands/exits/counts/UTC, focused witnesses, inherited failures, changed size fingerprints and remaining creation/staging boundaries. Integration alone adopts exact approved registry records. No self-accept or blanket debt waiver. Save handoff under your existing outputs.

#### WS-13 — Basic newsletter staged content fidelity (P1)

**Evidence/root cause:** [Saved-revision projection][ws-saved-revision] uses snapshot.docTitle as email subject and projects plaintext body; authored newsletter.subject is separately stored. [Staging UI][ws-newsletter-stage-model] correctly warns rich formatting/images/attachments are excluded, but cannot fix a mismatched intended subject or legacy client binding.

**Bounded work:** After WS-04/05, extend the versioned projection for Newsletter to use validated saved newsletter subject and plain-text body with an explicit projection/version hash. Show the exact staged subject/body before confirmation, preserve immutable attribution and length limits, and never silently truncate. Keep rich HTML sending on the rich-newsletter path rather than attaching an unverified HTML blob to the plaintext staging contract.

**Acceptance:** Distinct document title/email subject, non-ASCII content, empty subject, >8,000-character body, image-only blocks, invalid or missing newsletter body, exact saved-version replays, firm/client sponsors and changed session scope. What the user confirms must equal the staged draft receipt.

<a id="ws-14"></a>
