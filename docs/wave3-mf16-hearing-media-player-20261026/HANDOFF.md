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

MF16 hearing player implementation outline — 26 October 2026

Base 9438d2d0 (merged FE212), separate codex/w3-mf16-hearing-media-player-20261026 branch. This source work is excluded from the immediate release. Core producer PR175 is now 65afb925daa0d9688111fb9cd4b77ae9a6ac7e34 after the independent release-access finding; Meri public contract PR277 remains a7da2543a76abb28a95216a2639763d90e487621 and was independently accepted. Core tree 7d93c277b181a5d048a33069864f238c578fbf52; Meri tree 73d099436e3654fcbb60f3aa481f2f136d1989d3. Core requires independent recheck of the new head.

Extend the existing current-read owner and fixed source-read proxy with the new public contract receiver. The saved source view loads owner audio coverage and a user-selected retained segment. Vidstack owns audio loading/playback; Media Chrome's existing store connects its accessible controls to Vidstack's actual HTML audio provider. Do not implement a media engine, custom transport, source-URL inference, captions, recording activation, or citation timestamp mapping. Display recording offsets and partial coverage honestly. Expired/denied/stale/replaced/closed source or identity disposes the player and discards the signed URL.

Integration owns manifests and lockfile adoption: @vidstack/react 1.15.7, media-chrome 4.19.4, and the Release-generated @capiro/meri-contracts package from reviewed PR277. Public imports remain @capiro/meri-contracts/conversation-sources, @vidstack/react, media-chrome/react and media-chrome/media-store/media-store (the declared public wildcard export). No new client SDK/UI-stream package behavior is needed. Release owns physical builds/install/packing; this lane performs source edits and focused existing-tool checks only.

Relevant installed Next.js use-client and lazy-loading docs read before implementation. Primary library docs/source checked 26 October: https://vidstack.io/docs/player/components/core/provider/ ; https://vidstack.io/docs/player/api/providers/audio/ ; https://www.media-chrome.org/docs/en/react/get-started ; https://github.com/muxinc/media-chrome/blob/v4.19.4/src/js/media-store/media-store.ts . Both libraries are MIT. Upstream now points new projects at Video.js; this bounded integration retains the explicitly approved Media Chrome/Vidstack stack and does not introduce a migration.

Validate current proxy/receiver identity, positive coverage and playback, invalid/foreign source or time, cancellation and late reply; browser playback/seek/mute/rate, expiry disposal, close/identity replacement, responsive and accessibility checks against actual installed public artifacts. No copied/private contract declarations or producer-source aliases substitute for that evidence.

Source checkpoint — pending installed validation

The player extends the existing source-read operation and current-read lifecycle. Opening the saved page does not fetch media: the user explicitly checks coverage, chooses an owner-projected range, and loads each retained segment. Playback uses the owner's exact segment bounds, expires at the earlier of its signed expiry and 60 seconds after receipt, and is removed on close, identity replacement, source invalidation or playback error. Coverage contains no claimed citation-to-audio mapping. There is no replacement media engine or additional transport.

Retained source tooling: Node 24.22.1, TypeScript 5.9.3, the frontend's ESLint configuration and canonical architecture AST scanner. The eleven changed TS/TSX files pass syntax parsing; changed production files have no size review signals. ESLint passed all eleven files, then passed the affected files after the state/render separation and public media-store import correction. Prettier and git diff --check pass. The state/render separation is a same-file hook, not a shared abstraction. The retained lint environment reports that automatic React version detection falls back because this worktree has no installed dependencies; that is not installed-package validation.

Evidence is retained at C:/Users/Administrator/Documents/Codex/2026-10-25/wave2-visible-runtime/outputs/w3-mf16-hearing-media: frontend-lint-final.log, frontend-lint-refactor.log, frontend-lint-browser-final.log and frontend-source-checks.json. Earlier failing diagnostics remain in that folder. Updated producer evidence: core-release-recheck-tests.json (9 passing) and the author's rerun of the three unchanged reviewer probes in core-review-probe-recheck.json. The unchanged intel-tests.json (9 passing), meri-http-tests.log (17 passing), and six passing receiver tests in meri-sparse-import-failure.log are reused. Core's corrected commit above is ready for independent recheck; the player's remaining checks do not block it.

Three installed-contract unit tests and six full-host browser cases are authored but NOT RUN. Their remaining prerequisites are Release's generated public contracts from reviewed Meri PR277 and Integration's adopted player dependencies. Then verify actual installed types/public exports, the three unit tests, and the six browser cases including active identity replacement, real native playback/seek/mute/rate, URL disposal, responsive screenshots and accessibility. A production build and authenticated deployed acceptance remain Release/Root work. No package generation, dependency install, lock/vendor mutation, recording activation or deployment was performed by this source lane.

Exact dependency delta for Integration

In apps/web/package.json, add these exact entries to dependencies:

```json
"@vidstack/react": "1.15.7",
"media-chrome": "4.19.4"
```

Replace only that manifest's @capiro/meri-contracts dependency, currently file:../../vendor/capiro-meri-contracts-0.1.15-cc8a6d9f-f60b082509f4.tgz, with the immutable vendor filename and byte hash returned by Release for accepted Meri a7da2543a76abb28a95216a2639763d90e487621 (tree 73d099436e3654fcbb60f3aa481f2f136d1989d3). The new filename/hash is not yet available and must not be invented. Integration owns the root package-lock.json and any existing package provenance records affected by this adoption. No root dependency, React version, client SDK behavior, UI-stream behavior or new public subpath is requested.

The existing @capiro/meri-contracts/conversation-sources export must provide HEARING_MEDIA_READ_SCHEMA, receiveHearingMediaRequest, receiveHearingMediaResponse, HearingMediaReadRequest, HearingMediaReadResponse, and AdmittedHearingMediaRequest. Consumer runtime imports use the first three; the player derives its media/selection types from the public request/response types. Release's generated artifact and adopted libraries are required for the pending installed type, unit and mounted browser checks; the source lane will complete those checks after readiness instead of closing at this handoff.
