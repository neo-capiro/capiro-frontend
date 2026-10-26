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

Base 9438d2d0 (merged FE212), separate codex/w3-mf16-hearing-media-player-20261026 branch. This source work is excluded from the immediate release. Core producer PR175 is now 65afb925daa0d9688111fb9cd4b77ae9a6ac7e34 after the independent release-access finding; Meri public contract PR277 remains a7da2543a76abb28a95216a2639763d90e487621. Library independently accepted both heads. Core tree 7d93c277b181a5d048a33069864f238c578fbf52; Meri tree 73d099436e3654fcbb60f3aa481f2f136d1989d3.

Extend the existing current-read owner and fixed source-read proxy with the new public contract receiver. The saved source view loads owner audio coverage and a user-selected retained segment. Vidstack owns audio loading/playback; Media Chrome's existing store connects its accessible controls to Vidstack's actual HTML audio provider. Do not implement a media engine, custom transport, source-URL inference, captions, recording activation, or citation timestamp mapping. Display recording offsets and partial coverage honestly. Expired/denied/stale/replaced/closed source or identity disposes the player and discards the signed URL.

Integration owns manifests and lockfile adoption: @vidstack/react 1.15.7, media-chrome 4.19.4, and the Release-generated @capiro/meri-contracts package from reviewed PR277. Public imports remain @capiro/meri-contracts/conversation-sources, @vidstack/react, media-chrome/react and media-chrome/media-store/media-store (the declared public wildcard export). No new client SDK/UI-stream package behavior is needed. Release owns the physical contracts build and package; Integration owns player dependency installation. This lane performs source edits and focused existing-tool checks only.

Relevant installed Next.js use-client and lazy-loading docs read before implementation. Primary library docs/source checked 26 October: https://vidstack.io/docs/player/components/core/provider/ ; https://vidstack.io/docs/player/api/providers/audio/ ; https://www.media-chrome.org/docs/en/react/get-started ; https://github.com/muxinc/media-chrome/blob/v4.19.4/src/js/media-store/media-store.ts . Both libraries are MIT. Upstream now points new projects at Video.js; this bounded integration retains the explicitly approved Media Chrome/Vidstack stack and does not introduce a migration.

Validate current proxy/receiver identity, positive coverage and playback, invalid/foreign source or time, cancellation and late reply; browser playback/seek/mute/rate, expiry disposal, close/identity replacement, responsive and accessibility checks against actual installed public artifacts. No copied/private contract declarations or producer-source aliases substitute for that evidence.

Source checkpoint — pending mounted player validation

The player extends the existing source-read operation and current-read lifecycle. Opening the saved page does not fetch media: the user explicitly checks coverage, chooses an owner-projected range, and loads each retained segment. Playback uses the owner's exact segment bounds, expires at the earlier of its signed expiry and 60 seconds after receipt, and is removed on close, identity replacement, source invalidation or playback error. Coverage contains no claimed citation-to-audio mapping. There is no replacement media engine or additional transport.

Retained source tooling: Node 24.22.1, TypeScript 5.9.3, the frontend's ESLint configuration and canonical architecture AST scanner. The eleven changed TS/TSX files pass syntax parsing; changed production files have no size review signals. ESLint passed all eleven files, then passed the affected files after the state/render separation and public media-store import correction. Prettier and git diff --check pass. The state/render separation is a same-file hook, not a shared abstraction. The retained lint environment reports that automatic React version detection falls back because this worktree has no installed dependencies; that is not installed-package validation.

Evidence is retained at C:/Users/Administrator/Documents/Codex/2026-10-25/wave2-visible-runtime/outputs/w3-mf16-hearing-media: frontend-lint-final.log, frontend-lint-refactor.log, frontend-lint-browser-final.log and frontend-source-checks.json. Earlier failing diagnostics remain in that folder. Updated producer evidence: core-release-recheck-tests.json (9 passing) and the author's rerun of the three unchanged reviewer probes in core-review-probe-recheck.json. The unchanged intel-tests.json (9 passing), meri-http-tests.log (17 passing), and six passing receiver tests in meri-sparse-import-failure.log are reused. Library accepted the corrected Core commit and unchanged Meri contract; their review is independent of the remaining player checks.

The installed-contract run now passes all 13 cases: the three new media tests and ten existing bill/hearing reads, with no failures or skips. Evidence: INSTALLED-READ-TESTS.json/.log in the same output folder. Six full-host browser cases and installed player type checks remain NOT RUN pending Integration's installed player dependencies. They cover active identity replacement, real native playback/seek/mute/rate, URL disposal, responsive screenshots and accessibility. A production build and authenticated deployed acceptance remain Release/Root work. No package generation, dependency install, lock/vendor mutation, recording activation or deployment was performed by this source lane.

Exact dependency delta for Integration

In apps/web/package.json, add these exact entries to dependencies:

```json
"@vidstack/react": "1.15.7",
"media-chrome": "4.19.4"
```

Replace only that manifest's @capiro/meri-contracts dependency, currently file:../../vendor/capiro-meri-contracts-0.1.15-cc8a6d9f-f60b082509f4.tgz, with Integration's immutable vendor copy of Release's qualified capiro-meri-contracts-0.1.15.tgz. Its source is merged 61678ff32f25b84039492e6ad1a6ff073160b0c1, accepted tree 73d099436e3654fcbb60f3aa481f2f136d1989d3; archive SHA256 is 757e17047ccc431f200583ddcdfb11d226b24b5dcfdfd0b71f53fe91d79740bc. Integration owns the final vendor filename, root package-lock.json, provenance adoption and physical player dependency installation. No root dependency, React version, client SDK behavior, UI-stream behavior or new public subpath is requested.

The existing @capiro/meri-contracts/conversation-sources export must provide HEARING_MEDIA_READ_SCHEMA, receiveHearingMediaRequest, receiveHearingMediaResponse, HearingMediaReadRequest, HearingMediaReadResponse, and AdmittedHearingMediaRequest. Consumer runtime imports use the first three; the player derives its media/selection types from the public request/response types. Release's generated artifact and adopted libraries are required for the pending installed type, unit and mounted browser checks; the source lane will complete those checks after readiness instead of closing at this handoff.

Meri277 merged at 61678ff32f25b84039492e6ad1a6ff073160b0c1 with the same accepted tree 73d099436e3654fcbb60f3aa481f2f136d1989d3. Release may label the immutable artifact with that merge head; the accepted public shape is unchanged. Retained browser/type/unit harnesses are prepared in the existing media output folder. They require CAPIRO_HEARING_CONTRACT_CONSUMER (Release's new installed contracts consumer), CAPIRO_HEARING_PLAYER_CONSUMER (Integration-installed player dependencies), and CAPIRO_HEARING_CLIENT_CONSUMER (the unchanged, already qualified client consumer). They reuse the previous UI-stream/client artifacts and actual public package exports, and fail if the new physical inputs are absent. Browser cases run the existing full application harness at 1440 and 390 pixels with synthetic identity, owner responses and WAV bytes. They do not qualify authenticated deployed playback. The unit run also includes the ten existing bill/hearing read cases because their shared admission dispatcher changed. No server is started until package readiness.

The qualified physical contracts consumer is C:/Users/Administrator/Documents/Codex/2026-10-25/wave2-visible-release/work/release-20261025/w3-hearing-media-61678ff3/distribution/consumer; archive and receipt are in the sibling artifacts directory and receipt.json. Runtime independently matched the archive hash and ran the 13 frontend read tests against that installed public package. The generated implementation and declaration inputs are not copied into this source tree. The player consumer environment variable will point at Integration's installed dependency resource when it is available.

Installed read/test TypeScript checking also passes with zero diagnostics across five roots and eight resolved public exports, including the unchanged actual Release client. TYPES-READS.json records the result. The initial browser fixture used widened raw JSON scope-array types; it now reuses the canonical typed media fixture event. TYPES-READS-INITIAL.json preserves that diagnostic. This check does not include the uninstalled player libraries or claim their props/bridge are qualified. Changed player/control/browser lint, all eleven changed TS/TSX syntax checks, production size scan and formatting pass after the Figma alignment.

Native Figma 3.4 mapping

The figma-design-to-code skill and high-fidelity design contexts/screenshots were read for [Media Chrome Hearing player 1064:267525](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=1064-267525) and [Audio coverage 1064:267652](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=1064-267652). This retained-audio flow uses the latter's available 1064:267653, gap 1064:267665 and expired 1064:267677 states, rather than enabling the live-stream/video component. Native PNGs are retained under outputs/w3-mf16-hearing-media/figma/{available,gap,expired}.png. No Figma write occurred.

The existing Meri tokens and Media Chrome controls provide the 16px padded white card, 12px radius, 8px vertical gap, 12px control spacing, 40px muted buttons, 12px mono time, 11px helper copy and 5px steel seek track. The two exact 24x24 SVG exports and provenance are under apps/web/public/figma/meri-hearing-media. Their original geometry is retained in the public play/high slots; Media Chrome owns changing control states. A same-file RetainedAudioControls component separates presentation from Vidstack provider/store lifetime.

The contract exposes epoch extents and one exact retained part, not a complete part/gap inventory. The seek control therefore represents only the loaded part; it never paints continuous coverage across an unverified gap. Current owner ranges are listed as potentially partial, expired/denied players are removed, and transcript/caption availability is not inferred from the design's specimen copy. The supported playback-rate control is retained. Narrow controls wrap within the existing source viewer. The six pending browser cases include asset natural/rendered geometry checks and card, region and full-host screenshots at 1440/390. Native design capture is not product visual acceptance; actual rendered verification remains pending installation.
