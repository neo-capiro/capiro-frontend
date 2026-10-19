OWI-F01 repair committed as `24400fb5133d9b75bf78240774426aeb0a583941` on `repair/capiro-objective-current-read-20261012`, from `3562618`.

ObjectivesPage and ObjectiveSummary now conceal cached records after a current403 or service failure. Failed-read editor/create URL intents and delete state clear; open editors unmount. A successful current read restores records without reopening stale drafts. Error/retry, status filters and independent Advocacy history remain available. No shared query or backend contract changed.

The baseline403 remount control failed with cached content still visible. Final26/26browser checks pass:11new failure/recovery/editor/replacement controls plus15existing intake/readiness/receipt controls. TypeScript, focused ESLint, Prettier and diff checks pass. Initial new-form locator error was corrected to its existing accessible textbox name.

Architecture has0boundary errors and one pending size-review record: `ObjectivesPage`,208nonblank lines, fingerprint `5f1c21710a260ec6edb31ab366fdb048eeff1d28e1f149b7c7e4a80367bb4163`. Root owns that registry and combined qualification. Exact file hashes are in `source-hashes.json`.

Evidence and limitations: `repair-report.json`, `before-results.json`, `results.json`, `results/`, `existing-work-artifacts/`. No native/provider calls, production build or frozen archive edits were performed. Fixture server5203 remains available for independent review.
