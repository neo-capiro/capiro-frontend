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

MF16 hearing viewer — current source handoff, 26 October 2026

Frontend PR https://github.com/neo-capiro/capiro-frontend/pull/212. Author checkout C:/dev/w3-mf16-hearing-viewer-20261026, branch codex/w3-mf16-hearing-viewer-20261026; fixed base 912739b5da434ea8ceb7d811a1a2a80e26cbcd32. The final commit/tree are recorded in the PR body and the runtime RESULT.txt after this commit. Meri275/276 are merged at cc8a6d9fce95e235fee15c1c6a524a611fba3912; Core168 is merged at d209ebd4cc759bf6409a2df7af578b125964b77a. The first rollout is separate and does not establish acceptance for this viewer.

Native hearing references enter the existing public event receiver, conversation fold, source cards and current-read endpoint. Full saved records render their owner's claims, assessments and reviews with provenance. Fragments remain exact inert text and never become a claim collection. Current denial, stale data and view replacement use the existing access/abort lifetime. The bill failure/loading renderer and date formatting were extracted once into SourceReadState and both families use it. There is no new transport, copied DTO, private source import, cache, flag, authority check or answer-to-claim inference.

The final follow-up fixes derive reference items from the canonical claim type while allowing the actual assessment/review array types, and keep synthetic probe selections closed to known fixture keys. They do not weaken public receiving. Saved-page copy now uses a plain character range with a one-based visible start; the public zero-based/exclusive offsets remain untouched. Existing Figma3.4 FieldTable, StatusPill, SourceCard, LinkAction, StateMessage and phone tokens are reused.

Actual installed package qualification

Release supplied real public packages produced from Meri cc8a6d9fce95e235fee15c1c6a524a611fba3912, tree 4c6a21af0ad8cdb3396bd1837eb0b8d0d83ef6c7. Runtime verified both archive hashes and every installed file against Release's receipt (69 contracts files and 6 UI-stream files). Versions are unchanged; hashes identify this cohort:
- @capiro/meri-contracts 0.1.15: f60b082509f496c70636bfaa97aa008196135ea8710da290ee50332493d363e9
- @capiro/meri-ui-stream 0.1.5: 8b47501d43d93f784a7e8ee7638edf860e7f24843b4a2ddc97dd985c7a253dd0
- Distribution: C:/Users/Administrator/Documents/Codex/2026-10-25/wave2-visible-release/work/release-20261025/w3-hearing-packages-cc8a6d9f/distribution
- Release receipt SHA256: 2e89f17f6bc3a2c82f659cbc5eac84f20d55e9c33397f855fc6dd303c898ecf0

Five hearing read/proxy/fold cases and five existing bill/usage current-read cases pass against those installed public exports. The first combined run passed the old five but could not load the public client projection for the new suite; the corrected public package resolver then passed all five hearing cases. Both reports are preserved. TypeScript noEmit passes for the nine production roots, all twelve client sources, and fourteen source/test roots, using the actual generated public declarations. The two initial type findings and their fixes are preserved separately. Source typechecking is not a client build.

Presentation verification

Four focused presentation cases passed, including inert source-controlled strings/URLs, whole-owner provenance, claim-containing fragments and denial/stale content clearing. Disabling fragment handling failed the intended assertion; exact restoration passed. The affected character-range assertion passed after the copy correction. Eight distinct mounted presentation cases across 1440/390 px passed with actual Geist, no overflow/page errors and zero scoped axe violations. The six content captures were refreshed after the plain range copy; the two denied captures are unchanged. The three targeted capture reports identify the refreshed six cases. No full-host or live qualification is claimed by these standalone presentation captures.

Evidence and captures are at C:/Users/Administrator/Documents/Codex/2026-10-25/wave2-visible-runtime/outputs/w3-mf16-hearing-viewer. Review published-1440.png, published-390.png, reconciliation-1440.png, reconciliation-390.png, briefFragment-1440.png, briefFragment-390.png and denied-1440.png/denied-390.png. RELEASE-PACKAGE-CHECK.json, INSTALLED-READ-TESTS.json, INSTALLED-HEARING-TESTS.json and TYPES-WEB/CLIENT/TESTS.json contain the installed results. PRESENTATION-TESTS.json, PLAIN-RANGE-TEST.json, MOUNTED-PRESENTATION*.json and MUTANT-TESTS.json retain the presentation evidence. The original 15-file syntax and production-size scan passed with zero new signals; touched lint, formatting and whitespace checks passed. The final four affected web files have a focused lint/format check. Node24.22.1, TypeScript5.9.3, Vitest4.1.11, Vite8.3.4 and Chrome use the retained toolchain; no installation or package build occurred in this lane.

Exact Release build requirement

Build only packages/meri-client through its existing canonical TypeScript build from this PR's frozen head, with the above cc8 public packages as peers. The only client source delta is packages/meri-client/src/conversation-chat.ts, Git blob efb6954f (full hash in RESULT.txt): an explicit HEARING_SOURCE_EVENT branch invokes receiveNativeHearingSourceEvent before the existing generic receiver. This client blob is unchanged from b5e000cf8bac2edc6e1bcb02b67e1237b02c58f0, which Root accepted for the Release build. Do not use the previous generated client as hearing admission evidence. Return the actual archive hash, producing source/tree and physically installed consumer path; Release owns generation, packing, installation and coherent frontend artifact adoption.

Originally queued finite checks, now completed as recorded below: three SDK transport cases in packages/qualification-transport/conversation-native-hearing-source.test.mjs, four full-host browser cases in apps/web/test/browser/meri-hearing-current-reads.spec.ts and the affected bill-source flow. Independent final-head UI/source and visual review remain with Root. Existing package checks and the twelve unchanged client-module typechecks do not need repeating.

CLIENT-BEFORE-REBUILD.txt records a Windows loader failure before test execution (ERR_UNSUPPORTED_ESM_URL_SCHEME); it is not a behavioral admission failure. The corrected command obtains --import via node:url pathToFileURL. public-installed-hook.mjs now requires CAPIRO_HEARING_CLIENT_CONSUMER to identify the actual Release-built consumer and resolves only real public package exports. No second old-client failed probe was run. Use the command in RESULT.txt once the rebuilt artifact exists.

Media producer seam

Existing Intel PublicHearingAudioController/PublicHearingAudioAccessService own GET public-hearings/:hearingId/audio and POST public-hearings/:hearingId/audio/epochs/:epochId/playback. HearingRecordingController/HearingRecordingService own session recording separately. The current source response binds record/hash/location but has no authorized media epoch/session, playback URL/expiry, captions or source-version/time association. Frontend base 912739b has no adopted Vidstack/media-chrome package. Its existing RetainedAudioPanel uses native audio for browser-session recordings, which are not interchangeable with these public hearing references. A sourceLocator or payload URL is not media authority. Current viewer therefore reports playback unavailable. This source PR does not close the media portion of MF16; the existing producer must expose an authorized public projection before the viewer can consume it. No recording activation, invented provider URL or second media framework was added.

Cleanup and ownership

The old bill-only filtering/dispatch were replaced in place; shared failure rendering has one owner. No removed tests, dormant flags or abandoned replacement files. Manifest, lock, vendor archives and dist remain at the fixed base. No provider, protected database, cloud or live action. Root owns integration, independent source/visual review and merge; Release owns actual builds. Frozen Unicode author/composition evidence and shared development resources remain intact. The task-owned presentation server and browser sessions are closed after capture.
Final installed host qualification — 26 October 2026

Release built and installed the client once from b5e000cf, package tree38ff3c76a28a71c3b7a54b28be129b5b00257656, client admission blobefb6954ffd7a0d7bbea6b617d291adcb625ceff7 (unchanged by this final head). Actual archive capiro-meri-client-0.1.0-b5e000cf-aa38a4285a51.tgz SHA256aa38a4285a51db1273dbc3c4a2681ca3c63ea982ba1dbdde8cfd359f31ebd58c. Runtime verified its archive and all46installed file hashes against the receipt at Release/work/release-20261025/w3-hearing-client-b5e000cf/receipt.json. Release's installed SDK transport3/3PASS and8public export imports are reused; no repeat transport run or build.

All four actual mounted hearing cases PASS with the real installed client/contracts/UI-stream: native streamed event; completed reload with exact read, no effect dispatch, focus restoration and stale clearing at1440 and390; fragment plus late closed-view reply. Seven affected existing bill cases PASS: streamed event, saved page/separate usage at both widths, stale and denied clearing, late/replaced-identity reply and unsafe/malformed source. HOST-HEARING-STREAM.json records1PASS and HOST-TESTS.json records10PASS (3hearing+7bill). The unrelated usage absence case was intentionally not selected; its unchanged unit coverage remains. No test was skipped within the selected set.

The existing full application browser harness was served in its explicit development mode through the retained Vite toolchain, using public installed packages only. The broad host requires the newer qualified Shared package at Release/work/release-20261025/w3-shared-6146f9b6/consumer (archiveffb6476ab3742f506d21c10419302f53cd3bc849fb201bd6c1389a317b3cf13f). Source test imports now declare the JSON attribute required by Node24. Failed harness attempts are retained: JSON import, sparse dependency lookup, CommonJS/ESM condition and stale Shared export. They occurred before viewer behavior. Final Vite resolution delegates third-party resolution to the standard resolver at the retained dependency root, with explicit actual public Meri/Shared exports. Source files and request/session fixtures are the existing application harness; no private producer aliases, fabricated packages or alternate conversation component.

Mounted hearing screenshots are under host-results/meri-hearing-current-reads-*/hearing-current-1440.png and hearing-current-390.png in the runtime evidence folder. These complete local installed browser qualification, not live authentication/deployment acceptance. Root owns independent final-source and visual acceptance. The media follow-up is separately allocated and in progress in dedicated Core/Meri worktrees; this PR's saved-record contract/client source remains frozen.