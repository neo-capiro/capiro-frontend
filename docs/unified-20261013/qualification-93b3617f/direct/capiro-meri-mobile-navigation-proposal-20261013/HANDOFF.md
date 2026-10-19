# Meri mobile navigation regression proposal

Copy `meri-action-host-mobile-navigation.spec.ts` into `apps/web/test/browser/` when root is ready to stage the baseline. The source checkout was clean at `6a2e4aceaaa354a8edd9bf54e4148380ccbb1e32` after authoring; all proposal files are outside it.

Two cases, 32 authored expectation calls:

- **375px:** Start at actual Meri Home with the synthetic client hint, wait for current client verification through rendered Home, require one visible Conversations link and one Recommendation actions link with exact scoped hrefs, exact `aria-current="page"` on the active destination and no `aria-current` on the other. Reach each destination through actual sequential Tab presses and Enter, then verify both history entries through Back/Back/Forward/Forward. All seven settled routes check client scope, zero action requests and intercepted-request isolation; mobile content must fit 375px.
- **1440px:** Require the unchanged visible sidebar, one visible Recommendation actions link and one Conversations button. The mobile Conversations link must be absent from the accessible visible set. Keyboard navigation in both directions retains scope and updates active-state attributes, with no automatic action calls. Counts prevent the additive mobile component from leaking duplicate desktop destinations.

The spec reuses `actionHostFixture`, `actionClient`, `actionUrl` and `expectActionIsolation` from the existing reviewed fixture. It does not create another HTTP fixture, call application internals, force focus, substitute clicks for keyboard behavior or relax timing. The keyboard helper uses a finite 32-key Tab traversal and fails if the target is not reachable. Other helpers group repeated observable route/current-state assertions. No component class, new landmark label or implementation-specific DOM tree is assumed.

Expected baseline failure: at 375px the existing Sidebar is hidden, so the first required visible Conversations link is missing. This expectation is source-grounded, **not an executed red result**. Desktop is intended preservation coverage. Root owns actual red/green execution against the same proposed spec.

Completed checks: installed Prettier formatting; TypeScript parse; existing architecture source scanner (136 nonblank lines, zero size findings); source/reference hashes; clean checkout status. No browser, server, install, build, full typecheck or native/provider call was run. These will be synthetic harness composition tests and do not qualify Next production routing, real authorization/backend behavior, Figma completeness or full accessibility.
