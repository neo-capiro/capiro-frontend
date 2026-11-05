# Portfolio Overview — DG-05 approved metric coverage

26 October 2026. Product definitions approved by the user. Native Figma updates only; backend aggregation, completeness and cadence-setting bindings remain implementation work.

[Open the review index](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3134-80067).

## Current design coverage

There are 32 active frames in this scope: 24 Overview definition/state/drilldown frames and eight updated existing Pulse frames. The seven required states are drawn for Overview and Pulse: loading, complete zero, complete positive, partial unknown, failed with retry, permission redacted and stale. Each also has the current source-coverage-unavailable presentation. Awaiting reply is excluded from every frame in this scope, as instructed.

The three definition inventories pair each metric with its approved meaning, authorized scope, required sources, source-completeness rule and reporting/as-of period:

- [Portfolio Pulse definitions](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3134-83058)
- [Overview engagement definitions](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3134-83300)
- [Overview work definitions](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3134-83607)

## Approved product definitions

| Metric or signal | Definition applied in Figma |
| --- | --- |
| Pulse Clients | Non-archived CLIENT profiles only. Exclude FIRM profiles and prospects. |
| Active Objectives | Active Objectives only; exclude draft, completed, canceled and archived. |
| Off track | Active Objectives explicitly marked Off track. Missing updates alone do not imply Off track. |
| Active Strategies | Active Strategies, deduplicated across Objectives. |
| Need attention | Distinct clients with overdue Planner work, an explicitly Off-track active Objective, or missed engagement cadence. The drilldown lists every applicable reason; each client counts once. |
| Linkage | Eligible open Planner items explicitly linked to active Objectives directly or through an explicitly linked Strategy, divided by all eligible open Planner items. Count shared items once. Exclude completed, canceled and archived items using existing Planner status semantics. |
| Recorded touches | Distinct completed external interactions supported by records within the last 30 days. Exclude drafts, internal interactions, automatic replies and bulk newsletters. |
| Overdue work | Current open client Planner items with a past due date. Undated items are not overdue. Evaluate at the reporting snapshot, not a last-30-day window. |
| Recorded touches per week | Same qualifying-touch definition, grouped into the last eight calendar weeks. The current bucket is labelled “This week so far.” Calendar boundaries follow the configured locale. |
| Latest activity | Description, timestamp, actor and an entry point to the activity feed. A loaded feed-page count is not an aggregate metric. |
| Engagement health | Cadence-based On track, Needs attention or Unknown with a reason. Use the latest qualifying touch; for a new client, measure from creation until the first touch. |

**Cadence:** 30 days is the proposed default, adjustable per client. The design does not claim the setting read/write binding is already shipped.

**Zero denominator:** linkage displays **No open work**, with no percentage. It never displays 0% or 100% when no eligible open work exists. No ignore action or manual denominator exclusion has been granted or added.

## Matching drilldowns

Every example count is illustrative and explicitly separated from current API coverage. Counts represent all matching records under the same authorized scope, filters and reporting snapshot, not the number of rows on a loaded page.

- [Recorded touches, page 1](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3134-83874) and [page 2](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3134-84093): six last-30-day interactions, three per page.
- [Eight-week touch records](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3145-88040): nine interactions across eight calendar weeks, including the six in the separate last-30-day window.
- [Overdue work](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3134-84520): one matching open item with a past due date.
- [Need attention and reasons](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3134-84312): Anduril has overdue work and an Off-track Objective; Hidden Level has missed its illustrative cadence. These are two distinct clients, not three reasons counted as clients.
- [Linkage details](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3134-84724): 2 of 4 eligible open items = 50%. The rows distinguish direct Objective links, explicit Strategy links and unlinked items.
- [No open work](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3134-84936): the complete zero-denominator condition.
- [Pulse matching records](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3145-88276): three clients, three active Objectives, one explicitly Off-track Objective and two active Strategies.
- [Cadence reasons](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3145-88446): On track, a new client before its first touch, missed cadence and Unknown.
- [Overview complete-zero records](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3139-92302) and [Pulse complete-zero records](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3145-88663).
- [Unavailable drilldown](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3134-85152): the reason records cannot support a complete total, without fabricating zero.

The positive Overview chart uses eight buckets: 1, 1, 1, 1, 1, 1, 3, 0. The nine-record total is deliberately different from the six-record last-30-day card. The current calendar week is incomplete. The last-30-day fixture is 26 September 2026 at 10:00 ET through 26 October 2026 at 10:00 ET. The overdue fixture is an as-of snapshot at the latter time.

## Backend implementation boundary

The user's approval resolves the product-definition and linkage-denominator questions. It does not establish an existing aggregate endpoint or certify current coverage. Partial, failed, stale, permission-redacted and unverified sources must not be rendered as complete zero. Values and drilldown records must use the same authorized client scope, filters and reporting snapshot. Totals must remain stable when pagination changes.

Current source was inspected at main commit `393a2daeac0839ee6477600d09de9441137b8534`:

- [PortfolioPulse.tsx](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/features/portfolio/index/PortfolioPulse.tsx), inspected blob `f6729a482275bd6fe19fd2d8a5e2800b8a2a4617`.
- [OverviewSignals.tsx](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/features/portfolio/client-profile/OverviewSignals.tsx), inspected blob `1960cbc08c37c3ccb9b78a98638ec82e9e83ae48`.

The returned CLIENT-row count and loaded activity-feed length do not prove complete population or period coverage. Approved definitions now guide the required integration; the current-source unavailable screens stay honest until aggregate/completeness/as-of contracts are implemented and verified. This task neither implements nor certifies those contracts.

## Verification and delivery

All 32 scoped frames were checked: zero horizontal text overflows, zero status-card content overflows, zero obsolete Awaiting reply or definition-pending copy, and zero broken prototype targets. There are 1,011 total prototype links including inherited shell links; the approved update batch registered 314 explicit links. All text uses Geist. The only image fills are reused 77×26 Capiro wordmarks; screens remain native editable nodes and component instances.

The final native screenshot of the positive Overview passed after correcting the overdue card's period to an as-of snapshot. Content below the viewport scrolls vertically. This check does not claim a runtime browser or backend test.

Use [CURRENT-LEDGER.json](CURRENT-LEDGER.json) as the active frame inventory, [APPROVED-UPDATE.json](APPROVED-UPDATE.json) for the approved rebuild evidence, [APPROVED-SCOPE-FIX.json](APPROVED-SCOPE-FIX.json) for the final two-node scope correction, and [FINAL-QA.json](FINAL-QA.json) for final checks. The initial local `LEDGER.json` and earlier build records are historical and superseded.

The original Overview frame `1064:158895` was not changed by this metric subtask. The parent delivery separately removes historical Awaiting reply cards and updates baseline unavailable signals. No application code, shared component master, production deployment or live client data was changed here.

