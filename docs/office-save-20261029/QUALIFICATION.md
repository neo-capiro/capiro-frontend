# Native Office Save confirmation, 29 October 2026

Native CODE can acknowledge `Action_Save` before its WOPI write commits in Core. Against the continuous native CODE/Core/PostgreSQL fixture, the old controller read sequence zero immediately after acknowledgement, retired the frame as uncertain, and then the fixture observed committed sequence one. The failure was reproduced twice on frontend main `ee470d7d44b811dc84d147c62a3eab7c9b5be09f`.

The existing controller now delegates only this readback to `save-confirmation.ts`. It waits at most five seconds after the acknowledgement, spacing successful unchanged reads by 250 ms. A newer authoritative sequence and hash confirm edited work. Every read must retain the original editor ID and epoch; regression, refusal, access loss, cancellation, or timeout fails closed. The helper never repeats Save or Publish. Core remains the sole draft/lease authority, the existing transport owns request cancellation, and publication remains a separate explicit action after release. This focused helper keeps the controller below the repository's 400 nonblank line review threshold and gives the bounded readback one owner.

## Author verification

- Node 24.22.1, Vitest 4.1.11: 21 controller/frame cases pass, zero skips. Delayed commit, unchanged revision timeout, late modification, replacement editor/epoch, access loss, and failed read are covered. Existing acknowledgement and separate Publish cases remain.
- Actual headless Chromium 149, CODE 26.04.5.2, runtime main `889808d5a8d1c145eff312b1498dd1fd9a72c3e3`, Core main `0e1d73ed21d9e0851eaebb8540cc2f274d6c4108`, PostgreSQL 16: normal Save confirms sequence one; a committed write with a lost acknowledgement confirms sequence two; a pre-commit refusal retains sequence two and removes the frame as uncertain. Three cases pass. Both successful operations required a second authoritative read after the acknowledgement, reproducing the timing that exposed the defect.
- `npm run typecheck --workspace @capiro/web`, touched-file ESLint, Prettier and `git diff --check` pass. The first typecheck caught a readonly assignment in the new test fixture; it was corrected without changing product assertions. The first lint command used the repository root without the web ESLint configuration; rerun from `apps/web` passes.
- Architecture still reports the same four pre-existing backend preview allocation errors and the exact same blocking size fingerprints as untouched main346. No Office boundary or size error was added. This is an author assessment; independent review remains held.

## Continuous persistence evidence and limits

The same local session exercised 30 synthetic DOCX/XLSX/PPTX files through native CODE, actual runtime WOPI, actual Core draft/publication methods and ordinary-role PostgreSQL (`capiro_app`). All 30 saved, read back exactly, published exact bytes and replayed the same publication. After stopping the task host, a clean PostgreSQL restart and fresh Core process recovered all 30 exact byte hashes and publication receipts. This closes the previous gap between separate native CODE and Core fixtures.

All 30 contain their native edit markers. Twenty-five pass every selected semantic assertion. Five retain the documented differences: XLSX currency and fonts, PPTX chart-workbook relationships in two cases, and PPTX font names. This does not establish general Office format fidelity.

Identity, original artifact SQL/object ports and the frontend route adapter remain synthetic. Actual Core authorization/storage methods and the native CODE editor are used; this is not full authenticated application or deployed acceptance. ARM64, production hosting/network, retention integration, automatic reconnect and release acceptance remain open. No app/image build, deployment, paid model call or independent review ran for this change.

Content-free local evidence is retained in the task's `work/code-native/pg-corpus`: `continuous-native-results.json`, `continuous-recovery-results.json`, `semantic-results.json`, the preserved initial failure and final controller results. Private fixture bindings, TLS material, access tokens and browser profiles are excluded from exported evidence.
