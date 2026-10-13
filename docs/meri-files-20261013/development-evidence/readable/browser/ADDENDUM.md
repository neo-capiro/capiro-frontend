# Assertion-adaptation clarification

The sealed `REPORT.md` statement “No assertion, route/body/effect count or failure evidence was removed” is too broad concerning the desktop navigation assertion.

The initial test incorrectly required Files to be a link with an `href` at both widths. The existing desktop control is a button; the phone control is a link. The corrected test selects the exact Files button at1440px and the exact Files link at390px. The `href` assertion now applies only to the phone link; the invalid desktop `href` expectation was removed. Both widths still assert one matching control, keyboard reachability, visible focus, Enter navigation to the exact client-scoped Files URL, current-page state, Back/Forward behavior and zero automatic document operations.

This adapts the test to the existing control semantics without waiving the required navigation behavior. The populated-textarea changes retain exact accessible names and expected values; the fenced reconnect helper explicitly checks disabled fields where its earlier generic editable expectation was wrong. No production source changed. The original report, failed-run artifacts and148-file manifest remain unchanged; this addendum is a separate publication record.
