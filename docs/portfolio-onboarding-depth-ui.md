# Portfolio onboarding frontend implementation and validation

## Evidence correction — 2026-11-04

The implementation and validation statements below are retained historical
author claims. They are not newly verified evidence for PR 564 at
`e1212f47f9ed33be3cd1071c75be6e8543ca02c0`. The reported 219 tests, build,
browser checks and 72 architecture record changes do not have an exact-source
independent acceptance binding in the transferred evidence. Their presence in
the repository must not be read as a new reviewer attestation.

Reviewer 003 actually inspected that head in turn
`01a1a816-0b1f-7501-b710-c7fa139cfbde` and returned three P2 source findings,
`PR564-SRC-01` through `PR564-SRC-03`, with verdict
`CHANGES_REQUIRED_SOURCE_ONLY`. The independent receipt is
`PR564-E1212F47-INDEPENDENT-SOURCE-REVIEW-20261104.json`, SHA256
`31b45325cfccb7c7c102dbb17529f6ff88afcf48e6c223681d324829ef0d953c`.
Its focused source coverage is distinct from runtime or deployment acceptance.

The present correction retires changed capability dialog selections, adds an
explicit current-profile review after a prospect profile 409, and releases a
refused fact attempt only after a successful current snapshot read. Unknown
503 outcomes retain their original commands. The mounted regression fixture
uses the existing local Playwright/Vite facility and synthetic intercepted
requests. Source preparation does not claim that those browser checks ran.
Independent review of this correction and actual mounted results must be bound
to its sealed commit/tree in the subsequent QA receipts. No historical review
labels or architecture fingerprints are restamped as accepted here.

## Historical implementation account

The frontend now connects client and prospect entry, sourced research, manual
facts, capabilities and office relationships through the existing Portfolio
owners. A saved profile opens into a durable task ledger and review workflow.
Sources remain attached to approved facts; conflicts, unavailable sources and
missing evidence remain visible.

This records the implementation represented by integration checkpoint `d26182ff`
on 2026-11-04. Final integration checks and live acceptance are pending below.
The implementation targets are `capiro-frontend` and its `capiro-backend`
companion. No `capirov2` implementation is required or used.

## Handoff phase coverage

The [approved onboarding plan](plans/portfolio-onboarding.md) resolves the
prototype's proposed folders and stores against the existing product owners.
“Implemented” below describes code and contract coverage, not completed live
acceptance for every handoff scenario.

| Phase                              | Implemented frontend behavior                                                                                                                                                                                                                                | Canonical owner / boundary                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Foundations                    | Typed client/prospect subjects, sourced facts, conflicts, completeness, versioned review and durable command recovery.                                                                                                                                       | `profile-build/`; existing session/Core authorization and run/task/finding pipeline.                                                   |
| 1 — Entry and identity             | Shared Add profile entry, website/document/manual paths, evidenced company selection, existing-profile handling and admission feedback.                                                                                                                      | `index/CreateProfileDialog.tsx`, `client-intake/`, shared identity APIs; Core rechecks capacity and creation.                          |
| 2 — Research and locations         | Inline task ledger, independently saved findings, review/retry/recovery, source visibility and conflict choices. Seven location presentation states distinguish geography from site confirmation.                                                            | `profile-build/`, existing `client-profile/` facilities and geocoding.                                                                 |
| 3 — Other entry paths              | Six manual steps, reference-backed code selection, websites and research per imported LDA client, shared prospect facts/completeness and existing reviewed conversion.                                                                                       | `client-intake/`, `intake/registrant/`, `prospects/`; no hidden Client row for prospects.                                              |
| 4 — Capability review              | Sourced named capability proposals; edit, approve, reject/restore, merge and split. Approved business-unit scope reaches durable research. Show more pages stored results in batches of up to 12.                                                            | Existing `capabilities/`; shared `ProfileBuildPanel`, explicit discovery/review endpoints.                                             |
| 5 — Detail and tracking            | Lifecycle, existing documents/fit, sourced alignment and individually reviewed PE/program lines. Eligible tags/codes can be selected for approval; only approved watch terms enter active tracking. Pending, dismissed and restored matches remain distinct. | Existing capability detail and tracking refresh. NAICS/PSC are classifications; existing client-wide tracking remains at client scope. |
| 6 — Office relationships           | Client-to-office parents with optional capability-support children; owner, status, last contact, next step and support history. Relationship graph, geographic coverage, filters and evidence gaps.                                                          | Existing `ClientTarget` identities and facility map; exact target ID for tier/removal writes.                                          |
| 7 — Statements and recommendations | Dated official statement evidence, sourced recommendation review, fit/entry-point/why-not presentation and explicit approval. Office labels match directory, member and term.                                                                                | Domain recommendation endpoints; Core validates source access and creates associations atomically.                                     |
| 8 — Case and member view           | Twelve sourced case/impact fields with explicit gaps. Member facts bind to capability, directory and term. Replacements explicitly select the prior approved fact and preserve its history.                                                                  | Capability case proposals and existing office detail; member-specific case facts are unavailable for staff profiles.                   |
| 9 — Primes and sectors             | Reviewed annual-report business units scope research. Defense PE, health agency/account/program and USDA/Farm Bill anchors use typed data and maturity chains.                                                                                               | Shared capability workflow. Sector references remain Draft pending the missing source/practitioner packets.                            |

## Design and composition

Design source: [Figma 3.4 — 03.20 Portfolio onboarding](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3173-85786),
17 component sets and 57 state variants. The plan contains the complete node
mapping. Location, capability, alignment, tracking, office, recommendation, case
and business-unit design context and screenshots were inspected, including nodes
`3173:86147`, `3173:86410`, `3173:86453`, `3173:86496`, `3173:86537`,
`3173:86580`, `3173:86605` and `3173:86640`.

Composition reuses existing Geist typography, buttons, fields, surfaces,
capability fit/documents, target drawers and facility maps. Existing React Flow
renders relationship topology. The new component families require no static
image assets. Prototype company names/counts are fixture scenarios, never
hardcoded production facts or simulated research progress.

The shared Add profile entry supports manual, public-source, website-only,
private-document-first and LDA import paths for clients and prospects. Identity
candidates retain their actual company quote and separate sourced aliases or
parent/subsidiary claims. Confirmation revalidates the source before the existing
create owner runs. A failed follow-up resumes the saved profile/file/request.

Pre-create documents use the existing Files upload and attachment IDs. They are
private by default. The unchecked sharing option controls whether the same
file is shared and eligible for profile research after it is linked. The UI
checks current file access/readiness and hides unavailable source previews.

Code suggestions require individual sourced acceptance. Exact official facts
are visibly automatic, with “Not right” preserving rejection memory and later
person edits. Office fit recommendations and support history start with “No
support stance recorded”; geography and committee relevance do not imply an
office's interest. The existing durable research pipeline owns automatic
alignment, annual-report units, office-source refresh and all retry recovery.

## Source and identity behavior

All new requests use the existing API/session boundary and typed response
validation. Core remains authoritative for tenant/client access, source access,
versions and transactions. Browser research invokes the shared durable pipeline;
there is no frontend model loop or arbitrary source-text inference endpoint.

Capability and case review use server versions. PE/program lines require
individual approval. The bulk-approval policy excludes them and requires a
supported eligible proposal with a score above 85; the UI identifies scores as
ranking signals rather than calibrated probabilities. Approval refreshes the
existing fit/tracking projections, while source failures remain visible.

Failed or denied source reads hide cached evidence. Inaccessible historical
support evidence displays an unavailable-source marker without removing the
currently authorized support. Facility source redaction preserves canonical
site/impact values and explicitly identifies withdrawn evidence. Unrelated
facility edits omit unchanged evidence/impact; new figures require new evidence.
The backend companion preserves inaccessible prior site evidence when new
visible evidence is added.

Address changes omit unchanged derived district overrides and old verified
points, allowing canonical invalidation to run. A deliberately reverified point
can be supplied. A physical street plus ZIP or city/state is eligible; ZIP/city
alone is not. US territories stay eligible. Candidate selection requires the
serving boundary metadata; stale or unavailable resolutions do not enable old
candidate selection. Previous official boundary snapshots remain visible.

## Replaced code and retained behavior

Deletion evidence is relative to frontend implementation base
`e9a6d95be0eda3f490963da5e9d375161b1b5b61` and the tracked integration tree.

| Replaced identifier / owner                                                                | Result                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ClientEnrichmentDialog`, `EnrichmentToolbar`, old enrichment `public.ts`                  | Standalone modal and exports deleted; active research/review/recovery moved from `client-profile/enrichment/` to `profile-build/`.                                               |
| `MeriProfileStarterDialog`                                                                 | Obsolete standalone starter deleted; the unified Add profile flow owns entry.                                                                                                    |
| `ClientMeriActions` enrichment action/state                                                | Fill with Meri entry and modal handling removed; independent Ask Meri and notetaker behavior retained.                                                                           |
| `ProspectCompleteness`                                                                     | Replaced by common subject-aware `ProfileCompleteness`.                                                                                                                          |
| `useTargetRecommendations`, `useRefreshTargetRecommendations`, old `recommendationsSchema` | Old summary/add transport removed; sourced statement/recommendation review uses the explicit domain endpoints.                                                                   |
| Old feature labels/routes                                                                  | Tracked Portfolio runtime searches for `Fill with Meri`, `fill-with-meri`, `ClientEnrichmentDialog` and `MeriProfileStarterDialog` return no matches at the recorded checkpoint. |

Existing `client-enrichment*.test/spec` filenames intentionally retain regression
coverage for the moved pipeline: source selection, no-write preflight failures,
exact request recovery, rejection memory, upload boundaries and access loss.
They import the shared profile-build owner. Historical plan/evidence references
are not active entry points. Perform the final removal search in the clean
verification checkout; leftover untracked files are not deletion evidence.

## Verified scoped evidence

These are completed scoped runs on the owning changes, not a claim that the
final integrated branch passed all gates.

| Check                                      | Observed result / scope                                                                                                                                                                                                                                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `portfolio-depth-contracts.test.ts`        | 15 tests passed after scoped case replacement and redacted support-history handling. Covers sources/versions, approval policy, sector typing, member/term isolation, tracking IDs and relationship gaps.                                                                                                              |
| `portfolio-location-resolution.test.ts`    | 22 tests passed after facility source-redaction handling. Covers resolution states, unconfirmed occupancy, territories, street/ZIP eligibility, stale point/district invalidation, evidence requirements and unrelated edits with restricted sources.                                                                 |
| Focused facility/capability regression run | Five suites / 80 tests passed at the earlier depth checkpoint, including facility map/action writers and capability-fit coverage. Subsequent affected tests were rerun as noted above.                                                                                                                                |
| Scoped ESLint and whitespace               | Passed for the final owned location/source changes and adjusted research browser spec; `git diff --check` passed before the commits.                                                                                                                                                                                  |
| Dedicated depth browser scenarios          | Four cases passed at the preceding integration checkpoint: approval/tracking/dismissal/restore, persistent rejection, narrow-screen location states and unavailable office evidence. The later cached-sector-source test requires the final integrated rerun.                                                         |
| Research browser triage                    | The interrupted integration run reported 16 passed, 5 failed and 33 not run. Three tests were updated to assert the actual saved task state and accepted findings while retaining exact request/replay checks. Two missing permission/upload explanations were restored in production UI. Rerun results belong below. |
| Architecture review                        | Independent review records cover the affected composed functions and source-visibility followups. Root owns the final fingerprint/architecture gate and baseline comparison.                                                                                                                                          |

## Final integration results

Production source checkpoint: `32573b01` (subsequent changes update only this
record and exact independent-review fingerprints). Node 24.22.1, npm 11.9.0,
Next.js 16.4.1; browser checks used the available Chromium 153 executable.

| Gate | Result |
| --- | --- |
| Production build and TypeScript | **Passed**: `NODE_OPTIONS=--max-old-space-size=6144 npm run build` from the clean verification checkout. Compiled, completed TypeScript, generated all 296 pages and finalized standalone output. |
| Affected unit suite | **23 suites / 219 tests passed**. Covers research, exact retries, manual intake, facts, identity and private uploads, prospect sections, registration, location resolution and scoped discovery. Last spacing-only change separately passed 11 identity tests. |
| Scoped ESLint | **0 errors**, one pre-existing `next/no-img-element` warning in `ProspectDetail`. Final spacing/test follow-up also passed its scoped lint. |
| Architecture | 21 errors identical to the recorded baseline, with no new boundary error. 205 blocking findings versus 224 on the baseline; all changed composed functions have exact independent reviews. Baseline violations remain visible. |
| Browser behavior | Final 19-case identity/discovery/registration/conversion set passed as 18 plus the corrected required-label prospect case on rerun. Research/review/recovery's 22 cases passed. Final two document cases passed on phone dark and desktop, with explicit sharing, exact-file retry, quote selection, horizontal-overflow and text-spacing assertions. Earlier 95-case run recorded 88 passes and seven conversion-fixture failures, all seven subsequently passed after fixture corrections; this is not presented as one fresh 95-case run. |
| Visual inspection | Rendered company/code review and document identity chooser inspected on desktop and phone dark. Company name, confirmation status and source labels occupy separate readable rows. Figma 3.4 has 17 added families / 57 variants at the linked section. |
| Full-suite baseline comparison | Earlier full candidate/base runs had the same 101 failing test identities across 23 files and two errors, with zero newly failing identities at that checkpoint. Later implementation changes passed their scoped tests above; the full suite is not claimed green. Root script checks also retain 10 inherited fixture/vendor failures. |
| Backend companion | API production build and 102 suites / 1,309 tests passed. [Backend PR #472](https://github.com/neo-capiro/capiro-backend/pull/472) documents SQL, SDK, actor/source and geographic checks. |
| Release qualification | Native PostgreSQL concurrency, live IAM/SDK/provider runs, container scans and deployed acceptance were not run. No merge, migration against shared data or deployment was performed. |

The first packaging attempt reached TypeScript/page generation but hit a stale
standalone-output cleanup error. The clean retry exposed a newly added
screenshot fixture shadowing the browser's `document`; that test was corrected,
and the final production build above passed without weakening checks.

## Remaining limits

The healthcare drafts and practitioner interview packets referenced by the
handoff were absent. Typed sector anchors are implemented but remain Draft;
this work does not claim practitioner-validated funding rules.

State legislative directory rows do not provide verified serving-term identity
for every resolved boundary. Such rows are shown only as current-role context,
with the office term explicitly unverified; the UI does not present them as
confirmed representatives. Legacy unknown office terms require dated official
evidence before confirmation. A known historical term cannot be relabeled as a
new term.

Recorded synthetic fixtures prove interface behavior, not current facts about
the handoff companies or live provider availability. Live SDK/worker execution, native migration/concurrency qualification, deployed
behavior and the named-company acceptance scenarios remain release gates.
