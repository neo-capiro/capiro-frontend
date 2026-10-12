# P6 Bill Tracker preferences and current records — 11 October 2026

## Scope and outline before implementation

Assigned isolated worktree: `capiro-portfolio-tracker-preferences`, branch
`codex/portfolio-tracker-preferences-20261011`, starting at `ee39c2f`.
This continuation owns Portfolio Bill Tracker and dedicated tests only.

- **BILL-11/12:** add a personal alert-preference editor using the existing Intel
  tracker GET/PUT contract. Shared targeting remains owned by `WatchlistDialog`
  and its existing versioned writer. The new editor has its own boundary schema,
  complete-PUT projection, local draft/controller, and cohesive criteria and
  delivery presentation. Reuse the canonical API provider, query cache, current
  identity/writer checks, Portfolio dialog, and existing design tokens.
- **BILL-01/03/07:** derive visible board data and the selected Updates record
  from the latest successful read. Failed reads cannot expose cached results as
  current. Store a selected ID rather than a copied record; guard record removal,
  actor/context change, and late results. Preserve pagination and the explicit
  Core/Intel adapter choice.
- Browser input and dialog lifetime belong to the frontend. The existing native
  backend owns tenant/client/user authority, persistence, delivery, and phone
  verification. Complete PUT bodies preserve every fetched editable preference;
  no browser write includes server-owned phone verification or identity fields.
  A lost write response is reported as unconfirmed and is not automatically
  replayed. Closing a local view does not claim a server write was cancelled.
- Query/controller/section boundaries remain inside `bill-tracker`; no new
  shared abstraction, server service, package, route, or dependency is planned.
- Verification: full-body and association validation units; intercepted browser
  cases for editable preferences, retained input on failure, stale/late scopes,
  board refresh/removal, and explicit owner gating; desktop/phone rendered Figma
  comparison; focused lint/types/format and AST cohesion review.

## Native contract inspected before code

Current `neo-capiro/capirov2` main was re-read at
`4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`.
`apps/intel-api/src/tracker/tracker-watchlist.controller.ts` registers GET/PUT
`/intel-api/tracker/watchlists/:clientId/alert-prefs`; `tracker.module.ts`
registers that controller. `PutAlertPrefsDto` owns the input vocabulary. The
service preserves phone verification only for the same normalized saved number.
Its PUT defaults omitted fields, so submitting a partial preference body would
discard unrelated saved values. Neither a version token nor client-owned phone
verification is part of this contract.

No provider verification, test alert, mail/SMS delivery, AWS command, deployment,
or real preference write is authorized or executed by this local qualification.

## Figma discovery before code

Target file: `Zc2dEN5aLU47dVdsewDmiJ`, Portfolio 3.1 page `411:40601`.
The existing Bill Tracker screen `411:56471` has the Configure entry but no alert
preferences view. A page inspection found no quiet-hours, materiality, email/SMS
cadence, or alert-preference design. The existing `My budget alert` dialog
`411:106678` supplies the Portfolio modal pattern; it is a visual reference only.

The user authorized adding the missing view in the existing file before code.
Only a new isolated Tracker composition will be created; no existing frame,
component, or token is modified. Placement reserved at x=99808, y=3000, separate
from the Objective agent's new header variation at y=4000 or later.

Design-system discovery: no Code Connect files for required controls; existing
screens expose the `v2/Button` set (`12:388`), Geist typography, local Portfolio
colors/spacing/radii, and text/effect styles. Required input/checkbox/select
components were then found in the available Capiro Design System v3 library.
Their properties and actual typography will be inspected before composition.
The view uses editable text and component instances, not a flattened screenshot.

## Implementation and verification

The bounded implementation is complete and source-frozen. The final focused
cohort passed **34/34 browser checks** and **24/24 unit checks**. This evidence
qualifies the local frontend behavior against intercepted native-shaped
contracts. It does not establish deployed capability, signed-in acceptance, or
delivery. All five audit rows remain open for their remaining acceptance gates.

### Design and identity prerequisites completed before feature code

Created only these new editable views in the existing Capiro file:

- [Desktop preferences, `971:187129`](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=971-187129),
  x=99808, y=3000, 720 × 896 after refinement.
- [Phone preferences, `975:187289`](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=975-187289),
  x=100648, y=3000, 358 × 1245 after refinement.

The new frames reuse `v2/Button`, imported `Field/Input` and `Choice/Control`
instances, Geist text styles, and existing Portfolio color, spacing, and radius
variables. Initial inspection found wrapping field labels, template leading
glyphs, and inherited clipping. Those issues were corrected only in the new
instances. The final desktop screenshot shows complete field borders, aligned
columns, and the intended spacing; the phone layout stacks channel sections and
retains two quiet-hours inputs. No existing design frame, source component, or
token was modified. No raster/vector asset was introduced.

Design context supplied old Code Connect imports from
`apps/web/src/vnext/components/fields/index.tsx`. A repository-wide search of
`apps/web` and `packages` found neither that path nor `CapiroInput` or
`CapiroSelect`. Implementation therefore uses current Portfolio controls and its
canonical dialog, preserving existing assets and reproducing the reviewed field
layout with domain-local CSS.

The root-owned prerequisite `f0fb28809a090d6f3f65090c689deaba522151b6` was
cherry-picked as `34cb6a0`. It preserves the existing optional, nonempty
`user.clerkUserId` in the canonical identity schema. At the pinned backend SHA,
`packages/shared/src/index.ts` defines `TenantContext.clerkUserId: string` and
`apps/api/src/users/users.controller.ts` GET `/me` returns both
`user.id = ctx.userId` (database ID) and `user.clerkUserId = ctx.clerkUserId`.
The Intel controller passes `ctx.clerkUserId` to GET/PUT preferences. No database
ID fallback is valid for the preference receipt's `userId`.

## Audit continuation and canonical owners

| Audit row | Local continuation                                                                                                                                                                                                                                                                                                 | Canonical frontend owners                                                                                                                           | Design reference                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| BILL-01   | Board rows, columns, and native totals are composed only from successful current reads. Read keys include the verified current tenant/database-user/role scope. A late old-context response cannot populate the next board. Existing owner selection, native projections, pagination, and mutations are preserved. | `apps/web/src/features/portfolio/bill-tracker/{BillTrackerPage.tsx,queries.ts,current-data.ts}`                                                     | [Tracker board, `411:56471`][figma-board]; matrix also records `411:56671`, `411:83145`, and `411:86589`. |
| BILL-03   | A failed refresh conceals cached rows and totals, shows the real error/retry state, and avoids a successful-empty claim. Successful recovery restores the current board without reopening an old selection.                                                                                                        | The same three board owners, with the existing canonical `QueryState` presentation.                                                                 | Handover matrix loading/empty/error nodes `411:56889`, `411:56996`, and `411:57089`.                      |
| BILL-07   | Updates selection stores the bill ID and read scope, then resolves the latest successful loaded record. A successful refresh updates the open detail; a failed read, absent loaded record, or scope change closes it. The existing `BillDrawer` remains the detail and action owner.                               | `BillTrackerPage.tsx` and `current-data.ts`; existing `BillDrawer.tsx` is unchanged.                                                                | [Updates drawer, `411:57827`][figma-updates].                                                             |
| BILL-11   | Intel Configure exposes a personal alert-preference entry for a current native writer with a returned Clerk identity. Ordinary users retain the existing read-only shared-targeting view while accessing their personal settings. Core Configure has no Intel preference entry or request.                         | `WatchlistDialog.tsx`, `AlertPreferencesDialog.tsx`, and `alert-preferences/access.ts`.                                                             | [Existing Configure entry][figma-board], [new desktop][figma-desktop], and [new phone][figma-phone].      |
| BILL-12   | The separate preference editor reads and saves all published Intel writable fields, validates receipt ownership, preserves local input on refusal or an uncertain outcome, and requires explicit reload before replacing a newer saved record. No client-side phone verification is written.                       | `alert-preferences/{contracts.ts,queries.ts,usePreferenceEditor.ts,PreferenceForm.tsx,AlertCriteria.tsx,AlertDelivery.tsx,preferences.module.css}`. | The same new desktop/phone views. Shared watchlist targeting still uses its existing versioned writer.    |

The historical handover remains the source of the full row requirements:
`docs/portfolio-31/handover-2026-10-11/implementation-matrix.json`. This report is
a continuation, not a replacement for the historical contract/evidence record.
The source-only identity prerequisite is root-owned and is already listed above;
no other feature, route, package, lockfile, or shared foundation was changed in
this isolated patch.

### Personal preference contract and limits

All links below are pinned to the inspected published main SHA, rather than a
moving branch:

| Published source                                                                                                                    | Evidence used by this continuation                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Intel watchlist controller][native-controller] and [Tracker module][native-module]                                                 | The registered GET/PUT `tracker/watchlists/:clientId/alert-prefs` actions pass `tenantId`, `clientId`, and actual `ctx.clerkUserId` to the preference service. Tenant and Tracker-owner guards remain native authority.                                                                                                                                                          |
| [Tracker DTO][native-dto]                                                                                                           | Ten supported triggers; three materiality values; email cadence `realtime`, `daily`, or `weekly`; SMS cadence `realtime` or `daily`; nullable email/phone/quiet-hour values; and jurisdiction codes of at most two characters.                                                                                                                                                   |
| [Watchlist service][native-service]                                                                                                 | GET supplies saved values or native defaults. PUT is a replacement-like operation: omissions reset native defaults. PUT validates the client in the tenant and rejects a conflicting existing preference-row tenant. Server phone normalization and the existing verified number determine whether verification survives a save. There is no version/CAS token in this contract. |
| [Canonical Users controller][native-users], [shared tenant context][native-tenant], and [Intel tenant context][native-intel-tenant] | GET `/me` returns database `user.id` and a separate `user.clerkUserId`. The native tenant contexts type Clerk ID as a string. Intel personal preference `userId` is the Clerk owner.                                                                                                                                                                                             |
| [Intel alert service][native-alert]                                                                                                 | An empty jurisdiction list means all jurisdictions produced by the watchlist. A nonempty list is an explicit scope; the frontend does not insert `US` as an extra default.                                                                                                                                                                                                       |
| [SMS service][native-sms] and [channel controller][native-channel]                                                                  | Phone normalization, verification, and provider behavior are native concerns. Published verification-start, verification-confirm, and test-alert routes exist; this bounded editor does not execute or add those flows.                                                                                                                                                          |
| [Intel board controller][native-board] and [Core Tracker controller][native-core]                                                   | The existing owner-specific board paths remain unchanged. Core also publishes its own database-user-owned preference contract; this patch adds only the explicitly assigned Intel editor and does not fail over between owners.                                                                                                                                                  |

The frontend sends the complete fetched writable vocabulary: `triggers`,
`materiality`, `emailEnabled`, `emailAddress`, `emailCadence`, `smsEnabled`,
`smsPhone`, `smsCadence`, `quietHoursStart`, `quietHoursEnd`, and
`jurisdictions`. Explicit empty lists and null clears survive the projection.
The server-owned `smsPhoneVerified`, IDs, tenant, timestamps, and other response
metadata are excluded from the PUT body. Email length is capped at 320 and phone
length at 32, matching the DTO. Quiet hours accept the native 0:00–23:59 syntax;
this patch does not invent a timezone conversion or scheduling guarantee.

The GET default can omit `tenantId`, so the read schema permits its absence but
rejects a returned mismatch. Both `clientId` and Clerk `userId` must exactly match
the captured request owner. GET does not separately perform the service's
client-in-tenant assertion before producing default values; the PUT does. A
schema-valid default receipt therefore does not prove full live parent access.
Actual tenant/client policy still needs signed-in native acceptance.

Server phone normalization is not reimplemented in the browser. The UI's
verification caption is true only when a validated receipt marked the saved
number verified and the draft still contains that exact number. Editing the
number immediately removes that claim. The service may normalize a saved phone
or return null for an invalid one; the current successful receipt becomes the
new baseline. Saving preferences does not claim that a message was delivered or
that a phone was verified.

### Current record and mutation lifetime behavior

The board key now contains the current canonical read scope. It does not require
a Clerk ID because the existing board contracts do not share the personal
preference owner key. Read scope is distinct from mutation authority. Both
before dispatch and after receipt, a board read checks that its identity scope
is still current, and its request consumes the query abort signal. On the page,
cached data from a failed read supplies no rows, columns, or total. A selection
is resolved from the successful currently loaded set rather than a copied
record. Absence from that set is not a declaration that the bill was deleted or
untracked; the native service has a separate direct tracked-status lookup.

The preference query is scoped by explicit Intel owner, tenant, database actor,
returned Clerk ID, and client. It validates before and after the GET. The editor
captures a confirmed baseline and cache revision. Before a full PUT it rechecks
current identity and the exact saved source, then marks that read invalid so a
reopened editor must recheck the service if the response is lost. Only a current
validated receipt can replace the local baseline and shared cached record.

An actor, Clerk identity, role, client, or editor-lifetime change prevents a late
receipt from publishing into the next view. A concurrent GET also prevents the
older PUT receipt from overwriting its newer cache revision. An uncertain
transport/receipt outcome is explicitly unconfirmed; no automatic PUT replay
occurs. A definite native write refusal retains input and requires a fresh
saved read before another attempt. The visible reload action explains that it
discards local edits and offers a keep-edits choice. Closing or aborting the
local editor never claims that the backend rolled back an already dispatched
write. The native API has no compare-and-swap token, so this local stale-source
guard cannot prevent another device from racing a write after the last read.

### Design-to-code comparison and accessibility

The original [Bill Tracker board][figma-board] and [budget-alert modal pattern][figma-modal]
were inspected before authoring the missing personal preference composition.
The new Figma nodes were fetched again with design context and screenshots,
then the actual rendered browser views were compared at desktop and phone
sizes. The new form uses a 720px desktop dialog and a 358px phone dialog, the
reviewed Geist type hierarchy, 44px fields, existing border/color/radius tokens,
three-column/two-column trigger layouts, and stacked phone delivery sections.
The recorded screenshots show complete borders and no horizontal overflow.

The Code Connect mappings exposed by the Figma library refer to unavailable
`apps/web/src/vnext/components/fields/index.tsx` exports `CapiroInput` and
`CapiroSelect`. The canonical local equivalents reused here are
`apps/web/src/shared/portfolio/ui/SelectField.tsx` and
`apps/web/src/shared/portfolio/ui/Dialog.tsx`, alongside the current Portfolio
native input/checkbox styles and domain-local layout CSS. No different app's
private source or an unexported package control was imported. No generated,
substitute, or downloaded visual asset was needed.

Desktop and phone browser cases check the actual visible form, focusability,
Escape dismissal, accessible field labels, initial unchanged-save disabling,
and viewport overflow. Phone testing scrolls the complete form and reaches the
footer. The captured jurisdiction focus ring is expected because the keyboard
check runs before capture. These are targeted interaction checks and a visual
comparison, not a claim of a complete automated accessibility audit or native
signed-in acceptance. Root's later shared modal-geometry improvement is owned
by the integration branch; this patch does not edit that shared wrapper.

## Verification record

| Check                          | Result and scope                                                                                                                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency setup               | `npm ci` completed in the isolated worktree; 798 packages installed. No lockfile was changed.                                                                                                                                                         |
| Focused units                  | **24/24 passed**, four files: `tracker-alert-preferences.test.ts`, `tracker-current-data.test.ts`, and the preserved `bill-tracker.test.ts` / `watchlist.test.ts`. Final repeat completed in 544ms.                                                   |
| Final focused browser cohort   | **34/34 passed**, 0 skipped, 0 unexpected, 0 flaky, about 71 seconds. Includes 23 preference cases, seven board/current-data cases, and four preserved Bills/Watchlist cases. All service interactions used local intercepted fixtures.               |
| Current source types           | `npm run typecheck --workspace @capiro/web` passed after the new source and browser tests. Integration owns the full current-branch type/build run.                                                                                                   |
| Focused lint                   | Passed for the complete Bill Tracker folder and dedicated TypeScript tests/harness, with no ESLint warnings or errors. The environment printed its existing npm `http-proxy` deprecation warning.                                                     |
| Focused formatting             | Prettier check passed for the complete Tracker folder and dedicated tests/harness.                                                                                                                                                                    |
| Cohesion and dependency review | AST scanner with this report's four explicit supplementary review records: 0 boundary/origin/cycle errors and 0 blocking size findings. Whole-tree inventory at this base: 134 signals, 97 reviewed, 37 unchanged inherited signals still unreviewed. |

Browser coverage includes complete PUT preservation; missing actual Clerk ID;
client/user/tenant read mismatch; native GET 403/404 refusal without owner
fallback; failed refresh with retained local edits; unconfirmed writes without
replay; mismatched write receipts; native PUT 403 refusal; stale replacement
drafts; concurrent saved reads; server-owned phone verification; late receipts
after six actor/lifetime changes; Core-owner isolation; and desktop/phone
presentation. Board cases cover failed refresh 403/503, a changed current
selected record, selected record removal and return, late client/actor reads,
and immediate concealment after identity invalidation.

The preserved Watchlist cases still prove version-conflict input retention,
partial rejection handling, and ordinary-user read-only targeting. The preserved
Bills cohort includes its existing unrelated facility-clear case; that case
passed unchanged and is not claimed as new Tracker functionality.

### Initial failures retained and explained

The first combined cohort ran 31 cases: 29 passed and two new delayed-board-read
assertions failed. The captured DOM and screenshot showed the correct current
bill. Each title cell also contains the existing `Terminal risk` label, so an
exact text locator for only the title was incorrect. The dedicated tests were
changed to target the actual exact accessible table-cell name. Their absence
assertions were corrected the same way. They now explicitly wait for the
delayed route to finish and two render frames before assessing the final state.
No production source change was needed for those failures. Three additional
meaningful preference refusal/concurrency checks were then added, producing the
passing 34-case final cohort. Original failure traces/screenshots are retained;
the earlier failures are not erased or represented as a clean first run.

### Exact source review records

The scanner fingerprints the normalized full TypeScript function text. Each
changed/new size finding was read and assessed separately:

| Function              | Nonblank lines | Responsibility decision                                                                                                                                                                                                  |
| --------------------- | -------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ConfiguredTracker`   |            147 | One page composition: URL controls, successful-current selection, delegated board/table/drawer/configuration owners. No added persistence or provider workflow.                                                          |
| `AlertDelivery`       |             89 | Controlled presentation for the two fixed native delivery channels, their different cadence options, and the verified-receipt caption. No request or verification side effect.                                           |
| `PreferenceForm`      |            119 | One form's field composition, editor status, and explicit local discard/reload confirmation. Contract and lifetime work is delegated.                                                                                    |
| `usePreferenceEditor` |            161 | One confirmed baseline/draft/receipt lifecycle. Save, refusal, uncertainty, reload, and cleanup share captured actor, source revision, and pending lifetime; schemas, authority, queries, and UI remain separate owners. |

Complete reasons and exact fingerprints are in
`docs/portfolio-31/P6-TRACKER-PREFERENCES-SIZE-REVIEWS-20261011.json`. They are
supplementary review evidence for root's integration; this worktree did not
edit the central review registry. Inherited `BillDrawer`, `BillResults`,
`TrackBillDialog`, `WatchlistForm`, and `WatchlistTopics` size signals retain
their previous disposition. They were not blanket-approved by this patch.

The independent `portfolio_objectives` review compared the frozen contract,
controller, writer, and page composition to the pinned native sources. It found
no blocking defect, confirmed the complete eleven-field projection and receipt
ownership checks, and independently matched all four counts/fingerprints.
Root also inspected the final rendered captures against both new Figma views.

## Integration package and remaining gates

The exact 23-file patch manifest is
`docs/portfolio-31/P6-TRACKER-PREFERENCES-PATCH-20261011.json`: 13 Tracker source
files, seven dedicated tests/harness files, and three focused documentation/JSON
files. This branch has no feature commit. The only commit added locally was
the explicitly authorized root identity prerequisite cherry-pick, already
present on root's branch. Source/tests are frozen for independent review and
integration.

Raw local evidence is under
`outputs/evidence/portfolio-tracker-preferences-20261011/`:

- `first-cohort/`: original 31-case JSON result, desktop/phone screenshots, and
  both failure screenshots, contexts, and traces.
- `final-cohort/`: successful 34-case JSON result and final desktop/phone
  screenshots.
- `architecture-supplemented.json`: exact read-only dependency/size scan with
  the four separate review records supplied in memory.
- `focused-checks.json`: final focused unit/lint/format command results.

Actual deployment owner activation, signed-in native read/write acceptance,
server role/tenant/channel policy behavior, production identity projection,
OTP verification, test alerts, quiet-hour execution, email/SMS provider
delivery, and cross-device replacement-write behavior were not exercised.
The published OTP and test-alert endpoints are available contracts, not missing
backend designs. Adding or accepting those user-facing provider flows is
separate from this bounded read/save editor. No AWS resources were requested or
created. No actual preference PUT, verification, test alert, or provider send was
performed. BILL-01/03/07/11/12 receive this local continuation evidence and no
final acceptance in this report.

[figma-board]: https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-56471
[figma-updates]: https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-57827
[figma-modal]: https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-106678
[figma-desktop]: https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=971-187129
[figma-phone]: https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=975-187289
[native-controller]: https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/tracker/tracker-watchlist.controller.ts
[native-module]: https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/tracker/tracker.module.ts
[native-dto]: https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/tracker/tracker.dto.ts
[native-service]: https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/tracker/tracker-watchlist.service.ts
[native-users]: https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/users/users.controller.ts
[native-tenant]: https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/packages/shared/src/index.ts
[native-intel-tenant]: https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/auth/tenant-context.ts
[native-alert]: https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/intel-alert/intel-alert.service.ts
[native-sms]: https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/tracker/sms/sms.service.ts
[native-channel]: https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/tracker/tracker-channel.controller.ts
[native-board]: https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/tracker/tracker-board.controller.ts
[native-core]: https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/tracker/tracker.controller.ts
