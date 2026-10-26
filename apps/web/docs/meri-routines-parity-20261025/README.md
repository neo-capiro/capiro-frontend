# Meri Routines · Figma 3.4 parity (2026-10-25)

Bounded UI parity for the live Routines workspace (`/meri/routines`) against Capiro 3.4
Meri `IXJzJUkXcUTkySHir5JNea`, Prototype page `1064:140864`. Figma first: the design
received the missing state before the code changed. No contract, access, journal or
Temporal semantics changed; every routine command still goes through `RoutineWorkflow`
prepare → review → approve.

## Figma reference

| Screen | Node | Status |
| --- | --- | --- |
| 08.01 · Routines (list, selected-row actions, notice) | `1064:148241` | existing, unchanged |
| 08.01A · Routines · connect required | `3149:41265` (notice `3149:41368`, action `3149:41502`) | **added** |

08.01A is a clone of 08.01 with the table and selected-row actions removed, a neutral
(`muted`) notice "Connect to review routines" holding the primary v2/Button
"Connect routines", and no heading action, because nothing can be created before a
connection exists. Text and button are the shared Geist / v2 components already used by
the page.

## Code changes

- `MeriRoutinesHost.tsx` — the connect gate renders the 08.01A composition: page heading
  "Routines" / "Recurring research and drafting within your permissions", then a `Notice`
  whose title follows the gate state (Connect to review routines · Connecting… ·
  Routine connection unavailable · Routine access was denied, warning tone) with the
  scope line as body and "Connect routines" as its action. The hidden-while-unavailable
  workspace mount and the "Verifying current account and client access…" status are
  unchanged. The host now passes the scope name to the workspace for the Client column.
- `RoutinesWorkspace.tsx` — rows render in the 08.01 `DataTable` (Routine 29 / Client
  12.5 / Next run 21.5 / Status 14 / Last outcome 23) with phone cards, a selected row,
  and the 08.01 action row: **Open routine** (primary → `RoutineForm` edit), **Pause**
  (outline, active rows → `RoutineCancellation` mode pause), **Resume** (outline, paused
  rows → `RoutineForm`), **Cancel routine** (ghost → `RoutineCancellation` mode delete).
  The 08.01 success notice closes the list. "Show more routines" is now "Load more".
  The per-row `Panel` stack and its "Edit or resume with fresh choices" / "Pause or
  cancel" buttons are removed.
- `RoutineForm.tsx` — `RoutineCancellation` accepts `initialMode` so Pause and Cancel
  routine open the reviewable change with the matching default; the mode select stays.

## Deviations kept on purpose

- **Refresh routines** (outline, next to New routine) is not in 08.01. The list read is
  explicit and manual in this workspace (tests and the recovery model depend on it), so
  the button stays as a documented deviation.
- **Recent activity** disclosure under the selected row is not in 08.01. It carries the
  bounded inspection facts (destination, timezone, effective limits, observed actions,
  coverage) that have no column; kept as a `<details>` for the selected routine only.
- **Routine column** shows "Routine ‹first 8 of scheduleId›" because the list projection
  has no user title; "· unresolved change" is appended when the service reports one.
- **Status** is the schedule state (Active / Paused / Cancelled); Pause is enabled only
  for active rows and Resume only for paused rows. Unresolved or cancelled rows keep all
  four actions disabled.
- **Next run / Last outcome** come from `inspection.temporal`; "Not available" when the
  inspection is absent, "No runs observed" when there are no recent actions.

## Tests

- `tests/meri-routines.test.ts` — the pagination label is "Load more"; all 34 pass.
- `test/browser/routines.spec.ts` — "Pause or cancel" → "Pause".
- Checks run on this branch: vitest (34/34), eslint (clean), prettier (clean), tsc
  (clean). The routines Playwright spec result is recorded in the PR body with its
  pristine-main baseline.
