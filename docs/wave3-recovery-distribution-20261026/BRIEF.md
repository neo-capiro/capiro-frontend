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

# Recovery consumer distribution composition

This candidate adopts the independently accepted FE181 source and the actual qualified public contracts archive on current frontend main `13e4d6ef2a9e927eafd4befafa0b420c7f55b301`, tree `ca6473da9f3863a4777083c7b70416ab79efa962`. Main already contains FE179 and the accepted Hill Day composition from FE183. Root owns final disposition and merge; this packet does not claim deployed or authenticated live acceptance.

## Source and owner boundaries

Accepted FE source is `b58b9a56cc8b5abbb80ae7b4a67c9dfd9ba47974`, tree `f1d09193299a1b062fd6efaffc7567d5d9592ae6`. Its seven net paths comprise the exact-bound retry change, the existing journal retirement correction, three mounted fixture files and two direct-test files. Ordinary cherry-picks preserve those exact seven postimages. There is no change to session.ts, the host controller, SDK exports, architecture policy or the existing recovery storage namespace. Web directly imports the public session receiver through the retained host; no fictitious SDK session re-export or resolver alias is introduced.

Retry uses the exact retained conversation/run binding. Retirement overwrites each existing matching request value with the payload-free JSON string `null`; the existing decoder rejects this retained value, preserving an uncertain-write fence while removing private payload bytes. Existing generations invalidate old owners, a fresh run remains usable, and identity replacement clears the old identity scope. The removed retry expression and unconditional request-key removal are replaced in their existing owners. The obsolete SSR recovery test was removed in the accepted author series and is absent; four former SSR cases were replaced by six real mounted cases. No test count is silently reduced. Historical vendor archives remain provenance evidence; active manifests and lock select the new exact bytes. No compatibility wrapper, duplicate ledger, temporary diagnostic, feature flag, database migration or authority bypass is added.

## Actual artifact provenance

The archive remains `@capiro/meri-contracts@0.1.14`; the package manifest, exports and peer version are unchanged. Integration copied Release's archive without repacking to `vendor/capiro-meri-contracts-0.1.14-bc9a68f0-6e24472f649d.tgz`. The immutable filename distinguishes two different qualified byte sets with the same package version while preserving the old archive.

- Actual pack source: `bc9a68f0dd35c830346c4555e5934bd99b245204`, source tree `9bd0ccbe93542d77696606e71cafc395bed8813c`.
- Accepted producer source: `a602c574212bbf1521f8c7ea3aab41567838762d`.
- Merged producer: `0d128fe18c91530ab67de8f729b769c6e4b64e55`, tree `5cacccd0535e815456b9e5f7205facc5e49c3903`.
- Package input tree is exactly `10c3b953a4f52c2b3a7df7c39dd9a95708cb57e8` at pack source, accepted source and merged producer. The merged SHA is separate provenance, never a claim that the archive was rebuilt from that commit.
- Archive SHA256 `6e24472f649d9bc38b1a329b098b4f610500f5efdebc7724279962813352830a`, 885285 bytes, 61 regular entries.
- SRI `sha512-kaOMr11A2w5kyMJcFNh/94oq/UZUJuMR/dTYbpbmctMNptwmt69YcMnc1/Wi34FMTiVfB9QPrOM1vyLaLl8VpQ==`.
- Receiver SHA256 `39a049110dcf024853121647c48b0df326bcc9ee795cb7021079d270ef212c49`; generated browser imports remain empty.

`ARTIFACT-ENTRIES.json` records every entry's actual bytes/hash/source Git blob and comparison with the old archive. All 61 entries match the accepted package input. Exactly five differ from the old0.1.14 archive: the conversation-session runtime, declaration, schema and metadata, plus `validate.mjs`. The validator difference is inherited from the frozen producer parent: standard Node SHA256 `createHash(...).update(...).digest(...)` becomes `hash(...)`. Root accepted this fifth difference; Node24 remains required. It is not removed or hidden by repacking. The historical generated metadata version0.1.12 is retained unchanged; the actual package version is0.1.14.

The old archive SHA256 is `496c17bf7d003c83090c35f6451625313b138ed7ebeb810d2e7f8a6a819b6c0e`. Its bytes and all16 existing Meri provenance records are preserved, with one candidate record appended. Newsletter, Onboard, UI-stream and shared-package pins/provenance remain unchanged.

## Distribution changes and focused verification

Three existing consumers select the new filename: apps/web, packages/meri-client and packages/qualification-transport. One npm11.9 lock-only offline, lifecycle-disabled regeneration exited0. Deep comparison shows exactly five changed lock values: three consumer file references plus the installed package resolved path and SRI. All other lock values, version and dependency resolutions remain unchanged. Root lock SHA256 is `438edff6e9cd6dc3bab4f9b03a8207bc49258063d12778764f040e24e95be55b`.

The existing public-package guard previously allowed only a semver filename and could not name two immutable same-version archives. Its narrow extension accepts an optional eight-character source and twelve-character content suffix only for contracts, requiring both prefixes to match the existing full source/hash record. Existing full-byte verification remains mandatory. No UI-stream suffix, traversal, malformed prefix or mismatched source/content binding is accepted. The existing six tests plus one focused positive/negative binding test pass7/7, zero failures/skips; actual manifest checks validate24 records and both active Meri packages. No full product suite was repeated.

A parse-only check of the two changed production files and the guard reports zero size findings, zero review-record errors, zero dependency errors and zero cycles within the changed-product scope. No size registry change is needed. This finite check does not claim a repository-wide architecture census.

## Reused actual qualification and limits

The same archive was installed once, offline with npm11.9 and lifecycle scripts disabled, into Integration's owned qualification prefix. All61 installed entries and seven runtime/schema/type importer resolutions were checked. Three authorized package-local links in the FE author checkout point to that prefix. The donor root junction and all61 old donor package files remain unchanged. The existing Web SDK resolves through its unchanged donor graph: seven SDK local modules match the owned checkout and its five consumed public contracts exports are byte-identical. That SDK graph does not own the session receiver; the mounted Web host imports the qualified receiver directly.

Independent source and mounted evidence are reused without rerunning accepted tests. The first actual-candidate mounted run had4 passes/2 failures. The final accepted journal/history correction passes the two affected cases; the four unchanged earlier candidate passes remain credited separately. This is not a single new six-pass run. Seven selected direct cases passed, seven were unselected; the fence-removal mutant caused the intended two failures and the restored two affected cases passed. The old-package baseline1failure/5passes and prior candidate failures remain historical evidence.

The installed receiver hash equals the accepted Git source and Vite source-map input. The optimized module SHA256 is `eb5113992f0bb5ecc355cb724ebe2a8a44d79cba05fb25055e90f91cd12eb610`. Final traces show HTTP200 fetches, but contain no independent response-body hash; byte binding comes from preserved disk/module-map/installed-source evidence. The fixture mounts the real hook/host/journal with synthetic intercepted issuance. It is not a full authenticated screen/provider test. Pending-unmount evidence observes no mounted ready port and does not directly measure AbortSignal delivery.

Root accepted actual ordinary-role PG16.15 at producer a602:7/7 bodies pass, zero fail/skip/cancel, natural Node exit0, run04:42:17.506947–04:42:55.371249UTC. All seven owned DBs/roles are absent at readback and container/volume cleanup exits0. Earlier6/7 teardown failure is retained; the accepted socket-close fixture resolves it. Transaction durations32ms/434ms include overhead and are not isolated lock timings or capacity evidence.

No integrated frontend build/image, new browser campaign, database run, deployed recovery, provider execution, historical unknown-effect replay or external send occurred in this composition. Root's separately allocated release and authenticated acceptance gates remain open. Original FE172 remains untouched; FE181 is preserved pending final composition disposition.

## Evidence owners

The external Integration handoff and machine receipts under `C:/Users/Administrator/Documents/Codex/2026-10-25/wave2-visible-integration/work/recovery-public-distribution/final-composition/` bind the final head/tree/current-parent and complete changed paths. Existing actual-install evidence is in `outputs/W3-RECOVERY-CANDIDATE-INSTALLED.md`. Independent source/fixture/correction reviews are in `C:/Users/Administrator/Documents/Codex/2026-10-25/wave3-hermes-independent-review/outputs/`. Root's producer merge disposition is `outputs/W3-RECOVERY-MERI272-FINAL-MERGE-REVIEW.md` in the orchestrator workspace. Release's actual native receipt is `outputs/W3-RECOVERY-A602-DUAL-SOCKET-NATIVE-RESULT.txt` in the release workspace.
