# CORE-128 — Saved submissions in Capabilities

## Implementation outline recorded before source edits

Base: `3eeaeb785bf131d41f7bcdc28170d5bfa587cd0a`, isolated branch
`codex/portfolio-saved-submissions-20261011`. Portfolio only.

The continuation places a focused **Saved submissions** section within Capabilities.
The existing Advocacy history link stays available for actual advocacy work.
This is a reversible product composition choice; no Intelligence navigation is
added.

- **Public composition:** CapabilitiesPage imports the existing PastPerformance
  public entry and otherwise retains capability/editor/fit/registration ownership.
- **Current context and reads:** PastPerformance owns its client name and history
  projection. Reuse the profile domain's current actor, actor-scoped client read,
  and source-revision helpers; do not duplicate these owners. A successful current
  history is independently required. Failed, invalidated, replaced, or revoked
  reads cannot supply selected content or mutation controls.
- **Removal lifecycle:** a cohesive local controller owns the selected submission
  review, open-view lifetime, in-flight exclusion, feedback, and a session-local
  uncertainty fence. The action module retains native transport, exact fresh-row
  preflight, and receipt parsing. Before dispatch and effects, recheck the captured
  actor, client, history revision and current editor lifetime. Obsolete responses
  cannot publish UI success or invalidate replacement caches.
- **Native boundary:** existing Core GET
  `clients/:clientId/submission-history` returns at most 200 native history rows,
  sorted by fiscal year descending. The controller requires standard_user or a
  higher native role; the service verifies the non-archived tenant/client.
  Existing DELETE `clients/:clientId/history/:id` removes only the scoped history
  record and returns `{ deleted: true }`. There is no echoed identifier, request
  version, conditional-write guard, or idempotency receipt to invent. The client
  fresh-read check cannot eliminate a subsequent native concurrent-change race.
- **Design:** inspect Capabilities desktop 411:54867, footer 411:54982, phone
  411:86453, and remove dialog 411:58348 / 411:58549. Author a separate editable
  desktop/phone section before implementing it, using the existing Geist text
  styles, tokens and Button component. Preserve the existing removal confirmation.
- **Verification:** preserve the original removal/Quick-log assertions. Add
  focused synthetic cases for the product entry, role/read failures, selected-row
  replacement, actor/client/view lifetime, ambiguous acknowledgements and late
  cache effects. Record exact baseline/fixed source manifests and actual run
  order, unit/type/lint outcomes, and phone/desktop rendered comparison. Browser
  port 5191 is coordinated with the other feature owners.

Fresh native main was verified as
`4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`. The pinned
[controller](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/clients/client-capabilities.controller.ts),
[service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/clients/client-capabilities.service.ts),
and [role guard](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/auth/roles.guard.ts)
are retained with hashes in the evidence directory. The browser
uses the existing same-origin API client, whose fetch dispatch is synchronous;
no browser token callback is claimed or added.

## Implemented ownership and behavior

`CapabilitiesPage` now consumes the existing public `PastPerformance` entry. Its
independent capability cards, fit feed, registrations, editor and Advocacy history
link retain their owners. The one granted canonical browser fixture addition is
an empty `GET clients/:clientId/submission-history` response beside the existing
capability feed; explicit per-test overrides still take precedence.

`PastPerformance` loads identity at the entry and owns the saved-history section.
`submission-view.ts` reuses the profile domain's actor, exact client-read and
source-revision helpers. It requires both current, successful native records,
withholds failed/invalidated/fetching data, and excludes archived or mismatched
clients. `queries.ts` retains the native 200-row maximum, unique record IDs and
exact tenant/client association. Native fiscal-year ordering and stored title,
context, outcome and notes remain intact. The raw capability UUID line is removed;
there is no inferred capability label or link.

`useSubmissionRemoval.ts` owns the selected review and one native removal attempt.
Its selected ID is resolved against the captured client/history revisions. A
synchronous cache subscription aborts that review on authorization or source
changes, including an invalidate/restore sequence before React renders. Rendering
notifications are batched separately. `actions.ts` remains unchanged: it reads
the native bounded history again, compares the exact selected row, and only then
dispatches the existing DELETE with the existing literal `{ deleted: true }`
receipt schema. The browser API dispatch is synchronous; no extra token machinery
or native field is invented.

An actual DELETE dispatch enters a QueryClient-local uncertainty fence scoped to
tenant, user, client and history ID. A current definitive rejection clears the
fence for an explicit reviewed retry. A missing/incompatible receipt or a disposed
review keeps it fenced across close and same-session remount. Obsolete completion
does not invalidate either the original or replacement history or announce
success. A current preflight authorization/visibility refusal reconciles the
history through its existing query owner and removes the older actionable review.
Only a current confirmed DELETE publishes success and invalidates its exact
captured history query. `RemoveSubmission` now owns presentation and connected
opener focus restoration only; its confirmation text and desktop/phone sizing
are preserved.

This local fence is not durable across a new QueryClient/browser session. The
published DELETE has no idempotency token or conditional version, and a fresh
preflight cannot eliminate a native concurrent change between GET and DELETE.
Those limits are explicit; no server guarantee is claimed.

## Figma evidence

The original Capabilities and removal frames were read before source changes:
[Capabilities desktop](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-54867),
[Capabilities phone](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-86453),
and [Remove submission](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-58348)
with exact dialog child `411:58549`.

The missing placement was authored as a separate editable continuation:
[desktop](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=1019-187928),
[phone](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=1019-187952),
and [combined review](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=1017-187915).
Component set `1019:187927` has Desktop/Phone variants and editable native row
fields. Existing Geist styles, palette/spacing/radius variables and Button
instances are reused. No existing frame, shared token or icon asset was replaced.
The root owner independently reviewed both authored variants. Fresh design context
and eight verified PNGs are retained in the evidence `figma/` directory; the one
asset URL that returned HTML was verified invalid before documented inline
screenshot fallback.

## Verification and actual run order

Evidence root: `outputs/evidence/core-128-saved-submissions-20261011/`.

Eight exact tracked source preimages were preserved from base `3eeaeb7` before
application edits. Ten production inputs (seven changed/new, three unchanged)
were frozen in `fixed-before-browser/`. The browser runner verified and restored
the eight original files, temporarily removed the two new local owners, and then
restored and reverified all ten fixed inputs after each baseline. Source receipts
record every switch and the exact test inputs. Implementation and static checks
preceded browser regression reproduction against the preserved source; no earlier
browser-baseline chronology is implied.

| Cohort                                                             | Source                                                           | Result                                                                    | Evidence folder                 |
| ------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------- |
| New regression baseline                                            | Exact eight original production preimages; two new owners absent | 16 expected failures                                                      | `browser-baseline-01/`          |
| First fixed cohort, including all original removal/Quick-log cases | Frozen prebrowser source                                         | 23 passed, 3 failed at fixed total-GET assumptions                        | `browser-fixed-01/`             |
| Corrected lifetime baseline                                        | Same exact original production preimages                         | 3 expected failures: two actual late DELETEs and a late history read      | `browser-baseline-counts-02/`   |
| Strengthened visual baseline                                       | Unchanged frozen prebrowser source                               | 2 expected failures: browser-default button style and excess phone height | `browser-geometry-baseline-01/` |
| Final affected cohort                                              | Same TypeScript source plus the bounded local CSS correction     | 5 passed; no skips or flakes                                              | `browser-fixed-affected-02/`    |

The three new lifetime tests now capture the settled initial history-read count
and require exactly one preflight and no late reads. The actor-keyed initial
mount can start an aborted read before the authorized component mounts; the old
fixed total of two did not describe that lifecycle. The actual DELETE, privacy,
uncertainty and no-late-effect assertions were preserved. All ten original browser
cases and all sixteen original unit cases remain byte-for-byte unchanged.

All 26 distinct browser scenarios passed across the fixed and final affected
cohorts. This is not a claim that one final-tree 26-case run was performed. The
last production change is CSS only; root owns the combined integration gate.

Focused units passed 34/34: sixteen original overview/removal cases and eighteen
new source/selection/fence cases. Final TypeScript and scoped ESLint passed.
Formatting and diff checks passed. An initial lint finding about reading a React
ref during render was corrected before the frozen prebrowser candidate by using
the guarded review in state.

Three exact function-size signals have individual cohesion records in
`CORE-128-SAVED-SUBMISSIONS-SIZE-REVIEWS-20261011.json`. The final scan verifies all
three fingerprints unchanged after visual qualification. No owned source file
exceeds 400 nonblank lines. The central architecture registry is root-owned.

## Rendered comparison

Actual screenshot inspection found two issues that the first broad fit checks
did not assert. The canonical Button deliberately ships unprocessed utility
strings; its application caller must supply CSS. The local module now supplies
the exact outlined Refresh control, transparent Ghost removal control, Geist
button typography, 36px height and existing tokens. No package or shared component
was modified. The Figma phone SPACE_BETWEEN composition has no added gap between
the title stack and button or between the row text and removal button; those two
12px gaps were removed in the phone media rule.

The stronger checks first failed against the unchanged prebrowser source, then
passed with the correction. Actual desktop card size is 1024 × 276.40625px versus
the 1024 × 277px Figma capture; phone is 358 × 384.046875px versus 358 × 385px.
Both fit without horizontal overflow, all controls are at least 36px tall, and
both console-error and unexpected-request arrays are empty. Final PNGs and
computed geometry/control styles are preserved with the final affected cohort.
Desktop and phone were visually inspected after that run. The runner stopped and
an explicit port-5191 bind succeeded before release to the parent.

## Qualification status

The bounded source/design/test slice is complete and frozen for parent
integration. CORE-128 remains open for native and signed-in acceptance. The
published versionless DELETE and session-local uncertainty limits described
above remain. No live delete, deployment, signed-in native acceptance, or audit
row completion is claimed by these synthetic checks.
