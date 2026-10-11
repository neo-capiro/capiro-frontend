# Capiro 3.1 Portfolio implementation handover

Snapshot: 11 October 2026. **Portfolio is substantially implemented as a local frontend, but it is not a complete, live-accepted product.** Several essential workflows still require backend contracts, service-owner integration and signed-in validation. This handover preserves the current implementation and describes the remaining work; it does not authorize a merge, deployment or migration.

## How much work remains

The updated checklist contains **345 audit entries**:

| Current state | Entries | Meaning |
| --- | ---: | --- |
| Partial frontend implementation | 265 | Some working local behavior exists; row-specific gaps and live/Figma acceptance remain. |
| No frontend implementation | 72 | Workflow or exact semantics still need implementation or contract revalidation. |
| Backend billing candidate only | 1 | PROS-033 has a locally tested draft contract; inline purchase/conversion is not integrated or active. |
| Excluded legacy/obsolete scope | 7 | Historical evidence retained; these are not new implementation targets. |

**No audit entry is recorded as fully accepted.** The 265 entries must not be read as 265 finished workflows or a percentage complete. Entries differ greatly in size and overlap. The remaining effort includes major product flows—particularly proposals, conversion, Objective/Strategy/Planner linking and billing—plus cross-cutting permissions, recovery, live integration and final design validation. This is more than a final polish pass. A reliable finish date depends on backend ownership, approved auth access and the unresolved contracts below.

The workbook and JSON/CSV contain the exact per-row files, endpoints, evidence and qualifications. Historical API labels such as `implemented` mean “API exists,” not “frontend complete.”

## Repositories and current source

| Item | Current value |
| --- | --- |
| Frontend repository | `neo-capiro/meri-greenfield` |
| Isolated checkout | `C:/dev/meri-greenfield-portfolio-31` |
| Branch | `codex/portfolio-31-20261010` |
| Starting commit | `351be38b19279bbf8159b6da6ffc674239ac8ecf` |
| Latest locally qualified implementation | `aa316e0a83ea83556a2ab2b9faa9c449b6ae68e2` |
| Frontend draft PR | https://github.com/neo-capiro/meri-greenfield/pull/1 |
| Backend contracts last verified against main | `fd8765ec01d292013758606204f2c9d886cd31c1` in `neo-capiro/capirov2` |
| Running isolated Next preview | `http://localhost:5190`, older production-qualified source `bbf25e6ab4931886f5a382ee3362593e573c19de` |
| Hosted preview | Not established |

Published draft head at this handover: `7dbf8e1ee7e2ded8c6f7b0e3d3b9bc557cdca1a3` (OPEN, draft=true). The latest locally qualified source `aa316e0a83ea83556a2ab2b9faa9c449b6ae68e2` has **not yet been pushed** in this snapshot. Local checkpoint/README updates are pending a documentation commit. The running preview does **not** contain the latest source changes. Publishing and the new delivery read-back remain separate next steps.

Frontend implementation belongs in meri-greenfield as the human directed. Task-created capirov2 frontend changes were removed; capirov2 changes are separately reviewable backend candidates. Other checkouts, deployed frontend, Cleanup resources and fixtures remain preserved.

Shared operating policy: `b32b4803933760dc0a93fffdcd8fba30a89c3aac`; fetched remote policy `b2b0ce8c2bf03817b81e671d968b7892985b8d06`. The local policy is ahead by three commits and was preserved. Machine map revision: 30 September 2026, 00:21:48 UTC. Read BOOTSTRAP.md and AGENTS.md again on takeover; do not rely on this snapshot for future authorization.

## What is implemented locally

| Area | Current behavior | Material qualification |
| --- | --- | --- |
| Foundations | Shared shell/navigation, responsive tokens/primitives, Clerk session boundary, fresh actor-scoped cache, validated service origins, explicit deep links | Current-source production build and signed-in browser acceptance remain open. |
| Portfolio and intake | Index/list/cards, local filters, three-step create/edit, archive, focus tags, reviewed JSON export, LDA firm search/candidate selection/import receipts | Capacity preflight is not a server reservation. CSV entry placement and saved-performance removal placement remain unresolved. |
| Billing reads | Canonical capacity gate and collapsed plan/usage summary; summary hidden without current billing authority | Core proxy now permits only GET billing/state and billing/summary. No payment route is implied. |
| Overview | Objectives summary in place of old summary, advocacy history placement, activity timeline, notes/pins/actions, account/team and map/facility entry | Missing analytics definitions remain unavailable; ordered four-level ownership is not implemented. |
| Objectives | Four-field editing/readiness UI and reviewed lifecycle against the separate candidate | Candidate is not activated; Strategy/Planner lineage and full lifecycle acceptance remain incomplete. |
| Calendar | Distinct Master/client routes, real client selector, preserved view/date/scope/zone, meeting detail/preparation/notes/debriefs, caller-owned library, assignment and transcript extraction flow | Meeting privacy, native sync recovery, provider writes and saved Meri-note provenance are not accepted. |
| Meeting sources | Manual and uploaded/voice transcript review into existing generator, separate explicit debrief save; new saved-note source and attachment approval composition | Focused saved-note/approval UI browser checks pass; live acceptance remains open. Server attachment approval still lacks atomic viewer/version/readiness enforcement. |
| Relationships | Organization/government target drawers, people/staff context, direct-client email threads, reviewed recipients and attachments, member-note Quick log | Native reply semantics, full staff/client/objective log associations and durable outbound recovery need contracts. No customer send acceptance. |
| Work | Client Strategy library/new destination and existing Workspace draft/document links | Display and handoff only; no second editor. Objective-to-work coverage and lineage remain incomplete. |
| Capabilities, Bills, Opportunities, Files | Retained workflows, explicit tracker backend, hearing/source links, file upload/readiness and permission surfaces | Several metrics and atomic multi-file operations remain unsupported; prospect files/document integration is unfinished. |
| Facilities and research review | Client-bound facility actions and staged review UI; selected apply/reject/restore surfaces | Geocode CAS/research preview contracts remain drafts. Research start/retry stays disabled where old workers could apply before review. |
| Layouts | Complete-catalog profile ordering and keyboard interaction | Shared persistence candidate is unregistered; no local-storage replacement. |

Feature folders own their API adapters, contracts, query/mutation coordination and UI. Route files compose features; foundations do not import features. Existing Schedule-X, React Flow and Workspace/Strategy experiences are reused. This task does not rebuild all Modules or Meri.

## Remaining implementation by area

The following groups account for **all 72 entries without frontend implementation**, without double counting. Partial rows in the preceding section have additional work too.

| Group | Entries and IDs | Remaining work and dependency |
| --- | --- | --- |
| Billing purchase and requests | 9: CORE-077–085 | Inline provider quote/payment/receipt, annual/co-term versus monthly added-capacity choice, payment method and processing/failure states, tenant-slot requests/admin review/notifications. No request resource exists on current main. Native billing management may use the existing authorized destination; hosted Checkout does not replace inline conversion. |
| Objective advanced flows | 13: OBJ-14–16, OBJ-20–27, OBJ-29, OBJ-31 | Objective-bound Strategy generation/review/activation, stale-draft detection, authorized Planner creation and lineage, cycle forecasts, relationship recommendations, dependencies/decisions, files/context, clarification and continued-objective linkage. Some exact contracts still need revalidation; dates, forecasts and decision rules must not be invented. |
| Prospect data and documents | 18: PROS-006–009, PROS-016, PROS-019–021, PROS-024–026, PROS-028–031, PROS-034–036 | Registration/contact/classification fields and logo; arbitrary activity semantics; prospect files and Workspace handoff; native editing/comments/export; persisted proposals, reviewed send/stage consistency, reply-aware reminders; conversion carry-over and draft-objective mapping. Existing generic templates and brief text do not complete proposals. |
| Analytics and coverage | 14: CORE-009, CORE-087–090, CORE-112–115, BILL-13–14, PROS-039–040, MCAL-012 | Agree definitions/source/scope for trend, work coverage/ignore, attention/off-track, federal values, health/touches/replies, stress/requests, material change/PASS, pipeline/win rate and estimated government milestones. Current mockup numbers are fixtures. |
| Meri and research | 8: CORE-065, CORE-069, CORE-097, CORE-100, CORE-119, CORE-122, CORE-127, PROS-018 | Preview-only research start/retry/whole retry, editable client/prospect/file intent handoffs and approved automatic log linking. Current contextual Meri prompts autosend; compliant editable starters are unavailable. Existing research workers must be inventoried/upgraded/drained before preview-only activation. |
| Quick log and follow-up tasks | 7: CORE-095–096, CORE-101–102, ENG-tasks_create/list/update | Structured Objective/staff/client associations, commitment plus canonical Planner task, strategy lineage, same-client authorization and partial/unknown multi-write recovery. Generic meeting log needs an approved end-time/duration or Calendar handoff. Current ordinary Engagement tasks are insufficient for the promised private/Planner semantics. |
| Ordered ownership | 1: CORE-099 | Persist Primary/Secondary/Tertiary/Quaternary ranks. Current single owner plus team does not express the design. |
| Atomic file operations | 1: CORE-120 | Server transaction, per-file ACL and all-or-nothing batch-move receipt. Individual moves do not satisfy this guarantee. |
| Email preparation sender | 1: ENG-prep_sender_select | Revalidate connected sender contract, selection authority and actual send behavior; do not assume the generic composer proves mailbox-specific selection. |

**Additional disabled candidate:** PROS-033 inline conversion billing. It requires the payment/entitlement/conversion work below even though it is separate from those 72 rows.

### Significant unfinished behavior in partial rows

- Objectives CRUD/readiness must run against the activated authorized service; advanced lineage is not supplied by the basic four fields.
- Profile ordering needs shared server persistence and an atomic membership/catalog fence.
- Current meeting sync UI only has a mounted-session unknown-outcome fence. It is not wired to the disabled durable operation endpoint and does not recover safely across a reload.
- Attachment approval’s server endpoint records reviewer/time but does not atomically check viewer ACL, superseded version or readiness. Frontend preflight cannot repair that server race.
- Saved-note debrief generation can truthfully use a reviewed saved note; it cannot identify a note as Meri-generated because canonical provenance is missing.
- Outbound email requires canonical attachment/source authorization, parent/thread-bound replies, durable outcomes and designated-sandbox acceptance.
- Direct conversion must preserve contacts/files/research/proposals and consume a single-use paid entitlement atomically with capacity and client creation.
- Meri/Workspace/Strategy destinations need agreed public interfaces. Do not introduce a second editor or use an autosending prompt as an editable starter.
- Every area still needs representative final-build Figma comparison, signed-in permission/error/retry checks and real-service acceptance appropriate to its side effects.

## Backend draft candidates

All links below are **draft, undeployed work**. Tests qualify bounded candidates; they do not prove native registration, RLS, shared concurrency, migration or provider acceptance.

| Draft | Latest reviewed source and evidence | Required before use |
| --- | --- | --- |
| [Objectives 2362](https://github.com/neo-capiro/capirov2/pull/2362) | 72bfea4; root128 authorization/regression/actual-migration checks | Owner agreement, migration allocation/integration, atomic revocation fence, lineage and live checks. |
| [Stages 2365](https://github.com/neo-capiro/capirov2/pull/2365) | fd6ed6c01; 230 focused checks | Human legacy-stage mapping; exact reviewed source and migration/owner integration. |
| [Inline billing 2370](https://github.com/neo-capiro/capirov2/pull/2370) | 372ea02; root81 service/domain/provider/actual-DDL checks | Publication fence across all writers/consumers, unknown-dispatch recovery, actual-invoice consent/compensation policy, SCA/webhook ledger, single-use paid receipt and atomic capacity/conversion. |
| [Prospect contacts 2371](https://github.com/neo-capiro/capirov2/pull/2371) | 6c6f88e9; 11 PGlite/DTO/guard checks | Registration/schema and atomic conversion carry-over. |
| [Geocode CAS 2373](https://github.com/neo-capiro/capirov2/pull/2373) | 6e5774a; 96 checks | Final combined-source/native PostgreSQL/HTTP/provider acceptance. |
| [Brief refresh 2378](https://github.com/neo-capiro/capirov2/pull/2378) | 87de0da; 18 actual-migration checks | Module/migration/retention agreement and native/live acceptance. |
| [Outbound attachment ACL 2381](https://github.com/neo-capiro/capirov2/pull/2381) | 171ec869; root48 | Owner/native integration, batch/intent ACL and concurrent writer fence. |
| [Research preview 2382](https://github.com/neo-capiro/capirov2/pull/2382) | d394712; root110 | Old-worker inventory/drain/upgrade/recovery; strict start/retry routes remain503. |
| [Meeting PDF 2383](https://github.com/neo-capiro/capirov2/pull/2383) | 320878e; root47 | Native source/RLS/grants/publication adapters and allocated SQL; rich unsupported PDF content fails closed. |
| [Client activity ACL 2384](https://github.com/neo-capiro/capirov2/pull/2384) | d75b3c7; root78 | Service/security owner, atomic revocation/write fence, CAS and native acceptance. |
| [Saved layouts 2385](https://github.com/neo-capiro/capirov2/pull/2385) | 46937ce; root55 SQL/contract checks | Registration, allocated SQL and atomic catalog/membership fence. |
| [Calendar operations 2386](https://github.com/neo-capiro/capirov2/pull/2386) | 3883306; root58 Jest/PGlite checks | Native actor/RLS/provider adapters and shared manual/scheduler/webhook/lifecycle cursor writer fence. No shared cursor race is claimed fixed. |
| [Mail guard 2364](https://github.com/neo-capiro/capirov2/pull/2364) | 4b3c67257; 11 focused checks | Native integration and provider/reply acceptance; not the complete parent-bound reply contract. |

Abbreviated source IDs above are labels; the matrix and candidate evidence contain exact source bindings where verified. Do not integrate by an approximate label. Newly underway tenant-slot request candidate is in `C:/dev/cap-profile-requests-20261011`, branch `codex/portfolio-profile-requests-20261011`, based on fd8765ec. It is unregistered and unapplied, has no published acceptance yet, and deliberately has no working purchase approval before a reviewed billing port exists.

## Decisions already made

- Objectives “Confirm ready” requires only outcome, government problem, ask type and minimum win.
- Adopt Figma prospect stages; the human will provide the legacy mapping.
- Conversion uses inline provider quote, charge and receipt through a new billing contract.
- A non-admin Request profile requests **one tenant client slot**; the profile is created afterward. It is not tied to prospect conversion.
- ACH grants capacity **only after confirmed payment**, intentionally differing from Figma’s provisional-access example. Processing is not paid.
- Use capiro-internal and neo@capiro.ai for bounded designated testing; existing permissions still apply. Do not send customer messages or create real charges.
- Keep Claude SDK and Fargate responsibilities; SessionStore is an accompanying checkpoint/recovery candidate.

Outstanding product decisions include legacy prospect-stage mapping, invoice preparation/cancellation/compensation policy, post-payment reversal behavior, missing metric/forecast definitions, generic meeting-log timing, and the remaining entry placements described in the matrix. Do not ask again about the decisions above.

## Access and owner dependencies

### Signed-in preview

Production Clerk rejects localhost. Approved development keys can render sign-in, but that development application lacks matching approved tenant/JWT/backend issuer trust. Signing into Clerk’s dashboard or creating another user does not supply backend trust. Required resolution: an approved development backend/auth pairing with the right tenant and JWT template, or an approved isolated hostname compatible with production auth. Auth/hosting owner must make or authorize shared changes. No bearer-token bypass, CORS widening or secret-in-source workaround is implemented.

### Backend integration ownership

The responsible Core/Engagement/Business Development/Billing/Strategy/Workspace owners must agree contracts, overlap, native registration and migrations. An owner/successor is not yet identified for all Portfolio dependencies. New backend candidates stay isolated. Cleanup’s lack of direct file overlap is not deployment or schema approval.

### Meri handoff

The coordinated thread **Complete the entire file** has its older reliability goal paused, and no active greenfield successor/release lane was identified. Current main’s contextual prompts autosend; public context has no selected-file or Objective IDs. Strategy’s ordinary assistant can change the authoritative plan without a uniform mandatory review. These public-interface dependencies must be owned explicitly.

### Build resources

Cleanup’s native recovery and historical case conservation are still unresolved. Large allocations, new builds/installs/Docker remain deferred by coordination to preserve shared disk/evidence. The older preview remains available. A passing current-source production build and final browser run are mandatory before completion.

## Verification and evidence

| Exact source | Checks | Limits |
| --- | --- | --- |
| aa316e0 | 726 unit PASS;42 affected browser PASS; types/lint/format/architecture394 PASS | Billing15, meeting review22, manual4, preparation1. Includes actual Calendar approval→saved-note→existing generation/review path. Build/live NOT RUN. |
| 1c0b18a | 674 unit PASS;79 affected browser PASS; all static checks PASS | Intake/capacity/LDA/member-note/billing-summary component responses intercepted. |
| 5609395 | 645 unit PASS;44 intake/capacity/LDA browser PASS; static checks PASS | Corrected earlier failed continuation tests and unnecessary detail refetch. |
| e7978a4 | Last complete browser suite:349 PASS/2 FAIL | Failures preserved; affected corrections pass. No later complete green-suite claim. |
| bbf25e6 | Earlier production build PASS;5 actual Next auth/deep-link checks | Running5190 build; signed-in product acceptance still blocked. |

Original failures, traces and screenshots remain preserved. Latest root evidence: `outputs/evidence/portfolio-integrated-20261011/affected-aa316e0/` and `affected-1c0b18a/`.

Prior designated real-service evidence includes13 Core read projections,47 October meeting projections,20 Workspace templates plus one detail,62 unique meeting-library records across two pages, and one task-created synthetic intake/contact/facility lifecycle with archived client/read-back cleanup. These checks do not establish complete UI integration, teammate privacy boundaries, email/calendar-provider writes, conversion charges or all contracts.

Workbook preservation PASS: six original tabs,7,613 populated values,six formulas and345 IDs. Baseline source remains read-only. Current workbook SHA256: `21cd1d15eb215cb0aa9013d3b53a06405c7ed5f6a31c6e8c3ad05d1372e1e7c4`.

## Configuration and reproduction

Use Node24/npm11 in `C:/dev/meri-greenfield-portfolio-31/apps/portfolio-web`; bare system Node is22. Commands after build restrictions are cleared: `npm ci`, configure ignored `.env.local` from `.env.example`, `npm run dev` (default5188), `npm run build`, `npm run start`. On this machine use the bundled Node24 runtime explicitly and reuse existing dependencies while disk restrictions apply. Keep keys only in the approved machine secret store.

| Variable | Verified service target |
| --- | --- |
| CORE_API_BASE_URL | https://os.capiro.ai/api |
| STRATEGY_API_BASE_URL | https://os.capiro.ai/strategy-api |
| WORKSPACE_API_BASE_URL | https://os.capiro.ai/workspace-api |
| INTELLIGENCE_API_BASE_URL | https://os.capiro.ai/intel-api |
| TRACKER_BACKEND | Explicit core/intelligence; current preview unset, no fallback |
| CAPIRO_EXISTING_APP_URL | https://os.capiro.ai |
| Other shell destinations | Explicit verified Meri/Module/Workspace URL configuration |

Onboard payment mutations are a distinct service and are not added to the Core proxy by the new billing-read allowance. Separate hosting does not isolate backend data. The proxy obtains the canonical JWT; caller-supplied tenant headers are not authority.

## Current parallel work and next sequence

1. Attachment/saved-note UI source and22 browser cases are integrated and root-verified; inspect final root captures and retain the exact Meri provenance/server-approval dependencies. Root owns Calendar composition and shared browser main.
2. CORE-077–082 report is complete at5a92b8d; compose the independently supported authorized Manage billing destination, preserving paid-only ACH and the inline contract dependencies.
3. Independently review create/read/decline/recipient-notification tenant-slot request candidate (`sessionstore_native_race`); approval remains unavailable until the native billing contract exists.
4. Publish the locally qualified frontend checkpoint and refreshed workbook/matrix, with exact read-back and source/delivery manifest; keep PR draft.
5. Resolve auth/backend owner pairing while completing independent prospect/Objective/Files composition and exact contract revalidation.
6. Integrate approved native backend candidates in coordinated order; allocate/apply migrations only through the responsible owners and required authorization.
7. Run designated live flows and permission/privacy/expiry/failure/recovery tests, current production build, final full regression and representative Figma comparisons. Reconcile every audit row with evidence.
8. Deliver reviewable final PRs and isolated preview. Do not merge or cut over automatically.

SessionStore is separate: [meri-greenfield PR2](https://github.com/neo-capiro/meri-greenfield/pull/2),65d9c750…, has focused/native candidate evidence, but does not establish G1/W05 or fresh Fargate recovery acceptance. Portfolio takeover must not absorb a simultaneous Meri or all-Modules rebuild.

## Handover files

- `Capiro-3.1-Portfolio-Implementation.xlsx`: preserved baseline tabs plus current Implementation sheet.
- `portfolio-31-implementation-matrix.json` and `.csv`: all345 entries, original evidence, files/contracts/PRs/tests/blockers.
- `portfolio-31-frontend-checkpoint.md`: feature and run/configuration checkpoint.
- `portfolio-meri-handoff-current-20261011.json`: current owner/interface findings.
- `portfolio-billing-fence-discovery-20261011.json` and `portfolio-billing-pending-updates-20261011.json`: billing publication/dispatch and actual-invoice-consent findings.
- `evidence/portfolio-integrated-20261011/frontend-delivery-manifest.json`: historical published delivery7dbf8e1. It does not bind this new handover or the latest local source. `portfolio-handover-manifest-20261011.json` binds the current handover, workbook and matrix; a new published-code delivery manifest is still required after push.
