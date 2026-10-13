# Independent accessibility proposal review

**Accepted for bounded application and qualification; no source blocker found. This is a static review, not a post-fix accessibility pass.** Reviewed frozen source `93b3617f5d0599f34da373525a96dfc70eaa85d6`, app tree `46fb1aae65c1cdc640c965254b947a149e982c17`, author proposal `/tmp/capiro-unified-a11y-proposal-20261013`, and the three proposed test files. No repository, author packet, dependency graph, server or application was changed. No tests, browser, build or typecheck ran in this review. The only executions read files, calculate hashes/contrast, and parse source with the repository's AST scanner.

## Evidence and provenance

`INPUT-VERIFICATION.json` independently validates all 17 source pins against source bytes and frozen Git blobs, all seven candidate hashes, every author-manifest entry, and the six screenshot hashes. There are **zero mismatches**. The original audits bind the same before/after source and report empty blocked/unexpected/error arrays. Their 80 violation node instances and 40 incomplete node instances are retained; these are rule/node instances, not unique elements. Every incomplete entry matches the author's disposition by audit path, rule, target and HTML, with exact multiset equality: eight proposed semantic corrections, 30 pending rendered/manual contrast checks and two pending account-avatar/name checks. No incomplete entry is relabelled passed.

All 70 confirmed contrast instances use `#78716c` on `#f5f5f4`. Independent sRGB arithmetic gives old **4.39773360683:1**, proposed `#756e69` **4.59341287788919:1**, and proposed on white **5.011050710200293:1**. The actual rendered candidate remains unmeasured. Only the shared light token changes; the Portfolio dark `#aaa29c` override and background styles are unchanged. Since the light token is shared, six home fixtures do not qualify every consumer.

## Source semantics and preservation

- **Portfolio card:** `ProfileResults.tsx:98–119` adds one component-local stable description ID; H2 follows the existing page H1. The link preserves its exact `Open ${client.name}` accessible name, route and visible client name. Visible sector/location remains ordinary sibling text and becomes the link description. It is neither hidden nor removed. Only redundant logo/initials are hidden; the logo helper's two existing call sites both also display the client name. No extra keyboard stop, click handler, data owner or authority is added. Existing original `portfolio.spec.ts` exact-name navigation and attention-count assertions are unchanged.
- **Pointer/focus:** `portfolio.module.css:82–94` makes cardTop the containing block and stretches only the link pseudo-element over that block. The bottom status/owner and other cards are siblings outside that target. The title's old typography and ellipsis rules are preserved; focus remains the existing global link focus rule, and its H2/identity/card ancestors do not introduce clipping. This supports the intended behavior but does not prove actual hit testing, long-name geometry, focus visibility or touch access. Those require rendered controls.
- **Meri footer:** `ProductShell.tsx:34–57` retains both exact notice branches and the outer footer class, restores its document-level contentinfo semantics, and places the existing note on a valid inner container. The footer is outside main and has no sectioning ancestor in this composition. No warning text, conditional or functionality is removed.
- **Named static annotations:** the suggestions group, symbolic owner image and supplementary status/count notes supply roles compatible with their existing author labels. They introduce no tab stops, live regions or behavioral handlers. This is a proportionate correction of the reported generic-element naming concern. Real accessibility-tree/AT output, especially duplicated note name/text, remains to be observed; an axe result alone cannot certify the announcement.
- **Fixture notice:** both main.tsx notices become named complementary asides with the same text/class/positioning. The change corrects the harness landmark while keeping its synthetic-state warning visible. It does not claim a production notice defect or hide the region from audit.

The heading correction is limited to ProfileCard. Existing empty/list/error states and the independent Needs attention H3 are not fully audited by the populated card home fixture; no all-state hierarchy acceptance should be inferred.

## Proposed tests

The helper calls exactly `axe.run(document)` without rule filters, excluded elements, suppression or altered thresholds. It attaches the complete result before asserting an empty violations list, retaining incomplete/passes/inapplicable arrays. Two Portfolio and four Meri/Modules cases cover the same desktop/phone dimensions. Portfolio retains exact `Open Test Aerospace`, requires the `Aerospace` description and H2. No old scenario/assertion is deleted, renamed or weakened by these additional files.

**The six cases are a useful default-axe regression gate, not sufficient interaction qualification.** Root has agreed to preserve their exact baseline-red/candidate-green bytes and add separate focused controls from the author's `VERIFICATION-PLAN.md`. Before closing the change, verify:

1. Sequential Tab/Shift+Tab, visible focus, Enter navigation and Back/Forward; keep original positive navigation behavior on the untouched baseline.
2. Unforced logo/sector coordinate activation, with the card-bottom owner/status and neighboring cards outside the link hit target. The bottom annotations are not buttons: observe the real event/hit target or include an existing bottom control rather than inventing a product control.
3. Two clients with distinct, visibly unhidden descriptions; sector/location and missing-sector fallback; long names at 390px; no horizontal overflow and intact dark computed override/focus.
4. Both Meri footer branches, the three suggestions' keyboard draft behavior, and visible named fixture notice. Preserve no-provider/no-mutation isolation and capture unexpected requests/page errors during the successor qualification.
5. Preserve the new raw incomplete results and manually review gradient compositing, symbolic short text/account avatar, AT announcements, zoom/reflow, focus occlusion and target size. Screenshots previously captured only the viewport; below-fold phone card/footer visibility is not yet proved by those images.

No source patch flaw was identified. These are remaining verification requirements, not fabricated observed failures. Full WCAG, all routes, real authentication/provider/native operations, deployed hosts and full Figma acceptance remain unqualified.

## Dependency and responsibility review

Declaring exact **axe-core 4.14.0** as an apps/web dev dependency is appropriate because the new shared test helper imports it directly. It is already a dev-only locked transitive of eslint-plugin-jsx-a11y, resolved at `https://registry.npmjs.org/axe-core/-/axe-core-4.14.0.tgz`, integrity `sha512-9WTZxEjsZ7b13TH8JPmbV2z8CHbl80/2hm3XPEG4JgNdQLK81IBRXmSxHfMAOkSqQeRxT/0dwNDz2GOm3zzpcQ==`. Root should change only the direct declaration/owning lock metadata and verify the same version/integrity; no production import or graph upgrade is justified. No dependency change was made or installed here.

`STRUCTURE-SIGNALS.json` records the exact three changed review triggers using the repository AST scanner. They retain cohesive owners and need precise root registry records, not exemptions or count-driven splitting:

| Owner | Signal | Candidate fingerprint | Review |
| --- | --- | --- | --- |
| Portfolio index stylesheet | 487 nonblank lines (480 before) | `14dcea4159861620644b342695810bd081dfb89e818b5aa32aac5d2d01e56af0` | Existing Portfolio index presentation owner. Seven added lines establish the existing card-top target, and selectors retain title typography/ellipsis. No new feature responsibility or shared CSS subsystem. |
| Fixture RoutedApp | 107 body lines, unchanged count | `fe1e89f76112717722003d6e3ebf1f7718e9e4deb6dfa91b7332abc99b206458` | Existing synthetic route composition, with only two notice element substitutions. Existing routes/providers and fixture authority boundaries remain unchanged. |
| PortfolioAttention | 88 body lines (87 before) | `76e8ccdf0c111b56476f143a5bb6204a084807b0b19d3e4f81cacaa39fab2d3c` | Existing attention list/status/retry presentation; one note role on the already-labelled count. No additional query, aggregation, mutation or state responsibility. |

These reviews are bound to the unapplied proposal bytes. Any subsequent source revision needs refreshed hashes and review of the actual delta.
