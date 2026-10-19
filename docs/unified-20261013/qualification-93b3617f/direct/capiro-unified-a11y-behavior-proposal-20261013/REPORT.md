# Bounded accessibility interaction test proposal

**External proposal only; 16 cases have not been run or typechecked.** No repository source, runtime, server, existing test, dependency or frozen evidence was changed. Five proposed files under `candidate/` use their intended repository-relative paths. They supplement the six default-axe cases; all three original axe proposal files still have their exact reviewed bytes. Root's subsequent type-only cast correction has a separate review packet and does not alter these proposed tests.

The source basis is the reviewed `93b3617f` application and the seven-file accessibility correction. These tests reuse the existing Portfolio data fixture, actual Portfolio layout fixture/harness, Meri action host fixture, shared operation fixtures and Playwright. Synthetic fixture data is not native acceptance or browser authority. No endpoint or approval contract is added. The three specs remain focused on page interactions, Portfolio semantic metadata, and shared landmark/suggestion behavior.

| File | Cases | Expected untouched baseline | Purpose |
| --- | ---: | --- | --- |
| `apps/web/tests/browser/portfolio-accessibility-interaction.spec.ts` | 7 | Positive controls | Two viewport keyboard/history cases; two viewport logo/sector pointer cases with neighbor and bottom-owner hit targets; two 390px long-name/focus/theme cases; one existing layout control keyboard/pointer case. |
| `apps/web/tests/browser/portfolio-accessibility-semantics.spec.ts` | 2 | Red semantic controls | Three independent cards at each viewport verify H2, exact original link names, unique descriptions, visibly unhidden sector/location/fallback, supplied/unavailable owner and status roles. |
| `apps/web/test/browser/shared-home-accessibility-interaction.spec.ts` | 7 | One positive, six red semantic controls | Four footer cases (both modes at both viewports), one keyboard local-draft positive control, one named suggestions group and one named Modules fixture notice. |

Thus **eight positive controls and eight semantic controls** are proposed. These expectations are source-derived, not execution receipts. Run the unchanged candidate tests against the untouched source first; retain every actual failure, including unexpected positive-control failures, then run the same bytes against the applied source. Use the existing leased fixture servers, one worker and zero retries. Do not rerun or alter unrelated suites to make this proposal fit.

## Meaningful checks

- Sequential Tab and Shift+Tab preserve the single profile stop; Enter and Back/Forward reach the actual client route. No `.focus()`, forced click, synthetic keyboard event, arbitrary sleep or changed key sequence is used.
- Focus evidence asserts the actual active control, `:focus-visible`, computed nontransparent outline at least two pixels, and viewport bounds, then attaches computed properties and a full-page screenshot. Screenshots still need visual inspection; these computations do not certify all focus contrast/occlusion conditions.
- Pointer checks use `document.elementFromPoint` at visible locator centers before `page.mouse.click`. Both logo and metadata must hit the original client link, the neighboring link must resolve to its own route, and the bottom owner must hit no anchor. ProfileCard has static bottom annotations, not a bottom link; the existing real layout wrapper's Move later control is separately reached by Tab/Enter and pointer, changes only local order, and records zero writes. No product control is fabricated for the test.
- Semantic cases use the actual described element by its ID, require visible/in-viewport text and no `aria-hidden`, `hidden` or `inert` ancestor, reject metadata still inside a link, and check different clients do not share IDs/descriptions. They retain the original exact `Open …` link name.
- Long mobile names preserve the full accessible name and page width; dark computed muted token remains `#aaa29c`. The light token is recorded rather than asserted to the new value so this remains a baseline positive control; the unchanged six axe cases establish its red/green contrast requirement.
- Both Meri footer branches retain the exact notices within one contentinfo/note, with a scrolled viewport screenshot. Keyboard Research still creates the exact existing local draft and focuses its composer. There are zero action dispatches; synthetic approval is never exercised.
- The named Modules fixture warning remains visible, exact and unfocusable. The public-form branch, broad cross-mode navigation, full assistive-technology announcement, gradients, zoom/reflow, all-route audit and native/provider/deployed authority remain outside these new cases; existing coverage and the qualification ledger must retain those limits.

`observeHomeIsolation` rejects requests outside the exact configured origin and records page errors. Portfolio's canonical fixture rejects unexpected API paths/mutations; its test helper additionally records all non-GET API requests. Meri retains the existing action fixture's unexpected/remote/error checks and explicit zero-action assertions. All interactions are local fixtures.

## Static checks actually performed

`STATIC-INSPECTION.json` records formatting, TypeScript AST parse diagnostics, relative import resolution and exact source fingerprints. All five files parse, all relative imports resolve to an existing fixture or another proposed file, and no file/function crosses the repository's 400/80 review thresholds. No application module was executed and no typecheck, lint, browser, server or test ran. The five target paths were absent in the source worktree at review time.

Proposed sizes: shared interaction observation helper 95 nonblank lines; Portfolio fixture extension 58; Portfolio interactions 161; Portfolio semantics 68; shared landmark/suggestion spec 135. Every assertion remains source-owned in its relevant feature spec; helpers only handle fixture setup or reusable physical interaction observation and do not mirror a production decision algorithm.
