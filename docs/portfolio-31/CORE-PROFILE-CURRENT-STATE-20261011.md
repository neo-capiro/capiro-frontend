# Core profile current-state continuation — 11 October 2026

## Outline before implementation

Owned isolated worktree: `capiro-portfolio-profile-current-state`, branch
`codex/portfolio-profile-current-state-20261011`, base `0beb51c`.
Audit scope is **CORE-028–032**, **CORE-033–036**, and **CORE-045/046**.
Root owns the immutable integrated full-suite checkpoint and port 5191 until
explicit release. No other feature, backend, provider, AWS, or live write is
part of this continuation. No commits will be created in this worktree.

### Responsibilities and boundaries

- The existing Portfolio Dialog, fields, API provider, Query cache, canonical
  `currentClientWriter` / `assertClientWriter`, and pure index schemas remain
  their canonical owners. A small profile-local authority module will subscribe
  to current identity state and add the native admin requirement for notes/team;
  it will not grant backend authority or introduce a workflow framework.
- Notes retain their targeted native PUT and get a dedicated controlled draft
  and request-lifetime owner. Only a current matching Client/notes receipt can
  close the editor. Failed reads conceal saved data; refusal retains input;
  uncertain writes require an explicit saved read before another save.
- Team and owner changes retain separate native commands and receipt types.
  The editor owns selected member/role input. Its writer validates current
  successful roster/options and captured actor/client/view, refuses unavailable
  choices, and verifies returned roster/owner effects. The account owner remains
  a single native owner; ordered Primary–Quaternary ranks are not invented.
- Facility reads return only successful current data. Card/map/detail selection
  uses a current ID and loses its selection after failure or removal. A dedicated
  facility writer owns create/edit/remove attempt state, receipt association,
  current actor/view checks, retained input, and explicit refusal/unknown
  outcomes. Existing form normalization and server district/geocode behavior
  remain unchanged. Unknown creation cannot be inferred from a similar list row
  or automatically replayed. Any local fence is explicitly not durable across
  browser reload; the native API has no operation/CAS token.
- `client-profile/queries.ts` may change only `useTeam`/`useFacilities` and
  compatible scoped helpers; `useActivity` remains unchanged. Existing
  `mutations.ts` becomes deliberate exports to the dedicated domain owners.
  Existing schema definitions are reused; actual native receipt fields alone
  are validated. New notes/team/facility modules stay within client-profile.
- Root authorized the separate pure-export prerequisite:
  `index/contracts-public.ts` adds existing `memberSchema`, `ownerSchema`, and
  `Member`; definitions and `index/public.ts` remain unchanged. It will be
  separately identified in the integration manifest.

### Native source and design inspected first

Published capirov2 main was re-read at
`4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`:

- `apps/api/src/clients/clients.controller.ts` and `clients.service.ts`: GET
  client; admin-only PUT `:id/profile-notes`, 0–20,000 characters and explicit
  empty-string clear, returning the updated Client via `withLogoUrl`.
- `client-team.controller.ts` / `client-team.service.ts`: standard-user roster
  reads; admin-only POST/DELETE. Add can update an existing member's role; both
  writes return `ClientTeamMember[]`. The owner is always projected separately
  and cannot be removed by the team endpoint.
- `client-account-owner.controller.ts` / `client-account-owner.service.ts`:
  active tenant member options; admin-only owner PUT with nullable
  `accountOwnerUserId`; response contains assignment and member fields without
  clientId/tenantId. Captured request scope supplies context, not invented fields.
- `client-facilities.controller.ts` / `client-facilities.service.ts`: existing
  GET/POST/PATCH/DELETE routes are standard-user gated; create/edit return the
  facility, delete returns `{deleted: true}`. Native normalization, async
  geocode/indexing, tenant/client validation, and unversioned persistence remain
  native concerns. No provider-triggering operation is exercised locally.

Read the installed Next 16.4.0 `use-client` guide. Loaded the mandatory Figma
design-to-code skill and fetched current context/screenshots for account team
`411:51801`. Manage/remove facility parents `411:58068` and `411:58563` returned
sparse metadata, so their exact dialog children `411:58269` and `411:58764` were
fetched with high-fidelity context and screenshots. Notes retains the matrix's
Overview reference `411:47010` and existing editor layout. The bounded change
preserves existing UI assets and layouts while fixing state/availability; full
combined-facilities visual parity is not claimed from these guard changes.

### Verification plan

Write dedicated synthetic browser regressions against the existing source
before wiring the corrections, retaining the original facility creation,
clearing, map, representation, and other row assertions. Capture actual baseline
failures once root releases 5191. Pure native receipt/selection/authority units
may run independently. The final focused cohort will cover failed/current reads,
unavailable member choices, mismatched receipts, refusal/unknown outcomes,
actor/client/view changes, late results, close/reopen, and desktop/phone keyboard
behavior. Run focused types/lint/format and per-function AST responsibility
reviews; root integrates the exact review records and owns broad regression.

## Implementation and evidence

### Implemented scope

| Audit rows   | Current source owners                                                                                                                          | Qualified local behavior                                                                                                                                                                                                                                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CORE-045/046 | `NotesDialog`, `useProfileNotesEditor`, `notes-writer`, `profile-read-queries`                                                                 | Saved notes appear only from a successful actor/client read. The controlled draft survives refusal and source changes. The targeted native PUT contains only `notes`, including explicit empty-string clear. Only a matching Client and notes receipt can close the initiating editor.                                                                                                  |
| CORE-028–032 | `TeamDialog`, `TeamMemberFields`, `useProfileTeamEditor`, `team-writer`                                                                        | Failed roster/options reads conceal cached records and prevent writes. A missing member remains visibly unavailable. Add/update, removal, and nullable single-owner assignment validate the actual native response shape and requested effect. Current owner membership roles remain visible and must match the requested trimmed role.                                                 |
| CORE-033–036 | `FacilitiesCard`, `FacilityDialog`, `FacilityDetailDialog`, `FacilityRemoveDialog`, `useFacilityWriter`, `facility-writer`, `facility-attempt` | Failed reads hide stale locations and counts. Removed/failed selection cannot reopen later merely because its ID returns. Create/edit/remove require the current facility source, actor, and record; receipt identity and submitted stable fields are checked. Pending or uncertain create/edit/remove attempts remain fenced across closing and reopening within the same Query cache. |

`profile-access` reuses the canonical client writer identity checks and adds the
native role requirement. It subscribes to identity with TanStack's batched
notification mechanism. Identity fetching stays at the entry components; nested
editor mounts cannot silently requalify an invalidated identity. `profile-source`
captures the successful read's `dataUpdateCount` and refuses invalidated, failed,
or in-flight sources. Abort is a local lifetime mechanism, never evidence that a
dispatched native write rolled back.

The dedicated notes/team/facility writers replace the now-unused old
`client-profile/mutations.ts`, which is deleted rather than retained as an empty
compatibility module. No consumer still imports its old hooks. The account team
and facilities query owners changed; `useActivity` did not. `ClientOverview`
already renders its team counts and owner from the `useTeam` result, so concealing
failed current reads in that hook fixes those consumers without an Overview edit.
The canonical index schema definitions and shared auth owners remain unchanged.

Facility form extraction preserves every existing native input and explicit null
clear. `name`, address fields, employees, notes, and submitted state district
fields must match the receipt. Congressional district normalization remains
native: a valid returned at-large `00` is not rejected solely because a submitted
value was normalized. Facility deletion still accepts the real `{deleted:true}`
receipt; no invented echoed ID or tenant field was added.

### Pinned native evidence and limits

Full source copies are preserved in
`outputs/evidence/core-profile-current-state-20261011/native-reference/`.
The reviewed published source is pinned to
[`4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`](https://github.com/neo-capiro/capirov2/tree/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace).

- [Clients controller](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/clients/clients.controller.ts)
  and [service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/clients/clients.service.ts)
  define the admin-only, 0–20,000-character targeted notes PUT and updated Client
  response. The client validates actual returned client identity and optional
  tenant identity. This is an unversioned write; no cross-device CAS guarantee is
  claimed.
- [Team controller](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/clients/client-team.controller.ts)
  and [service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/clients/client-team.service.ts)
  define the standard-user list and admin add/remove routes. The native owner
  projection deliberately includes `m.role`, so owner membership role updates
  require the same requested-effect check as other members. Roster receipts do
  not echo client or tenant IDs; captured request scope and current actor/source
  provide the available association, without fabricated fields.
- [Owner controller](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/clients/client-account-owner.controller.ts)
  and [service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/clients/client-account-owner.service.ts)
  provide active tenant member options and one nullable account owner. Returned
  assignment and nested member identity must agree. Primary–Quaternary ranking
  semantics (CORE-099) remain unavailable from this contract.
- [Facilities controller](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/clients/client-facilities.controller.ts)
  and [service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/clients/client-facilities.service.ts)
  define standard-user CRUD and tenant/client checks. Receipt identity is actual
  facility/client identity, plus tenant when supplied. Native district
  normalization, asynchronous geocoding/indexing, and provider completion remain
  service concerns. There is no native operation token, CAS token, or durable
  client retry receipt. A similar row in a later list cannot prove which unknown
  create completed.

An explicit current GET lets the user review saved state after uncertainty. It
does not prove that another device has stopped writing or that an earlier
provider request is finished. The facility attempt fence lasts only while the
same Query cache exists; it is not durable across reload. Starting a separate
facility entry after review clears the old form and never replays it.

The inherited geocode/resolve/reviewed-candidate writer was intentionally not
claimed as requalified by this CRUD checkpoint. Its UI now receives current
parent availability, but its actor/source/lifetime handling is a separately
approved follow-on. No provider action was called against a live service.

### Figma and rendered review

Inspected current reference frames in the existing Capiro file:

- [Account team parent 411:51801](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-51801)
  and its dialog child **411:52061**.
- [Manage facilities dialog 411:58269](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-58269).
- [Remove facility dialog 411:58764](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-58764).
- [Overview 411:47010](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-47010)
  and actual client-card child **411:47029** for the notes entry.

The final 1440×1040 and 390×844 browser captures were visually inspected for
notes, account team, and the facility editor. They retain existing Portfolio
Dialog/field primitives and exact existing map/button assets; controls fit the
viewport, long phone forms scroll, and keyboard focus stays in the modal. The
account owner remains first, with any native membership role alongside it.
No unrelated frame, token, or asset was changed. The existing separate facility
card/detail/editor composition is not a full reproduction of the combined
700-pixel Manage facilities frame, and this report does not claim that visual
scope complete.

### Verification chronology and retained evidence

Pristine `0beb51c` source was preserved before implementation as 72 exact files
with SHA-256 hashes in `pristine/manifest.json`. Root held the browser port, so the
fixed implementation and units were prepared before the actual baseline run.
For the baseline, every original owned feature file was restored and hash-checked
against that pristine snapshot. New unwired helpers and the permitted pure-export
prerequisite stayed available for test collection. Afterward the fixed source was
restored and checked against `browser-source-switch.json`. The later owner-role
and identity-subscription corrections are included in the final frozen manifest.

| Evidence                          | Result                                                                                                                                                                                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First pristine browser cohort     | 1 pass, 11 failures: 10 actual behavior failures and 1 new-test owner locator defect. Preserved as `baseline-first-results.json`, original test source, and traces.                                                                                               |
| Pristine owner receipt rerun      | The corrected accessible select locator reached the command and reproduced the mismatched-owner receipt failure. `baseline-owner-results.json`. Total: 11 actual new behavior failures on pristine source.                                                        |
| First fixed 21-case cohort        | 20 passed; identity invalidation still failed and cross-component React subscription warnings were observed. `fixed-first-results.json` is retained.                                                                                                              |
| Independent native receipt review | P2 identified the owner-role bypass. It was corrected for owner rows as well; dedicated mismatch and matching-role cases were added. The synthetic owner fixture now reflects native `role: null` when no membership role exists.                                 |
| Final focused unit cohort         | **55/55 passed** across profile current state, preserved facility map contracts, and profile tools. `final-crud-units.json`.                                                                                                                                      |
| Final focused browser cohort      | **33/33 passed**, no skips or flakes: 12 current-state cases, 10 receipt/lifetime cases, 2 desktop/phone layout and zero-console-error cases, and 9 preserved facility assertions. `final-crud-browser-results.json`, traces/captures in `final-crud-artifacts/`. |
| Static verification               | TypeScript and focused ESLint passed; all 34 owned code/test files were formatted. The old mutation hooks/imports are absent.                                                                                                                                     |

Preserved facility assertions include exact selected-client create routing,
explicit null clears, coordinate pins, keyboard district selection, pan/zoom,
representation, candidate revision refusal, reviewed-candidate conflict handling,
remove confirmation/refusal, and wrong-client read rejection. The original
assertions were not weakened. New tests intercept all requests and fail on
unexpected routes; no live read/write or provider call establishes this evidence.

AST scanning found eight functions above 80 nonblank lines and no owned source
file above 400. Each function was read and reviewed individually in
`CORE-PROFILE-CURRENT-STATE-SIZE-REVIEWS-20261011.json`. These are exact source
fingerprints, not a blanket size exception. The provider-action lifecycle gap is
explicitly recorded separately from the structural review of its presentation.

All audit rows remain open until their actual native and signed-in acceptance
conditions are verified. These source and synthetic-browser results do not prove
live permissions, persistent tenant data, provider operation, or concurrent-write
resolution.
