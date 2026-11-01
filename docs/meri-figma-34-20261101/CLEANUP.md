# Meri 3.4 — current implementation set

The user requested removal of unused designs so implementation agents do not follow obsolete screens. Cleanup is saved in the existing [Meri 3.4 file](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3244-78203).

## Removed

91 screen roots and seven empty sections were physically deleted:

- 44 previously archived entry screens and three before-refresh comparisons.
- Four former global approval inboxes.
- Twelve superseded review maps, handoff notes or placeholder boards.
- Eight older delivery/history examples with current equivalents.
- Five unsupported personal-memory request-changes or other-reviewer paths.
- Thirteen fixture-only Plate draft/comment screens.
- One exact duplicate phone review and one duplicate evidence-unavailable example.

[REMOVED-SCREENS.json](REMOVED-SCREENS.json) contains every retired ID, rationale and replacement reference. Deleted IDs are deliberately not clickable Figma targets.

## Retained

Loading, empty, error, denied-access, uncertain-write, original-request recovery, responsive layouts and current Office save/release/publish states remain. Distinct retry-pending, reserved-turn, restored-input and partial-history states were not treated as duplicates merely because they look similar.

Pause/steer/resume/fork and browser takeover have current rendered source owners; they remain contextual conversation controls. They are not a standalone Runs destination. Selected-tab sharing remains distinct from managed browser control. No unverified memory-purge cause is asserted.

The current coverage register has 318 references across the same 24 groups / 41 areas. The complete retained page inventory contains 526 FRAME roots, including supporting views, overlays and design aids. These counts describe different scopes. Reusable components were preserved.

## Navigation and validation

24 surviving controls were rewired. Six fixture-only Edit document controls were hidden and disconnected; real Files/Office entry controls were preserved. Prototype starting points were reduced to Current experience and Screen review.

Read-back verified every removed root is absent, no empty sections remain, all 375 main-page destination IDs resolve, and all 21 component-page destination IDs resolve. See [cleanup QA](qa/CLEANUP-QA.json), [component QA](qa/COMPONENT-CLEANUP-QA.json) and [mutation receipt](qa/CLEANUP-RECEIPT.json).

Use [FRAME-REGISTER.json](FRAME-REGISTER.json) for inventory coverage and [SCREEN-INVENTORY.json](SCREEN-INVENTORY.json) for retained supporting views. Older QA snapshots are historical records, not permission to rebuild retired nodes.

No application code, backend, deployment or live data changed.
