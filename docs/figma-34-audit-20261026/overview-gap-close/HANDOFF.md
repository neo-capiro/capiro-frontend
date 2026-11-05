# Portfolio Overview — design gap closure, 26 October 2026

This addendum supersedes the earlier Overview-specific design coverage and pending product-definition statements. It records Figma work only. No application code, endpoint, backend data, deployment or production acceptance changed.

## Review in Figma

- [Overview additions directory](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3139-87657)
- [Original Overview with added controls and Client details](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-158895)
- [Timeline recovery](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3132-78373)
- [Metric definitions, coverage states and drilldowns](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3134-80067)
- [1440 long-content reference](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3139-86941)
- [1024 long-content reference](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3139-87185)
- [Layout, focus and overflow specification](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3139-87429)

## Four previously missing shipped surfaces

| Surface | Frame | Coverage |
| --- | --- | --- |
| Client details | [3139:86736](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3139-86736) | Seven source fields, read-only missing-value treatment and long values. Added below Timeline in the original Overview. |
| More actions | [3139:86185](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3139-86185) | Edit client profile, Export client profile JSON, Archive client; restricted menu and current role annotations. |
| Profile notes | [3139:85856](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3139-85856) | Entered text, saving, definite failure, unknown save, changed saved value, read-only and saved-value comparison. Separate from Internal notes. |
| Add focus tag | [3139:86035](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3139-86035) | Empty/ready, duplicate rejection, saving and unknown outcome. No resend after uncertain delivery. |

The More actions menu has native Client edit, export and archive destinations. Client edit reuses the existing native three-step intake controls, changes context to Client, and adds Primary sector. It never routes a client action into a Prospect record. Export is JSON, including explicit partial output; archive retains saved records. The four-surface/layout set contains 28 frames/dialogs, three transparent overlay wrappers for anchored menus, and two local main components. The menu sits 6px below its trigger with aligned right edges; outside click closes it. Reused edit dialogs have explicit Close reactions. A duplicate focus tag cannot save until the value changes.

Source evidence and exact permission/save boundaries are in [SOURCE-EVIDENCE.md](source/SOURCE-EVIDENCE.md) and [MORE-ACTIONS-DESTINATIONS.md](source/MORE-ACTIONS-DESTINATIONS.md), pinned to frontend main `393a2daeac0839ee6477600d09de9441137b8534`.

## DG-09: separate ambiguous outcomes

Eleven new native screens extend thirteen existing recovery references. Unknown update and removal are distinct from ordinary update error `1064:161135` and feed read error `1064:162784`. Lookup and replay previews identify the original operation, keep the draft separate, show authoritative rejection/current-version change, redact content on actor/client change and specify focus restoration. [Current removal recovery](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3146-90478) retains the original removal target and intent without showing an update draft.

The current implementation has no immutable original-operation receipt lookup/replay endpoint. Its current-record comparison is read-only evidence and does not prove the operation outcome. The current unavailable screen is separate from visibly gated future previews. Cross-close/refresh draft retention is a design requirement; current activity editing only retains the mounted draft. No automatic resend or fresh request is authorized after an uncertain outcome.

See [Timeline handoff](timeline/HANDOFF.md) and [ledger](timeline/LEDGER.json).

## DG-05: product definitions supplied, Awaiting reply removed

The user supplied [approved product definitions](PRODUCT-DEFINITIONS.md) and explicitly removed Awaiting reply. These decisions replace earlier “definition pending” statements. They do not prove backend source completeness or establish a new endpoint.

The design set covers loading, complete zero, complete positive, partial unknown, failed/retry, permission-restricted and stale data. Drilldowns share the metric's scope, filters and reporting snapshot, with totals covering all matching records. Linkage deduplicates eligible open Planner items and shows **No open work** when there are none. Weekly touches cover eight calendar weeks, while Recorded touches covers thirty days. The 30-day cadence default remains a proposal and is visibly separate from shipped settings.

Awaiting reply is removed from active Overview examples, including 18 historical desktop/tablet Stat cards. Current-unavailable cases remain unavailable until the service can satisfy the approved definition and coverage. Illustrative complete-data examples are labelled synthetic. No Ignore action or authority was granted. The metric inventory now contains 24 Overview frames plus eight updated Pulse references, with matching population, cadence, linkage and zero-result drilldowns.

See [Metrics handoff](metrics/HANDOFF.md) and its final ledgers for the complete definition inventory, approved scenarios and counts.

## DG-12: desktop/tablet and focus

Native 1440 and 1024 references show wrapping client/owner names, emails and long identifiers; one content column at 1024; the expanded 232px sidebar; and an error below the fold with a scroll-to-error action. Original Overview `1064:158895` and its main scroll container carry implementation annotations.

The reference specifies reading/focus order, keyboard equivalents, close/fallback focus return, fixed header, overflow boundaries, 200% zoom and reduced-motion behavior. Persistent Close and independent sidebar scrolling are desired improvements where the current shared implementation does not supply them. Figma annotations are not browser accessibility qualification. Phone layouts remain outside this pass.

## Validation and remaining work

Native editable layers use the existing Geist typography, Capiro color/spacing tokens, shared shell, buttons and intake controls. Full-view screenshots and structural checks cover the new compositions; field wrapping, identity-button spacing and header action spacing were corrected. The only raster fills in the new four-surface set are five small reused Capiro wordmarks. See [OVERVIEW-LEDGER.json](OVERVIEW-LEDGER.json), [approved Overview update](APPROVED-OVERVIEW-UPDATE.json) and [final QA](FINAL-QA.json). The original construction ledger precedes the approved-definition and interaction corrections; the update and final QA records take precedence.

Remaining implementation dependencies:

- Map approved aggregates to authoritative service fields, authorized scope, completeness and as-of/reporting snapshots. Product definitions are no longer blocked on the user.
- Accept and implement any original-request receipt/replay and durable draft recovery contract before enabling its gated controls.
- Implement/verify focus restoration, persistent Close and responsive/zoom behavior in the browser.
- Keep notes draft behavior truthful: current Profile notes draft survives while mounted, but closing loses it; focus-tag uncertainty survives same-actor/client reopening and never crosses actor/client boundaries.

No application test suite, build, live endpoint, browser runtime or deployment checks were run. The documentation PR remains separate from integration/merge/deployment authority.

