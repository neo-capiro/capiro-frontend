# Frozen integration qualification checkpoint

Current application and deployment source is frozen at
`9fa5e2cb68bc2b15f2dddc5dd2a846756a5b6c9e`
(tree `d6ebc315242254504b6f99a3ec4bae8673826983`) on draft PR8.
Subsequent evidence-only commits do not change that source. The full 882-case
Portfolio browser run is in progress and has one failure in meeting preparation
recovery. This pin has not passed combined qualification.

The input heads, merge order, shared ownership and preserved-source audit are in
PLAN.md and PRESERVATION.json. The Portfolio owner's later archive-only head
`c330cebbd021eb984b4bf64ae13dbb991ae6b1c0` is included. Its complete 33-commit
history bundle verifies against the expected SHA256; no restoration tool was run
over the checkout. No audited feature/test/asset file is missing. Original owner
branches, main, resources, credentials and databases remain unchanged.

## Completed on the current frozen source

- Clean npm ci with the root lock: 847 packages, scripts disabled as required by
  the repository's qualification package. Node24.19.0 / npm11.9.0.
- Combined check: public package hashes; all workspace typechecks; 58 repository
  guard/asset/CLI cases; architecture with zero boundary/blocking errors;
  21 transport cases; lint with zero errors/76 warnings; formatting of all web
  source and both test trees; 1,011 Portfolio units and 94 Modules contract units.
- Architecture preserves all 391 signals: 366 explicitly reviewed, 25 inherited
  unchanged and still unreviewed. Two changed existing large functions have
  individual source-bound reviews; no threshold or boundary was weakened.
- One unified Next production build and actual standalone-server smoke pass.
  Routes, style isolation, light/dark desktop/mobile, history and mode links pass.
- All 62 Modules/Settings/shared-integration browser cases pass, including
  sign-out, expiry, client replacement, organization replacement, interrupted
  writes and history. These use controlled fixtures, not live Clerk acceptance.
- Fifteen UI provenance/SSR cases pass through the new shipping helper, using
  the official hash-verified Linux esbuild0.28.2 tool and a fresh source-bound
  receipt. No native/provider calls were made.

Source-bound logs, JSON and hashes are in `evidence/candidate-9fa5e2c/`.
The complete Portfolio browser result will be recorded after the full run finishes.
The current failure checks a request array immediately after an asynchronous
retry click: the trace records the second POST/202 and queued-job dialog, but the
assertion runs before its route callback is observed. Its red trace and precise
timing diagnosis are preserved under the candidate evidence's failures directory.
No source will change during this run; a subsequent test synchronization correction
must retain exact count, identical key/payload and saved-job cancellation controls.
The separate local container gate is blocked: the existing environment proxy
rejects HTTPS CONNECT to the official Alpine package index with HTTP403.
The pinned base image pulled, but APK indexes could not refresh; no final image,
container runtime smoke or fresh vulnerability scan is attested. The Node24.19.0
host checks do not attest the container's Node24.21.0 runtime. Deployment-source
independent review remains parent-coordinated. See SHIPPING-CONTRACT.md and
DEPLOYMENT-SOURCE.json for the exact source recipe and runtime contract.

## Preserved failure and repair evidence

The prior frozen application `5840b50` failed combined qualification: its complete
881-case Portfolio browser run finished with 869 passed, 12 failed, zero skipped
and zero flaky. Its logs, traces and receipt remain in evidence/. Earlier progress
based on the recent log tail missed failures and is superseded by that final
result. No source changed during that run. No acceptance transfers to this pin.

The follow-up repairs preserve independent failing controls for case-sensitive
Intel rejection identity and canonical billing navigation. They also retain the
nested-dialog Escape failure and repeated reproduction; top-dialog dismissal now
preserves its parent and focus. Fixture expectations explicitly account for saved
submission reads while retaining request counts, cancellation and no-late-effect
assertions. Canonical navigation and visible-disabled Core404 preference entries
replace obsolete assertions. Two long visual/100-selection cases have bounded
90-second budgets justified by their observed work; every assertion and action
remains. Focused corrections pass; the full new run is still required.

Original Intel targeting receipt, requested phone-code copy and Core404 zero-Intel
regression baselines also remain. Normalization and explicit partial rejections
are honored while unexplained targeting loss fails. Phone requested-state copy
matches the inspected design. Native backend gaps remain visible.

Representative Figma/mobile/keyboard findings and limitations are documented in
VISUAL-REVIEW.md. This is not exhaustive pixel or assistive-technology acceptance.
The earlier additional actual-server Meri fixture audit is retained with its
original source identity; it is not represented as a new-pin run.

## Remaining acceptance boundaries

Backend draft PR2393/2394/2395 contracts were inspected without activating new
frontend workflows. Existing facility wiring already uses the opaque revision
and reviewed route, with404 no-fallback and409 renewed review; CORE-039 remains
native/deployment-blocked. Sender selection ENG-prep_sender_select and durable
Planner command wiring are separate next-candidate work. CORE-108 native reply,
PROS-029/031 proposal version/send/reminder and the remaining handover gaps stay
open. See BACKEND-CONTRACT-REVIEW.md for exact reviewed source heads.

All **337 Portfolio rows remain unaccepted**. Live Clerk/tenant/role/client
matrices, backend persistence/CAS, provider/sender/reply, media/capture, billing,
paid model/runtime and missing contracts remain unrun or blocked as documented
in the original handovers. Container build/runtime/scan and preview shipping are
not qualified. No merge, AWS build/deployment, real send, billing or paid workload
occurred. The designated shipping session owns any later approved image and AWS
operation after source qualification and independent review.
