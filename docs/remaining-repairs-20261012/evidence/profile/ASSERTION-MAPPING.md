# Existing assertion mapping

Only the FacilitiesCard plus-entry presentation changes in the two existing lifetime files. The old dialog locator `Add facility` becomes `Facilities: Synthetic profile client`. Its submit locator `Add facility` becomes `Save facility`. The card entry remains `Add facility`. All unknown-result text, current-read review, disabled/enabled gates, write counts, held-reply boundaries, actor replacement, retained draft, and no-unexpected-request assertions are unchanged. The standalone detail editor remains `Edit facility` / `Save changes`.

The manager stays open after a confirmed inline save and closes that editor. New profile-presentation.spec.ts explicitly asserts updated saved-card content plus editor disappearance after one native receipt. No old success/close assertion required weakening in the two existing files.

No full-suite or native backend claim follows these focused controls.

Corrective presentation tests preserve the six5291 recovery assertions unchanged. The final eight presentation controls retain their geometry/filter/focus/write assertions after a separately recorded harness-only correction; HARNESS-CORRECTIONS.md and harness-correction.patch identify its relative-date setup, boundary fixture and exact file-name button locator. Original invalid clock attempts remain preserved and are not counted as valid feature reds.
