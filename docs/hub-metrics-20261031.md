# B9 module hub metric contract

Source candidate only; independent review, merge, serving-source verification and deployed acceptance remain required. This work owns hub presentation and its focused tests. Core, Intelligence, Engagement, Planner, Workspace, Strategy, Directory and Research Portfolio owners retain their APIs and authorization. No schema, SQL, registry, shared auth or configuration change is included.

## Implemented matching metric

**Intelligence: Active funding opportunities.** Count source records with normalized `lifecycle = active`, across all dates, through existing `intelligence.funding.search` (`GET /intelligence/opportunities/v2/search`). This is the approved visible-active-record baseline, not funding awarded, dollars, client awards, forecast confidence or federal-FY appropriations. Unit: source records; no denominator. Identity remains each catalog's canonical record; separate records in different catalogs are not assumed to represent one award.

No selected client means enabled tenant funding catalogs (`mode=all`). A selected valid client means the existing owner's matching criteria (`mode=matched`, exact client ID); Core checks visibility and reads the current profile. Matching means relevance according to that owner, not ownership of funding. Disabled sources are outside the reported population. The UI states the scope beside the count. A malformed selected ID suppresses the read rather than broadening scope. The roster is used only for selection labels, never aggregation or authorization; an omitted client keeps a visible selected-client label.

The request selects `lifecycle=active`, page 1 and page size 1. Only `total` is displayed, after checking it equals `counts.active`; the returned record list is never counted. The SQL owner aggregates the entire filtered catalog in `stats` before `LIMIT`. Aggregation over enabled catalog adapters occurs before the UI page is sliced. Core source inspected at `00f31989f65de2c15d7dcf39446fadfd83379ec9`:

- `apps/api/src/funding-opportunities/funding-opportunity-v2-search.sql.ts`, blob `e77be3dd1bcc71c4f41c69af55b6220f05e8ca3c`, `searchSourceSql`.
- `apps/api/src/funding-opportunities/funding-opportunity-v2-search.service.ts`, blob `58f26631019a716b01894829a192b910b65db566`, `search`.
- The existing controller uses `RolesGuard`, `standard_user` and `FundingOpportunitiesFlagGuard`. Existing Capiro transport, configured service origin and application-session lifetime remain unchanged.

`generatedAt` is the response observation time, not the last source sync. Admission requires `catalogComplete=true`, `totalIsCapped=false`, at least one enabled source and every enabled source reporting `current`. Full integer counts must be nonnegative and safe. A complete zero is displayed as zero. No enabled sources means unavailable, never zero. Incomplete/capped/non-current source evidence is labeled partial and the exact total withheld, including an old source that has a newly generated response. An initially complete observation becomes explicitly stale beyond two minutes of age or future clock skew, matching B2's display threshold. Backend source freshness remains independently authoritative; the frontend invents no source-sync threshold.

Refresh is manual and every minute while mounted. The existing `useCapiroQuery` clears replaced reads, aborts prior work and fences results by input and application API lifetime. The clock label updates every ten seconds. Loading/replacement and failed refresh hide previous values. HTTP 401/403 means denied; 404 and transport/schema failures mean unavailable without exposing raw errors. One source/card failure cannot clear other module navigation or independent observations. Preview's roster-only branch never mounts metrics.

## Remaining cards: exact owner and decision boundary

These rows are review proposals, not implemented APIs or approved new formulas. Each remains visibly unavailable until its existing owner returns the full eligible population with observation, scope and completeness. UI lists, first pages and roster sizes are never substitute sources.

| Card                | Owner and proposed smallest useful metric                            | Scope, status, window and units                                                                                                                                                                                                       | Concrete remaining dependency                                                                                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engagement          | Core Engagement/Outreach: saved outreach records in trailing 30 days | Current tenant/actor's visible records; selected client filters exact canonical association. Count each canonical saved outreach ID once. Proposed window inclusive `[observedAt-30d, observedAt]` UTC. Unit records, no denominator. | Owner must select the saved event timestamp and included statuses (drafts versus sent) and publish its complete aggregate. B2 CRM `recordedActivities` explicitly excludes outreach/mail/meetings, so it is **not** reused as Engagement activity. |
| Planner             | Existing Strategy/Planner task owner: unfinished overdue tasks       | Full readable task population in current workspace and optional exact client; saved due date before observed UTC date; exclude completed/deleted/archived per actual canonical status contract. Unit tasks, no denominator.           | Owner must map actual terminal/archived states and date-only versus instant due semantics, return count/coverage/time/scope. Objective-only planner projections do not establish a module-wide total.                                              |
| Workspace           | Workspace document owner: active saved documents                     | Full readable tenant/actor/client population; canonical document IDs once, not versions or attachments. All dates; unit documents.                                                                                                    | Owner must define active for drafts/published/archived/deleted and provide a full-population aggregate. Do not count a library page, Hill Day packets and templates together.                                                                      |
| Strategies          | Strategy library owner: active saved strategies                      | Current authorized tenant/workspace/client; distinct canonical strategy IDs, all dates; unit strategies.                                                                                                                              | Owner must settle retained/archived/draft status mapping and expose a scoped aggregate; Objective counts and generated-run counts are not strategy totals.                                                                                         |
| Directory           | Directory people/organizations owner                                 | Current readable population; proposed separate person and organization counts, all dates, units people/organizations. No automatic client filter over a global directory.                                                             | Review whether global catalog counts or explicit saved client relationships belong on this card, then use the chosen owner's complete aggregates. Never combine persons and organizations into a fabricated activity score.                        |
| Research Portfolios | Research Portfolio owner: active portfolios                          | Current actor's readable owned/shared portfolios, deduplicated by canonical portfolio ID; all dates; unit portfolios. Client filtering only through an explicit stored association.                                                   | Confirm active/archive/delete statuses and client-association semantics and publish aggregate. Saved client bill watches are a different population and cannot become Research Portfolio counts.                                                   |

For every future owner response: observation timestamp, exact definition/version, current authorized client scope, full-population coverage and per-source availability are required. Complete zero, denied, unavailable, partial and stale must remain distinct. Hidden/unauthorized rows must never enter a numerator or denominator; current access withdrawal must clear cached observations. Full counts must be computed before pagination, with association fan-out deduplicated by canonical identity. Source failures remain independent.

## Narrow decisions for review

1. Approve the exact event/status selection for Engagement and the due/status mapping for Planner; reuse B2 only after those populations are proven identical.
2. Confirm Workspace/Strategy active statuses and Directory/Research Portfolio scope before adding totals. Existing active-record wording alone does not define those enums or relationships.
3. Keep health, win rate and stage weights unimplemented. A future health score needs named inputs and weights; win rate needs eligible won/lost cohort and time basis; weighted pipeline needs explicit saved-stage weights and currency rules. Saved prospect stages can be counted by their existing owner but there is no Prospect card in this hub.
4. Government funding amounts retain their stated US federal fiscal year and source basis. Do not sum funding opportunity values here or call relevance/association client money awarded. No fiscal-year amount is claimed by this record-count slice.

The Text-to-SQL owner (`01a19189`) inspected its 14 private projections and confirmed that no approved full-population Engagement/Planner aggregate is established there. Its `client_engagement_tasks` excludes General tasks, research-portfolio actions and PlannerTask; `client_action_items` is ActionRecommendation, not PlannerTask. This does not claim no separate endpoint exists elsewhere. Future structured aggregates must use existing scoped domain owners/engine. This frontend adds no query generator, SQL execution surface, central aggregate service or alternative authority.

## Acceptance still required

Independent review must check the actual source and selected contract. Release must bind the serving FE/Core tuple, configured source availability and permissions. Then exercise a known complete count beyond page size, real zero, selected/unselected client, inaccessible/invalid client, access withdrawal, source partial/stale/unavailable, refresh/reload and preview behavior. No live SQL, data seeding, provider effects, browser action, product build or deployment was performed by this source session.

# Directory aggregate continuation

Root selected the six remaining metric meanings in
`B9-METRIC-DEFINITION-DECISION-20261031.txt`. The Directory consumer uses the
actual additive Core `GET /directory/metrics` contract, registered as
`directory.metrics`. It reads the complete unfiltered contact count under the
existing Directory role guard. This is global catalog scope, independent of the
Hub's client selector; staff associations and organizations are not added.

The producer reports `metric: directory_contacts`, `definitionVersion: 1`,
`scope: global_catalog`, safe-integer `count`, `complete: true`, `capped: false`,
and `observedAt`. `snapshot` contains the exact `sourceId`, `loadedAt`,
`checkedAt`, nullable/unknown `publisherObservedAt`, and selection state:
`current`, `previous_fallback`, `stale_cache`, or `unknown`. Here `current` means
the latest pointer was selected successfully; it does not establish publisher
recency. No source timestamp is inferred from the path, cache TTL, or browser
response time. The UI always discloses unknown publisher freshness and identifies
fallback/stale/unconfirmed snapshots. It uses the producer's stale-cache state,
without inventing an ingestion SLA.

The canonical mapper's unconditional QA contact injection was removed by the
Directory producer change, so an empty real snapshot can return complete zero.
The old synthetic profile remains an explicitly injected test fixture only.
Malformed snapshot populations fail rather than reporting zero.

This consumer requires the compatible Core producer before rollout. Existing
funding behavior remains independent; either source's failure withholds only its
own value. Preview mode continues to read only the fixed client roster. Other
cards await their owners' actual accepted producer contracts; no placeholder
operations were registered for them.

## Planner, Strategy and Workspace continuation

Core343 (accepted `ef2b93874113478706d5f1130a278fd6d8a481f5`) and Core344
(accepted `600ed8c3de029e768d84a44a83eacf821cd00a85`) are merged into Core main
`cb92d596ce52f20161db05633265ccdcf0f905ae`. Their source contracts now support:

| Card      | Fixed operation / owner                                                     | Population                                                                                                                                                                                                                |
| --------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planner   | `planner.metrics.overdue`, strategy service `/planner/metrics/overdue`      | Distinct readable unfinished overdue tasks, including eligible General work when unselected. Timed deadlines are strictly before producer `asOf`; date-only deadlines precede the local `asOf` day, default timezone UTC. |
| Strategy  | `strategies.metrics.active`, strategy service `/strategies/metrics/active`  | Actor-readable unarchived strategies; no inferred status or run/node count.                                                                                                                                               |
| Workspace | `workspace.metrics.savedWork`, workspace service `/drafts/saved-work-count` | Readable draft and complete parents, one work product per packet; unselected includes General/null-client work.                                                                                                           |

Each operation accepts only an optional exact UUID `clientId`. Omission requests
the owner's actor population. Invalid selection disables the read instead of
falling back. The existing authenticated fixed-operation transport supplies
service prefixes and authority. The shared Planner/Strategy receiving schema
matches their single producer contract; Workspace retains its distinct DTO.
No browser-side population calculation or authorization decision is introduced.

Display requires the expected metric/version, exact returned scope, valid ordered
producer timestamps, safe nonnegative integer count, `complete:true` and
`capped:false`. Complete zero remains visible. Planner also requires the exact
deadline semantics. Planner/Strategy `state:incomplete` requires null count,
`complete:false`, `capped:false` and a known producer reason; the UI withholds its
number. Invalid, failed or denied responses clear both prior value and detail.

Workspace returns incomplete as HTTP503 rather than a successful DTO. The sole
gateway extension is private GET `/drafts/saved-work-count` on service `workspace`
with status503: read at most4096 bytes, preserve only the exact top-level native
`WORKSPACE_SAVED_WORK_INCOMPLETE` code in a fixed sanitized error envelope, and
discard native messages, counts and extra fields. Existing browser transport
exposes that safe code; the card shows incomplete with no number. Unknown,
malformed, oversized, wrong-service/method/path/public responses remain generic
unavailable. Cancellation is propagated and refused streams are cancelled. This
shared gateway boundary requires independent review. No other error semantics,
authentication, headers or routes are changed.

Each card has an independent query and refresh action. Existing query lifetime
fencing clears results on selected-client or authenticated API identity change
and aborts replaced requests. Refresh runs every60seconds; a separate local
clock marks an observation older than2minutes as stale. This is UI observation
age, not a publisher freshness SLA. Original `observedAt` plus `asOf` or
`observationStartedAt` are retained; browser completion time never replaces them.
Preview remains fixed-roster-only. Classic Outreach and Research metrics remain
unavailable pending their producer's corrected, accepted contract.

Focused checks cover scope/identity/version/clock rejection, full count and zero,
coherent incomplete branches, independent failures, cancellation and the actual
Workspace gateway-to-browser-error-to-card path, including bounded parsing.
Full web typecheck, touched-file lint and architecture comparison accompany the
source handback. Source tests are not live acceptance: compatible owner services
must be deployed before these consumers, followed by actual actor/client,
revocation, zero, unavailable, reload and refresh checks. B9 is not Done from
these source changes.

# Engagement and Research Portfolio aggregate continuation

The two remaining Hub consumers are implemented as receiving contracts only; no
producer is merged, sealed or serving for either metric yet, so the cards show
honest unavailability until their owners publish the aggregate.

Both read `status` rather than Planner's `state`. `complete` carries a safe
nonnegative integer `count`, `complete: true`, `capped: false`. `incomplete`
carries `count: null`, `complete: false`, `capped: true`; the count is withheld
and no partial value is displayed. The consumer validates metric identity,
version 1, the exact returned scope, ISO timestamps and branch coherence, and it
never derives a population, window, dedup or authorization decision.

Engagement reads `engagement.metrics.personalClassicOutreach30d` from
`GET /engagement/outreach-metrics` on the existing engagement service prefix.
The producer owns the personal Classic unfiltered or exact-client scope, current
actor/tenant authority, the exclusion of internal record types and the eligible
General records. `window` is the producer's fixed 30 x 24-hour UTC `[start,end)`
window with `basis: created_or_sent`; one canonical saved outreach ID counts once
even when both dates fall inside it. The consumer rejects a non-30-day span, a
different bound label or a sent-only basis, and it displays a producer window as
reported even when that window is old relative to `observedAt`. The producer's
maximum 100-candidate authority universe surfaces as an incomplete observation,
never as the first 100 records. Not sent-message volume, tenant totals or G03
recorded activity.

Research Portfolio reads `researchPortfolios.metrics.active` from
`GET /research-portfolios/metrics` on the existing Core service prefix. Scope is
the current same-tenant viewer/editor/owner grant unfiltered (including unlinked
General portfolios) or an exact client with a current client wall plus a saved
exact link. Duplicate grants and client links do not multiply the count, and
watches, actions, members and outputs are not portfolio identities. There is no
window field. The producer's 4096-row authority observation bound surfaces as
`capped: true` incomplete with a withheld count; 4097 detects the overflow. A
canonical absent Classic membership yields 404 and a Research denial yields 403;
neither may be retried as General scope.

Refresh stays manual plus every minute while mounted, the freshness clock is ten
seconds, and 401/403 deny, while 404 and transport or schema failures are
unavailable without exposing raw errors. Invalid selected clients suppress the
request entirely, replaced reads abort, and late responses cannot replace a
newer scope. Preview stays roster-only with no metric reads.
