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

MF16 hearing player — validation freeze, 26 October 2026

Base: 9438d2d00733040f602b2504ecbfa99e3f4325ef (merged FE212). Branch: codex/w3-mf16-hearing-media-player-20261026. PR: https://github.com/neo-capiro/capiro-frontend/pull/222. This remains separate from the PR224 release pin.

Implementation

The existing authenticated current-read owner and fixed source-read proxy now accept the public hearing-media request/response. Opening a saved source does not fetch media. The user checks coverage, selects an owner-projected range, and explicitly loads each retained segment. Vidstack owns the actual audio provider; Media Chrome controls that HTML audio element through its public store.

The source owner signs .wav object URLs. Vidstack 1.15.7 recognizes that extension, although its AudioMimeType union omits audio/wav; the player passes the original URL string to the built-in loader. No MIME cast, custom loader, media engine, transport, source-URL inference, recording activation or caption inference is introduced.

Expiry is the earlier of owner expiry and 60 seconds after receipt. Expiry, close, identity replacement, source invalidation and provider failure discard playback and pause the detached audio. A late response cannot restore the player. Coverage remains explicitly partial and never locates a citation in the recording.

Native Figma 3.4

The figma-design-to-code skill and high-fidelity contexts/screenshots were read for Media Chrome Hearing player 1064:267525 and Audio coverage 1064:267652 in https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE . This retained-audio flow maps to available 1064:267653, gap 1064:267665 and expired 1064:267677. Native captures remain in the evidence folder under figma. No Figma write occurred.

The card uses existing Meri tokens, 16px padding, 12px radius, 40px buttons, 12px control gaps, 12px mono time and 11px helper text. Exact original 24x24 play/volume SVGs and provenance are in apps/web/public/figma/meri-hearing-media. Media Chrome owns dynamic play/pause/mute states. The loaded-part seek track does not fabricate a complete gap inventory. On narrow screens the seek control wraps onto its own 40px row; its thumb stays visible within the card padding.

Media Chrome's time label is a noninteractive current/duration display. The speed button's visible rate and accessible name share the same slotted label, driven by Vidstack's rate-change event; the upstream button still owns cycling rates. The accessibility assertions remain enabled.

Physical dependencies and ownership

Core175 was independently accepted at 65afb925daa0d9688111fb9cd4b77ae9a6ac7e34 (tree 7d93c277b181a5d048a33069864f238c578fbf52) and merged as 43ffd8fa908b51b9b2fcfab6b454fd9b9b98a191. Meri277 merged as 61678ff32f25b84039492e6ad1a6ff073160b0c1, preserving accepted tree 73d099436e3654fcbb60f3aa481f2f136d1989d3.

Release's contracts 0.1.15 archive SHA256 is 757e17047ccc431f200583ddcdfb11d226b24b5dcfdfd0b71f53fe91d79740bc. Its installed consumer is C:/Users/Administrator/Documents/Codex/2026-10-25/wave2-visible-release/work/release-20261025/w3-hearing-media-61678ff3/distribution/consumer. Runtime independently matched the archive hash. The previous qualified UI-stream/client artifacts are reused; no rebuild is required.

Integration installed @vidstack/react 1.15.7 and media-chrome 4.19.4, with React/ReactDOM 19.3.0, at C:/Users/Administrator/Documents/Codex/2026-10-25/wave2-visible-integration/work/hearing-media-packages/player-consumer. Its consumer-readiness.json records physical package versions, hashes, public exports and script-disabled installation. Both player libraries are MIT. The already approved stack is retained despite Vidstack's upstream migration notice.

Integration owns the six-file vendor/manifest/root-lock adoption in its separate package candidate. Runtime changed no package manifest, lock, vendor archive or node_modules links and performed no install, build or pack. Public imports remain @capiro/meri-contracts/conversation-sources, @vidstack/react, media-chrome/react and media-chrome/media-store/media-store.

Validation

Evidence root: C:/Users/Administrator/Documents/Codex/2026-10-25/wave2-visible-runtime/outputs/w3-mf16-hearing-media.

- INSTALLED-READ-TESTS.json/.log: all 13 installed-package cases pass (three new media plus ten affected bill/hearing reads), zero failures/skips. Unchanged since that run; reused.
- TYPES-TESTS.json: all 12 changed roots/global declarations, 11 actual public exports, zero diagnostics. Includes player libraries, production files, fixtures and browser tests.
- frontend-lint-mounted.log: affected player/browser ESLint passes. Earlier 11-file lint evidence is retained.
- frontend-source-checks.json and frontend-source-check-mounted.log: all eleven changed TS/TSX files pass syntax, with zero production size signals.
- HOST-TESTS-verified-visual.json/.log: desktop1440 and narrow390 pass actual playback, pause, mute, rate, accessible speed naming, keyboard seek, exact next-segment requests, no model writes, SVG geometry, 40px seek target, no overflow and scoped axe checks with zero violations.
- HOST-TESTS-lifetime.json/.log: four cases pass actual owner-expiry removal, close/late-response disposal, active identity replacement and missing/denied/stale/unsafe outcomes. No skips. The later changes are limited to visual CSS and harness font loading; these lifecycle results are reused.
- Six final region/card/full-host screenshots are in host-results-verified-visual. Desktop card and narrow recording region were visually inspected against native Figma, with actual installed Geist Mono loaded by the existing browser harness.
- Formatting and git diff --check pass. Node24.22.1, TypeScript5.9.3, Vite8.3.4, Playwright1.61.1/Chrome, React19.3.0.

Preserved failures and corrections

TYPES-WEB-INITIAL.json and TYPES-TESTS-INITIAL.json preserve the unsupported explicit WAV MIME diagnostic. Earlier read-fixture typing failure remains TYPES-READS-INITIAL.json.

Browser initial, seek-diagnostic and range runs retain the synthetic WAV's missing byte-range semantics and the initial one-key absolute-time assertion. The fixture now serves real byte ranges; six native arrow increments verify movement beyond one second. The controls run retains the ESM require failure; the test now resolves axe through import.meta.resolve. The mounted run retains two upstream accessible-name mismatches; both are fixed through public component properties/slots.

The accessible run passed desktop/narrow but exposed Playwright fake-clock replacement of Intl.DateTimeFormat breaking an unrelated mounted picker. The expiry test now uses a real five-second owner expiry and verifies the actual timer/disposal, without replacing global clocks. The final-visual run retained the harness-only Geist Mono allow-list error; verified-visual uses the actual installed font. The missing import hook in the first static-check invocation is recorded in the chat; the corrected invocation uses the existing public-installed-hook and passes. No assertion was disabled and no failure evidence was deleted.

Remaining gates and cleanup

The source is frozen for independent player review and Integration composition with its separately owned package candidate. Release/Root still own the production build and authenticated deployed acceptance; local synthetic full-host checks do not qualify those flows. No cloud, database, recording or deployment action occurred.

The task-owned Vite server was stopped after final captures. Port5359 has no listener. Installed resources, shared caches, previous failures, other worktrees and the deployed release pin are preserved.

