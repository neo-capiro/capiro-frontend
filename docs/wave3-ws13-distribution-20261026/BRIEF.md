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

# WS13 actual Shared distribution adoption

FROM: Integration | TO: Root / Library / independent reviewer | TYPE: package adoption | RE: accepted Core144 public contract

Branch codex/wave3-ws13-distribution-20261026 starts at merged FE176a76baa609302db93faf8d038096b7877e6890464/tree6aa6501b5253b9546e0ca24635587cdc95edee65. It preserves every accepted WS15/FE175 production blob. Root allocates only artifact/pins/lock/provenance/public-fixture binding metadata; Library owns the separate four-file basic staging consumer and focused tests. No consumer source or registry/import policy change.

Actual Release artifact **capiro-shared-0.0.0-3b4937ad-40ac9d745261.tgz**, **696105bytes**, **SHA25640ac9d74526123da69c321a537a8ec842960ee226acb53e41c0c8d5d65563598**, **sha512-j/XFzPmzJCUsbKve+8gmtTXIyBLqMxHdzWthYBmnVBcGqKrWGssK4HrEGO90ANyqTXOJRmOUwdD3oews4p5kzw==**,288entries. Exact accepted source3b4937ad2f5d15b85ea1c4474ed48b4a39e2f0ac/tree122b0c926a6a6f864c9aed36d8f5be465064976e. Root first supplied bytes while qualification was pending; the actual receipt advanced to SCOPED_PASS before final publication. This adoption uses the completed receipt, not an assumed pass. Release ran one build/one offline pack, both exit0; Integration performs no rebuild/repack/registry publication.

Receipt: `C:\Users\Administrator\Documents\Codex\2026-10-25\wave2-visible-release\work\release-20261025\w3-shared-3b4937ad\distribution-receipt.json`. Release qualification records13 WS13 runtime cases,15 WS15 preview cases and public NodeNext/Bundler declarations/import/private boundary. Its initial installed runtime run was12/13: the namespace assertion treated Node's synthetic ESM __esModule metadata as a public export. Only probe instrumentation changed; final13/13 passes, original failure remains. Runtime DB ports are synthetic; no real authority/transaction/grant proof follows. Accepted prior Chromium116renderer/130receiving evidence is reused by exact six-module byte identity, not rerun. Broad-root node:crypto browser stub remains outside that closure.

Integration independently verifies artifact byte length/SHA256/SHA512/SRI, installs the actual adopted file offline with npm11.9.0 and lifecycle scripts disabled into work/ws13-distribution/consumer (one package), and matches15 targeted installed files against Release receipt: twelve WS15 public JS/declarations, the changed Workspace saved-revision JS/declaration and package manifest. Package manifest/exports and all12 WS15 entries equal the prior d680 artifact exactly. Release's bounded compatibility result identifies only5changed paths (saved-revision source/JS/declaration/maps),0added/removed entries. No broad census or duplicated source implementation.

Both public package pins and actual npm11.9-generated lock reference this artifact. Exactly3semantic package lock records change; all other values/versions are identical. Both active provenance manifests advance while all historical artifacts/records remain unchanged. PUBLIC-ENTRY-BINDINGS retains prior complete bindings and identical12entry hashes under the new artifact source/hash. RECEIVING-FIXTURE-BINDINGS changes only active artifact source/hash; no executable fixture body or golden is changed. The two selected existing fixture/public-entry byte tests pass (2/2,0skips), and installed SRI equals the generated root lock. Existing accepted WS15 fixture/type/parser/consumer evidence is reused with original attribution; no broad product tests or declaration rerun is needed for unchanged bytes.

The new public saved-revision declaration exposes the versioned projection through the existing root export; Workspace HTTP supplies projectionVersion/projectionHash. Library must use the delivered fields in exact display/confirmation/request/receipt binding, retain supported historical unpinned replay and preserve unknown fences. This package PR does not edit those four consumer paths or invent a frontend serializer/hash. Current basic staging source still needs its assigned paired correction; package-only success is not full application compatibility or WS13 closure.

No product body deletion, dormant flag, diagnostic, dependency version upgrade, new import allowance or source barrel. Removed active package reference is the prior d680 filename in the two pins/three lock bindings; the old artifact and historical records remain required evidence. No test count drop or new executable assertion by Integration; product mutant N/A. Producer tests and Release's new public-contract witnesses retain their own scope and initial failures.

Core144 merged tree confirmed once, accepted ad44cac7 equals3b4937/tree122b0c9. Source producer PG harness belongs a3_scope; Release executes the ordinary-role gate later. API schema remains MG06, Workspace schema WS10. Library's staging operation/model/hook/view and OrdinarySave's basic save source remain separate. No authenticated/live/model/provider/send, DB/cloud, image or deployment activity. Final receipt and own installed proof are in work/ws13-distribution; final head/tree/test path are returned via shared Integration status and handoff. Core current authority, exact receipts and all standing requirements remain unchanged.

Final scoped manifest check passes for both provenance manifests, two active pins and three lock bindings, including preservation of older artifact bytes. Release's completed handoff is C:/Users/Administrator/Documents/Codex/2026-10-25/wave2-visible-release/outputs/W3-SHARED-3B4937AD-DISTRIBUTION-HANDOFF.txt. FE178 atomic-save remains under independent review and is excluded from this package-only branch.
