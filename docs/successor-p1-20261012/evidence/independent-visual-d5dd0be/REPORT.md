# Final-source Files / Calendar visual and keyboard replay

**15/15 unchanged controls passed**, with no skips, retries, flakes, or failures. No new clipping, modal keyboard, or changed-state interaction blocker was found in this bounded review. The original inherited focus defect SV-01 remains resolved.

Reviewed `/workspace/capiro-p1-successor` at source `d5dd0be9bf5ad7800e648ff1421ce047523288b3`, `apps/web` tree `79deadc9fd0c74c3634d3acc3b026a6ac9087ffe`, and `apps/web/src` tree `32c0d89bf53037dbab4b611d7e25957b8b0caf9e`. Source stayed unchanged throughout the run; all126 Files/Calendar/shared-Dialog file hashes remained stable. `RUN-START-SOURCE.json`, `FINAL-SOURCE.json`, and `REVIEWED-SOURCE-HASHES.json` record the exact receipt. Shared Dialog/focus bytes and all15 controls match the prior accepted49f review byte for byte (`PREPARED-SOURCE.json`).

## Execution and results

Root released capacity after its Modules run. These independent runs used the root-owned5191 fixture sequentially, one worker, retries0, `webServer: undefined`, and `/usr/bin/chromium`. No server, installation, application edit, provider/native-auth call, AWS operation, or real backend write was performed. Root's broader Portfolio run was concurrent; it owns full-suite/build qualification. Browser work finished at17:10:53Z, final source receipt at17:11:12Z, and capacity was immediately released to root. No later browser calls were made.

| Controls | Result | UTC start | Duration | Raw result |
| --- | --- | --- | --- | --- |
| Files/Calendar desktop/mobile visual + keyboard |10/10|17:07:31.649|132.1s|`results.json`|
| Original immutable settled-focus regression |1/1|17:09:54.153|10.3s|`focus-regression-results.json`|
| Disabled Save/initial-autofocused field controls |4/4|17:10:13.010|40.3s|`focus-field-results.json`|

The visual cases cover Files ACL pending/unknown/current review, Files folder unknown/current review, Meeting pending/unknown, and notes/debrief pending/unknown at1440x1040 and360x800. The four additional focus cases cover button and field submission at360x1040 and1440x1040. `LAYOUT-AND-FOCUS.json` records22 rendered-state measurements,22 focus logs, and200 focus samples: zero horizontal-overflow states and zero samples outside the modal. Assertions also check dialog bounds/modal/name/description, retained readonly/disabled drafts, settled forward/backward Tab containment, applicable Escape behavior, keyboard Files current-review, and no duplicate writes.

## Fresh screenshot inspection

Ten actual PNGs were opened and visually inspected, indexed with hashes in `SCREENSHOT-INSPECTION.json`. They include desktop Files ACL/Meeting/note unknown states, mobile Files ACL unknown/current review, folder unknown, Meeting unknown top/bottom, and note/debrief unknown.

Desktop dialogs remain640px wide; mobile dialogs remain328px. Tall mobile ACL/Meeting states use internal scrolling within720px; bottom captures show the full warning and actions. Heading scroll-out at the bottom of a tall dialog is expected internal scrolling. Long viewer names wrap, Calendar drafts/warnings remain readable, and the current-file review result distinguishes current state from confirmation of the earlier write. Existing member-name/email composition remains a Figma difference. Native-disabled save controls remain unavailable after an uncertain receipt; no new reconciliation capability is implied.

## Existing Figma and native limits retained

The byte-identical saved PR11 evidence for actual Figma file `Zc2dEN5aLU47dVdsewDmiJ` is in `figma-reference/`: Files access411:54355, New folder411:53327, Move to folder411:53579, and New meeting680:142683. The saved PNGs were inspected again. Existing generic fieldset/full-width footer/member-row differences and the Meeting date-time/description composition differences remain open; this replay does not claim pixel parity. The move design's “Nothing was changed” statement cannot establish the outcome of an ambiguous native write, so truthful unknown/current-review disclosure remains intentional.

The saved packet does not specify exact pending/unknown/current-review designs. It lacks exact note/debrief editor frames683:142816,698:142912,680:142817,698:142490 and meeting-edit frames683:142929,698:143074. No new Figma calls were made or required for this bounded regression replay. No exact parity for those missing targets is claimed.

The three source changes since49f are the Calendar receipt/native-conformance, explicit client-clear, generation-entry availability, and unknown-sharing caption corrections. Their diff was read; their separate47 native controls belong to root's independent contract qualification and were not represented as additional tests in this unchanged15 replay. The list sharing caption and successful native receipt variations are not exercised by these empty-list/unknown-response visual fixtures.

This is Chromium/light responsive synthetic-fixture verification, not all-browser/theme/device qualification, full screen-reader certification, live authentication/native acceptance, durable idempotency, or causal attribution of an uncertain write. Existing PR11 gaps and native dependencies remain unless separately resolved.

## Evidence and reproduction

```
node /workspace/capiro-p1-successor/node_modules/@playwright/test/cli.js test -c /tmp/capiro-final-visual-d5dd0be/playwright.config.ts
node /workspace/capiro-p1-successor/node_modules/@playwright/test/cli.js test -c /tmp/capiro-final-visual-d5dd0be/focus.config.ts
node /workspace/capiro-p1-successor/node_modules/@playwright/test/cli.js test -c /tmp/capiro-final-visual-d5dd0be/focus-fields.config.ts
```

Use an already-running approved root fixture; these configs start no server. Logs are `visual-run.log`, `focus-run.log`, and `focus-field-run.log`. Raw PNGs, geometry, accessibility snapshots, focus logs, and traces are isolated under `artifacts/`, `focus-regression-artifacts/`, and `focus-field-artifacts/`. `SHA256-MANIFEST.json` indexes final bundle bytes excluding itself. `source-reviewed/` saves the relevant source/test bytes.

Original red runs, intermediate fix variants, and interrupted-server history remain untouched under `/tmp/capiro-successor-visual-review`; `PRIOR-EVIDENCE.json` binds that prior manifest. No failure was overwritten or reclassified as a pass. `FINDINGS.json` preserves the disposition of SV-01 and the current bounded review outcome.
