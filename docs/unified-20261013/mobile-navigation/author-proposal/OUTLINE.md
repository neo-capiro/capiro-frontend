# Additive Meri navigation regression proposal

Author only one new browser spec outside the checkout, intended for `apps/web/test/browser/meri-action-host-mobile-navigation.spec.ts`. Root owns the responsive shell component, integration and runtime. Reuse the actual mounted ApplicationBoundary/ProductShell/MeriHome/MeriActionHost and existing synthetic actionHostFixture; no new transport, authority or API fixture owner.

Two cases: 375px keyboard navigation between Home and Recommendation actions, scoped client preservation and browser Back/Forward; 1440px unchanged sidebar navigation with no duplicate visible controls. Both require exact active-state semantics and zero automatic action requests. Helpers own only repeated observable route and keyboard assertions. All existing test bytes remain untouched. Runtime red/green is deliberately NOT_RUN by this author; root will establish the baseline against the frozen source.
