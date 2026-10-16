# PR52 authentication readiness investigation

Status: **test-only diagnostic candidate; production authentication unchanged; browser behavior unvalidated**.

Exact parent: `0b6c7ecf2c3f0f66dee5a0e88cb67528a6cc5fc2`. Shipping receipt reports preview revision10. This worker neither deploys nor independently fingerprints its running image. Meri, mobile, gateway/origin/Dockerfile/AWS are excluded. Rich task-description toolbar and Duplicate task remain tracked and unfinished.

## Finding

The prior native run verified backend identity200 for the existing authorized synthetic account and inspected TaskDetail/AddTime idle behavior. Subsequent pages remained on Loading sign-in, although public global Clerk loaded/user-presence booleans were true. Those booleans do not establish application hydration or Clerk React context readiness.

A fresh read-only network trace now records `net::ERR_INSUFFICIENT_RESOURCES` for essential Next chunks, CSS, fonts and Clerk UI. The trace itself stopped with Failed to fetch before collecting readiness samples. Windows memory counters reported98% committed; later available commit was632909824bytes despite10146MB free physical memory. No own abandoned Node process was found by exact known PID/audit-command inspection. No unrelated process was terminated. The owned browser context closed after the failed trace; no application write was admitted or attempted and no credentials were extracted.

The server-rendered loading message can remain when application chunks cannot execute. Its15second recovery feedback requires a React effect. This establishes an environment/resource blocker for this trace; it does not prove every earlier stall had the same cause, nor prove a particular frontend defect. No authentication bypass, global-based authority, forced loaded state or speculative provider remount was introduced.

## Bounded changes

Five files are owned under `apps/web/test/browser`:

- `clerk.tsx`: separate synthetic providerLoaded from providerStatus. Real installed Clerk7.9.14 / React6.17.8 ClerkLoaded tests the owner's loaded flag; ClerkLoading/ClerkFailed use status. Existing fixture events remain compatible through defaults; explicit loaded values permit an independent negative control.
- `auth-lifecycle.html` and `auth-lifecycle.tsx`: minimal explicit synthetic fixture uses the existing ApplicationBoundary, RequireSession and canonical me.read query. It does not import the full Modules/Portfolio screen tree. Its test-only readiness output gives positive event-settlement evidence without admitting protected content.
- `auth-readiness-navigation.spec.ts`: three controls cover delayed readiness across URL navigation/reload with no early backend reads, provider-loaded versus auth-loaded plus backend401 expiry/no replay, and loaded=false/status=ready refusal followed by valid readiness.
- `server.mjs`: preserve the normal index build entry and emit the new HTML fixture as a second entry, so default suite discovery does not silently serve the wrong fixture.

These are synthetic application boundary controls. They do not exercise remote Clerk, reproduce live hydration, close native rows or fix the reported preview symptom. Production auth/session/backend-identity source bytes are unchanged.

## Checks actually executed

Prettier check on all five files: PASS. Git diff whitespace check: PASS. Playwright focused discovery:3tests found. Browser behavior: **NOT RUN** after memory gate refused launch (available632909824bytes; required1.5GiB for one browser plus bounded256MB Node fixture process). Earlier full selection was interrupted after Vite FATAL ERROR Zone Allocation failed/process out of memory; it supplies no acceptance. Full type/build/suite checks were not rerun under this resource pressure.

Independent Codex `independent_fix_review` accepted the final test-only static candidate after its P1 missing HTML-build-entry finding was repaired. Reviewer confirmed production auth files unchanged, no remaining static findings and browser validation still outstanding. This is not an auth-fix acceptance.

## Focused cloud validation

Use the project's adopted Node24 and npm11 runtime in a sufficiently provisioned environment. Install the root lock with `npm ci`; use an installed approved Chromium path. No production credentials or live account are required for these fixture tests.

```sh
export NODE_OPTIONS='--max-old-space-size=768'
export RAYON_NUM_THREADS=1
export CAPIRO_QA_CHROMIUM_EXECUTABLE=/usr/bin/chromium
npm run test:browser:modules --workspace @capiro/web -- auth-readiness-navigation.spec.ts --workers=1 --retries=0
npm run test:browser:modules --workspace @capiro/web -- auth-initialization.spec.ts session.spec.ts --grep-invert '390px' --workers=1 --retries=0
npm run typecheck --workspace @capiro/web
```

The first command also checks the default multi-entry harness output. The next selection covers1440desktop timer/failure transitions and retained session lifecycle gates. Test runs must report real passes/failures and retain errors; discovery is not a behavior pass. Restore adequate NEOMART commit space through its resource owner before native navigation/reload tracing, then require successful essential chunk loads, actual app hydration and Clerk/backend identity admission together before attributing a persistent loading state to product source. Do not transport this worker's browser profile or credentials into cloud validation.

Return findings only to the coordinating user/thread. No cross-workstream message, publication of a website or AWS release is performed by this worker.
