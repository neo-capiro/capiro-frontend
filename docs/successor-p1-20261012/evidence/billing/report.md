Billing repair committed as `0f80c354ee7eb08ce9a5dd08dd2305b7a5694bcd` on `repair/capiro-p1-billing-20261012` (base `3562618`).

Existing subscribers now use the billing portal for Add profiles. Eligible new subscribers retain clearly labeled Start subscription checkout. Both current billing reads must agree before dispatch; failed reads, changed eligibility, repeated clicks and replaced sessions cannot replay the selected action. Redirect validation distinguishes the portal from checkout. No native/provider action was executed.

The active-subscriber regression failed before repair and all24 focused cases pass after the final fixture rebuild. Settings access tests4/4, TypeScript, focused ESLint, Prettier and diff check pass. The browser cases cover all six subscription statuses, eligible none/trialing non-subscribers, unsupported states, disabled billing, failed/stale/contradictory reads, both mismatched hosted origins, repeated clicks for both flows, and replacement during preflight or pending receipt.

Architecture reports0boundary errors. It exits1 only for the changed BillingSettings function (292nonblank lines), fingerprint `e1a7cb20d84cd766915defd93a303aa4806c0525a8d9ed3636b1aba4e5a42044`. Root owns the independent review record. BillingSettings remains presentation/dialog state; billingFlow.ts owns the cohesive hosted-flow preflight. Shared registry, architecture manifest and frozen archives were untouched.

Evidence: `before-results.json`, `before-browser-artifacts/`, `results.json`, `results/`, `backend-billing-contract.txt`, `architecture.txt`, and `repair-report.json`. Full production build and native acceptance are unrun here; root owns combined qualification.
