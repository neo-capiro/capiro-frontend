# Objective full-page intake continuation

## Bounded implementation outline, before edits

The owner authorized Portfolio-only continuation in the isolated worktree at
`ee39c2f`, using the current service interfaces and the existing Figma file. This
work addresses the full-page intake part of OBJ-13, OBJ-28 and OBJ-30, plus the
visible entry into the existing OBJ-19 client picker. It does not activate a
backend candidate or add Strategy, Meri, autosave, inferred context, or attachment
binding contracts.

Fresh Figma context and screenshots were read for filled intake `411:60728`,
its form `411:60766`, header `411:60757`, readiness `411:60841`, and the global
picker `411:62481`. Blank frame `411:60726` now contains only the shared shell;
the intact blank `Main` frame `411:64465` supplies the form placeholders, blank
readiness and truthful “Draft not saved yet” footer. The form has a flexible
left column, a 24px gutter and a 360px readiness rail. The unchanged shared
client shell remains its owner. These inspected form children use editable
text and CSS-shaped controls; their information and readiness marks are
literal Figma text, not replacement icons.

Fresh Portfolio header `411:41429` in screen `411:41421` has no New objective
entry. The owner approved a separate, named desktop/phone header variation in
the existing Figma file before adding an outline New objective action ahead of
Add profile. The variation will reuse the existing buttons, typography and
tokens, and will not alter the baseline screens. New node URLs and validation
evidence will be recorded below.

### Cohesive owners and interfaces

- `useObjectiveEditorSession` will own the existing draft fields, persisted
  record, per-session request ID, local validation and confirmation state. It
  delegates persistence, exact receipt checks, cancellation and actor/client
  lifetime guards to the unchanged `useSaveObjective` and `writer.ts` owners.
- `ObjectiveFields` will render the controlled fields for the two real callers.
  Creation uses the inspected radio-chip ask choices and inline hints; editing
  retains its drawer and select interaction. The existing contract remains the
  single owner of field keys, limits, ask values and readiness rules.
- `NewObjectivePage` will compose the full-page heading/back action, intake
  card, current-client chip, readiness rail, explicit save/review actions and
  the existing confirmation dialog. It will use the public existing client
  query and refuse a mismatched or failed client response.
- `ObjectiveEditor` will remain the edit drawer and consume the same draft
  session and controlled fields. Shared feedback/actions/confirmation may be
  extracted together where the two presentations share their semantics.
- `ObjectivesPage` will delegate the existing `?new=1` state to the full-page
  creator and retain list/edit/delete ownership. Existing entry URLs and
  unrelated query parameters remain compatible; no new server route is needed.
- The sole Portfolio index change will expose the approved entry by setting
  `new=objective` through its existing query-preserving navigation. The existing
  picker continues to own client catalog validation and selection authority.

Feature code depends only on its local Objective owners and deliberate public
Portfolio/shared interfaces. No shared shell, route, lockfile, backend, or
architecture registry edits are planned. The canonical query cache is replaced
by the existing session boundary when actor/session/organization changes.

### Intentional behavior and verification

Create intake changes from a modal drawer to an accessible page region at the
same URL. Edit remains a drawer. The create ask type changes from a select to
native radio choices using the same wire values. Save/review/ready still require
explicit user actions, use the current exact receipts and expected versions,
and return to the objective list only after confirmed success. Pending writes
lock the exact draft and page exit action. No mock persistence or autosave
success label will be presented as service acceptance.

Preserve all existing meaningful Objective and global-picker assertions while
updating only the intentional create container and radio interactions. Add
focused page navigation, keyboard, explicit-save, client-isolation, pending and
edit-regression cases; compare actual rendered desktop/phone light/dark
components to the inspected Figma geometry. Run relevant unit and browser
cohorts, typecheck, lint, formatting and architecture checks. Report changed
size findings with exact function fingerprints and individual responsibility
reviews to the integration owner, without editing the central review registry.

## Results

Source is frozen in the isolated worktree
`capiro-portfolio-objective-intake`, branch
`codex/portfolio-objective-intake-20261011`, based on `ee39c2f`. The integration
owner will review and commit the changes; this lane made no git commit.

### Audit scope

| Audit ID | This continuation supplies                                                                                                                            | Remaining acceptance or dependency                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| OBJ-13   | Blank and filled full-page creation at the existing client Objective URL, exact current-client chip, controlled fields and deliberate back navigation | Semantic outcome rewording and live native persistence are not established |
| OBJ-17   | Existing explicit ready confirmation is preserved and regression-checked through save plus versioned transition                                       | Native lifecycle activation and signed-in acceptance remain open           |
| OBJ-19   | A visible Portfolio header entry opens the existing authorized client picker, preserves index filters and returns keyboard focus on close             | Signed-in accessible-client and native Objective acceptance remain open    |
| OBJ-28   | Existing four-field readiness is composed in the 360px desktop rail and below the form on phone                                                       | No additional semantic readiness or rewording rule is inferred             |
| OBJ-30   | Explicit Save draft and Request review remain on the shared mutation path; the unsaved footer reflects actual local persistence state                 | Autosave policy and live native write acceptance remain open               |

The earlier P2 checkpoint in `911cd76`, before canonical app consolidation,
also affected OBJ-12 through the status-filter empty state and clear-filter
action, and OBJ-13/17/28/30 through the four-field checklist, exact readiness
validation and mutation lifetime guards. This full-page slice preserves those
changes. No CORE audit row is newly implemented by this slice.

These are source and intercepted-browser qualifications, not row completion.
All 345 original packet rows and the 337 open in-scope acceptance rows remain
under the integration owner's unchanged ledger authority.

### Figma evidence and new entry variation

The existing source frames used for creation are:

- [Filled intake, 411:60728](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-60728),
  with [form 411:60766](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-60766)
  and [header 411:60757](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-60757).
- [Intact blank Main, 411:64465](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-64465),
  because [411:60726](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-60726)
  currently contains only its shared shell.
- [Readiness, 411:60841](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-60841)
  and [global client picker, 411:62481](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-62481).

The new visible entry was first authored as a separate editable Figma variation
based on [Portfolio header 411:41429](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-41429):

- [Continuation wrapper, 972:186855](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=972-186855).
- [Desktop header, 973:186855](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=973-186855).
- [Phone header, 973:186879](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=973-186879).

It reuses the existing `v2/Button` Outline component `12:376` from set `12:388`,
with the New objective label and no icon or chevron, ahead of Add profile.
The wrapper is at x=99808, y=5200 on Portfolio page `411:40601`, outside the
separately owned Tracker continuation. The baseline frames and shared tokens
are unchanged. Desktop and phone contexts/screenshots were inspected again;
the integration owner independently confirmed both new frames.

The changed controls use editable Figma text, existing buttons and bound
tokens. No new image or SVG asset is needed for these slots. Literal `i`, `✓`
and back-arrow text match the inspected source; existing shared-shell assets
remain in their existing owner. The actual app comparison covers the changed
intake and entry controls, not an acceptance claim for unrelated index widgets.

### Implemented ownership

The planned owners above are now in place. Creation and editing use the same
`useObjectiveEditorSession`, `ObjectiveFields` and `ObjectiveEditorControls`.
`ObjectiveEditor` is the existing edit drawer; `NewObjectivePage` owns the
full-page create presentation and checks its public client read against the
exact requested ID before rendering a form. The existing Objective endpoints,
wire ask values, receipt/version checks and actor/client lifetime guards did
not change.

The page has two explicit Save draft controls as shown in Figma, native
keyboard-operable ask radio chips, truthful unsaved/draft status, a 24px desktop
gutter and a 360px readiness rail. Phone layouts stack the rail and wrap field
choices and actions. The header save uses the compact inspected style; the
optional limits field grows on phone so its placeholder is not clipped.

PortfolioIndex now owns its visible trigger and its focus-return ref. Its
seven-line `objective-entry.module.css` only allows whole header controls to
wrap and retains single-line button labels. The existing picker still validates
current catalog/actor/role state and performs no write when navigating to the
selected client's empty intake.

### Verification

| Check                      | Result and scope                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency install         | `npm ci` succeeded in this worktree; no lockfile change                                                                                         |
| Focused units              | 61/61 across objective-readiness, objective-receipts and global-objective                                                                       |
| Initial browser cohort     | 30 passed, 1 failed, 0 skipped; all original cases passed, and the new visible-entry case exposed missing focus return after Cancel             |
| Final functional cohort    | 9/9 passed: new entry, existing Cancel/Escape, actual deep link, five intake cases and the original save/confirm/list-refresh case              |
| Final entry visual check   | 1/1 passed after the narrow header-wrap CSS correction                                                                                          |
| Static checks              | Workspace TypeScript, focused ESLint, Prettier and `git diff --check` passed                                                                    |
| Architecture boundary scan | No boundary, untyped-any, remote-origin or graph errors; three exact changed/new size findings await the integration owner's record integration |

The failure was fixed using the picker's existing `onCloseAutoFocus` prop to
return focus to the visible enabled trigger. No picker authorization or
selection assertion was removed. Original create locators deliberately changed
from a dialog to an accessible region, and create ask interaction changed from
a select to native radios. Exact display labels now match Figma; wire enum
values are unchanged. The edit drawer/select is covered explicitly, including
the exact expected version and reopening a ready record as a draft. Pending
coverage now checks both Save draft controls and the page back action.

The preserved run evidence is in
`apps/web/work/objective-intake-evidence/cohort-1`, `cohort-2` and `cohort-3`.
Each contains the Playwright JSON result; the initial failure also retains its
screenshot, trace and error context. These are separate cohorts, not a claimed
single 41-case passing run. The screenshots visually inspected at final source
are:

- `apps/web/work/objective-intake-desktop-blank.png`
- `apps/web/work/objective-intake-desktop-filled.png`
- `apps/web/work/objective-intake-phone-dark.png`
- `apps/web/work/objective-global-entry-desktop.png`
- `apps/web/work/objective-global-entry-phone-dark.png`

Port 5191 was released after the final run and the owned web server stopped.
Root's later shared Dialog `aria-modal` and optional Clerk-ID commits are not
copied into this earlier fork; combined integration checks belong to root.

### Size review and remaining limits

The current scanner reports 131 size signals: 91 exact existing reviews,
37 inherited/unreviewed findings and three changed/new findings awaiting
integration. The proposed specific author reviews are in
`OBJECTIVE-INTAKE-SIZE-REVIEW-2026-10-11.json`: PortfolioIndex (258 nonblank body
lines), ObjectiveIntake (82) and ObjectivesPage (184). The original long
ObjectiveEditor is now below the function threshold; no new/changed TS/JS
module exceeds 400 nonblank lines. The central registry is untouched, and its
unreviewed finding gate is intentionally still active until root integrates
the exact records. Each record includes its specific responsibility rationale
and exact function fingerprint, so any subsequent body change reopens review.

No Objective backend candidate, migration, new endpoint, hidden save, Strategy
generation, Meri invocation, inferred profile context, file binding or cycle
calculation was activated. The native lifecycle and signed-in preview gates
remain open. This presentation work can be reviewed and integrated independently
of those live-service gates.
