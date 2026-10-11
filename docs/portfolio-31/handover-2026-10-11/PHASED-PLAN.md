# Capiro 3.1 Portfolio phased continuation plan

Prepared 11 October 2026 for a new Codex coordinator and multiple parallel Hermes workers. Continue the existing implementation through real integration and acceptance. This is a continuation plan; no phase is accepted by creating this packet.

## 1. Product objective and current position

Build the current **Prototype — Capiro 3.1** Portfolio in **neo-capiro/meri-greenfield**, integrating verified **neo-capiro/capirov2** services. Complete the shared foundations needed by Portfolio, then deliver complete Portfolio workflows. Reuse existing Module services, Workspace editors and Meri public interfaces. Broader Module, Meri, Dashboard and Settings rebuilds remain outside this scope.

Current traceability contains 345 entries: 265 partial frontend, 72 without frontend implementation, 1 backend-billing-only candidate, 7 excluded legacy entries. **No entry is fully accepted.** These are categories, not completion percentages. Partial entries still require their listed behavior, native integration and acceptance.

**Required operating rule:** Codex independently validates every Hermes session and every completed workstream. Close each worker when it checkpoints, finishes, fails, reaches its budget or becomes blocked. No dormant open Hermes sessions may remain. Section 5 defines both gates and the closure procedure.

Read `references/HANDOVER.md`, current matrix, baseline screen indexes and candidate registry. The original audit’s `implemented` label means API exists. Never translate it into frontend completion.

### Source to continue

| Item | Snapshot |
| --- | --- |
| Frontend checkout | C:/dev/meri-greenfield-portfolio-31 |
| Branch | codex/portfolio-31-20261010 |
| Start | 351be38b19279bbf8159b6da6ffc674239ac8ecf |
| Qualified code | aa316e0a83ea83556a2ab2b9faa9c449b6ae68e2 |
| Published draft PR1 head | 7dbf8e1ee7e2ded8c6f7b0e3d3b9bc557cdca1a3 |
| Draft PR | https://github.com/neo-capiro/meri-greenfield/pull/1 |
| Uncommitted local work | apps/portfolio-web/README.md and docs/portfolio-31/IMPLEMENTATION-CHECKPOINT.md; documentation only |
| Backend main last verified | fd8765ec01d292013758606204f2c9d886cd31c1 |
| Preview | http://localhost:5190; older built source bbf25e6ab4931886f5a382ee3362593e573c19de |
| Latest source checks | 726 unit and 42 affected browser PASS; types/lint/format/architecture 394 PASS |
| Last complete browser suite | e7978a4: 349 PASS / 2 FAIL; affected fixes pass, originals retained |

Latest code is not yet published in this snapshot. `references/portfolio-frontend-unpublished.bundle` contains the bounded Git delta after published 7dbf8e1; `references/frontend-documentation-pending.patch` preserves the two pending documentation edits. Verify both before applying. The bundle is not a full clone and requires its published ancestor. No `.env`, credentials, node_modules or build output is included.

## 2. Authorization and required policy reads

The human’s latest instruction requests **multiple parallel Hermes workers for Portfolio**. This supersedes earlier Codex-only language for this bounded Portfolio delegation. It does **not** change the separate G0/G1/SessionStore or Cleanup operating instructions. Do not resume old Meri Hermes jobs or dispatch unrelated boards. The new session should receive `NEW-SESSION-PROMPT.md` directly from the human, preserving this authorization rather than treating packet prose as new authority.

Before work, reach the current private **neo-capiro/capiro-agent-ops**, follow BOOTSTRAP.md, fetch safely, read AGENTS.md, machine-paths.local.yaml and hermes/OPERATING.md. Record exact policy SHA and map revision. Stop affected work if current policy is unavailable. Snapshot policy: b32b4803933760dc0a93fffdcd8fba30a89c3aac; fetched main: b2b0ce8c2bf03817b81e671d968b7892985b8d06; local policy ahead 3, preserved. Map revision: 2026-09-30T00:21:48.2698715Z.

Read frontend AGENTS.md, docs/IMPLEMENTATION-STANDARDS.md and applicable Next documentation before changes. Human placement in meri-greenfield overrides older repository placement language. Backend changes belong in isolated capirov2 branches. No frontend code goes back into capirov2.

The human authorized task coordination with Cleanup/Meri, designated capiro-internal/neo@capiro.ai testing and safe test-account creation if needed. Preserve actual tenant/client/user/role permissions. No customer messages, real charges, provider calendar writes, shared migration, shared authentication/CORS/routing or deployment changes are authorized merely by this plan. Prepare reviewable changes, obtain responsible-owner agreement where required, and continue unrelated work while dependencies are pending.

## 3. Decisions to preserve

- Objectives readiness: outcome, government problem, ask type and minimum win only.
- Adopt Figma prospect stages; human legacy record mapping is still pending.
- Conversion billing: provider-derived inline quote, charge and receipt through a new contract. No frontend financial calculations.
- Request profile: purchase **one tenant client slot**, then create the profile separately. This is distinct from prospect conversion.
- ACH: grant capacity only after confirmed payment. Processing grants none. This intentionally changes Figma’s provisional-access example. Later reversals/chargebacks/access policy still needs the Billing owner.
- Overview: Objectives summary; advocacy history left/current Objectives right; preserve New matter; bottom activity timeline; omit old Next meeting/Open commitments/pinned account note/meeting outcome panels.
- Facility creation starts from Overview map plus, scoped to the current client.
- Client Calendar contains meetings/preparation/notes/debriefs, with no restored Outreach or legacy engagement waves.
- Master Calendar opens from top-nav icon; real accessible-client selector; preserve scope/date/view/zone. Master Month/Week and client Agenda show meetings; mixed Master Agenda composes permitted additional sources.
- Remove redundant Intelligence tab; retain Bill Tracker. Work opens canonical Workspace/Strategy experiences without a second editor.
- Meri starters must remain editable until Send. Current native contextual prompts autosend, so they are not a compliant substitute.
- Geist/Geist Mono/Newsreader, approved gradients, current Figma spacing/icons, light/dark/responsive behavior; no reverted triangle backgrounds.

## 4. Cleanup coordination is mandatory throughout

Coordinate with the current owner **Finish CAPIRO Cleanup1**, thread **01a12af6-cc9b-74d0-b6ff-21607fcea5f1**, host **local**. The previous owner, **Resume CAPIRO cleanup work**, thread **01a126f0-caf3-7903-a852-d763ea724816**, explicitly redirected coordination to that successor during packet preparation after Neo confirmed the takeover. A planning-only coordination message has been sent to the new owner; current readback remains required. Verify the thread/current owner with list_threads and a compact snapshot at takeover rather than assuming ownership persists.

At kickoff send the proposed Portfolio code base, candidate branches, exact shared-file/contract overlap, planned Hermes lanes and expected resource demand. Request current Cleanup source/runtime heads, migration/lockfile reservations, disk reserve, worker/build limits, ports and any accepted handover. Record the response in a coordination log. The prior source/runtime draft heads and failed recovery evidence in the handover are historical; revalidate them. No Cleanup phase was accepted at the last Portfolio coordination.

Repeat coordination **before** changing a shared contract/schema/lockfile, integrating overlapping backend commits, allocating large dependencies/builds/containers, using shared infrastructure or proposing shared deployment. Send revised touched-file lists and exact commits, not a broad feature name. A no-file-overlap result is not migration, auth or deployment approval.

Preserve all Cleanup checkouts, uncommitted work, evidence, baselines, fixtures, processes, containers and volumes. Do not reset/clean/remove them or stop their jobs. Current machine has roughly 11–12GiB free; large builds/installs/Docker allocations remain deferred pending updated coordination. Existing 5190/5188 previews and other owned ports must be inventoried and preserved. No port listed here should be assumed free.

If Cleanup does not answer, keep shared integration and large allocations pending, record the exact dependency, and continue isolated source work, small targeted checks and contract preparation. Do not poll or message unchanged status repeatedly. Send meaningful milestones, changed overlap, failures or required decisions.

### Latest Cleanup owner readback

The Cleanup owner replied during preparation of this packet. Its private C1 continuation reference is `C:/Users/Administrator/Documents/Codex/2026-10-10/run-this-with-mutple-codex-sessions/outputs/cleanup1-handoff-20261011/README.md`, with resume.json and REFERENCE-INDEX.json beside it. `references/cleanup-coordination-20261011.json` records the exact response, source heads and reference hashes. The packet is a reference, not a transfer of ownership or phase acceptance. C1 remains Codex-only.

Current reported heads are source d5a4e0ac82f8a313ae44c6b8f6b199adc71f1ed7 (PR2390), runtime 8f52dcaf0b18da79681d02a8f208a3b28deeae98 (PR2389), native carrier 952272ec657937da47ada998534c382fb73955d2 (PR2391), and unpushed visual carrier a6c5312005f04d9c34d21dac4268caf19526ca41. Full d5 gate/three-run visual have not run. Previous116 native6278471a failed; previous116 visual three-run PASS is historical. Portfolio has not independently qualified these heads.

Preserve `C:/dev/c1-*`, cleanup-nameproof-private, cleanup-handoff-20261010-root1471, all 348 original baseline PNGs/assertions/optional identities, existing containers/volumes and six shared BuildKit containers. C: has about 12.23GB free. No heavy local install/build/Docker allocation is cleared. Shared lockfiles, workflows, API/Web test configuration and tested-source changes require fresh coordination/rebinding. Primary C:/dev/capirov2 has unrelated dirty work. Cleanup requires a current Meri/frontend release owner and integration window before merge/deploy; disabled D5 and visual review gates remain held. Recheck all facts at takeover.

## 5. Team structure and parallel execution

**One Codex coordinator owns integration and acceptance.** Use multiple bounded Hermes workers concurrently. Start with up to **three active workers plus the coordinator**, reducing this to current Cleanup/resource limits. Nine logical workstreams below are a queue, not nine simultaneous builds. Run heavy/browser/full-build jobs under one coordinated resource schedule.

| Lane | Scope and ownership | Boundary |
| --- | --- | --- |
| H1 Client flow | Portfolio/intake/Overview/forms, existing-contract slice | Shared shell/routes/proxy and common files stay with coordinator. |
| H2 Objectives and Planner | Objectives lifecycle, work links, canonical Planner/task lineage | Public contracts frozen before cross-feature composition; no second Strategy editor. |
| H3 Calendar | Meeting scope/privacy, source review, preparation/debrief, sync operations | No mail sync/Outreach; no provider writes without designated sandbox scope. |
| H4 Relationships and email | Directory/contact drawers, structured logs, authorized email/replies | Reuse canonical Files/public interfaces; no duplicate upload or transport implementation. |
| H5 Prospects and proposals | Prospect data/files/brief/template/proposal/native Workspace integration | Billing consumption belongs to H7; provider payment belongs to H6. |
| H6 Payment operations | Onboard quote/invoice consent/dispatch/recovery/SCA/webhook projection | Sole coordinated provider writer; no simultaneous edits to canonical webhook/publication files. |
| H7 Capacity and requests | Core capacity serialization/entitlements/conversion, slot-request lifecycle | Freeze target-specific ports with H6. Preserve the existing request candidate owner before reassignment. |
| H8 Retained surfaces and Meri interfaces | One bounded feature at a time: Files, Capabilities, Bills, Opportunities, facilities/research handoffs | No catch-all feature service or Meri rebuild. Split assignments by actual owned files. |
| H9 Independent QA | Contract/permission/recovery review, browser/Figma, traceability proposals | Worker does not approve its own code; Codex independently verifies and accepts. |

### Shared ownership rules

Coordinator owns route composition, src/shared foundations, canonical feature public boundaries, browser main/fixtures/config, lockfiles, dependency additions, migration allocation requests, endpoint/config map and final matrix/workbook. Workers propose necessary edits to these files. Assign a single named worker an exact shared file only after relinquishing other ownership and recording it. Backend canonical schema/controllers/writers likewise have one owner at a time.

Each worker receives a pinned reviewed commit, its own branch/worktree and evidence directory, an exact file allowlist, API/public interfaces, audit IDs, dependency status, ports, allowed checks and external-action scope. Workers must not edit a common integration checkout. They return focused commits and an actual report at their runtime budget; unfinished work remains explicit. They do not recursively launch workers or schedulers.

### Hermes launcher

Installed CLI on this machine: C:/ProgramData/Hermes/bin/hermes.exe. Read-only `chat --help` verifies --query-file, --oneshot, --in, --format stream-json, --quiet, --max-turns and --run-budget. Named profiles exist, but several gateways are already running; profile availability and ownership must be checked. Do not stop/reconfigure other profiles, copy credentials or borrow active Meri profiles.

Use the existing approved profile and provider settings with a unique Portfolio session/worktree. Do not change global models, pools, hooks, memory or gateways. An illustrative bounded invocation, after allocating paths/profile and rechecking help:

```powershell
& $HermesExe --profile $ApprovedProfile chat --in $WorkerWorktree `
  --query-file $AssignedPacket --oneshot --format stream-json --quiet `
  --max-turns 80 --run-budget 1800
```

This command is a template, not an executed or qualified worker launch. Start separate non-interactive processes with independent logs/session IDs; Windows background launches must be hidden. Use literal argument arrays/file queries, never interpolate packet text into shell commands. Do not use --ignore-rules, --safe-mode, --yolo or the global -z approval-bypassing shortcut. No persistent profile changes are necessary for ordinary task delegation. If the approved runtime cannot safely allocate parallel sessions, resolve that runtime dependency with its owner while source work continues; do not report Codex subagents as Hermes workers.

Suggested first bounded jobs: 30 minutes/80 tool iterations, then checkpoint and review. These are scheduling checkpoints, not permission to abandon incomplete workflows or claim completion at timeout. Coordinator may dispatch another bounded continuation with the same ownership after reviewing results.

### Gate A: Codex validates every Hermes session

This gate applies after **every** session, including continuations, discovery, QA, failed runs and runs with no code changes. Before accepting its output, integrating commits, advancing its dependent assignment or marking an audit row complete, Codex must:

1. Collect the final transcript/checkpoint, session/process IDs, pinned input/output commits, dirty/untracked paths, actual changed files, commands/results, evidence and external side effects. Compare actual actions with the assigned ownership and permissions.
2. Directly inspect the full diff and relevant surrounding implementation. Check correctness, contract/authorization/validation/persistence semantics, architecture, duplication, error and unknown-operation behavior. For discovery/QA, inspect the primary evidence and reproduce material conclusions.
3. Independently rerun proportionate meaningful checks on the exact submitted source. Use native/service/sandbox checks where the behavior requires them and authorized access exists. Worker-reported tests or a second Hermes review alone never satisfy this gate. Investigate failures without weakening tests or regenerating baselines to pass.
4. Write a Codex validation receipt with session ID, reviewed SHA/files, independent commands/exits/evidence, result **accepted / corrections required / blocked**, and remaining dependencies. Incomplete work stays incomplete. Missing live access is an explicit unverified gate, not acceptance.
5. Return corrections as a new bounded assignment after preserving the rejected evidence. Continue unrelated validated lanes while a dependent gate is blocked.

### Gate B: Codex validates each workstream after integration

Session acceptance does not close a workstream. After integrating its reviewed commits, Codex pins the combined source and independently validates the complete workflow, public interfaces and cross-feature effects against that source: appropriate tests, permission/session/retry/reload checks, real designated-service/sandbox checks and Figma/responsive/accessibility comparison. Record audit IDs, commits, evidence and remaining dependencies. H9 may assist, but Codex owns and verifies H9's work too. Repeat affected checks after integration changes. P7 supplies the final combined build/regression/live gate across all streams.

### Worker lifecycle: no dormant open Hermes sessions

Track each assignment as `assigned → running → checkpoint → exited/closed → Codex validated`. Closure and acceptance are separate facts; closed work may still require corrections. Use one-shot runs and bounded budgets, not open interactive terminals waiting for another prompt.

- On success, failure, budget expiry, a blocking dependency, cancellation, wave completion or coordinator handoff, the worker writes its checkpoint and exits. A blocked job frees its slot immediately; it does not remain open awaiting an owner reply. Continue later through a reviewed bounded assignment, with an explicit session ID if resuming is appropriate; never use a blind `latest` resume.
- Codex records the actual task-owned session and process IDs, verifies process exit and final status, closes any task-owned interactive/runtime session through the currently documented interface when necessary, and checks that assignment-owned helpers/ports have stopped or are explicitly transferred as intentional previews. Do not count a request to stop as verified closure.
- If an owned worker hangs, first request a checkpoint/graceful exit. If necessary, stop only its positively identified owned process and owned descendants, preserving partial logs and work. Never terminate by a broad process name, stop shared gateways/profiles, or touch Cleanup/other workers' resources.
- Before another wave or coordinator handoff, reconcile the ledger against runtime/session/process state. Require **zero dormant open, orphaned or unaccounted Portfolio Hermes workers**. List any intentionally running active workers with owner/deadline; close all owned workers before ending or handing off the coordinator session. An unverifiable closure is an operational blocker, not a successful shutdown claim.
- Preserve closed transcripts, commits and evidence. Session history is not a running worker. Archiving/soft-hiding history does not terminate a process; never prune/delete session history to make the ledger look closed. The installed archive CLI uses filters rather than exact session IDs: do not run a broad archive/cleanup operation. Any optional archival requires a dry run whose matches contain only the explicitly owned completed sessions.
- On takeover after an interruption, inventory existing sessions/processes before launching replacements. Recover checkpoints and close orphaned task-owned workers. No detached retries, recurring jobs or automatic session revival are allowed.

The common worker contract, every lane brief and coordinator log repeat these requirements. No Hermes workers were launched to prepare this plan.

## 6. Phases and acceptance gates

Phase numbers describe integration order. **Contract research for all high-risk dependencies starts in P0/P1.** Independent frontend work and later-phase existing-contract slices may run early. Portfolio must not wait for all Modules or every blocked payment/forecast contract.

### P0 Establish a safe takeover and freeze the backlog

**Purpose:** recover actual local work and establish one coordinator before edits.

1. Verify packet hashes, current policy, Git origin/main, HEAD, branch and tracked/untracked work for every checkout in use. Do not discard documentation edits or the uncommitted request candidate.
2. On this computer, agree ownership transfer before using the existing Portfolio checkout. On another computer, authenticated-clone both repositories; fetch published Portfolio branch, verify/fetch the supplied incremental bundle, then create an isolated continuation branch. Read RECOVERY.md. Request inaccessible full evidence/baseline assets rather than assuming Windows paths exist.
3. Review the two documentation edits, commit them separately if correct, and publish the qualified code/docs to draft PR1 or a clearly linked continuation draft. Verify remote head and create a new delivery manifest; do not use the historical 7db manifest for current source.
4. Coordinate Cleanup/Meri and establish exact owners, file reservations, runtime budget and a redacted service map. Confirm active worker sessions before resuming anything.
5. Revalidate345 audit entries against current code/Figma, retaining original IDs/evidence. The supplied phase-audit map assigns every row one primary implementation phase and P7 validation; amend it when new evidence warrants, not to close a count.
6. Open a decision/contract register immediately: auth origin/trust, Objectives/Planner ownership, stage mapping, proposal send/reminder semantics, billing/invoice/annual catalog/reversal policy, Meri editable/file context, analytics/forecasts and entry placements. Propose concrete definitions and continue unrelated work.

**Parallel jobs:** H9 verifies inventory/evidence, H2 reviews Objectives/Planner contracts, H6 reviews billing/entitlement contract with H7 owner. Coordinator handles source recovery, Cleanup and shared files.

**Exit:** verified source recovery and owner/resource log; current-state register; reviewable published draft; no unexplained dirty work; authoritative scope and auth dependency known. Authentication can remain a recorded external dependency, but dependent live acceptance is not passed.

### P1 Validate foundations and complete the first real client slice

**Purpose:** turn the existing frontend into a tested product entry flow.

1. Validate matching Clerk/backend configuration, canonical JWT template/tenant membership and service origins. Production Clerk rejects localhost; development sign-in alone lacks approved backend issuer/tenant/JWT trust. Auth owner provides a compatible development pairing or approved isolated hostname. Do not widen shared auth/CORS to bypass this.
2. Verify shell/deep links, session expiry/logout/organization change, fresh query caches, required icons/logo/fonts, light/dark/mobile, loading/error/empty/permission states and current proxy boundaries. Core billing only permits GET state/summary; Onboard is a distinct service.
3. Complete real accessible-client index/filter/card → permitted create/intake or LDA import → Overview → notes/owner/facility/map → Objectives summary/detail path. Create only task-owned synthetic data within authorized scope, record IDs and cleanup read-back; preserve Cleanup fixtures.
4. Integrate minimal Objectives CRUD/readiness only after native owner approval/registration; use the four-field rule. While blocked, qualify the same current-contract client/intake/Overview flow and keep Objective live gate open.
5. Connect authorized Manage billing navigation to configured existingApp /settings/billing without automatically creating a provider session. Resolve CSV/removal/global New Objective entry placement from current Figma/user decisions.
6. Recheck capacity/logo/import actor/lifetime guards, actual proxy forwarding, ambiguous create reconciliation and catalog pagination; snapshot capacity is not an atomic reservation.

**Audit focus:** Portfolio/index/intake/header/team/notes/timeline, CORE-074–076/078/086/098/099, minimum OBJ CRUD/readiness and facilities used by the slice. Exact primary allocation is in phase-audit-map.csv.

**Parallel jobs:** H1 product slice, H2 minimal Objectives native contract, H9 auth/proxy/visual verification; H6/H7 billing contract preparation may replace a blocked lane.

**Exit:** first signed-in isolated real-service flow passes with permissions/session/error evidence; no fake success or metrics. If auth/activation remains unavailable, mark P1 live gate BLOCKED and continue all independent implementation. Historical test totals never satisfy this gate by themselves.

### P2 Complete Objectives and shared Work or Planner behavior

1. Finish standalone Objective CRUD/drafts/lifecycle/readiness and advocacy history/New matter/corrections with canonical authorization, validation and shared persistence. Review draft2362, its unallocated/unapplied SQL and atomic revocation gap before native integration.
2. Freeze Objective↔Strategy↔Planner/work/artifact lineage, visibility, stale-draft/version checks, mandatory reviewed activation and durable partial/unknown outcomes. Existing Strategy assistant can mutate the authoritative plan; generic draft jobs do not prove these semantics.
3. Implement approved strategy draft/review/activation and Planner project/task creation through existing product owners. Preserve required rolling-window/task limits only when the actual contract confirms them; no hardcoded fixture forecasts or invented decision rules.
4. Finish structured Quick log/commitment plus canonical Planner follow-up task using agreed associations and recovery. Ordinary Engagement tasks lack the required same-client wall/private/Planner lineage. Directory member notes remain tenant-shared; unsupported fields must not be hidden inside free text.
5. Persist work-to-objective linking, coverage/ignore semantics and continued-objective history after explicit definitions. Supporting files/context use canonical Files interfaces. Work stays display/handoff only.
6. Recommended targets, cycle verdicts, questions/dependencies/decisions and funding claims require source-backed definitions; revalidate retention/current design and carry specific unresolved definitions rather than fabricate data.

**Audit focus:** all 31 OBJ rows, eight Work rows, CORE-087–088/095–096/100–102 and ENG-tasks_create/list/update. Defined analytics remain in P6, linked back to their P2 contracts.

**Parallel jobs:** H2 Objective lifecycle/lineage; H4 structured log/commitment adapter in disjoint paths; H9 authorization/actual-SQL/recovery review. Shared Planner files and schema have one allocated owner.

**Exit:** reviewed Objective→Strategy→Planner/work flow persists and reloads correctly; duplicate/stale/unauthorized/partial operations do not falsely succeed. Remaining unapproved forecasts are explicit product dependencies, not fabricated completed controls.

### P3 Complete Calendar, Relationships and authorized communication

1. Verify caller-created/owned-calendar rules and explicitly authorized client sharing. Omitted clientId is caller Master scope, not every teammate’s calendar. Client filter is not an ACL. Test two approved identities where needed for privacy, without cross-tenant elevation.
2. Validate all relevant pages and range/time-zone/all-day boundaries. Master Month/Week and client-filtered Agenda remain meeting feeds. Mixed Master Agenda composes permitted paginated hearings/Planner/deadlines; the Planner five-item queue is insufficient. Stable provenance IDs and deduplication preserve distinct events. Estimated Government windows stay a P6 source/definition gate.
3. Finish meeting details/edit/assignment/attendees/join, preparation/cancel/refine/sources, saved notes, manual/upload/voice debrief generation and explicit save/approval/share/unshare/export. Preserve source/state when errors permit and refuse stale actor/lifetime/parent results.
4. Repair server attachment approval viewer/current-version/readiness checks atomically with its owner. Saved meeting notes are usable, but exact Meri origin requires note↔notetaker session provenance; do not infer it from author or order.
5. Review calendar operation2386 and native manual/scheduler/webhook/lifecycle writer fence. Wire durable status/recovery only once activated and proven. A local unknown fence does not survive reload or repair a shared cursor race.
6. Finish organization/government contact/staff/committee drawers, real email history, authorized sender selection, attachments, recipient review, exact sends and actual error/pending behavior. Integrate canonical outbound ACL/reply contracts, batch/intent authorization, parent/thread identity and durable no-replay recovery. No customer sends or provider/bot operations for tests outside approved sandboxes.

**Audit focus:**50 Calendar rows, 14 Master rows except forecast primary in P6, 30 Relationship rows. Legacy Engagement/public-proceeding exclusions are retained according to current scope; do not restore them to close audit totals.

**Parallel jobs:** H3 Calendar, H4 Relationships/email, H9 privacy/time/recovery/visual validation. Coordinator integrates common Files/access/identity/browser composition. Avoid concurrent edits to common Engagement service/controllers; allocate exact backend paths.

**Exit:** native client and Master meeting scopes, complete meeting artifact flow and permitted Relationships/email behavior pass meaningful signed-in/provider-sandbox checks. Unsupported provenance/provider dependencies remain open with exact IDs.

### P4 Complete prospects, proposal documents and reply-aware follow-up

1. Finish prospect index/detail/filter/stages and retained profile/contact/classification/registration/logo fields after exact contracts. Stage2365 requires the human legacy mapping; do not translate existing records by guesswork.
2. Reuse prospect contacts2371, reviewed brief history/refresh2378 and authorized Files/Workspace routes. Complete list/upload/open/search and permitted editing/comments/sharing/export in the existing editor; no second Plate/editor inside Portfolio.
3. Persist immutable proposal input binding: prospect/version, brief/version, template/version, scope, fee, start date, team, appendix and permission. Distinguish provider quote data from proposal commercial terms and do not invent financial values.
4. Implement generation/review/save/export and selected-contact send through native Workspace/Business Development/Engagement contracts. Freeze send intent, attachments/recipients/versions and outcome recovery.
5. Make successful send/stage change/history consistent. Define stage Undo/version behavior and partial-send outcomes. Five-day reminder must use a defined reply/thread/mailbox lineage and cancel/suppress on the authoritative reply condition; a blind scheduled reminder is insufficient.
6. Prepare conversion input/carry-over identity mapping for P5: contacts/files/research/proposal versions/Workspace and approved brief-to-draft-Objective mapping. Existing-client no-charge linking stays distinct from paid new-client conversion.

**Audit focus:**PROS-001–031 and037–038, except Meri18 in P6 and analytics39–40 in P6; conversion32–36 joins P5.

**Parallel jobs:** H5 prospect/document flow; H4 canonical proposal-send/reminder adapter by explicit handoff; H9 version/receipt/retry tests. H6/H7 payment/capacity contract continues independently.

**Exit:** prospect→saved reviewed proposal→native export/reviewed send→correct stage/history→reply-aware reminder is persisted and source-bound. Existing templates or a pretty editor do not satisfy this gate.

### P5 Complete inline billing, tenant-slot requests and conversion

Start contract/preparation work in P0/P1; join fulfillment only after its dependencies are agreed. Payment latency must not block unrelated Portfolio work.

1. Billing/Core owners freeze separate immutable target types for prospect conversion and tenant-slot purchase, operation keys/versioning, authorization, lock/transaction order, exact quote/invoice consent, dispatch proof, settlement/publication boundary, compensation/cancel/recovery and reversal policy. Annual added-slot choice needs co-term-versus-monthly catalog semantics; current candidate supports a narrow monthly +1 prospect case only.
2. H6 completes sole coordinated Onboard provider writer/journal, actual-invoice confirmation, unknown preparation/dispatch recovery, SCA/webhook ordering and paid projections. Extend publication fencing across subscription sync/webhooks/lifecycle/provisioning/admin-comp/overage/Portal/Checkout and explicitly coordinate external sessions/Dashboard writers. Consent, dispatch and payment are distinct facts. Do not substitute hosted Checkout or pending_if_incomplete for actual-invoice consent.
3. H7 completes tenant-wide capacity serialization/reservations and one-time entitlement consumption. Cover manual/Meri creates, CSV, LDA, reactivation and conversion; a prospect lock does not protect tenant capacity. Test crash/replay/concurrent workers/rollback against native PostgreSQL, not PGlite alone.
4. Independently verify the existing new profile-request metadata candidate before assigning more work. Create/read/decline and recipient-scoped durable internal notification are separate from purchase approval. Approval must bind exact request/version/tenant/quantity to authoritative paid entitlement; no purchase/control success before that port exists. Create the profile later through normal capacity rules.
5. Build inline quote, explicit charge confirmation, approved method/mandate/verification/SCA, pending/failed/unknown/paid/receipt and request/review/inbox UI against frozen contracts. ACH processing grants no capacity. No fabricated prices, “no charge,” created-client or receipt-email claims without authoritative receipts.
6. Join paid prospect conversion with atomic entitlement consumption/capacity/client creation and carry-over. Handle selected existing-client linking without a new charge. Preserve contacts/files/research/proposals and approved draft-objective lineage; partial joins must be recoverable without duplicate charge/grant/client.

**Audit focus:**CORE-074–085 and PROS-032–036, plus every create/reactivation writer affected by the shared entitlement boundary. Payment2370 and request metadata are prerequisites, not active services.

**Parallel jobs:** H6 Onboard payment, H7 Core capacity/requests, H5 or H1 frontend request/inline composition against versioned public contracts. H9 independently reviews monetary/receipt/concurrency behavior. Schema allocation is centrally owned; migrations remain unapplied until required agreement/authorization.

**Exit:** native/sandbox quote→consent→paid→exactly-once entitlement/fulfillment→receipt passes declined/pending/SCA/duplicate/lost-response/crash/rollback tests; slot request and conversion targets stay distinct; conversion carry-over is verified. No real charges.

### P6 Finish retained surfaces, Meri handoffs and defined metrics

These existing-contract pieces can run from P1 in available lanes; they are not waiting on all Modules.

1. Complete retained Capabilities, Bill Tracker/watchlist/hearing updates, Opportunities, Files, team/ordered ownership, notes, facilities/map and responsive drawers/dialogs. Reuse public feature contracts and canonical editors. Atomic batch file move needs transaction/per-file ACL/all-or-nothing receipt.
2. Keep tracker ownership explicit; current preview has TRACKER_BACKEND unset and no fallback. Final config must identify Core versus Intel for the tenant. Source availability alone does not establish ownership.
3. Complete client-bound geocode CAS2373 and reviewed research apply/reject/retry2382 only after old-worker version/claim/recovery/drain agreement. Strict preview start/retry must remain disabled while legacy workers could mutate before review.
4. Coordinate with the current Meri/Workspace/Strategy owner or successor. Older thread **Complete the entire file**,01a0e551-c148-70c3-ac99-586bba4569b0, was paused/idle and no active successor identified. Obtain current public interfaces for editable client/prospect starters, selected authorized file context, Objective lineage and reviewed actions. No autosend, duplicate Meri/editor or unrelated G1 rebuild.
5. Obtain exact definitions and source scope for objective coverage/off-track, trend/touches/reply health, federal obligated/request values, stress/open requests, material change/PASS, pipeline probabilities/win rate and Government actual-versus-estimated windows/confidence. Some current APIs have different meanings. Revalidate before retaining each metric; missing definitions remain explicit decisions.
6. Complete approved entry placements and visual states using current Figma context/screenshots, approved libraries where suitable and existing integrations first. Library choice is not permission to replace Workspace/Meri work.

**Audit focus:**all retained CAP/BILL/OPP, general Client Files/facilities/map/research/Meri/analytics; PROS-018/039–040, MCAL-012 and product decisions mapped here. Some file/ownership subflows are exercised earlier in P1/P4/P5 too.

**Parallel jobs:** H8 one bounded retained feature, H2 or H5 agreed native interface adapter, H9 metric/source/visual review. Unknown-owner work proceeds as isolated proposal until coordinated integration is possible.

**Exit:** retained workflows are connected, persisted where required and accepted; metrics are defined and service-derived or carry specific product dependencies. Current designs are covered without reviving obsolete screens.

### P7 Integrate, validate and deliver the complete Portfolio

1. Integrate independently reviewed worker commits at a pinned clean source, resolving shared ownership and architectural duplication first. Verify routes→features→foundations, public boundaries, no circular imports/god hooks/stores and no hardcoded origins or fabricated data.
2. Run formatting/lint/types/meaningful tests/architecture and current production build after Cleanup resource coordination. Reuse existing test tools. Preserve original failures/assertions/coverage/visual baselines; investigate failures instead of skipping or weakening checks.
3. Run final full component regression and actual Next preview checks, then approved signed-in real-service/sandbox workflows: expiry/tenant/client roles/privacy, mutations, deep links, paging/filtering, time zones, cache invalidation, retries and durable unknown/reload recovery. Record source/service/identity scope without secrets. Mocks do not prove live integration.
4. Open and compare representative final screenshots against current Figma for index/intake/Overview/Objectives/calendar views/contact/email/prospect/proposal/billing/files and mobile/light/dark. Explain intentional ACH policy copy changes.
5. Reconcile all 345 IDs: verified supported/composed/new contract/local UI/obsolete/product decision, with implementation evidence and specific remaining owner dependencies. Preserve the baseline workbook’s six tabs / 7613 values/six formulas and all IDs; never use local storage as shared persistence.
6. Deliver exact starting/qualified/published commits, draft PRs and authoritative read-backs; isolated local URL/run/build instructions and redacted service map; hosted preview only through approved separate infrastructure; workbook/matrix/screenshots/checks/blockers and structure/tradeoffs. Include Codex validation receipts for every Hermes session/workstream and a verified closure ledger with no dormant open workers. No auto-merge, cutover or shared backend deploy.

**Exit:** current in-scope workflows work with real services; confirmed gaps are implemented/verified where coordination permits; each remaining item has a specific evidenced dependency. Material disconnected/stubbed/fixture-only behavior prevents a full-completion claim. An evidenced blocker does not permit stopping other unblocked work.

## 7. Suggested parallel waves

| Wave | Concurrent jobs | Coordinator focus |
| --- | --- | --- |
| A | H1 first slice; H2 Objectives/Planner contract; H6 billing contract with existing H7 candidate owner | P0, auth/owners/Cleanup, publication and shared foundations. |
| B | H3 Calendar; H4 Relationships/logging; H5 prospects/documents | Integrate P1, allocate shared Engagement/Files boundaries, freeze proposal/lineage interfaces. |
| C | H2 approved Objective/Planner implementation; H6 payment; H7 capacity/requests | Cross-service contract review, migrations/owner dependencies, shared composition. |
| D | H5 proposal/convert integration; H8 retained surfaces/Meri interfaces; H9 independent acceptance | Join ready flows, decisions, native adapters and bug fixes. |
| E | Targeted fixes in disjoint owned paths; H9 final evidence | Serial clean-source full build/regression/live validation, matrix/workbook and draft delivery. |

Do not launch dependent implementation because a wave number has arrived. Ready jobs pull from the queue; blocked jobs checkpoint exact dependency and free their slot. Keep one coordinator and one owner for each contract/file. No repeated broad “review everything” tasks.

## 8. Completion records and session continuity

Maintain a small durable coordinator log: current code/PR/build source; workers/session IDs/worktrees/base commits/file reservations/ports; Cleanup responses; contract decisions; per-ID progress; exact commands/exits/evidence; next 3 ready jobs and blocked dependencies. Workers return proposed row updates; only coordinator writes the canonical workbook/matrix.

Every worker report must identify commit, dirty/untracked paths, intentional behavior/contract changes, tests actually run, original failures, side effects/read-backs, unresolved risk and exact next step. A green exit or worker summary is not acceptance. Codex reviews files, reruns meaningful checks and verifies PR/endpoint receipts independently.

Use the packet manifest and verify-packet.py for portability. Current source recovery is small and explicit; the private Cleanup evidence/archive stays with Cleanup. Large traces, full Git histories, credentials and dependencies are not in this packet. Reference paths/hashes identify omitted evidence; request authorized access when required. On another machine, do not assume any C:/ path exists.
