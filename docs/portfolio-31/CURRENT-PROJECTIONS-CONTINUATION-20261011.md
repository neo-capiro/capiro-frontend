# Current Portfolio list and activity projections — 11 October 2026

## Problem and scope

The remaining-row review at `3eeaeb785bf131d41f7bcdc28170d5bfa587cd0a`
found that a failed refresh hid Portfolio cards but still left the retained
catalog in the title, client pulse count and status/sector choices. The activity
timeline also rendered retained rows, kinds and its 500-item caption alongside
an error. Overview counted those rows as recent activity, and the client frame
kept the previously returned client name after its current read failed.

This is a bounded frontend correction for `CORE-001`, `CORE-002`, `CORE-007`,
`CORE-013`, `CORE-048` and `CORE-103`. The existing GET contracts, authentication,
cache ownership, write operations and metric definitions are unchanged. It does
not establish signed-in or final audit acceptance.

## Implementation and ownership

| Owner | Change |
| --- | --- |
| `index/PortfolioIndex.tsx` | A successful current catalog is the input for the title/pulse count, filters, rows, profile-type counts, attention and Quick log composition. Failed or initial/recovering reads do not produce successful-empty claims. |
| `index/IndexFilters.tsx` | An optional catalog distinguishes unavailable data from a successful empty catalog. Selected status/sector values remain in URL state and are labeled “not available” when the current catalog cannot supply choices. Independently available owner choices retain their existing behavior. |
| `client-profile/ActivityTimeline.tsx` | One successful current activity projection supplies filtered rows, kind choices and the exact source-limit caption. Search/date/kind state is retained while the existing error/Retry view is shown. |
| `client-profile/ClientOverview.tsx` | The activity-derived count uses that feed's successful current state. A current Client read is required to render the client overview, with an explicit retry available. Healthy unrelated sources remain visible when only activity fails. |
| `client-profile/ClientFrame.tsx` | The shell name and client header use the current successful Client, so an errored read cannot retain a current-looking client name. The requested route context remains available for recovery. |

These are derived render values; no additional saved state, polling, generic
workflow helper or request implementation was introduced. A background refresh
can retain its previously successful presentation until the read fails; the
correction specifically prevents a failed/recovering observer from publishing
that retained result as current. Native authorization remains with the service.

The five existing component bodies and final diff were read in full. Four
functions exceed the review threshold, and each has a separate exact
responsibility review in
[CURRENT-PROJECTIONS-SIZE-REVIEWS-20261011.json](./CURRENT-PROJECTIONS-SIZE-REVIEWS-20261011.json).
No changed product file exceeds 400 nonblank lines. The revised architecture
scan reports 140 size findings: 111 exact reviews, 29 unchanged inherited
findings and zero blocking findings. Unchanged inherited findings remain visible.

## Figma and service references

Root inspected the existing
[Portfolio frame 411:41421](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-41421)
and
[Overview/Timeline frame 411:49451](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-49451).
The pulse, filter, overview and timeline layouts retain their current owners and
tokens. Error/retry presentation reuses `QueryState`. No replacement metric,
whole-page visual parity or new Figma component is claimed for these read-state
corrections.

Existing adapters still call `GET clients`, `GET clients/:clientId` and
`GET clients/:clientId/activity?limit=500`. The backend reference remains
`capirov2@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`. This change adds no endpoint,
request field, receipt shape, pagination or provider behavior.

## Qualification

All browser service responses were intercepted synthetic fixtures. The new
test-only entry mounts the real `PortfolioIndex`, `ClientFrame` and
`ClientOverview`; only the cache refresh trigger is synthetic. No test entry or
fixture identity is part of the product route tree.

- **Actual baseline:** all five new cases failed on the unchanged `3eeaeb7`
  feature preimages. The exact failures were retained count `2` instead of an
  unavailable count, retained activity rows after 403/503, and a retained client
  name after the client read failed. No baseline failure was a browser launch,
  locator setup or test-harness error.
- **Fixed browser cohort:** **15/15 passed**, zero skipped/flaky, in **57.08
  seconds**. This contains five new regressions and ten unchanged existing
  activity/index cases. The existing tests remain byte-identical to the parent.
- **Covered recovery:** 403 and 503 after a successful read; selected filters
  retained; current choices/counts restored only after a successful retry;
  explicitly held catalog retry; no false empty state; current activity kind and
  500-item caption removed; healthy client/facility sections retained; phone dark
  error state without horizontal overflow; client frame recovery.
- **Static checks:** scoped lint, formatting and diff whitespace passed. The
  first typecheck found strict indexed-access typing in a new nonempty test
  fixture; its non-null assertion was corrected. TypeScript-emitted JavaScript
  before/after that correction is byte-identical. The final typecheck passed,
  with its result recorded in the qualification receipt.
- **Rendered review:** root inspected the recovered desktop catalog and the
  phone dark activity-permission view. Search/type/date controls and Retry fit,
  and the failed activity view does not contain stale rows or an empty-history
  claim.

Evidence is under
`outputs/evidence/portfolio-current-projections-20261011/`: baseline source
hashes, baseline/fixed browser JSON and artifacts, final product/test hashes,
the type-only fixture correction proof, Figma review metadata, static logs and
exact architecture output. No temporary Figma asset URL is persisted. The
complete combined suite is a separate gate against the final integrated source;
the focused counts above must not be added to it.

## Acceptance limits

All six audit rows remain open. These tests do not establish real tenant/client
authorization, source completeness, durable native behavior, cross-device
recovery, live history, or signed-in visual acceptance. The activity source is
still limited to its existing latest-500 response; it has no new pagination.
Unavailable service-defined pulse metrics remain unavailable.
