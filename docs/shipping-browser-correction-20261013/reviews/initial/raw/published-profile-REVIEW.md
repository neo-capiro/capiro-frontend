# Independent permanent profile regression review

**Accepted, no source-review blocker found.** This is static review of the additional permanent profile test and preservation of the existing test/product. Root's active v2 browser qualification is separate; this reviewer started no browser/server/build and made no product, test, AWS or prior-packet edit.

Exact reviewed candidate files:

- New `apps/web/tests/browser/profile-identity-layout.spec.ts`: 2,375 bytes, SHA256 `970638f7f61e13a9ea1ab097f041c06dc4928bcb7d12dc64edcd9419b3c40edf`.
- Existing `apps/web/tests/browser/profile-tools-integration.spec.ts`: 4,864 bytes, SHA256 `894315f902f99caa97552a9308898e9752e2e3c3a02a765e3525e82263cc4a2a`.
- Frozen baseline: `1585438295776604f23a5cb5ab592729f7c468ca`. [Full receipt](REVIEW-RECEIPT.json).

## Why the added regression is meaningful

The test uses the existing real fixture and a held public `page.route` response for `/api/backend/core/me`; it neither patches application DOM nor uses private Playwright APIs. It controls the identity transition without sleeps or timeout changes. While identity is held it observes the saved client focus text, verifies Add is disabled and Account team is visible, and checks no PUT has occurred.

After releasing identity it requires Add enabled, then verifies the retained old focus handle is disconnected and has a null bounding box. Freshly resolved focus and Account team boxes must both exist and satisfy the original strict vertical ordering. It then exercises the real UI edit to add “Current actor”, requires the dialog to close, verifies both saved/current tags in the fixture's stored record and exactly one PUT, and rejects unexpected requests. The gate is released in `finally`, avoiding a permanently held fixture route on assertion failure.

This protects both sides of the observed behavior: an old actor-scoped DOM handle is not retained as current, while the current profile remains visible, ordered and writable under the admitted actor. It is a controlled lifecycle regression, not an assertion that the shipping run necessarily followed this interleaving. The earlier diagnostic's old-owner-handle continuity is not an acceptance requirement of this new test; the new test correctly verifies current owner-row geometry instead.

## Original source and assertions preserved

Removing exactly the three added lines awaiting `+ Add focus tag` to be enabled reproduces the entire original integration test file byte-for-byte. The original non-null checks, strict ordering, full intake-data preservation comparison, tag update, exact single PUT, unexpected-request check, pulse styles/link and screenshot remain unchanged. The new test is additive and does not replace those assertions.

There is no diff from frozen source anywhere in `apps/web/src/features/portfolio/client-profile`. The actor/client/tenant keyed FocusTags remount remains intact. No profile product behavior, authority check, fixture response, timeout, retry setting or original geometry locator has been relaxed. The separate RichMailEditor correction is outside this review.

## Updated AWS evidence and final causal limit

The supplied shipping-owner [AWS report](AWS-FAILURE-EVIDENCE.json) is exactly 18,324 bytes, SHA256 `21f89c46e5af85b5f249602481c3fe35731d91b02080c01f75cedf23d13f06c7`. This reviewer independently matched all twelve source bindings in that report to frozen Git bytes; no AWS collection was performed here.

The report establishes 1,116 passes / 2 failures from 1,118 tests and, for this profile case, that saved focus text passed before at least one of the two bounding-box results was null. The log does not identify which row. Geometry and subsequent cache-update interaction were not reached. Screenshots, traces, error context and resolved browser JSON were worker-local; the report establishes no preserved retrievable destination for them. Their logged filenames are not evidence of their contents.

Accordingly the final supported diagnosis is: **AWS observed a null layout measurement after client-text readiness; controlled local evidence proves identity resolution can detach the old focus handle while current rows stay valid; waiting for actual editor readiness is a justified synchronization correction with all original assertions retained. The exact AWS race/row remains unproven.** Prior notes that traces were pending are historical; the supplied report now explains the missing-artifact limit. No browser-version causal claim or recovered-trace claim is made.

Local investigation used Chromium154.0.8037.57; AWS installed Chromium/headless-shell149.0.7827.55, while its exact launched browser was not captured. The download block for local149 and the original passing repetitions remain preserved separately. Static acceptance here neither claims candidate runtime qualification nor a new shipping/deployment pass.
