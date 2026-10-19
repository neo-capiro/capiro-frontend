# Portfolio continuation — 11 October 2026

## Current checkpoint and restart

**12 October coordination addendum:**
[the shared integration contract](../SHARED-INTEGRATION-CONTRACT-2026-10-12.md)
records the proposed common-shell owner, Portfolio-at-`/` and shared auth/client
context seams. Meri's active consolidation is draft frontend PR #4, freshly
read at `e141d68f8954ba6c76327bcbed94739d28e0a902`; PR #1 is retained history,
not an additional integration candidate. The user explicitly requested no new
credential or AWS actions while preparing this contract. Existing merge and
deployment holds remain effective; the contract does not assign ownership or
grant new authorization. Continue authorized Portfolio source/qualification.

This continuation supersedes the old host's restart instructions. The owner
explicitly waived `capiro-agent-ops` access, limited implementation to Portfolio,
confirmed `capiro-frontend` for frontend source and existing `capirov2` services
for Portfolio, and authorized creating missing Portfolio UI components in Figma
before implementing them. Changed code must have focused responsibility owners.

The current integrated source is `d4c613985b69bc80cd3af28ed2c48c29335c770d` on
`codex/portfolio-continuation-20261011`. It is **local and not yet published**.
This adds exact current-list Files arrival to the prior `75409a96` product
checkpoint. Its frozen slice passed 27 browser cases (16 new and 11 retained)
and 13 unchanged units; this is separate from the pending final combined gates.
The watchlist and alert-channel lanes remain under final review/integration.
The GitHub connector's branch creation returned 403, `Resource not accessible
by integration`, and an unauthenticated Git push could not obtain credentials.
The exact underlying installation/user/organization grant is not exposed.
Official GitHub and AWS CLIs are installed, with authentication pending. No AWS
API call, deployment, remote branch or PR is claimed. The older GitHub device
code expired and must not be reused.

1. Fetch the current frontend repository and the continuation branch once it is
   published. Compare the exact source and verification checkpoints before
   reusing evidence. Preserve other authors' work, especially open draft Meri
   consolidation PR #4 and its PR #1 ancestry. Read root `AGENTS.md`, `apps/web/AGENTS.md`,
   `docs/IMPLEMENTATION-STANDARDS.md` and `docs/ARCHITECTURE.md`.
2. Use **`apps/web`** as the sole active application. Portfolio domains are in
   `apps/web/src/features/portfolio`, the index is its `index` domain, and shared
   Portfolio foundations are in `apps/web/src/shared/portfolio`. Tests are in
   `apps/web/tests`; deployment files are in `apps/web/deployment/portfolio`.
3. Inspect current Figma child frames under
   `Zc2dEN5aLU47dVdsewDmiJ / 411:40601`. Existing designs govern the UI; the small
   new components below were authored there before coding. Read the current
   native contracts and record their revision. This checkpoint uses published
   `capirov2@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`; any draft contract is
   identified separately and must not be described as published behavior.
4. Verify 345 unique audit IDs: 337 open, seven pending packet exclusions,
   `CORE-018` excluded by the owner, and zero accepted complete. Original
   authority, packet rows, 12 earlier deltas and historical validation labels
   remain intact. Additive continuation evidence describes implementation,
   not acceptance. At this checkpoint it covers 85 rows in 19 overlapping groups.
5. Install the single root lock using Node 24/npm 11. Against fixed source, run
   root `npm run check`, `npm run build`, `npm run test:production` and the complete
   browser suite. Keep heavy builds separate from browser runs on this host.
   Preserve failures beside corrections and do not add overlapping cohort totals.
6. Keep new credential and AWS actions pending under the latest coordination
   hold. The contract records a verified-bundle handoff to an existing authorized
   publisher as the smallest recovery once publication is admitted. After the
   applicable hold is resolved, use authorized access for fresh identity, stack,
   ECS task/image, target-health, ECR scan, DNS and Clerk read-back. Tell the owner the concrete shipment or resource action
   before performing it. Preserve the isolated preview and narrow authorized
   source `/32`; keep shared backend deployment and existing production routing
   outside that change.
7. Complete approved signed-in acceptance in the intended test tenant. Fixture
   qualification cannot establish live authorization, native concurrency,
   provider behavior, payment, persistence or final row acceptance. Use the
   existing authorization for read-only acceptance; broader live mutations,
   provider sends or charges need their own concrete authorization.

## Integrated implementation

| Slice | Result and material limits | Source and evidence |
| --- | --- | --- |
| Shared application | One canonical Next application, shared header and public UI primitives, one active lock, scoped Portfolio providers/styles and runtime default-product redirect. The actual-production smoke covers the real Portfolio navigation link, same-document transitions and loaded setup wordmark visibility in both themes. Container HTTP probes have finite connection and total deadlines. | `ee39c2f`, `96ebea`, `0f73691`, `e7cdd3c`, `967ac17`; [source map](./CONSOLIDATION-SOURCE-MAP-20261011.json), [shared preview guidance](../SHARED-FRONTEND-PREVIEW-GUIDELINES-2026-10-11.md) |
| Objectives | Four-field readiness, guarded existing native mutation, full-page Figma intake/readiness rail and a global entry through the authorized-client picker. Strategy/Planner lifecycle remains a separate native dependency. | `911cd76`, `d3e90e4`; [intake report](./OBJECTIVE-INTAKE-CONTINUATION-2026-10-11.md) |
| Calendar and Relationships | Independent Planner start/due occurrences, successful-current-read feed presentation, scoped meeting availability, Figma committee cascader and captured Portfolio email rewrite context. | `911cd76`, `ac69724`; [P3 report](./P3-CALENDAR-RELATIONSHIPS-CONTINUATION-20261011.md), [Calendar report](./CALENDAR-CURRENT-READS-20261011.md) |
| Prospects and Files | Exact current native record/receipt checks, Figma prospect overview/stage/notes/history and previews/actions resolved from the latest accessible attachment. Prospect-specific Files/Workspace identity and paid conversion remain native dependencies. | `911cd76`; [P4 report](./P4-PROSPECT-FILES-CONTINUATION.md) |
| Quick log | Record a meeting opens current-client Calendar and asks for required start/end there, using the authored desktop/phone action. The navigation performs no write. | `6801fd4`; [handoff report](./QUICK-LOG-MEETING-HANDOFF-2026-10-11.md) |
| Tracker | Current board/detail reads and personal Intel preferences with the existing 11-field PUT and actual Clerk-user association. Native GET defaults do not prove client existence; the service exposes no CAS/version token. | `f0fb288`, `d4ca4fe`; [Tracker report](./P6-TRACKER-PREFERENCES-20261011.md) |
| Capabilities, registrations and opportunities | Current list/fit/feed presentation, captured writer/client/view, exact capability receipts, five-field administrator registration PUT with legacy-code retention, and independent opportunity/program error handling. | `916b65b`, `0beb51c`, `9fa236f`; [current-read report](./P6-CAPABILITY-OPPORTUNITY-CURRENT-READS.md) |
| Capability editor | Existing create/saved geometry, Profile/Documents tabs, badges/readiness controls and inline token fields. New Figma Details/footer variants preserve all eleven native fields; required Name becomes visible and focused if its section was collapsed. | `1a9fa55`, `f96ca45`; [presentation report](./CAPABILITY-PRESENTATION-CONTINUATION.md) |
| Profile CRUD | Current notes, team/options, facilities and selected details; focused controllers capture source/writer, preserve drafts and validate actual native effects. Facility uncertainty survives close/reopen in the session cache and requires explicit saved-state review. | `5e8a338`, `3fed90a`; [Profile report](./CORE-PROFILE-CURRENT-STATE-20261011.md) |
| Facility address actions | Current source/actor/receipt checks, stale-effect suppression, explicit GET review after uncertainty and truthful asynchronous geocode acknowledgement. Phone metrics fit. Reviewed-candidate selection remains conditional on the unpublished contract described below. | `3eeaeb7`; [action report](./CORE-FACILITY-ACTIONS-20261011.md) |
| Work | Exact Strategy-ID reads, independent current source states and unique current client-name association for legacy Workspace data. Figma error/Retry presentation and phone document cards retain visible canonical actions and current query feedback. | `7653b93`, `6ed2833`; [read report](./P7-WORK-CURRENT-READS-20261011.md), [presentation report](./P7-WORK-PRESENTATION-20261011.md) |
| Current index and activity | Successful current projections supply catalog counts/choices, activity rows/kinds/source-limit captions, Overview count and the frame client name. Failed reads preserve filter drafts and explicit retry without showing retained records or false empty states. | `666dd6d`; [projection report](./CURRENT-PROJECTIONS-CONTINUATION-20261011.md) |
| Capability documents and current file actions | Authored document rows/states reuse the source-filtered current Files collection. Upload binds native ticket and exact confirmation fields; fresh authorized list reads qualify download/navigation; reader-scoped selection and extraction suppress obsolete filenames, text and completion effects. Existing move/delete/access writers are unchanged. | `1c80792`; [Documents report](./CAPABILITY-DOCUMENTS-CONTINUATION.md) |
| Advocacy timeline, filters and outcome review | Actual native dated/undated evidence, local current-data search/status filters, and a separate update-only editor with human confirmation for a new final outcome. Current actor/source/view checks and explicit unknown-result review preserve the native void acknowledgement and scoped GET contract without claiming CAS. | `f4731d2`; [Advocacy report](./ADVOCACY-FILTERS-OUTCOMES-CONTINUATION.md) |
| Saved submissions | Capabilities composes the existing PastPerformance public entry with authored desktop/phone layout. Current client/history reads and a selected removal lifetime guard the unchanged native preflight/DELETE/receipt owner; uncertainty survives close/reopen within one QueryClient. | `75409a9`; [Saved submissions report](./CORE-128-SAVED-SUBMISSIONS-CONTINUATION-20261011.md) |

Feature operations, validation, cache/lifetime state and presentation have
separate cohesive owners. The coordinator reviewed exact oversized-function
fingerprints, retaining justified cohesive functions and leaving inherited
unreviewed findings visible. At `75409a9`, architecture reports 144 size signals:
116 exact reviews, 28 unchanged inherited findings and zero blocking findings.
An inherited finding is not a blanket architecture approval.

### Supported Tracker follow-on in progress

CAP-05/06/07, OBJ-02/03/06 and CORE-128 are now integrated at the exact commits
above. The final phase mapping identified additional supported BILL-11/12 work:
the shared Watchlist Configure view still needs current-read/authority/lifetime
corrections, and the published Core personal preference and Core/Intel phone
verification/test-alert routes need their corresponding UI. Earlier bounded
Intel preference work deliberately did not implement those flows; that earlier
assignment is not an owner exclusion from the full Portfolio plan.

Two focused owners are implementing these follow-ons against the configured
native backend, preserving Core database-user/no-echo receipts and Intel
Clerk-user/explicit-owner receipts. Shared targeting and personal channel actions
have separate responsibilities. Missing controls are authored in Figma before
source, and provider operations are qualified only with synthetic responses.
No actual verification SMS, email, test alert or delivery acceptance is claimed.

## Verification and chronology

The newest integrated source has **not yet passed the full combined gate**.
Each focused result below belongs to its exact frozen source and report. Results
from overlapping cohorts must not be combined into an independent pass total.

| Evidence | Actual result and interpretation |
| --- | --- |
| Root check at `0beb51c` | Passed in 68.95 seconds: 828 Portfolio unit cases/55 files, 32 foundation cases, 21 transport cases, types, package integrity, lint (zero errors; 11 image advisories), format and architecture. Source was unchanged during the run. |
| Root build at `0beb51c` | Passed in 33.24 seconds; actual Next standalone output. Source was unchanged. |
| Full browser at `0beb51c` | 603 passed, 3 failed, zero skipped/flaky, 1,288.30 seconds. One browser-context setup timeout occurred before the test body; two tests exposed timing/aggregation weaknesses described below. This is not a full pass. |
| Root follow-up at `3e88f1d` | All 33 selected cases passed after deterministic Calendar response gating and splitting the 12-screen visual test into individual route cases. Original interaction, request and visual assertions remain. No timeout was increased. |
| Current projections at `666dd6d` | All five new cases reproduced their intended baseline failures. The fixed 15/15 browser cohort passed with ten unchanged existing index/activity cases; types, lint, format and four exact cohesion reviews passed. A type-only nonempty fixture assertion was corrected with byte-identical emitted JavaScript. |
| Profile CRUD frozen slice | 55/55 units and 33/33 browser cases passed. Exact preimages and final source hashes were checked before integration as `3fed90a`. |
| Facility address action frozen slice | 79/79 units (24 new plus 55 preserved) and final 19/19 browser cases passed. The actual baseline had seven failures and one definite-refusal pass; the first fixed 18/19 run found a real phone overflow, corrected before the final run. |
| Work frozen slices | Current-read qualification: 18/18 browser cases and 11 selected units. Presentation qualification: eight intended baseline failures, first fixed 25/26, then 26/26 after fixing pending Retry feedback. The earlier evidence is unchanged and these cohorts overlap. |
| Capability editor frozen slice | Final seven focused presentation cases passed after correcting opener focus and hidden required-field validation. Earlier 38/41 and 15/16 cohorts retain their failures; the 21 writer unit cases also passed. These results are not summed. |
| Documents frozen slice | Final 48/48 dedicated and 38/38 preserved compatibility browser cases passed against the same 14 product hashes; 60/60 selected units, type/lint/format and seven exact cohesion reviews passed. Earlier baseline/candidate failures remain in the report and evidence. These cohorts overlap the full suite. |
| Advocacy frozen slice | 44/44 units passed. The complete candidate02 browser cohort was 43/45; two fixture sequencing failures were corrected without weakening the assertions, and the separate affected candidate03 cohort passed 5/5. Root's two final dark-icon cases passed at `75409a9`, with actual loaded-image contrast/geometry and both inspected captures. No single combined 47-case run is claimed yet. |
| Saved submissions frozen slice | 34/34 units passed. The exact original baseline produced 16 expected failures. The first fixed cohort passed 23/26; corrected relative-count assertions reproduced three original-source failures and stronger visual assertions reproduced two prebrowser failures. Final affected cases passed 5/5. All ten original browser and sixteen original unit assertions remain byte-identical. |
| Actual standalone at `0beb51c` | Passed anonymous/setup routes, fail-closed unconfigured proxy, product redirect and same-document light/dark desktop/phone style transitions. Later screenshot review found a dark wordmark contrast gap that the new committed smoke and scoped CSS now cover. The new smoke still needs execution against the next build. |

The original Calendar pending case used a 1,200 ms fixture delay that could expire
while taking its screenshot. Its replacement holds the response until the test
explicitly releases it and preserves every existing assertion. The aggregate
visual test shared one 30-second budget across 12 screens; individual route tests
now preserve the same 36 checks/captures. The separate setup timeout coincided
with a heavy build and did not reach feature behavior. Final build and browser
runs are sequenced to avoid that resource contention.

Raw source hashes, receipts, logs, failed traces and screenshots are retained under
`outputs/evidence/portfolio-shared-integration-20261011/` and the per-slice evidence
paths in the reports. Portable final receipts and representative captures are
being assembled under the documentation tree after the last source integration.
The local browser is Chromium 149.0.7827.0 from the verified installed runtime;
Playwright 1.61.1 expects Chromium 149.0.7827.55. The official download returned
HTML on this host. The CodeBuild pinned-browser gate remains separate.

## Current Figma references

| UI | Existing frames and authored component variants |
| --- | --- |
| Objective intake | Filled `411:60728`, blank `411:64465`, client picker `411:62481` |
| Global Objective entry | Authored desktop `973:186855`, phone `973:186879` |
| Quick log Calendar action | Authored desktop `985:187911`, phone `985:187921` |
| Personal Tracker preferences | Authored desktop `971:187129`, phone `975:187289` |
| Capability editor | Existing new `411:55155`, profile `411:55341`, documents `411:55548`; authored Details/footer review `999:51328`, sets `999:51300` and `999:51327` |
| Capability document states | Existing `411:55548`, upload `411:55667`; authored states `1011:51339`, review wrapper `1011:51353` |
| Advocacy | Existing timeline `411:60560`, card `415:80045`, outcome editor `411:59639` and confirmation `411:59659`; authored controls wrapper `1018:187915`, desktop `1019:187976`, phone `1019:188028` |
| Saved submissions | Existing Capabilities/removal `411:54982`, `411:58348`, `411:58549`; authored wrapper `1017:187915`, desktop `1019:187928`, phone `1019:187952` |
| Registrations | Existing `411:55825` |
| Profile | Existing overview `411:51801`, facilities/detail `411:58269` and `411:58764`, team/notes reference `411:47010` |
| Work | Existing `411:52106`, `411:52437`, `411:86349` |
| Committee cascader | Root `570:124980`, House `570:125014`, search `570:125218` |

The linked reports include exact Figma references and screenshot comparisons.
Authored components remain editable Figma controls. Screenshots are evidence;
code uses canonical UI primitives, theme tokens and exact existing assets. Full
responsive and signed-in visual acceptance remains open.

## Remaining native and live dependencies

The exact row criteria remain in the canonical ledger. Missing native contracts
include Objective Strategy/Planner activation and lineage; cycles/dependencies/
decisions and bound Files/Calendar destinations; Quick log commitment/task
atomicity and ordered client owners; enrichment worker activation; editable
cross-application handoffs; prospect registration/logo/contact and file/draft
identity; immutable proposals, export/send and reply-aware follow-up; versioned
billing quote/consent/settlement, paid capacity, conversion and recovery;
service-defined metrics; complete authoritative public Calendar dates; and
outbound sender/ACL/replay policy. Per-row contract reviews identify the service
owner and precise missing behavior. Source-present but unaccepted workflows must
remain distinguishable from those dependencies.

Facility reviewed-candidate selection references **open, draft, unmerged**
`capirov2` PR #2373 at `6e5774a14c73ea04f0a77650a5bbd33173bcc9b3`.
Its actual opaque revision and candidate index are required; missing revision
or unsupported responses never fall back to an unchecked write. Existing
published geocode and district resolution routes preserve their contracts.
Browser abort does not prove provider cancellation, and the session Query cache
does not provide durable or cross-device recovery.

All **337 in-scope rows remain open**, alongside seven packet exclusions and the
one owner CSV exclusion. At `75409a9`, this continuation adds source evidence to
85 rows in 19 groups without changing acceptance. GitHub publication, current
preview read-back, deployment and signed-in/native service acceptance remain
pending.

## Earlier session outline and consolidation history

The sections below retain the initial implementation outline and the earlier
consolidation checkpoint. Their counts and future-tense statements are historical;
the current checkpoint and remaining work above take precedence.

## Scope and authority

The owner instructed this session to continue independently without requiring
`capiro-agent-ops`, implement **Portfolio only**, use the existing services in
`neo-capiro/capirov2`, and use the current Figma Portfolio page
`Zc2dEN5aLU47dVdsewDmiJ / 411:40601` for UI. New or changed code must remain
organized by responsibility. AWS shipment or resource creation is a separate
owner-visible step. No Modules or Meri feature implementation belongs to this
continuation.

Source base: `capiro-frontend@02c02d95bdf3949662b9123f425271c6491ffdab`.
Read-only backend reference: `capirov2@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`.
The public Meri backend contracts and existing Meri feature are preserved.
The open Meri fixture PR #1 is a separate author's work.

The attached audit workbook has SHA-256
`b3f03493995bc2575b965cdb77f91f9e581c0adb6a7908480bdf9f5ea80d5c28`.
Read-only extraction verified six sheets, 7,613 populated cells, six formulas,
and all 345 handover audit IDs. The workbook's API-exists labels are service
discovery evidence, not frontend acceptance. The original workbook is unchanged.

## Implementation outline

- Portfolio presentation stays in cohesive domain folders for the index,
  client profile, Objectives, Calendar, Relationships, Prospects, Files and
  retained client surfaces. Routes only compose those areas.
- Existing `capirov2` service adapters and schemas remain the wire boundary.
  Authentication and authoritative tenant/client/actor checks remain with
  Clerk and backend services; UI scope checks reject stale or mismatched
  responses but never grant backend authority.
- Readiness uses exactly outcome, government problem, ask type and minimum win.
  Calendar task occurrences preserve existing Planner schedule and due-date
  semantics. Prospect identity is separate from a legacy Client-PROSPECT ID.
- Consolidate the transferred Portfolio into the canonical frontend application
  only after the disjoint feature changes checkpoint. Preserve every existing
  test assertion and source asset; use a single active workspace lock and build
  entry. Do not activate a new Meri/Modules integration to make navigation appear
  complete.
- Reuse canonical shared UI primitives through explicit public exports.
  A Portfolio-specific wrapper may add its form/drawer semantics; it must not
  create another independent primitive implementation.
- No new metric definitions, billing arithmetic, provider sends or fictional
  server contract is introduced to satisfy a mock. Missing native behavior stays
  tied to a precise existing service or pending contract dependency.

## Parallel ownership

| Lane | Owned feature changes |
| --- | --- |
| Objectives | Four-field readiness, response validation, mutation lifetime and stale actor handling |
| Calendar / Relationships | Existing Planner date composition and the Figma committee hierarchy selector |
| Prospects / Files | Existing record scope checks, mutation receipts and Figma prospect stage presentation |
| Coordinator | Shared Portfolio integration, runtime/build ownership, architecture review, ledger and independent verification |

The coordinator alone owns dependency/lock changes and commits. Agents use
disjoint paths and release the browser test port before another lane runs.
No recursive worker delegation is used.

## Verification and acceptance

Read the installed Next 16.4.0 route/layout/output guidance before integration.
Run focused units and browser cases for each changed behavior, then the required
integrated type, lint, format, architecture, unit, browser and build gates.
Review changed first-party files over 400 nonblank lines and functions over 80
nonblank lines for cohesive responsibility; do not split merely to reduce a
count, and do not accept unrelated behavior in a shared container.

Figma context and screenshot for the affected individual frames control visual
review. The full Portfolio page cannot be rendered by the context service in
this session, so use its exact indexed child frames. Temporary Figma asset URLs
must never enter production source. Validate downloaded bytes and native geometry
before using an asset.

The 337 in-scope rows remain open until their actual acceptance conditions are
verified. Local component tests do not establish signed-in preview, live service,
payment/provider, deployment, or full P7 acceptance.

## Shared-application checkpoint

The three disjoint feature lanes were checkpointed in `911cd76` before the move.
The canonical app now owns Portfolio routes, domain modules, shared foundations,
tests and exact assets. The source map accounts for 710 original files: 703 moved
and seven superseded configurations or entrypoints. The shared root lock and
build replace the separate Portfolio install. Existing Meri feature source and
immutable public package bytes remain unchanged.

The shared HeaderFrame owns common header geometry. Portfolio owns its provider,
session cache, navigation and scoped styles; the canonical Dialog primitives are
reused through the public UI package. Independent review found and corrected a
collision between the primitive's literal `grid` class and the Portfolio page
grid utility. The utility now excludes dialog content without increasing the
specificity of page-grid rules, preserving compact custom drawer layouts.

Current repository checks passed: 778 Portfolio unit cases, 32 foundation tests,
21 transport cases, workspace types, lint (zero errors; 11 static-image warnings),
format and architecture. The architecture scan covers 425 modules and 22 routes;
it reports 93 exact reviews and 38 inherited/unreviewed size findings, with zero
new or changed findings awaiting review. Detailed responsibility assessments are
in the P3/P4 review documents and `scripts/architecture`.

The first integrated 491-case browser run was intentionally stopped after the
additional custom-drawer style interaction was identified. Its partial log is
preserved; it is not a completed regression result. A new final full run follows
the style correction and the next unblocked frontend work. Production build,
container shipment and signed-in acceptance are separate outstanding gates.

The next unblocked presentation work is the full-page Objective intake from
Figma `411:60726` and `411:60728`, retaining the existing readiness component and
mutation lifecycle. The drawer had been retained for the coordinated move;
native Objective candidate activation is not a prerequisite for this layout
work, and the UI work does not establish native activation.
