# Frozen integration qualification checkpoint

Current source/test/deployment pin:
`e1bcf60030007edaab610b069c6fb885fc5265dc`, tree
`1e8ca91eb1c22a62c845f7fcfd0c5356cb3c39e9`, on draft PR8.
The complete 882-case Portfolio browser run finished with **880 passed, two failed,
zero skipped/flaky**, in 35.7 minutes. Combined qualification **FAILED**.
Subsequent documentation-only commits leave this source frozen.

## Passed on the current exact source

- Clean root-lock install: 847 packages with lifecycle scripts disabled;
  Node 24.19.0 and npm 11.9.0.
- Public package hashes, all workspace types, 58 repository/architecture/asset/CLI
  cases, 21 transport cases, lint with zero errors and 76 inherited warnings,
  formatting, 1,011 Portfolio units and 94 Modules contract units.
- Architecture retains all 391 signals: 366 individually reviewed and 25 inherited
  unreviewed signals, with zero boundary or blocking errors. No guard threshold,
  dependency boundary or meaningful test was dropped.
- Unified Next production build and actual standalone-server checks for routes,
  mode navigation/history, scoped styles, desktop/mobile light/dark layouts,
  security headers and unconfigured API refusal.
- Fifteen UI provenance/SSR cases using a fresh receipt and official hash-verified
  Linux esbuild 0.28.2 tool through the corrected shipping helper.
- All 62 Modules/Settings/shared browser cases, including sign-out, expiry,
  identity/client replacement, interrupted writes and history. These are
  controlled fixtures, not live Clerk or backend acceptance.

Complete logs, reporter JSON, both failure traces and fresh shared/Meri captures
are in `evidence/candidate-e1bcf60/`, with a hashed qualification receipt. The
pipeline verified unchanged non-documentation source between every gate.
Both failures are at shared-dialog-layout.spec.ts:200: clicking outside a reopened
standard or compact desktop dialog leaves it open. Earlier geometry, focus, Escape
and Close-button assertions passed. Diagnose and repair in the next candidate;
do not remove or weaken outside-click expectations. The post-suite actual-server
Meri audit passed at desktop/mobile with zero service requests or page errors.

## Preserved prior results and review corrections

`5840b50` failed its complete run: 869 passed, 12 failed, zero skipped/flaky.
`9fa5e2c` passed those prior failing cases but finished with 881 passed, one failed,
zero skipped/flaky, in 36.3 minutes. Both full reports and all failure artifacts
remain preserved. The latter failure was an immediate fixture-array assertion
racing the asynchronous meeting-preparation retry dispatch; the trace records
identical request bodies/keys, the second POST/202 and the queued saved-job dialog.

Independent re-review of `9fa5e2c` cleared the prior Intel partial-rejection identity
and canonical billing controls, supported the bounded synchronization correction,
and reported passing affected Escape/focus and SSR checks. It requested one
remaining shipping assertion correction: the actual unconfigured sign-in page
renders `Sign-in setup required`. Actual-server red/green evidence retains
HTTP 200, nosniff, DENY and no-powered-by checks. This corrected source includes
that literal and a bounded request-observation wait in one browser test file.
Exactly two identical request bodies, saved-job cancellation and no-extra-send
assertions remain. Ten focused repeats passed. No application behavior changed
between `9fa5e2c` and this pin. The intermediate `988b244` run was explicitly superseded
and interrupted during combined checks; it is not counted as qualified.

The original requested Intel normalization/explicit partial-rejection, requested
phone-code copy and Core 404 visible-disabled/zero-Intel baselines remain in
`evidence/`. Representative Figma/mobile/keyboard findings and their limits are in
VISUAL-REVIEW.md; this is not exhaustive pixel or assistive-technology acceptance.
Parent reports the independent narrow review of `e1bcf60` passed, including both
changed files, focused replays, exact keys/bodies, cancellation and status/security
checks. Archive subtree, all 477 inventoried files/eight parts and prerequisite
hashes were independently verified. This is bounded source review only.

An additional production-artifact regression identifies an open runtime-config
finding: Meri static output serializes the shared boundary publishableKey as
undefined. Direct Meri entry can retain build-time unconfigured context after
runtime credentials are supplied. No credentials/provider calls were used to
reproduce it. `evidence/runtime-config-red/` retains the actual prerender route projection,
serialized marker and failing assertion. The frozen run is complete. Repair common request-time initialization in the
distinct follow-up candidate.
This finding is a shipping hold despite the separate narrow review pass.

## Preservation and shipping boundary

PLAN.md and PRESERVATION.json pin all inputs and show no missing audited feature,
meaningful test, asset or governed package file. The complete Portfolio archive
from owner head `c330cebb` is preserved at `docs/portfolio-31/handover-2026-10-12/`.
ARCHIVE-PRESERVATION.md records exact paths/hashes, 477 independently checked
inventoried files, eight checked transport parts, the unchanged Git subtree and
the owner's isolated 33-commit history restoration/fsck evidence. This session
verified bytes and the qualified bundle without restoring over any worktree.
No original owner branch or main was replaced.

The local image build on `9fa5e2c` pulled the pinned base but stopped when the existing
proxy rejected official Alpine package-index HTTPS CONNECT with HTTP 403. No
proxy/TLS bypass, package weakening or base-image change occurred. This new pin's
image build, runtime smoke and fresh vulnerability scan remain unrun. Host
Node 24.19.0 passes do not attest container Node 24.21.0. DEPLOYMENT-SOURCE.json and
SHIPPING-CONTRACT.md identify the exact reviewed recipe and separate shipping
owner's remaining gates. No AWS build, image push or deployment occurred.

## Native and next-candidate scope

All **337 Portfolio rows remain unaccepted**. Live Clerk/tenant/role/client
matrices, persistence/CAS/RLS, provider/sender/reply, media/capture, billing,
paid model runtime and other handover gaps remain unrun or blocked.
No real provider message, billing action, database/security change or paid
workload occurred.

Exact sender, Planner, Core Quick log, ordered-owner and approved memory wording
handoffs are recorded in BACKEND-CONTRACT-REVIEW.md for a separate source-qualified
contract integration candidate. Their source review does not establish deployment
or permit missing native workflows. Neo directed at 04:41–04:42 UTC that Quick log omit Commitment and its direction,
counterparty and commitment-specific due-date UI, and remove feature-only dead
code after tracing references. Ordinary activity logging and generic follow-up
tasks remain in scope. Current Quick log already has no Commitment option or
related implementation; separate member-note/meeting-preparation uses remain
independent. This supersedes the earlier unresolved-semantics question.
