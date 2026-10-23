# A1 single-mail browser recovery

ML-03 keeps one request UUID across close/reopen, reload, transient failures and concurrent tabs. Local storage contains only that UUID and its start time, scoped by tenant, actor, client and contact/thread. The submitted message remains on the server. Web Locks serialize both reservation and settlement; delayed success or uncertain responses cannot overwrite a newer tab's identity. Storage or lock refusal stops dispatch.

The POST includes the UUID. Every post-dispatch error, including 401/403 after provider acceptance, stays uncertain unless the response contains the exact request's typed durable failed receipt. Current-actor recovery reads the owned send-intent route, polls only within a bounded interval, and releases only accepted complete receipts or terminal failed records. Pending/sending/unknown and inaccessible receipts remain held. No automatic resend is introduced.

Four focused suites passed: 64 tests. All nine new/changed safety cases killed a relevant mutant; `mutation-evidence.json` maps each case to its mutation. After source restoration, the two affected suites passed again (35 tests), recorded in `restored-green.json`. Existing attempt tests were updated for asynchronous Web Lock reservation/settlement and durable retention after cache disposal.

Validation used the session's cached Vitest 2.1.9 and Zod v4 subpath from a cached Zod 3.25 package, not a fresh locked install. Test-only aliases selected the actual file attachment contracts instead of their UI barrel and replaced unused provider/Next Link imports. Actual send/recovery functions and HTTP response parsing remained under test. No browser rendering, production build or full typecheck ran. A syntax transpilation check is separate from typechecking.

Fable must run the normal locked frontend tests, browser reload/two-tab checks and staging validation against the paired backend migration/code. The backend send-intents table proposal must be applied before this code is deployed. No flag, runtime enablement, live provider or deployment was changed.
