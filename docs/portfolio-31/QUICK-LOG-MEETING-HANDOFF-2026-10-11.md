# Quick log meeting handoff — CORE-102

## Bounded outline, before edits

The owner authorized a Portfolio-only, local navigation handoff from the
existing client Quick log to the existing Calendar meeting form. Calendar
already accepts `/portfolio/:clientId/calendar?new=meeting` and requires
separate start and end times. The activity endpoint does not accept a meeting
kind; this work will not add one or infer a meeting duration.

The existing Figma Quick log screen `411:42657`, dialog `411:42756` and kind
chooser `411:42775` were inspected. The existing design's Meeting option cannot
be sent to the activity contract. The newly authorized continuation will add a
small outline “Record a meeting” action and a concise caption explaining that
the required start/end times are entered in Calendar. It will be authored in
the existing Figma continuation area before implementation, with desktop and
phone content widths, without changing the baseline frame.

### Design-system preparation

| Requirement         | Evidence                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Code Connect        | Repository search found no `.figma.*` mappings for these controls                                                                         |
| Existing components | The current Portfolio header variation uses `v2/Button` Outline `12:376`, set `12:388`; its exact existing properties and style were read |
| Text                | Product font is Geist; use the existing `v2/Button` and `v2/Caption` styles                                                               |
| Tokens              | Existing card, input, foreground, muted-foreground and radius-lg variable bindings were inspected; spacing discovery precedes the write   |
| Images              | This added action/caption row contains no image, SVG or content asset; no full-screen raster is part of the deliverable                   |
| Placement           | Reserve a separate continuation wrapper below the Objective header variation, without modifying its nodes or the Tracker lane             |

### Code ownership and behavior

`client-profile/QuickLog.tsx` will keep the existing activity fields,
validation, save receipt, Undo and uncertain-outcome owners. Its only new
behavior is a button with `type="button"` that navigates to the exact encoded
current client Calendar path. The current `canCreate`, pending and uncertain
states will disable the action and guard its click handler. Neither title,
details nor person identity will enter the URL, and clicking it will not create
an activity, meeting or other record.

A small local CSS module may own the added action/caption wrapping. Do not
extract the existing form just to lower its line count. No Calendar source,
shared primitive, service, schema, duration or member-note semantics belongs
to this lane. Root separately owns Calendar current-client/feed guards.

### Verification plan

Check the actual existing Quick log-to-Calendar route with zero writes, blank
meeting subject/details and required start/end fields. Verify that rejected
role, pending save and unknown save outcome cannot use the new action. Preserve
the existing note/Undo, failed person-linked note and unknown receipt tests.
Compare the new row on desktop and phone against its authored Figma variation,
then run focused types/lint/format and return exact changed-function review
evidence to root. Keep source/browser qualification distinct from signed-in
meeting persistence acceptance.

## Results

The bounded CORE-102 handoff is implemented and frozen for coordinator
integration. It adds no meeting write and leaves the existing activity path
intact. This is frontend source and synthetic browser qualification; it does
not close the audit row or claim signed-in service acceptance.

### Figma source and authored continuation

The original [Quick log screen](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-42657)
and its exact [kind chooser](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-42775)
were read before the authorized addition. Existing baseline nodes were not
changed.

| Authored node                     | URL                                                                                                                                      | Layout                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Continuation wrapper `984:187909` | [Quick log · Calendar handoff · CORE-102](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=984-187909) | Existing Portfolio 3.1 page, x99808/y5800, 688×219                         |
| Desktop row `985:187911`          | [Desktop handoff](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=985-187911)                         | 590 px content width; 145×36 button with a 12 px caption gap               |
| Phone row `985:187921`            | [Phone handoff](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=985-187921)                           | 308 px content width; caption below the intact button with an 8 px row gap |

The two new controls are instances of the existing `v2/Button` Outline
component `12:376`, with label “Record a meeting” and both optional icons
disabled. The hint reuses the existing `v2/Caption` Geist Regular 12 px style
at 1.4 line height. Existing card, foreground, muted-foreground, input,
radius-lg, space-2, space-3 and space-6 variables remain bound in Figma. The
added nodes contain no image-filled layers or new content assets. The
rendered browser implementation reuses the existing Portfolio `.button`
control and theme variables; its small local stylesheet adds only row
wrapping, the inspected caption typography, and the existing outline
button's letter spacing/shadow.

The fresh continuation design context and its screenshot were inspected
after creation. Actual desktop and phone browser captures were then compared
with that reference. The desktop action/caption stays on one row; the phone
caption wraps below the whole button without clipping or horizontal scroll.
The dark phone capture uses the existing theme. The coordinator independently
inspected both authored row nodes as well.

### Implemented behavior and ownership

| File                                                                                | Responsibility                                                                                                       |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/features/portfolio/client-profile/QuickLog.tsx`                       | Adds one visible, non-submit navigation action and its accessible hint to the existing activity form                 |
| `apps/web/src/features/portfolio/client-profile/quick-log/meeting-entry.module.css` | Owns only the added action/caption layout and exact local presentation                                               |
| `apps/web/tests/browser/quick-log-meeting.spec.ts`                                  | Six focused navigation, authority, pending, unknown-result and phone cases using the real frontend route composition |
| This report                                                                         | Bounded outline, Figma provenance, behavior, checks and acceptance limits                                            |
| `docs/portfolio-31/QUICK-LOG-MEETING-SIZE-REVIEW-2026-10-11.json`                   | Exact changed-function responsibility review for coordinator integration                                             |

The action is enabled only while Quick log is open, the existing
`canCreate` is true, and no activity mutation or uncertain outcome is active.
The click handler checks the same gate. `type="button"` keeps keyboard
activation independent of the activity form's required Title field. The
caption is associated through `aria-describedby` and says: “Enter the
required start and end times in Calendar.”

Navigation uses only
`/portfolio/${encodeURIComponent(clientId)}/calendar?new=meeting`. It does
not reuse a conflicting query-string client, serialize title/details/person
identity, or call any write endpoint. Route navigation unmounts the old form;
it does not separately close Quick log through its query-replacement callback,
which would introduce a competing navigation. Calendar remains the owner of
the new meeting dialog, explicit start/end inputs, service write and receipt.

The original activity kinds, input limits, validation, activity mutation,
exact save receipt, lost-result handling and Undo remain in their existing
owners. No Calendar source, shared primitive, service interface, central
review registry, lockfile or backend file changed in this slice. The
coordinator's Calendar current-client/feed guard changes are separate.

### Verification

| Check                                 | Outcome                                 | Scope and evidence                                                                                                                                                                                          |
| ------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing Quick log/removal unit suite | **16/16 passed**                        | `tests/overview-removal.test.ts`; observed Vitest output, not a persisted raw unit report                                                                                                                   |
| New browser cases                     | **6/6 passed**                          | Both current-client URLs, phone keyboard/wrapping, rejected role, pending save and uncertain receipt                                                                                                        |
| Preserved browser regression cases    | **6/6 passed**                          | Exact-entry Undo, wrong creator, lost Undo, unknown second create, unsupported role and failed person-linked note/provider refusal                                                                          |
| Combined browser cohort               | **12/12 passed**, zero skipped/flaky    | First and only CORE-102 browser cohort, 53.6 seconds; results preserved separately from the earlier Objective cohorts                                                                                       |
| TypeScript                            | Passed                                  | `npm run typecheck --workspace @capiro/web`; the first check found only the new test locator's union-element `.click()` type, corrected with an explicit `HTMLButtonElement` cast before this passing check |
| ESLint                                | Passed                                  | Only changed `QuickLog.tsx` and the new browser spec                                                                                                                                                        |
| Formatting and whitespace             | Passed                                  | Focused Prettier and `git diff --check`                                                                                                                                                                     |
| Current-tree architecture             | Zero boundary/review-schema errors      | Four exact changed/new function reviews are pending registry integration: the three frozen Objective records plus this QuickLog record                                                                      |
| Proposed review integration           | Zero errors, zero blocking size signals | In-memory review substitution only; the central registry is unchanged                                                                                                                                       |

Both client-route cases fill a private activity draft, then verify the exact
current-client Calendar URL, empty meeting subject/description and empty
required Starts/Ends fields, with zero backend writes and zero unexpected
requests. The fixed-client meeting dialog has no client selector. The phone
case activates the action by Enter while activity Title remains empty and
autofocused initially. Rejected-role, pending and uncertain cases also try
native button activation and remain on Quick log. The pending case still
finishes the original exact activity receipt, and the uncertain case retains
the activity draft without exposing Undo.

Existing assertions in `overview-removal.spec.ts` and `relationships.spec.ts`
were not edited. No new browser failure required a source or assertion change.
Port 5191 was released to the Tracker lane after the owned Playwright server
stopped.

The current source scan reports 131 size signals: 90 exact existing reviews,
37 inherited/unreviewed functions, and four changed/new signals pending
integration. `QuickLog` is the only CORE-102 changed size signal: its body has
108 nonblank lines and fingerprint
`527bbeee1ca91882b2c5f5970be50d48019bdeafc020c22bf239a05ab28f6850`.
It remains one form/entry composition; authority, lifetime, persistence and
receipts stay in `useQuickLog`, and all meeting input stays in Calendar. The
specific author review records that reasoning without granting future size
growth an exception. Substituting the four exact author records in memory
produces 94 reviewed signals, 37 inherited/unreviewed signals and zero
blocking signals. These are worktree results, not a claim about a later
combined integration tree.

### Evidence and remaining acceptance

- Browser result: `apps/web/work/quick-log-meeting-evidence/cohort-1/browser-results.json`.
- Manifest with source and evidence SHA-256 hashes: `apps/web/work/quick-log-meeting-evidence/manifest.json`.
- Actual desktop captures: `apps/web/work/quick-log-meeting-desktop.png` and `apps/web/work/quick-log-meeting-row-desktop.png`.
- Actual phone captures: `apps/web/work/quick-log-meeting-phone-dark.png` and `apps/web/work/quick-log-meeting-row-phone-dark.png`.
- Actual scan: `apps/web/work/quick-log-meeting-architecture.json`.
- Proposed exact-review scan: `apps/web/work/quick-log-meeting-architecture-proposed-reviews.json`.

The existing 18-file Objective slice was rechecked against its frozen manifest
with zero hash mismatches and remains separate. Both slices are uncommitted in
`codex/portfolio-objective-intake-20261011`, based on `ee39c2f`, for the
coordinator to integrate.

CORE-102 remains open for actual signed-in service acceptance and the combined
integration check. The browser network responses here are intercepted
synthetic fixtures. This handoff deliberately uses the existing Calendar
entry point, so its implementation does not depend on a new meeting schema or
an Objective lifecycle candidate. No resources were created and no AWS CLI
command, backend activation, deployment or live meeting write was performed.
