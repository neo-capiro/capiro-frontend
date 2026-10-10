# Frontend guard and historical-report repair

## Outline before implementation

Dedicated branch `fix/frontend-guards-reports`, worktree `C:/dev/main/capiro-frontend-worktrees/frontend-guards-reports`, exact base `6ebc3e3351c2c56f31eb72c8c1fd79476f3d3c72`. Scope is the two existing guard modules/tests, restoration of the foundation/UI author reports, and this report. Root package/lock, application, UI/client packages and vendor artifacts remain read-only.

The architecture guard owns authored import inspection. After relative resolution it must enforce an identical `apps/<app>` or `packages/<package>` ownership root, retaining existing feature, public-export and cycle checks. Preserve the independently returned app-to-client/client-to-app witnesses and add both directions plus valid same-owner/public-import controls.

The public-artifact guard owns finite input byte bindings. Validate an ordinary manifest/record shape and primitive string fields across every record before artifact reads, avoiding regex coercion. Keep the existing public signature, byte checks and CLI. Preserve the independent array-sourceCommit witness and add malformed type/shape and late-invalid-record controls with zero artifact reads.

Restore each historical author report from raw Git blobs at `45c70daa1f525df04562d7a05b171150d003fdfb`; replace only the erroneous ASCII lock hash with its measured correct ASCII hash and append an ASCII historical correction. Preserve originals/corrupted inputs and verify all other original bytes unchanged. This repairs evidence text, without rewriting past test results.

Run only the focused script tests and the real architecture/public-package CLIs once using read-only existing TypeScript dependencies. Capture raw streams, source/runtime hashes and exact report-restoration relation. No install, build/browser, transport/Elements suite replay, Figma, AWS, Hermes or provider action. Root owns distinct independent review and integration.

## Result and behavior

The architecture guard now refuses resolved relative edges across `apps/<app>` and `packages/<package>` roots in either direction. Six import/export/literal-dynamic-import fixtures cover the two returned witnesses; valid same-owner imports and explicitly approved public imports remain valid. Existing public-export, feature, cycle and route rules remain unchanged.

The public-package guard validates all ordinary records and their own data fields before any artifact read. Filename, commit and hash fields must be primitive strings; accessors, inherited fields, array/class records and coercible values are refused. Validation produces primitive snapshots before reads, so a read callback cannot substitute a later record. This is finite ordinary-data validation, without a hostile JavaScript Proxy or filesystem guarantee.

Both author reports were restored from binary Git blobs at `45c70daa1f525df04562d7a05b171150d003fdfb`. Each original contained the same mistyped 63-character lock hash once. Each replacement is the measured 64-character hash `5acf8eabbaf763f400fe705968a31f98d4ef33b3f68d8033afa34bc834200a7e`; all other original bytes remain exact, followed by an ASCII historical correction. The original reports, corrupted integration bytes and intermediate restoration bytes remain retained.

## Actual focused verification

Fresh direct commands, each bounded to 120 seconds and run once:

- `node --test scripts/architecture.test.mjs scripts/public-packages.test.mjs`: **12 PASS, 0 FAIL**, no skipped cases; process 0.562 seconds.
- `node scripts/architecture.mjs`: **PASS**, `errors: []`, `signals: []`, all three existing page/layout entrypoints discovered; process 0.484 seconds.
- `node scripts/public-packages.mjs`: **PASS**, both existing contract/stream tarballs exactly match their fixed byte/hash/commit bindings; process 0.187 seconds.

All three commands had exit 0, empty stderr and identical measured source/runtime before/after records. Node is 24.19.0; the read-only borrowed TypeScript entry is 5.9.3. Binary streams and machine envelopes are under `.task-inputs/CODEX-FRONTEND-GUARDS-REPORTS-1/{tests,architecture,public-packages}/` in this dedicated worktree. Envelopes bind argv, replacement environment, UTC timestamps, direct-child timeout, exit, raw stream hashes and the measured source/runtime records. They do not establish OS network containment, descendant-process containment or a complete installed dependency execution closure.

The independent original witness output is preserved unchanged: six controls passed and three boundary controls failed before these repairs. No failed product check occurred in this repair. The first DATA restoration helper stopped on its own incorrect assumption that the UI report had no hash occurrence; it had one. Its helper and partial raw inputs remain preserved. The new version asserts one occurrence in each report and passed the exact byte relation. That console traceback was not separately captured as a binary process envelope.

## Scope and remaining gates

Root package/lock, app/CSS, UI/client packages and vendor bytes remain unchanged from the allocation base. The guards inspect authored syntax and finite package bindings; they confer no authorization or native/runtime admission. No install, application build/browser check, transport/Elements suite replay, Figma refresh, AWS, provider or Hermes action occurred. The evolving Figma visual gate remains open. Distinct independent review and root integration remain owner decisions.
