# Independent successor Files / Calendar visual and keyboard review

Reviewed final source `49f6609c7277ce8701b0d38c3ba163860633e668` (application tree `964c8c51b1449d303a9286cf902133d02c2e4301`) after root repaired one inherited focus defect discovered in this review. The original reviewed successor was `2b0511a7efe2047028c31269626140829db33541` (root-provided application tree `057fd70503a8f8e9e88d5c1393182d6ec67e1651`). `FINAL-SOURCE.json` binds both stages, the exact changed Files/Calendar/shared files, and final shared source hashes. The reviewer made no application/shared source edits, commits, provider/backend calls, or server restarts.

## Outcome

No remaining clipping, modal keyboard containment, or changed-state interaction blocker was found in the bounded reviewed scope. Final independent runs: **10/10** desktop/mobile visual and keyboard cases, **1/1** unchanged minimal settled focus regression, and **4/4** separately replayed button/initial-field focus controls. The final source was stable at SHA256 `97f46e6cfdb61055c53966d27e6bdd7b24fca30b5e3f1287ebdba002874a940b` for `Dialog.tsx` and `0dda1e8377cc7d8be416d5d991240cd6c16229f43e4cb5dc41c80f3163a6a5af` for `dialog-focus.ts` before and after the final runs; both hashes are committed in49f6609. Raw results/logs/traces/screenshots are retained.

At **1440x1040** and **360x800**, actual Files ACL pending/unknown/current-review, Files folder unknown/current-review, Meeting pending/unknown, and notes/debrief pending/unknown states were rendered using the application's real components and synthetic intercepted contracts. Dialogs were640px wide on desktop and328px on mobile. There was no horizontal overflow. Mobile ACL unknown and Meeting unknown legitimately exceed the available height and scroll inside a720px-high dialog; top/bottom captures show complete copy and actions. Long selected-viewer names wrap. Existing member-label/name/email composition differs from the design and is not newly accepted as pixel parity.

Role/name/description/modal semantics and accessibility-tree output were checked. Pending/unknown inputs remain disabled/read-only as designed; warning text has alert semantics; explicit Files current-read result has status semantics. Forward Tab and Shift+Tab remain in the modal after the final fix. Files review executes through keyboard Enter without replaying the uncertain PATCH; applicable Escape close and return focus are preserved. Meeting unknown remains intentionally frozen by its existing versionless native-write fence; this review does not claim a new in-dialog reconciliation capability.

## Finding and root-owned repair

**SV-01 (P2), resolved:** after a focused Save/input became disabled, focus could fall to BODY/Radix guard and subsequent settled Tabs could reach background links while the modal remained open. This was confirmed with150ms settled focus snapshots, including `Skip to content`, `Capiro Home`, `Meri`, and `Portfolio`; it was not an immediate-event timing assertion. `FINDINGS.json` gives precise raw evidence and the reproduction. The shared Dialog and vendor primitive were unchanged by the feature repairs, so it is classified as an inherited issue found during successor qualification.

The exact minimal regression `focus-regression.spec.ts` remains unchanged (SHA256 `411838b98b535d56fc7744df7e450b65ee53e8745bd1a006d73544a29a3769ff`). Root reproduced it red and retained `/tmp/capiro-successor-qualification/focus-red-results.json`; a byte-identical results/log/trace copy is bundled in `root-minimal-red/`. It passes independently on the final fix. Root's initial native-listener variant passed our first10-case replay, but its additional Enter-from-initial-autofocused-field control exposed an earlier focus-capture edge. The final React `onFocusCapture` variant handles that edge; our4-case independent replay passes both button/field at360/1440.

Independent source review accepts the final narrow hook: React capture records a contained target (excluding nested portalled content from ancestor memory), observer filters disabled-attribute mutations affecting the remembered control/ancestor, verifies it is actually disabled, requires active focus to be BODY/the prior control and the document to remain focused, and recovers only the top open dialog. Cleanup disconnects its observer. Radix retains trapping; vendor source is unchanged. No unrelated focus, auth, networking, or persistence owner was added.

## Existing Figma evidence and limits

Actual file `Zc2dEN5aLU47dVdsewDmiJ` evidence was read from the PR11 remaining-assessment packet, copied byte-for-byte under `figma-reference/`, and inspected visually with its saved raw context:

- `411:54355` Files Manage access.
- `411:53327` Files New folder and `411:53579` Move to folder.
- `680:142683` New meeting.

The existing designs establish modal hierarchy, named form fields, access choice/member controls, folder destination, and meeting form composition. Existing generic fieldset/full-width footer/member-row differences remain; current Meeting uses two date-time inputs/description rather than the captured design's separate date/time and attendee field. These were not introduced or repaired by the receipt/focus changes. The Figma move error asserts “Nothing was changed”; an ambiguous native write cannot substantiate that claim, so the current unknown/current-review disclosure correctly preserves native truth rather than claiming design-string parity.

The supplied packet has no exact pending/unknown/current-review frame for these new failure states. Exact note/debrief editor targets (`683:142816`, `698:142912`, `680:142817`, `698:142490`) and meeting-edit targets (`683:142929`, `698:143074`) were not captured in that packet; no exact pixel parity is claimed for them. No additional Figma call, paid provider call, or invented native capability was used. Existing PR11 visual gaps, broader criterion statuses, and native owner dependencies remain open unless separately closed.

## Reproduction and evidence

All tests use root-owned read-only fixture `http://127.0.0.1:5191`, one external worker, and unique outputs in this directory. No shared report was overwritten. Commands from any cwd:

```
node /workspace/capiro-p1-successor/node_modules/@playwright/test/cli.js test -c /tmp/capiro-successor-visual-review/focus.config.ts
node /workspace/capiro-p1-successor/node_modules/@playwright/test/cli.js test -c /tmp/capiro-successor-visual-review/playwright.config.ts
node /workspace/capiro-p1-successor/node_modules/@playwright/test/cli.js test -c /tmp/capiro-successor-visual-review/focus-fields.config.ts
```

Final raw outputs are `focus-regression-results.json`/`focus-regression-final.log` (1pass), `results.json`/`final-run.log` (10pass,52.2s), and `focus-field-results.json`/`focus-field-replay.log` (4pass,12.2s). `LAYOUT-AND-FOCUS.json` indexes22 rendered state measurements and settled focus logs. `artifacts/` contains fresh full-page PNGs, accessibility snapshots, geometry, focus logs, and trace ZIPs. Actual screenshots were visually inspected, including mobile top/bottom scroll states, desktop form/error layout, current reviewer names, and Calendar note/debrief retained text.

Historical evidence remains separate: `initial-*` preserves the first hard focus assertions and interrupted run; `focus-initial-*` preserves a diagnostic harness wait on absent `:focus`; `focus-settled-*` preserves definitive settled active-element evidence; `before-fix-*` preserves two desktop passes followed by8 connection-refused failures when root deliberately stopped5191 before its fix (not product failures); `variant1-*` and `after-fix-run.log` preserve the first-hook green run. None of these failures were deleted or represented as final passes.

This is Chromium/light-mode responsive fixture review, not full screen-reader certification, all-theme/browser/mobile-device qualification, or native live acceptance. No real tenant data, mutation, provider execution, hard-reload idempotency, or causal attribution of uncertain writes was tested. Final production build and full combined qualification remain root-owned.
