# CI-01/02/03/04 bounded repair report

Delivery source: **ced1d1b428f57a5cd8628ece6222924c0ebcf0f2** (34 changed source/test/asset paths). Base: 7aca86e7d64cfdb85d09d424a07e6186339fc24c. Source branch repair/capiro-remaining-intake-20261012. No frozen candidate/evidence, native backend, provider, cloud, dependency, shared session or architecture registry edits.

## Scope

- CI-01 P2 / CORE-013: saved contact, engagement date, funding priorities, internal notes and known business classifications now have a read-only ClientDetails surface. GovernmentInfo displays supplied registration/sector/track fields through the existing canonical clientToIntake adapter and catalogs. Missing values remain explicit; unknown array codes remain visible. Current ClientOverview read/error gate and application actor/client replacement remain the authority owners. The read surface creates no mutation request and does not claim external registration verification.
- CI-02 P2 / CORE-121: one approved extension of canonical clientViews describes existing nine destinations, subtitles, eight supported G shortcuts and exact Figma icon references. Radix Popover owns overlay/focus; the local combobox owns search/active selection, empty state and Enter/arrow interaction; a separately scoped key hook ignores editing, modifier, composing, repeated and modal events and cleans up listeners. No Timeline/Outreach/Advocacy route was invented. The filter stays visible while the list scrolls; keyboard-selected options are brought into view.
- CI-03 P3 / CORE-028,030,031,032: TeamRoster renders available email, dynamic initials, owner marker, row separators and existing guarded removal. Addition fields align on desktop and stack on mobile. Existing actor-keyed useProfileTeamEditor, canChange, unknown fence, owners and ordered-owner mutation semantics are unchanged. The prior Owners repair is preserved, including its additional management control.
- CI-04 P3 / CORE-012,014: ChoiceList explicit presentation variants implement business 3-column choices with Foreign-owned spanning the last row, 6-column certifications and 2-column tracks. Existing data, labels, unknown choices, validation and payload behavior stay unchanged. All groups stack at mobile breakpoint.

These are eight listed row facets, not acceptance of eight complete rows or all337 native rows. Native read-role completeness, current backend create/capacity/persistence, concurrency and provider behavior remain unrun. Parent owns combined qualification/build and publication.

## Preserved evidence

- red-results.json: four intended baseline failures on unchanged 7aca86e source, 0 passing/4 failing. Baseline missing heading, missing search control, missing member email, and Foreign-owned width298px versus >819px. Traces embed test source.
- green-results.json: intermediate replay, 4 failures retained. Three affected pages exposed a leftover header extraction syntax fragment; team geometry used overly strict getByLabel exact matching. Corrected source fragment and semantically equivalent role/name locator, no assertion removed.
- green2-results.json: initial four controls green.
- focused-results.json: 46/46 meaningful new and preserved controls green. Covers canonical intake writes/errors/payloads, owner ordering/conflicts/uncertainty, failed cached roster/options, role/actor/client replacements, note/facility current-state behavior and desktop/mobile dialogs.
- final-results.json: 10/10 after active-option scrolling and dark icon contrast refinement. Subsequent visual review caught that scrolling the whole popup could hide the focused search on short screens; popup-red-results.json preserves the stronger failure (input y78 above popup y120); popup-green-results.json then passes all10 after the listbox receives its own scroll container. The earlier final-results run is not evidence for the later popup correction.
- unit-final.log: 60/60 across client-view-navigation, client-intake, profile-current-state, ordered-owners. Existing tests retained.
- lint-final.log and format-final.log: changed TypeScript/TSX/CSS/asset provenance files pass. First lint ran from the wrong directory and failed config discovery; preserved lint.log. Correct app-directory replay passed.
- typecheck.log: initial new mobile test tuple annotation issue; corrected. typecheck-final.log plus command exit137: resource-killed concurrent attempt, no diagnostics; preserved. typecheck-serialized.log: full app tsc exit0 after browser release and coordination. typecheck-popup-final.log: final full app tsc exit0 on the delivery source; lint-popup-final.log and format-popup-final.log pass for the final popup delta.
- architecture-popup-final.log: final zero dependency/cycle errors, three explicit size review triggers. Exact fingerprints and cohesive rationale in structure-review.json; root alone approves/registers.
- lease-release.json: first owned server/browser released19:42:34UTC, TCP5191 closed. The short follow-up lease was released19:53:04UTC with TCP5191 closed (popup-lease-release.json); Calendar is next.

Only existing assertion adaptation: client-header.spec.ts changes old menu/menuitem locators to the new accessible listbox/option semantics; exact Objectives navigation, quick-add route, New meeting opening/closing, URL cleanup, Profile notes and unexpected-request assertions are retained. No original test deleted, skipped or timeout weakened.

## Design evidence and limits

Original file Zc2dEN5aLU47dVdsewDmiJ and node references unchanged. Raw high-fidelity contexts, embedded code and screenshots for Government info411:47482, switcher411:47736, team411:51801 and intake517:121532/121876/122239 are saved in figma/. Sparse overview parent411:47010 was supplemented with an inline full screenshot and visible children411:47030/47063. Prior contexts/renders were already Git-preserved; root separately committed these fresh snapshots before potential design edits. No immutable Figma version ID or standalone variable/token-definition file was returned; returned token names/values remain in the raw design contexts.

Returned asset URLs failed HTTP403. Parent authorized read-only exportAsync of ten exact existing switcher icon nodes. Raw export response, original dimensions and SHA256 hashes are in figma/switcher-exports-{raw,manifest}.json; no canvas nodes changed. Public SVG bytes remain exact exports and have a provenance file. Node IDs and dimensions match the frozen context, with no new design adopted.

Government dialog, team roster, switcher and choice groups were reviewed from actual desktop/mobile screenshots. Existing shared chrome, shell, disabled destinations and ordered-owner additions remain outside this bounded visual correction. Added read-only profile field rows are functional completion; this report does not claim pixel-identical full overview parity. A native integration/image qualification gate remains separate.

Final screenshot reviewed: popup-green-output/remaining-intake-CI-02-nar-9048e--keyboard-selection-visible/view-switcher-mobile-dark.png shows the focused search retained above the scrollable list and Files selected in view. Final architecture capture is architecture-popup-final.log; structure-review.json binds the exact129-line picker fingerprint.

## Final source binding and popup correction

The active-option effect still calls `scrollIntoView({ block: "nearest" })`. The correction adds `className={styles.list}` on the existing listbox and changes CSS: the popup is a flex column with hidden overflow, filter/group do not shrink, and only the listbox has `min-height: 0; overflow: auto`. This retains the search header while bringing the keyboard-selected option into view. It is a container/CSS correction, not a different scrolling API. The strengthened short-screen control failed before this change and passed afterward.

The final ten-case run started 2026-10-12T19:52:04.621Z, used one worker and zero retries, and passed 10/10 with no skipped, unexpected or flaky results. `source-binding-verification.json` independently rechecks every source-hashes entry against the committed delivery blobs and confirms the final architecture fingerprints. The picker SHA256 is `85457ac89eaec97080ad4d1f7f6b7668761100b4bb2b6847614886d1b9c8894d`, its CSS is `f0f8fa317338dca5ac5653f5dc924308e35b789d64b692c90cf3a031df73523c`, and the focused test file is `4cdf6399b49c98856892c31584c738876284f25ae7c0672ee138e25f55a51a46`.

The later callback commit `24ac231749b9e8dc9b778cf318f3f94e74d168ad` was completed just before the integration owner withdrew that coordinated approach. It is **superseded and excluded from delivery**; integrate only `ced1d1b428f57a5cd8628ece6222924c0ebcf0f2`. The worktree HEAD still preserves that unused historical commit. `timeline-callback-*` and `architecture-callback.log` are historical evidence only, not final review bindings. No callback work remains in progress or is needed. The profile owner will activate the existing URL contract directly; the main intake commit retains the canonical QuickLog owner unchanged.

No native row status is promoted. Combined integration qualification and the three architecture approvals remain parent-owned gates. No owned browser, fixture server or typecheck remains active.
