# Facility address-action lifetime continuation — 11 October 2026

## Row mapping after root integration

Root integrated the immutable action slice as
`3eeaeb785bf131d41f7bcdc28170d5bfa587cd0a`. The follow-up row review confirmed
that the same named interactions also directly support **CORE-037** (resolve
district), **CORE-038** (retry geocoding) and **CORE-039** (choose an address
candidate), alongside their CORE-033–036 facility context. The additive ledger
mapping now includes these action IDs. The original implementation outline and
frozen source/evidence remain unchanged. All rows remain open, and CORE-039
retains the unpublished-contract/activation limit described below.

## Outline before implementation

This is the bounded follow-on to the immutable Core profile CRUD checkpoint in
`outputs/evidence/core-profile-current-state-20261011/frozen-crud/`. It remains in
the isolated `codex/portfolio-profile-current-state-20261011` worktree. Root may
integrate that checkpoint independently. Scope stays within CORE-033–036 and the
existing facility address-resolution interaction; no other feature or backend
source changes are authorized here.

### Current native contract

Re-read capirov2 main and its exact controller/service, pinned to
`4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`:

- Standard-user POST `clients/:clientId/facilities/:id/geocode` has no body. It
  updates the retry schedule, clears the previous error, starts asynchronous
  geocoding, and returns the actual facility. A successful response acknowledges
  the request; it does not prove provider completion.
- Standard-user POST `.../:id/resolve-district` has no body. It resets resolution
  state, awaits the existing resolver, and returns the current same facility.
  Native tenant/client/facility checks remain server-owned.
- Main does **not** contain the reviewed-candidate route or revision field. The
  existing conditional Portfolio client uses draft PR
  [2373](https://github.com/neo-capiro/capirov2/pull/2373), independently read as
  open, draft, and unmerged at
  `6e5774a14c73ea04f0a77650a5bbd33173bcc9b3`. Its POST
  `.../:id/geocode-candidate/reviewed` accepts only `{candidateIndex,
expectedRevision}`. The revision is the actual optional returned opaque
  `v1:<64 lowercase hex>` semantic snapshot. Missing revision disables selection;
  stale 409 refreshes the displayed snapshot; unsupported 404 never falls back to
  the legacy unchecked route. This follow-on preserves that conditional contract
  and records its activation dependency rather than inventing main support.

Native main sources are already preserved in the CRUD evidence directory. The
draft controller, service, and exact `CONTRACT-CANDIDATE.md` are preserved in
`outputs/evidence/core-facility-actions-20261011/native-reviewed/`.

### Responsibilities and behavior

- `facility-action-writer.ts` will own the existing action vocabulary, current
  actor/source/facility preflight, actual displayed candidate-index/revision
  association, unchanged POST bodies, and actual facility/client/optional-tenant
  receipt identity. It will not infer provider completion, server cancellation,
  semantic CAS for the published routes, or new native fields.
- `facility-action-attempt.ts` will own a small session-local per-actor/client/
  facility pending/unknown fence. It is separate from CRUD attempts and is not a
  durable operation receipt or generic workflow abstraction.
- `facility-map-mutations.ts` will own the explicit action lifetime. It captures
  the current native actor and facility read, aborts obsolete local requests on
  actor/source/view changes, suppresses their cache and UI effects, and preserves
  unknown outcome after dispatch. Matching current receipts alone may refresh
  the current facility/representation/nexus feeds. Definite candidate refusals
  may refresh the current displayed snapshot; late errors may not refresh a
  replacement view.
- `FacilityGeocoding` and a small status view will retain the existing displayed
  address/status/candidate structure and controls. An unknown result requires an
  explicit current GET review before another deliberate action. The review does
  not claim the earlier provider stopped. No automatic POST replay, fallback, or
  provider call for verification will be introduced.

Existing Figma Manage facilities and facility-detail references, primitives,
and exact assets from the CRUD review remain the visual basis. This continuation
does not redesign a composed view or add an unrelated component/frame.

The first fixed browser cohort exposed an existing phone detail-layout gap:
the real `Unresolved` district value makes the three-card stats grid wider than
its dialog. Preserve that failing capture and the original CSS preimage, then
make the existing cards use one column below 480px in the local
`facility-map.module.css`. Keep the values, labels, DOM reading order, tokens,
and desktop composition intact. The unchanged no-overflow assertion and
preserved map phone case will qualify the correction.

### Verification plan

Add dedicated synthetic regressions for mismatched receipt identity, missing or
changed current candidate source, failed reads, actor/client/source changes,
late success/error, pending close/reopen, and uncertain action review. Preserve
all original facility-map assertions. Its existing 503-then-explicit-retry case
may gain the now-required GET review step; that retains its failure, one-attempt,
exact route, and successful retry assertions without treating 503 as a proven
non-write. Capture baseline against the immutable CRUD source once the browser
port is available, then restore and hash-check fixed source for the final cohort.
Run focused native contract units, types, lint, and exact per-function size
review. No live request, provider call, AWS command, or backend mutation is part
of local qualification.

## Implementation and evidence

### Implemented boundary

| Owner                        | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `facility-action-writer.ts`  | Preserves the three existing action shapes. Validates canonical current actor, exact scoped successful facility source, current facility identity/address projection, and actual returned candidate index/revision. Sends no invented IDs, preconditions, or body fields. Checks real returned facility/client identity and optional nonempty tenant identity.                                                   |
| `facility-action-attempt.ts` | One canonical key helper for session-local actor/tenant/client/facility attempt state. Both pending and unknown status survive view close/reopen in the same cache. A monotonic local token prevents an older result from clearing a newer local attempt; it is never sent to the backend.                                                                                                                       |
| `facility-map-mutations.ts`  | Explicit dispatch and effect lifetime. Subscribes to the captured identity/source during a dispatched request, aborts obsolete browser work, and retains unknown status. Stops that watcher before its own qualified invalidations. Late success/error cannot refresh or report success in a replacement source/view. A definite reviewed-candidate refusal may refresh only its still-current displayed source. |
| `FacilityGeocoding`          | Keys one address-resolution view by actual actor, client, and facility; displays existing native status, provenance, candidate labels, and actions. It passes only the displayed choice/index and server revision.                                                                                                                                                                                               |
| `FacilityActionStatus`       | Displays native failure, pending-result uncertainty, explicit saved-state review, and truthful request acknowledgement. It performs no request or cache work.                                                                                                                                                                                                                                                    |

The local `facility-map.module.css` additionally owns the responsive correction:
the existing metric cards stack below 480px so the unresolved district value fits
the phone dialog. Their values, labels, reading order, tokens, and desktop grid
remain intact.

The controller checks the current cached attempt synchronously at dispatch as
well as disabling pending controls. Current actor and saved source are checked
before the POST and again before any completion effects. A source becoming
invalidated, fetching, failed, or replaced makes the old request obsolete.
Aborting the local request preserves unknown outcome; no success is inferred
from a closed dialog or a stopped browser request.

After an uncertain result, the explicit **Review current address resolution**
action performs a GET only. A successful current same-facility read releases the
local action fence for another deliberate user command and explains that the
earlier provider request may still be running. A failed read, missing facility,
changed actor, or replacement attempt cannot release it. Nothing automatically
replays a provider POST. The fence is session-local and does not survive a new
Query cache or browser reload.

Successful retry copy now says **“Retry requested. Refresh this page later to
check the current result.”** It does not promise polling or provider completion.
Existing limited facility polling remains unchanged; no additional polling or
provider calls were added for verification.

### Native source status

| Existing action                                                                    | Exact source                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Remaining native limit                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bodyless `POST .../:id/geocode`                                                    | [Published controller](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/clients/client-facilities.controller.ts), [published service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/clients/client-facilities.service.ts)                                                                                                                                                        | Receipt acknowledges the native schedule update and asynchronous request. It is not a completed geocode or cancellation receipt.                                                                                                             |
| Bodyless `POST .../:id/resolve-district`                                           | Same published controller/service                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Native resolver and updated facility read are service-owned. The frontend adds no CAS or provider cancellation contract.                                                                                                                     |
| `POST .../:id/geocode-candidate/reviewed` with `{candidateIndex,expectedRevision}` | [Draft controller](https://github.com/neo-capiro/capirov2/blob/6e5774a14c73ea04f0a77650a5bbd33173bcc9b3/apps/api/src/clients/client-facilities.controller.ts), [draft service](https://github.com/neo-capiro/capirov2/blob/6e5774a14c73ea04f0a77650a5bbd33173bcc9b3/apps/api/src/clients/client-facilities.service.ts), [exact draft contract](https://github.com/neo-capiro/capirov2/blob/6e5774a14c73ea04f0a77650a5bbd33173bcc9b3/docs/portfolio-geocode-cas/CONTRACT-CANDIDATE.md) | PR2373 remains open/draft/unmerged at the inspected head. Missing revision disables the existing conditional frontend path; 404 never falls back to the unchecked legacy route. API plus both worker activation remains a native owner gate. |

`native-status.json` records the read-only main/PR status inspection. The three
draft source files are now under the report's canonical `core-facility-actions`
evidence directory; their hashes were preserved when correcting the initial
evidence-directory typo. The draft opaque revision is never reconstructed from
the frontend projection. The projection comparison detects a stale displayed
facility locally and is not a server precondition or native semantic digest.

### Design and responsibility review

This adds state handling inside the existing address-resolution section, using
the current [Manage facilities reference 411:58269](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-58269)
and the already-inspected facility detail/removal composition. Existing assets,
map geometry, tokens, and shared dialog/field ownership remain unchanged. No
full combined-facilities design parity or new Figma frame is claimed by this
bounded follow-on.

Root independently read all five fixed owners, unit assertions, and pinned main
and draft native contracts. It found no actor/source/receipt/lifetime blocker.
Its three bounded corrections were applied before the browser baseline: fix the
evidence location, remove an unsupported completion/polling promise, and reuse
the canonical attempt-key helper. The initial fixed snapshot remains preserved;
the reviewed snapshot is separate in `fixed-for-browser/`. The first fixed
browser run then found one actual phone overflow in the inherited three-column
metric grid. Its 18/19 result, screenshot, trace, and CSS preimage are retained.
The five-line local responsive rule resolved it without changing assertions.
The final 19/19 run used the separately hash-verified
`fixed-after-phone-layout/` snapshot.

Exact AST review records cover `useFacilityAction` (183 nonblank lines), its
`run` operation (89), and `CurrentFacilityGeocoding` (109). Each was read and
reviewed separately in `CORE-FACILITY-ACTIONS-SIZE-REVIEWS-20261011.json`; no
owned source file exceeds 400 nonblank lines. The source, receipt, attempt, and
status responsibilities are separate rather than one cross-feature workflow.

### Verification chronology

The frozen CRUD source integrated by root as `3fed90a` supplies the exact
behavioral preimage. While P2 held the browser port, the fixed source and units
were prepared. Before the baseline, the original `FacilityGeocoding.tsx` and
`facility-map-mutations.ts` were restored from that immutable preimage and
SHA-256 checked. New helper/status modules remain unwired during the baseline;
the fixture's explicit `Facility[]` annotation changes no runtime behavior.
`browser-source-switch.json` records original, first-fixed, and reviewed-fixed
hashes. Source was held constant during each browser cohort. The final run's
source/test hashes matched the immutable snapshot before and after execution.

| Gate                                           | Result                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reviewed fixed focused units                   | **79/79 passed**, including 24 new action/preflight/receipt/attempt cases plus 55 preserved profile/facility cases; `reviewed-final-units.json`. The only subsequent code change was the local responsive CSS rule.                                                                                                    |
| Reviewed fixed TypeScript and focused ESLint   | Passed. A test-only unused destructuring binding found in the first lint pass was removed; final focused lint has no warnings.                                                                                                                                                                                         |
| Eight-case actual frozen-CRUD browser baseline | **Seven expected behavior failures, one preserved definite-refusal pass**, zero skips/flakes; `baseline-browser-results.json` and `baseline-artifacts/`. The mismatched-tenant baseline capture shows a false retry acknowledgement.                                                                                   |
| First fixed browser cohort                     | **18/19 passed**. The remaining failure was a real phone overflow from the unresolved district metric, preserved in `fixed-first-browser-results.json` and `final-browser-artifacts/`.                                                                                                                                 |
| Final fixed browser cohort                     | **19/19 passed in 57.6 seconds**, zero skips/flakes; `final-browser-results.json` and `fixed-final-browser-artifacts/`. Includes all eight new action cases, all seven preserved facility-map cases, and four preserved facility current-read/CRUD lifetime cases.                                                     |
| Rendered desktop and phone inspection          | Inspected the final unknown-result captures at 1440px and 390px. Desktop cards and actions remain coherent; the phone metric cards, uncertainty text, review action, and footer fit horizontally and remain reachable by scrolling. The unchanged no-overflow assertion passes.                                        |
| Exact source and responsibility check          | All ten code/test hashes matched the tested snapshot; all 34 other frozen CRUD dispositions remain unchanged. Three separate AST function records match current source, and no owned source file exceeds 400 nonblank lines. The deleted broad `client-profile/mutations.ts` has no remaining imports in that feature. |

The final browser command selected the eight action cases and eleven preserved
map/current-read/CRUD cases in `facility-action-lifetime.spec.ts`,
`facility-map.spec.ts`, `profile-current-state.spec.ts`, and
`profile-write-lifetime.spec.ts`. It used the explicit local Chromium executable
and `FONTCONFIG_PATH=/etc/fonts`; every service response was a synthetic fixture.
The runner stopped and a local bind check confirmed port 5191 was released.

All original `facility-map.spec.ts` route, body, error, count, and success
assertions are retained. The existing 503-then-retry case adds exactly one
explicit GET-review step before its original Retry geocoding action. Treating a
503 as an unknown dispatched outcome is the intentional behavior change; no
assertion was deleted or weakened.

Reviewed-candidate native activation and signed-in provider acceptance remain
separate gates. Local aborts and synthetic receipts cannot establish provider
cancellation, completed persistent geocoding, privacy/RLS acceptance, or
cross-device completion. No live/provider/AWS operation was run.

### Integration checkpoint

`outputs/evidence/core-facility-actions-20261011/frozen-actions/manifest.json`
contains the twelve exact dispositions relative to root's integrated CRUD
checkpoint `3fed90a`: six feature/style files, four dedicated test/fixture files,
and this report plus its three AST review records. Each modification records
its preimage SHA-256; every resulting file is copied into the immutable
`frozen-actions/files/` tree with its final SHA-256. This follow-on has no new
shared contract export, dependency, lock, route, auth, or registry changes.
The original CRUD snapshot remains separate and unchanged.
