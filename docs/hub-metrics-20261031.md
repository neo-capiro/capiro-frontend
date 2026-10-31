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

| Card | Owner and proposed smallest useful metric | Scope, status, window and units | Concrete remaining dependency |
| --- | --- | --- | --- |
| Engagement | Core Engagement/Outreach: saved outreach records in trailing 30 days | Current tenant/actor's visible records; selected client filters exact canonical association. Count each canonical saved outreach ID once. Proposed window inclusive `[observedAt-30d, observedAt]` UTC. Unit records, no denominator. | Owner must select the saved event timestamp and included statuses (drafts versus sent) and publish its complete aggregate. B2 CRM `recordedActivities` explicitly excludes outreach/mail/meetings, so it is **not** reused as Engagement activity. |
| Planner | Existing Strategy/Planner task owner: unfinished overdue tasks | Full readable task population in current workspace and optional exact client; saved due date before observed UTC date; exclude completed/deleted/archived per actual canonical status contract. Unit tasks, no denominator. | Owner must map actual terminal/archived states and date-only versus instant due semantics, return count/coverage/time/scope. Objective-only planner projections do not establish a module-wide total. |
| Workspace | Workspace document owner: active saved documents | Full readable tenant/actor/client population; canonical document IDs once, not versions or attachments. All dates; unit documents. | Owner must define active for drafts/published/archived/deleted and provide a full-population aggregate. Do not count a library page, Hill Day packets and templates together. |
| Strategies | Strategy library owner: active saved strategies | Current authorized tenant/workspace/client; distinct canonical strategy IDs, all dates; unit strategies. | Owner must settle retained/archived/draft status mapping and expose a scoped aggregate; Objective counts and generated-run counts are not strategy totals. |
| Directory | Directory people/organizations owner | Current readable population; proposed separate person and organization counts, all dates, units people/organizations. No automatic client filter over a global directory. | Review whether global catalog counts or explicit saved client relationships belong on this card, then use the chosen owner's complete aggregates. Never combine persons and organizations into a fabricated activity score. |
| Research Portfolios | Research Portfolio owner: active portfolios | Current actor's readable owned/shared portfolios, deduplicated by canonical portfolio ID; all dates; unit portfolios. Client filtering only through an explicit stored association. | Confirm active/archive/delete statuses and client-association semantics and publish aggregate. Saved client bill watches are a different population and cannot become Research Portfolio counts. |

For every future owner response: observation timestamp, exact definition/version, current authorized client scope, full-population coverage and per-source availability are required. Complete zero, denied, unavailable, partial and stale must remain distinct. Hidden/unauthorized rows must never enter a numerator or denominator; current access withdrawal must clear cached observations. Full counts must be computed before pagination, with association fan-out deduplicated by canonical identity. Source failures remain independent.

## Narrow decisions for review

1. Approve the exact event/status selection for Engagement and the due/status mapping for Planner; reuse B2 only after those populations are proven identical.
2. Confirm Workspace/Strategy active statuses and Directory/Research Portfolio scope before adding totals. Existing active-record wording alone does not define those enums or relationships.
3. Keep health, win rate and stage weights unimplemented. A future health score needs named inputs and weights; win rate needs eligible won/lost cohort and time basis; weighted pipeline needs explicit saved-stage weights and currency rules. Saved prospect stages can be counted by their existing owner but there is no Prospect card in this hub.
4. Government funding amounts retain their stated US federal fiscal year and source basis. Do not sum funding opportunity values here or call relevance/association client money awarded. No fiscal-year amount is claimed by this record-count slice.

The Text-to-SQL owner (`01a19189`) was asked to identify any already-approved exact Engagement/Planner aggregates. Future structured aggregates must use existing scoped owners/engine. This frontend adds no query generator, SQL execution surface, central aggregate service or alternative authority.

## Acceptance still required

Independent review must check the actual source and selected contract. Release must bind the serving FE/Core tuple, configured source availability and permissions. Then exercise a known complete count beyond page size, real zero, selected/unselected client, inaccessible/invalid client, access withdrawal, source partial/stale/unavailable, refresh/reload and preview behavior. No live SQL, data seeding, provider effects, browser action, product build or deployment was performed by this source session.
