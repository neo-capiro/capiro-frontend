# Independent changed-test cohesion review

The 10 supplied size signals match the exact source at `4dbbe4b5558f93bbf27ee7263d77a5b838a7d074`: five are new, two are changed file signals, and three Mail fixture functions are inherited unchanged. All SHA256 values, fingerprints, line numbers and nonblank counts recompute with zero mismatches.

The new helpers and test groups are cohesive at their current scope. No test duplicates the production parser, editor, grouping or eligibility algorithm to calculate its own expected result. `remaining-modules.spec.ts` is an explicit, bounded three-screen acceptance cohort using the existing operation fixture; its planner, Workspace and public-form controls do not depend on each other's state. The 109-line Calendar unit callback is a describe group of independent contract assertions, not a monolithic procedure. Exact signal-specific rationales are in `review.json`.

One test-confidence followup remains: **TCR-01**, `calendar-sharing.spec.ts:247`. The held-preflight actor-replacement case releases its old read, observes dialog disappearance and immediately checks zero writes. The dialog already disappears because identity changed; the test does not synchronize old response processing or cancellation before the final assertion. It could end before a wrong late dispatch. Root has been notified to have the owner add a deterministic completion/abort observation and replay this control. No production defect is established; the production abort/actor guards inspected are separate supporting evidence.

Calendar's stateful positive receipt fixture stamps selected references and projects visibility. That fixture demonstrates frontend request/receipt flow, not server authorization or every artifact combination. Foreign/error receipts and changed-preflight cases use independent fixed data. Its identity control updates Portfolio cache under DataProvider, while Modules uses the actual ApplicationBoundary fixture. Rich Mail's identity invalidation and client-prop controls are likewise scoped local-lifetime tests. These limits must remain visible in acceptance claims.

The prior Mail audit proved all 24 adapted Message assertions retain exact expectations and all surrounding test ASTs. The three oversized unchanged Mail setup functions retain their prior status; no blanket exemption is proposed.

This review ran only source/blob/AST inspection. No browser, test suite, server, TypeScript build or source/registry write occurred. Root owns the requested synchronization correction and final qualification; Profile remains pending.
