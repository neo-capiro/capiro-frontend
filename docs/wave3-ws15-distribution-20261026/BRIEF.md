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

# WS15 public distribution adoption

FROM: Integration | TO: Root / Library / independent reviewer | TYPE: bounded adoption | RE: actual qualified Shared artifact

Root accepted Release's W3-SHARED-DISTRIBUTION-HANDOFF.txt and allocated a separate artifact/pin/lock/provenance/qualification change. This branch began at merged FE173504add2eb594180c8c28d1ee9d025769af1a594a, whose tree exactly equals acceptedf7d266/a389274a. It then fast-forwarded to merged FE175858f06790d30216ad1070cab1768b192087d6c18/tree279e1cccb7d8fcdcf00cf7deb8642228879c114c, preserving that exact accepted native-token fix. The temporary redundant175 cherry-pick remains local/unpushed at a8a45bc0 after Root cancelled its composition; no redundant PR was created.

Reuse Release's actual capiro-shared-0.0.0-d68024dc-e92d6c6129f7.tgz,693445bytes,288entries,SHA256e92d6c6129f7c82b62b71086b81cbba6e0f57b786b41ba023017ca77b1c5c72e, built from accepted Core d68024dc62edddb0784f79b4e5ca50335dd1ca89/tree0051653db4eb1bbd4b8f8e742cc22b11d25126bf. SHA512/SRI are read from the actual receipt and verified against bytes, not invented. Core139 preserves this Shared/compiler source. No rebuild, repack, registry publish or copied DTO/private import.

Both app and qualification package pins use the new immutable filename. Retained pinned npm11.9.0 regenerated package-lock with --package-lock-only --ignore-scripts --offline --no-audit --no-fund, exit0. Exactly three semantic package records change: apps/web dependency, node_modules/@capiro/shared resolved/integrity and qualification-newsletter dependency. All other values/versions are equal; npm also orders existing dependency keys. Old tarballs and original manifest records are preserved. Both newsletter/Onboard activeFile records identify the new input. Twelve public-entry hashes are taken from the artifact and matched to Release's receipt; previous bindings remain explicitly historical.

The existing positive receiving fixture now calls the public parser with expected document/revision for a pinned preview, separately types unbound content and rejects unbound-as-pinned/partial expectation claims. Its original published binding is retained under adaptedFrom; immutable corpora, other original fixtures and historical source files are unchanged. The existing byte-check test title now describes published or adapted bindings truthfully; assertions remain intact. No new framework or generated golden. Deleted active assumption: one-argument preview assigned to pinned NewsletterPreview. No production behavior is deleted here and no test count drops.

Integration installed the actual adopted tarball offline with lifecycle scripts disabled into task-owned work/ws15-distribution/consumer, one package. Its copied qualification files are checked against this branch. Before correction, the original active fixture fails with exactly one TS2322: unbound content lacks documentId/revision/renderHash/hashFormat. Final affected NodeNext/Bundler positive compilations pass; each existing negative exits2 with the exact six expected diagnostics (two2345,three2322,one2353). Two selected existing byte-binding tests pass, including all twelve installed entry hashes and recorded original/adapted fixture bytes. The retained compiler is TypeScript5.9.3/Node24.22.1. No standalone broad renderer/receiving corpus campaign was rerun; module import initializes its existing corpus as part of the selected test file, but only the two binding tests are claimed executed.

Reuse Release15preview parser, public declarations/CJS/ESM, actual Chromium116renderer+130receiving and exact six newsletter modules. Preserve its original Windows path-separator graph guard failure and normalized evaluation of the same bundle. Public root canonicalWorkspaceSnapshot invocation works but includes Vite's node:crypto stub through internal-service-secret; this root is not the pure newsletter closure. Onboard pricing strings match old bytes. Unbound parsing has a content-only TYPE yet may retain supplied valid metadata; field presence never proves expected identity. HTML still requires sanitation/isolation. No whole app typecheck/build/browser, image, authenticated, provider/model, DB/cloud/send or deployment gate by Integration.

Library exclusively owns both shared rich-newsletter operation/adapter files and its allocated controller/actions/preview/tests. This adoption changes none of them. Its final preview/stage consumer must qualify against this exact adopted artifact and bind expected document/revision from the submitted saved request. The package-only branch is a paired dependency, not independent full WS15 closure. Integration composes the accepted consumer later; no mutation of Library source before that verdict.

Root's 02:08UTC WAVE3-STATUS.md records source merges Core141/139,Meri270/271,FE173/175; all remain separate from deployment. FE172 is CHANGES/excluded. MG06 owns only API schema and WS10 owns only Workspace schema; WS13 basic-newsletter save and producer projection have separate authors. Release alone owns package/image/cloud/DB/deploy. Last deployed sources remain Core929acd/Meri87dc/FEd285; this artifact adoption does not change that fact. No new live effect or acceptance is inferred.

Evidence: Integration work/ws15-distribution/adoption-start.json, lock-regeneration.log, lock-scope.json, consumer-install.log, before-pinned-fixture.log, active-declarations-results.json and active-byte-checks.log. Release handoff and distribution-receipt.json remain in its existing outputs/work paths. New worktree initialization at the first longer Windows path failed without retained checkout; a shorter owned path with Git long-path support succeeded. No existing checkout, cache, service or resource was removed. Exact final head/tree and paired test path are returned through Integration STATUS and handoff.
