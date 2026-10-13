# Calendar held-preflight test completion correction

Commit `3195ffab57584054a714ff5bd025063fba363929`, tree `a26f5a33576ec52e3158b1607203e0ef23c3722f`, follows `16fb50f9578cca86189b2e303f0918ddebc60413`. This test-only correction resolves independent confidence finding TCR-01. No production defect was claimed or production source changed.

The original test released the request, then observed a dialog already removed by actor replacement and immediately asserted no writes. That could finish before the old operation's continuation. Original source bytes and source hashes are retained in `baseline.json` and the two `.before` files; earlier complete evidence remains unchanged.

The revised test captures the exact held GET, requires the original actor/tenant/meeting/client attempt to be pending, replaces the actor, releases the route, and observes either completed transport or explicit `ERR_ABORTED`. It then requires that same original attempt to reach `refused` before the original dialog-absence and zero-write assertions. The harness exposes only the original attempt status via canonical `sharingAttemptKey`; it neither changes authority nor treats an absent/new idle entry as completion. No arbitrary delay or test retry was added.

Focused exact-spec replay passed **1/1**, one worker, zero retries. `preflight-completion.json` records actual network abort, original attempt refused and zero writes. Lint, formatting and diff check pass. The first lint command used the root instead of app directory and could not find the existing config; that attempt remains `lint.log`, followed by the successful bounded app-directory invocation `lint-corrected.log`. No full TypeScript/build/broad suite was run, as requested.

Independent reviewer objectives_work_intel_review accepted the exact two-file change; final commit/hash binding was sent for the separate correction record. The existing cohesive sharing-test module is larger by the added completion assertions; no production structure signal changed. Exact test/harness hashes and sizes are in `manifest.json`.

Owned server PID758606 was stopped; port5191 returned connect_ex111 (`lease-release.json`). Profile5299 was untouched. Borrowed node_modules was a symlink only and has been released without modifying its target. Root owns cherry-pick and final combined qualification.
