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

# Bind basic newsletter staging to saved projections and atomic saves

Basic newsletters display the selected saved subject/plaintext and require confirmation of its exact projection before staging. New requests retain the server's projectionVersion/projectionHash and recheck them before dispatch; exact matching receipts settle the request. Historical unpinned recovery preserves the original request and uncertainty rules. Existing drafts save through the canonical atomic ordinary-save owner, preserving the full document body and confirmed-save behavior. This pairs the actual qualified Shared3b artifact with independently accepted FE178 atomic-save and FE180 staging source.

## Accepted inputs and exact composition

- Base: merged FE176 a76baa609302db93faf8d038096b7877e6890464/tree6aa6501b5253b9546e0ca24635587cdc95edee65, retaining accepted FE175 and WS15. No unrelated base source is replaced.
- Package-only179:9eb2e017f8775f8b31de7c89c0bfbff0c9bc586c/tree9097ff7ecb6186629a8251994263b66e56fd56ba, independently ACCEPT in W3-FE179-PACKAGE-REVIEW.md. Its ten artifact/pin/lock/provenance/binding/README paths stay exact; this existing brief advances. The package-only commit remains in history.
- Atomic178:17a584ad583a1455283930faf572374eb9760139/tree926ff12c429958b7dd580fcf079490f314c60696, independently ACCEPT in W3-FE178-ATOMIC-SAVE-REVIEW.md. Cherry-pick6cb07abe3c4439b4dc809ad8047e06962b17179b retains all20 reviewed blobs. Seven exact size dispositions were registered at preserved intermediate3901ea710f4809376ada9be1f1763775f56c057f/tree06bde5876f5677bb0975fda25a9e9349ba543aa1.
- Staging180:e3a00f51ea0f8f62d3abf1affd2db518d1d426c2/tree6625e3384f3b7bbd4f18dc7b53cd7e5967497b64, independently ACCEPT in W3-WS13-PR180-REVIEW.md. Cherry-picka45ed029e067f7824fed8fc8d1c25496f6b3767e retains all7 reviewed postimages. Every preimage equals base and3901; its paths are disjoint from all32 intermediate paths. No manual source combination. NewsletterWorkflow continues to pass the unchanged draftId/saved props to NewsletterStaging.

Only final Integration changes beyond those accepted source postimages are the one exact type-only import allowance, three exact size records and this composition brief. Accepted178 twenty blobs/seven records and actual179 artifact/pins/lock/provenance remain unchanged. No source branch is closed or merged by this handoff; Root performs final independent composition confirmation.

## Behavior and retained owners

The selected response requires published projection identity. New staging carries that identity unchanged through displayed content, confirmation, retained request, fresh selected read and dispatch, refusing changed projection before POST. The receipt must match the original request/source/revision/snapshot/projection/state; malformed or mismatched results retain uncertainty. Empty authored subject remains visibly empty. Selection, refresh and scope changes invalidate confirmation; loading/errors block dispatch. Actor, current client/sponsor/access, immutable source and effect authority remain with existing owners and Core. No browser hash, serializer, HTML conversion or duplicated DTO authority is introduced.

Historical recovery rechecks current actor/draft/client/destination and replays the unchanged original unpinned request/id without forcing it through current-v2 projection. Only a matching unpinned replayed receipt settles it; current session state is not causation. Existing atomic saves retain complete body and extra fields, exact primary identity, normalized JSON, locks/reservation, replay and UNKNOWN fences, explicit readback/rebase and independent unsent edits. Save and exit requires confirmation. New-newsletter creation remains outside this acceptance.

## Package and narrow architecture dispositions

Immutable capiro-shared-0.0.0-3b4937ad-40ac9d745261.tgz:696105bytes/288entries, SHA25640ac9d74526123da69c321a537a8ec842960ee226acb53e41c0c8d5d65563598, SRI sha512-j/XFzPmzJCUsbKve+8gmtTXIyBLqMxHdzWthYBmnVBcGqKrWGssK4HrEGO90ANyqTXOJRmOUwdD3oews4p5kzw==. Accepted Core144 source3b4937ad2f5d15b85ea1c4474ed48b4a39e2f0ac/tree122b0c926a6a6f864c9aed36d8f5be465064976e. Both pins and three semantic lock bindings are preserved from accepted179. Prior archives/history and WS15 public-entry bindings remain exact. No rebuild, repack, install or new package audit for this composition.

Allow only workspace-newsletter-staging.ts importing the single workspaceSavedOutreachRevisionWithinTx binding from @capiro/shared through whole-clause import type. Existing scanner kind other with one named binding identifies this form; no runtime root edge is added. Root is not added to publicExports, and existing pricing/snapshot exceptions remain unchanged. Scoped source-policy proof rejects ten runtime/default/namespace/wrong-owner/extra-binding/private/re-export/dynamic forms. The old policy refuses the accepted positive; an in-memory runtime-widening mutant fails the refusal assertion, and the actual unchanged policy remains green. These are static guard checks, not repeated product tests.

Register only three independently approved function fingerprints: StagingSelection337/3472ae78e5343e0a81130218e663b3104c5818f0d4464aa0e6a34ea3064400c3; useNewsletterStaging130/79a68c08d1c38d3d85f452dbd8fb56fba440a505171b06d59da5b61c3cf6d1be; nested stage87/1bd3e16fbdeb84beca078100a50be98f9c52ef3b70074e2c6f99ce629972992c. Two old records replaced, one added; all seven atomic records and unrelated registry entries preserved. Final four-file scan:0direct dependency errors,0cycles within the scanned scope,0record errors,3signals/3reviewed/0blocking. No whole-architecture or inherited-debt waiver.

## Evidence reuse and final checks

Release SCOPED_PASS is reused: all288 installed entries,13/13 WS13 runtime,15/15 WS15 preview, NodeNext/Bundler declarations/public-private imports (six commands exit0). Its initial12/13 namespace probe failure and corrected13/13 remain attributed to Node synthetic __esModule instrumentation. Prior Chromium149 renderer116/receiving130 evidence is reused for identical six-module bytes; no browser rerun. Whole-root node:crypto Vite stub caveat remains; this new import is type-only. Integration's original offline install/generated lock,15 installed-file matches,2existing byte tests and pin guard remain accepted evidence. Reviewer manifest-key instrumentation failure remains preserved.

Accepted178 evidence remains86unit passes/1inherited held-library failure/0skip, reproduced on untouched base;30mounted passes followed by2affected final readback cases; same35type diagnostics on base/final, not clean typecheck; focused final lint/format passes. Original mounted red and preservation/JSON mutants/restored outcomes retain their original scopes. No product rerun on the composed head is claimed.

Accepted180 evidence is reused:20/20units and20/20mounted, zero skipped/flaky, with final3/3affected subset after the historical missing-client correction; this is not23distinct mounted cases. One intended fresh-projection mutant attempted POST and failed, then exact hook restored. Focused final TypeScript/lint/format exit0. Initial mounted13pass/7fail from retained-request property ordering, initial narrowing failure and wrong-path formatter attempt remain preserved. Library's actual package probe matched all288 entries and supplied non-ASCII/empty-subject fixture values. Synthetic frontend fixtures do not prove actual DB transactions or grants.

Integration runs only exact preimage/postimage and artifact/manifest preservation comparisons, the scoped architecture/size/import guard, registry/policy delta checks and diff/clean/remote verification. Full changed paths and final head/tree are in the Integration final-composition handoff. Source tests, package campaigns, browser, build, DB, client generation, cloud and deployment are not rerun. The old snapshot-only staging guards/messages and existing-draft PATCH assertions were replaced by their reviewed owners; no disabled alternative, new diagnostic, test-count reduction or compatibility shim is added. Historical retained recovery and artifact evidence remain required.

## Pending confirmation and release

Root's one final independent whole-composition confirmation is pending; Integration does not merge. **WS13 actual-service PostgreSQL is NOT RUN:** the full migration-qualified Core+Workspace fixture recipe remains unresolved and Release is preparing it. Scratch run preparation is not DB execution. Coherent build/deployment and authenticated end-to-end acceptance remain open. New-newsletter creation, WS14, unrelated recovery, MG06 and WS10 corrections are excluded. Core145 policy merge changes no Shared/Onboard source and does not require another package. Core retains tenant/member/client/wall and effect authority; SDK/AgentCore/Temporal ownership and standing requirements remain intact.

## Verbatim bounded WS13 ticket

#### WS-13 — Basic newsletter staged content fidelity (P1)

**Evidence/root cause:** [Saved-revision projection][ws-saved-revision] uses snapshot.docTitle as email subject and projects plaintext body; authored newsletter.subject is separately stored. [Staging UI][ws-newsletter-stage-model] correctly warns rich formatting/images/attachments are excluded, but cannot fix a mismatched intended subject or legacy client binding.

**Bounded work:** After WS-04/05, extend the versioned projection for Newsletter to use validated saved newsletter subject and plain-text body with an explicit projection/version hash. Show the exact staged subject/body before confirmation, preserve immutable attribution and length limits, and never silently truncate. Keep rich HTML sending on the rich-newsletter path rather than attaching an unverified HTML blob to the plaintext staging contract.

**Acceptance:** Distinct document title/email subject, non-ASCII content, empty subject, >8,000-character body, image-only blocks, invalid or missing newsletter body, exact saved-version replays, firm/client sponsors and changed session scope. What the user confirms must equal the staged draft receipt.
