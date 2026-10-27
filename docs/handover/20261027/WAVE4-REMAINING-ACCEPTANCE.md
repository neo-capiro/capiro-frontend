# Wave 4 remaining acceptance — source reconciliation

27 October 2026. **Author handoff, not independent review or acceptance.** Hermes Agent app/CLI owns reviews and acceptance; root owns integration and Release owns target operations. This document reconciles later work with older reports; it does not rewrite their historical verdicts.

Neo selected the recovered **70 rows (28 RP/DI/MX/OP requirements, 18 screens, 24 acceptance scenarios), full section 16 and MO-05** as the final scope. Missing original sections 1–15/F01–F42/V4-01–V4-15 definitions are provenance limitations, not new blockers or invented obligations. Q07 semantic work remains skipped. The source is `C:/dev/w4-final-handoff-20261027/docs/handover/20261027/RESEARCH-PORTFOLIO-REQUIREMENTS.md`; the later user decision is recorded in root's `work/fable-closeout-20261027/ROOT-CLOSEOUT-DECISIONS.md`.

## Source and release position

| Source | Established evidence | Still separate |
| --- | --- | --- |
| Frontend `1281d906986cc2f6efe79622fc907656c8d3478d` | Hermes source/architecture follow-on PASS: native Research/Coverage, comparisons, qualified evidence inspector, ledger/review evidence, import retry, Explorer/PE URL state and explicit exports. | Authenticated visual/live acceptance on the final deployed cohort. |
| Frontend `52d2f3e0`, `4397c3abfd3cd367eccc36eb50fd44245ddf7ac9`, `4482db9f` | Authored bulk reviews, typed member discovery/resolution/bulk receipts, same-scope reload preservation and shared URL review lanes. Focused developer checks pass. | Finite Hermes source/architecture addenda and final integration. A prior review of `1281` does not cover these later bytes. |
| S10 `ff5a201929440937ff9b3949d134eca9fc83006c` | User chose existing owners: Budget, per-PE Congressional, selected-client Monitored, and portfolio Actions reusing native Reviews. Authored and frozen; three unit/five mounted cases, scoped types/lint/format pass. | Finite source review, root-owned mounting/registry integration and deployed behavior. It is no longer an undefined product mapping or an unbuilt screen. |
| Core `f7b3c44011196c4228a4a1dc45ae5083c48aadc9` | Main and finite addendum Hermes source PASS, including canonical qualified evidence admission and compatible Unicode draft reads. Existing SQL correction is included. | Final merge/deployment and current tenant/client/grant/runtime evidence. |
| Core watch `d9a39916f652c8b6d90642f488a0e323b6d34272` | Hermes PASS for current client wall/archive authorization in the existing owner. | Integrate/deploy before exposing the new Monitored read. |
| Release ingress `3c434a57ad1e8e933979c5f62b82fc343a7a9569` | Hermes PASS for narrow JSON ingress corrections; author checks cover large Unicode draft and base64 import bodies. | Later edge allowlist WIP is expressly excluded from that PASS and still needs its own reviewed integration. |
| Meri PR296 merge `337e54b3ad92bd80eb65eefc72b4245c4f9ff50d` | Merged; reviewed head `9959d4cf…`, published material producer `2f425244c…` recorded in `MERGED-PINS.json`. | Deployment, matching installed material/catalog, existing RP tool flag, and runtime acceptance. Merged does not mean serving. |

Release must produce one exact serving cohort/route/material/flag receipt before Hermes resumes live work. Enable the existing `RESEARCH_PORTFOLIO_MERI_TOOLS_ENABLED` setting with the reviewed catalog/material; do not invent a new flag. Read the actual migration ledger and preserve already completed migrations—do not replay them merely to reconstruct evidence. External watch delivery remains a separate configured-channel/activation dependency. No new migration, ingestion, provider activation or test campaign is authorized by this document.

## All 28 module requirements, reconciled to current owners

Paths below are existing Core services or current frontend components, not proposals for parallel owners. “Remaining” is not a fresh bug verdict unless a concrete contract gap is stated.

| Rows | Authored/current owner | Remaining qualification or concrete limit |
| --- | --- | --- |
| RP-01, RP-05 | `ResearchPortfoliosService`; native list/settings/client links; filtered event history and current grants/walls. | Target owner/editor/viewer/revoked/raw-role isolation; client-fit/cache/output revocation and open-form conflicts. |
| RP-02 | Canonical target resolver + `ResearchMembers`, `MemberDiscovery`, `MemberDecision`; add/resolve and atomic decisions. | Real concurrent/stable unresolved-ID and large-collection proof. Detail members remain the existing unpaginated contract; typed search is bounded, awards page 20. |
| RP-03, RP-04 | `ResearchPortfolioRulesService`, `ResearchRules`, versioned rule/template/taxonomy owners. | Populated outage/concurrency/manual-precedence and old-template reproduction; qualified vocabulary and editor accessibility. Persisted previews remain effects. |
| RP-06, RP-07 | Review/annual-continuity services; native four lanes, notes/assignment, supporting/opposing evidence, bulk outcomes and `reviewLane` URL state. | Real-cycle rename/split/merge/selective reopen; current visibility and mixed conflict outcomes on target data. |
| RP-08 | Import service and `ResearchImports`/`ImportWorksheet`/operations; retained action keys. | Actual crash/reconcile/partial apply/all-row receipts and compensation after later edits; final large-body ingress/edge verification. |
| RP-09 | Changes/subscription/per-user delivery owners; native Changes/Subscriptions. | Two-actor state, baseline restore/no flood and configured external-channel delivery. In-app/source checks are not external delivery proof. |
| RP-10 | Analytics/contribution ledger, snapshots/output services; `ResearchAnalytics`, `ResearchContributions`, outputs/filing/download. | Qualified basis/dedup equality, real source corrections, object bytes/scan/index and pre/during/post revocation. |
| DI-01, DI-02, DI-03 | Defense dossiers/milestones/funding matrix, existing PE five-tab readers; native Dossiers & funding. | Real narrative/schedule precision/history, edition/FYDP/cell evidence. Arbitrary historical `knownAt` reconstruction remains unsupported; captured snapshots own reproducibility. |
| DI-04, DI-08 | Defense office/relationship readers and native Offices & relationships. | Dated authority/transition/unresolved negatives and access-filtered counts; relationships do not confer award/allocation authority. |
| DI-05 | Acquisition revision/action/coverage and federal-market owners; native Acquisitions. | Qualified action identity, measures, retained text and real acquisition journey. |
| DI-06, DI-07 | Qualified context/reference/evidence resolver and native `ResearchEvidence` inspector. | Real family/locator proof. **Public DTO gap:** structured table/row/cell coordinates, prior/next evidence pair and correction-impact graph are not exposed. Page/section/occurrence/span/hash displays do not complete those obligations. |
| DI-09 | Existing exact/alias/capability search, typed discovery and URL-owned Explorer. | Adjudicated exact-search negatives and real full-result export semantics. Q07 semantic/index evaluation and its precision/recall claims stay skipped. |
| DI-10 | `DefenseSavedComparisonsService`, compare reader, native comparison workbench. | Real independent per-side evidence, immutable-version replay, selected Add/bookmark and empty/partial acceptance. No invented history-list endpoint. |
| DI-11 | `productCoverage()` and native Research Coverage; governed lifecycle/source owners remain separate. | Physical/logical denominator and completeness attestations; actual governed recheck/publication. **No customer recheck command is published:** Refresh only rereads coverage. |
| MX-01 | Current Core RP scope/registry/domain adapters and Meri bounded contracts; see all 17 operations below. | Enabled runtime discovery, current scope/alias parity and reauthorization. Research context must remain distinct from all-clients `portfolio`. |
| MX-02 | Existing output/client-file writer plus institutional brief/meeting ClioArtifact owner; native exact draft Open/version save. | Actual lineage/bytes/edit/open/filing and unknown-result behavior. No fabricated Workspace draft/version identity. |
| MX-03 | Versioned native `ResearchTour` and retained correction/event owners. | Target keyboard/breakpoint/tour-state behavior; correction-impact contract gap above remains explicit. |
| OP-01 | Existing mounted API/web/Meri runtime owners and fixed gateway. | Reviewed final images, authenticated routes, edge operations, material/catalog/flags and exact cohort receipts. |
| OP-02, OP-03 | Existing governed import/promotion/publication, expected-source/bundle/observation and annual-cycle owners. | Independently qualified baseline families, real physical perimeter, two historical cycles and next-cycle rehearsal. Historical PARTIAL does not authorize a new corpus program. |
| OP-04 | Existing durable jobs/runtime/release owners and bounded regression evidence. | Independent quality labels, authenticated performance/cost, targeted fault recovery/rollback and operator evidence. Select actual unresolved risks; no blanket rerun. |

## All 18 native screen/action rows

| Rows | Current authored destination | What remains beyond source presence |
| --- | --- | --- |
| S01–S03 | List, retained three-step Create, overview/fit and detail. | Empty/revoked/archive/list restoration; Forward/mobile/accessibility; common count/fit and source-versus-activity freshness proof. |
| S04 | Typed member discovery/resolution, bulk decisions, rules and bookmarks. | Real outage/manual precedence, evidence and large sets. Member receipt/retry regressions now pass; this is not an old raw-ID-only UI hole. |
| S05 | Portfolio Changes, subscriptions and per-user state. | Badge parity, two users, configured delivery and restored baselines. |
| S06 | Basis-aware analytics and source/disposition/revision contribution drilldown. | Qualified corpus/ledger equality. |
| S07 | Four review lanes, exact evidence, notes, assignment and bulk receipts. | Real-cycle/current-access acceptance. Shared lane URL is authored at `4482db9f`. |
| S08 | Grants/client links/lifecycle/settings. | Effective grants and access-loss/archive conflict behavior on target. |
| S09 | URL-owned Explorer, typed facets/detail, selected/page/all exports. | Real dataset completeness and browser acceptance. All-match capture discloses a 10,000-row ceiling and is not a database snapshot. |
| S10 | Composed Budget/Congressional/Monitored/Actions over the user-selected existing owners, frozen at `ff5a2019`. | Source review, watch access fix deployment and live source/FY semantics. Congressional has no fabricated FY filter. |
| S11–S12 | Four-segment native Research workspace plus existing five-tab PE dossier with URL selection. | Real narratives, schedules, funding, legislation, structure and sources. |
| S13 | Saved Research comparison/version selection, per-side evidence and typed Add/bookmark. | Real source/version/browser qualification. |
| S14 | Customer-safe Research Coverage with honest unknown denominators. | Corpus attestations and governed recheck outcome; Refresh is not source requalification. |
| S15 | Qualified revision/hash-bound evidence/occurrence inspector and canonical modal focus behavior. | Real source/correction proof and the precise DI-07 public-contract gaps. |
| S16–S17 | Native import worksheet/operations and output lifecycle/filing/download/draft Open. | Target crash/recovery/compensation, exact bytes/scan/index/open and revocation. |
| S18 | Research context launch, typed actions/receipts and native readback. | All 17 runtime/tool/alias paths with unsent-input preservation. |

## All 24 acceptance rows and section 14.2

These are **pending final-cohort acceptance or external qualification**, not inherited automatic failures. Reuse equivalent exact-source evidence; do not declare an entire row passed from a narrow unit or synthetic browser test.

| Rows | Remaining evidence and owner |
| --- | --- |
| AT-01, AT-02, AT-10 | Hermes: empty-tenant navigation, URL Back/Forward/refresh/mobile, profile/milestone date/state/edition precision. |
| AT-03, AT-22 | Hermes/Core: current tenant/grant/wall/raw-role boundaries; snapshot/snippet/count/notification/download before/during/after revocation. |
| AT-04, AT-05 | Core/Hermes: populated create/import/member races, revision/idempotency receipts; rule outage/manual exclusion without incomplete-fetch mutation. |
| AT-06, AT-12, AT-17 | Governed source/continuity owner: adjudicated identity changes, selective reopen/carry-forward, two historical cycles and next FY/Congress. |
| AT-07, AT-14, AT-21 | Financial/source owner + Hermes: exact basis/dedup/parent-order/repeated facts, snapshot correction replay, amended/withdrawn/replacement/FYDP evidence. Reuse native SQL precision PASS; correct-parent live query remains distinct. |
| AT-08, AT-09 | Governed source owner: official-byte corrections/revocations and dependent invalidation; qualified legislative branch text/status. |
| AT-11 | Exact/capability ambiguous/wrong-section/unrelated/none-result adjudication. Semantic portion is user-skipped Q07. |
| AT-13, AT-18 | Release/Core/Hermes: mixed import/retry/reversal, actual object-store/Client Files bytes and scan/index, targeted unknown-commit/lease/partial failure recovery. |
| AT-15, AT-20 | Hermes: enabled UI/tool/alias same-context parity and create-to-cited-brief saved/open buyer journey. |
| AT-16 | Delivery owner/Hermes: configured channel, two users, one event, explicit subscription, baseline, acknowledgment/dismissal and no historical flood. |
| AT-19 | Release: reviewed final source/build/digest/scan/migration ledger/route/flag/material/rollback receipt. |
| AT-23, AT-24 | Governed source owner: dated recipient/performance/district geography and declared marketed component/account/FY/edition/detail denominators, including unavailable families. |

All twelve section 14.2 probes map to these same owners: facade/route depth and fresh deployment → OP-01/AT-02/19; database role/grants, client fit/revocation and outstanding download URL → AT-03/22; known-at/source location and funding/execution → AT-07/14/21; full result versus page → S09; personal watch state → AT-16; exact saved output → AT-13; Meri scope/runtime parity → AT-15; source inventory/eligibility → OP-02/03 and AT-24. This is one qualification set, not twelve additional campaigns.

## Full section 16 and MO-05

The full FR-16.1–45/16A–I and FR-15.22 remain binding. Existing Workspace share links, portfolio PIN/settings/design/frozen payload/public recipient/admin owners are retained. Core's selected-client and qualified-source admission fixes, locked-link semantics and named-widget refusal are authored/reviewed. A temporary lock is required to reveal no content under FR-16.33; it is not revocation. No private-source ACL model is invented for the currently public qualified source owners.

The earlier live 16H attempt was blocked at branded publish on its old cohort: **none of the 14 rows was fully PASS**. Later source fixes and healthy services do not close those rows. After the final reviewed cohort is serving, Hermes completes the same finite outline: (1) PIN-required enable/publish/open; (2) five wrong PINs/15-minute lock/owner count; (3) changed PIN invalidates prior sessions; (4) exact 168-hour expiry/revoke/lock/unknown uniform unavailable page; (5) frozen content after later edits; (6) two-client isolation; (7) immutable branding on/off; (8) unlink/archive warning without link revocation; (9) sharing-off revokes all; (10) keyboard designer/announcements; (11) unsafe/unqualified source names the refused widget; (12) lost publish acknowledgment yields one link with canonical readback; (13) network/cookie isolation; (14) owner/editor publishes without a second person. Also verify tenant admin list/revoke/off, FR-15.22/Meri's existing own-confirmation flow, responsive/light-dark/recipient access and relevant design retention/conflict requirements. Native publish and Meri effect confirmation are not a second-person approval workflow. Do not send the generated link externally as part of acceptance.

MO-05 has these **17** required paths, each through discovery → current scope → canonical owner → typed result/receipt → native UI readback:

| Family | Required operation names | Focused remaining runtime evidence |
| --- | --- | --- |
| Management | `manage_research_portfolio` | Genuine read actions bypass effect approval; writes and persisted previews retain existing confirmation/authority. |
| Projection and output | `get_research_portfolio_analytics`, `create_research_portfolio_snapshot`, `request_research_portfolio_output`, `save_research_portfolio_output_to_client` | Exact basis/source version, durable output identity, duplicate/lost ACK, true Client Files receipt. |
| Watch and review state | `watch_research_portfolio`, `update_research_portfolio_change_state`, `get_research_portfolio_reviews`, `add_research_portfolio_review_note` | Current actor/client/grants, explicit watch behavior, stale/prohibited review writes and per-user outcomes. |
| Context reads/bookmarks | `get_research_portfolio_bookmarks`, `create_research_portfolio_bookmark`, `get_research_portfolio_fit`, `get_research_portfolio_rules`, `get_research_portfolio_imports`, `get_research_portfolio_operations` | Typed canonical target, duplicates, ground-truth/coverage honesty and stale/malformed/partial import/operation states. |
| Saved drafts | `prepare_research_portfolio_brief`, `prepare_research_portfolio_meeting` | Existing ClioArtifact identity, exact native Open/edit/version recovery and evidence lineage. |

Foreign portfolio/record and stale snapshot/rule/import/change versions remain negative cases across enabled aliases. Do not regenerate already accepted artifacts or rerun unchanged scenarios simply to populate another report.

## Reusable evidence and bounded next handoff

- **Accepted DOCX:** `DOCX-RENDER-RESULT.txt` records authorized retrieval, native Word opening/rendering and all-page inspection of the exact 36,669-byte synthetic file, SHA256 `78abde2da9a20a35e782784d04d83993e3e39a863a0309d358dc882be27478c2`. Reuse that accepted artifact evidence; the earlier retrieval limitation is superseded. It does not establish every new Research output or Client Files scan/index result.
- **SQL:** `fable-sql-closeout/REVIEW.txt` and `NATIVE-RESULT.txt` establish reviewed source and native PostgreSQL six-digit UTC microsecond behavior. SQ1 fanout is not a defect under the documented authored-query grain contract. Reuse these results; correct-parent target-data behavior remains separately required.
- **Current frontend checks:** `1281` source/architecture PASS is reusable for unchanged bytes. Later member work has four contract tests and eight distinct mounted scenarios; the parent regression proves same-scope retained requests/receipts, blocked portalled submission during refresh, refusal clearing and scope-change clearing. Bulk reviews and lane navigation have focused mixed-outcome/lost-ACK/URL checks. These are author evidence, not independent acceptance.
- **True remaining source/contract limits:** DI-07/S15 coordinates/prior-next/correction impact; no customer governed Coverage recheck contract; existing unpaginated membership/watch collections and bounded search/export/history surfaces need honest large-set qualification. S10 Budget returns source-reference strings without unit metadata; Congressional is per PE, has no FY/source query and is bounded to 40 bills/60 actions each/200 final events. These are disclosed owner limits, not invented capabilities. Corpus completeness, historical cycles, dated geography and configured external delivery require their existing data/operations owners. Do not relabel these as missing native panels or silently manufacture a new backend.
- **Next:** freeze/review the finite later FE/S10 and edge deltas; integrate reviewed Core/watch/ingress and Meri material; issue the exact deployed cohort receipt; let Hermes resume only the unresolved sharing/full-scope cases above. If an actual requirement cannot be exercised because its public contract or qualified source is absent, retain that specific open item with its owner instead of writing PASS or beginning an unrelated rebuild.

Evidence locations: root workspace `C:/Users/Administrator/Documents/Codex/2026-10-26/wave4-orchestrator-20261026`, `work/fable-closeout-20261027/` author reports and `MERGED-PINS.json`; `work/hermes-review/fable-frontend-followon/`, `fable-core-final/`, `fable-core-ingress-watch/`, `fable-sql-closeout/`, and `sharing-live-acceptance/`. Companion source reports in this repository: [native Research](RESEARCH-WORKSPACE-CLOSEOUT.md), [navigation](INTELLIGENCE-NAVIGATION-CLOSEOUT.md), [initial frontend and later appendices](FRONTEND-FABLE-CLOSEOUT.md). Their older S04/S09–S15 “missing” statements are historical where the later source owners above now exist.
