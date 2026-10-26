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

# Pair qualified WS13 package with accepted existing-newsletter atomic save

Existing basic newsletters now save through the existing atomic ordinary-save owner, preserving the complete document body, exact request/receipt identity, replay and UNKNOWN fences. This intermediate candidate combines the qualified Shared3b package adoption with independently accepted FE178. Library's four-file saved-projection staging consumer is still in progress and must receive independent acceptance before final composition. New-newsletter creation recovery, full WS13 closure and deployment remain separate.

## Exact composition and ownership

Base is merged FE176 a76baa609302db93faf8d038096b7877e6890464/tree6aa6501b5253b9546e0ca24635587cdc95edee65, retaining accepted FE175 native getToken and FE176/177 WS15 behavior. The package-only commit9eb2e017f8775f8b31de7c89c0bfbff0c9bc586c/tree9097ff7ecb6186629a8251994263b66e56fd56ba remains in history. Its artifact, pins, npm lock, provenance and qualification bindings are unchanged; only this brief advances to the current composition.

FE178 accepted head17a584ad583a1455283930faf572374eb9760139/tree926ff12c429958b7dd580fcf079490f314c60696 is adopted by cherry-pick6cb07abe3c4439b4dc809ad8047e06962b17179b. All20 preimages equal the author base504add2eb594180c8c28d1ee9d025769af1a594a and currenta76/package candidate; all20 postimages equal accepted178. No manual source combination. Eight production files, ten focused tests/fixtures and two allocation documents are exact reviewed blobs. No rich-newsletter, staging implementation, shared journal, import policy or private package source change. Root's W3-FE178-ATOMIC-SAVE-REVIEW.md independently ACCEPTS source and seven exact design dispositions; final package+atomic+staging combination is still pending.

Existing-draft save dispatches one atomic operation through the canonical owner and exits only after confirmed saving. Capture preserves full body/unknown fields and surviving block fields, refuses ambiguous primary identity and unsupported blocks, and normalizes optional undefined links before retained JSON hashing. Exact replay, current actor/client checks, lock/reservation, readback/rebase, cross-tab unsent edits and uncertainty remain with the existing ordinary-save lifecycle. The retained creation path is outside this acceptance. Core remains the authority; no second journal, serializer, endpoint or policy owner is added.

## Immutable package and seven exact records

Actual Release artifact capiro-shared-0.0.0-3b4937ad-40ac9d745261.tgz is696105bytes/288regular entries, SHA25640ac9d74526123da69c321a537a8ec842960ee226acb53e41c0c8d5d65563598, SRI sha512-j/XFzPmzJCUsbKve+8gmtTXIyBLqMxHdzWthYBmnVBcGqKrWGssK4HrEGO90ANyqTXOJRmOUwdD3oews4p5kzw==. Accepted Core144 source3b4937ad2f5d15b85ea1c4474ed48b4a39e2f0ac/tree122b0c926a6a6f864c9aed36d8f5be465064976e. Release completed SCOPED_PASS in w3-shared-3b4937ad/distribution-receipt.json and W3-SHARED-3B4937AD-DISTRIBUTION-HANDOFF.txt. No rebuild/repack/publication by Integration. Only five saved-revision source/JS/declaration/map files differ from d680;283entries, manifest/exports and all12 WS15 newsletter JS/declarations are identical. Historical distributions and provenance remain immutable.

Register only the accepted seven fingerprints: NewsletterWorkflow module476/f23f461d and NewsletterEditor350/4ac93708; useNewsletter234/2d4f82b6 and nested save89/a4a0e41d; useOrdinaryDraftSave module493/c33506c1 and function428/5fac0d97; workspace-documents module429/fa0039c6. Five same-symbol records are replaced; the obsolete renamed NewsletterWorkflow function record is removed; NewsletterEditor and nested save records are added. Six old records become seven exact accepted records, with all unrelated entries preserved. A static four-file scan reproduces exact line/count/fingerprint and confirms seven registered signals, zero record errors/blockers within that scope. No whole-architecture PASS or approval of inherited debt.

## Reused evidence and current checks

Release actually verified all288 installed entries,13/13 WS13 runtime and15/15 WS15 preview cases, plus NodeNext/Bundler declarations/public-private imports (six commands exit0). The first WS13 runtime run was12/13 because the probe counted Node synthetic ESM __esModule metadata; the probe alone was corrected and the failure retained. Runtime DB seams are synthetic. Prior Chromium149 renderer116/receiving130 evidence is reused for byte-identical six-module closure; no new browser run. Whole-root node:crypto Vite external-stub caveat remains.

Package-only Integration evidence remains valid: npm11.9.0 offline lifecycle-disabled install and generated root lock exit0;15 targeted installed files match the receipt, two selected existing byte tests pass with zero skips, both manifests/two pins/three lock bindings pass, unrelated lock values and executable fixtures/goldens remain exact. Evidence and installed stage: C:/Users/Administrator/Documents/Codex/2026-10-25/wave2-visible-integration/work/ws13-distribution/consumer. No repeated package campaign.

Accepted178 author evidence is reused with original limits: intended original mounted failure at first PATCH; preservation/refusal and JSON-roundtrip mutants fail as intended, then restored. Six selected unit files report86pass/1inherited failure/0skip; untouched base reproduces that held-library assertion. Mounted newsletter/manual/recovery campaign30pass/0fail/0skip, followed by two affected readback cases after the final JSX correction. Base/final typecheck both exit2 with the same35diagnostic lines, zero added/removed; not clean typecheck. Final touched lint/format/diff checks pass. Earlier setup, JSX, normalization and widening failures remain in author evidence. Author architecture runs exit1,120→127blocking; only the seven independently accepted records are adopted here. No full-suite/typecheck/build/deployment PASS.

Integration's current checks are exact20preimage/postimage and package/current-default preservation, a four-file static seven-record scan, registry-scope proof, diff/clean/remote checks. No product tests, rebuild, browser, architecture census, DB/cloud or deployment execution. The original source/test evidence is not relabeled as execution on the combined head.

The old existing-draft direct-PATCH assertion is replaced by two primary-selection/bound-only atomic tests; held association's static no-owner refusal has real mounted positive coverage. Old existing-draft dispatch returns through the atomic owner; no disabled path, test-count reduction or temporary diagnostic is introduced. Immutable artifacts and accepted source commits are retained history.

Library exclusively owns workspace-newsletter-staging.ts and newsletter staging-model.ts/useNewsletterStaging.ts/NewsletterStaging.tsx plus focused tests. Its eventual candidate must preserve server projectionVersion/HTTP projectionHash in exact display/retained/request/receipt identity, permitted historical unpinned replay and UNKNOWN fences, with no frontend hash/serializer. Integration waits for independent verdict before composition. a3_scope owns producer PG harness; Release executes later. MG06 remains API schema owner, WS10 Workspace schema owner. Root owns final combination confirmation/merge; Release owns shipping. No authenticated/live/provider/send or new-newsletter creation acceptance follows.
