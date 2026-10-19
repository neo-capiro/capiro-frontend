# Shipping failure correspondence

Parent forwarded exact PR42 build f4204b9a-bf8a-4390-a30a-bce5125c1c23 traces on14 October2026; shipping reported1292 passed/5 failed. No AWS access was performed by this owner.

- acceptance-portfolio-incompletes.spec.ts:11:5,390px light/dark: rendered-contrast.ts31 via spec33 expected visible pulse.locator(p,small,span.eyebrow).first(); it resolved the intentionally hidden p.eyebrow.
- portfolio-home-accessibility.spec.ts:6:3 via accessibility.ts20/spec17: desktop1440 heading-order at h3; phone390 heading-order plus serious scrollable-region-focusable.
- visual-closeout.spec.ts116, line139: expects a disabled Drag-to-rearrange button in unavailable Customize, but no element exists because the catalog was not admitted.

Frozen-source local run reproduced exactly those5 failures and2 passing desktop contrast controls. First local correction exposed the same mobile scroll-region defect and strict helper inability to evaluate translucent chip backgrounds. All attempts are retained. Final focused controls pass with default axe fully enabled, actual keyboard scroll, actual contrast composition and unavailable/admitted catalog keyboard paths. Complete final suites are required separately.
