# Independent bounded integration review

**Accepted for the single successor source commit and its comprehensive qualification. No remaining blocker was found in this bounded source/test correction. Full qualification of the new frozen application pin is still pending.** This is not native integration, deployed-host, full Figma or WCAG conformance acceptance.

The review is bound to the exact uncommitted source snapshot in `SOURCE-SNAPSHOT.json`, based on `93b3617f5d0599f34da373525a96dfc70eaa85d6`. There are seven production `src` files, one existing fixture entry, ten new test/helper files, the web dev-dependency declaration, lock metadata and architecture review registry: 21 source/metadata files in total. Every captured file matches root's execution materialization. Original test/spec files are unchanged. The five behavioral proposal files were integrated byte-for-byte. No application, dependency, test, server or runtime was edited/executed by this reviewer; source parsing, type-erasure comparison, hashing and existing receipt inspection were the only executions.

## Final source decisions

The light muted token, valid footer/note composition, named static annotations and Portfolio heading/link/visible-description corrections retain the independently reviewed scope. Sector/location remains visible and unhidden. The exact `Open ${client.name}` link name and route remain, with one stable per-card description ID. The card-top pseudo-element preserves the pointer target; bottom owner/status and neighboring cards stay outside it. ProductShell retains both exact notice variants. The fixture warning remains visible in a named complementary landmark. No data, session, approval, endpoint or provider behavior changes.

Portfolio navigation now treats `/` and `/portfolio` as the same index for Overview/Clients current-state markers. Exact path comparison excludes client-detail and other routes; existing links, client navigation and click callback are unchanged. The added navigation tests check one current marker and Back/Forward for both aliases.

Two post-proposal adaptations are accepted: the axe helper's `unknown` Window cast and ProductShell JSX line wrapping. Independent TypeScript 5.9.3 transpilation produced identical JavaScript for each before/after pair, preserving all assertions and both note texts. Their separately sealed type/format addenda retain exact source and emitted hashes.

## Manual-review defect and correction

Empty axe violations did not establish readability of the active profile count: its inherited muted foreground on the dark selected button remained in axe's incomplete results. Manual computed evidence identified it. The first regression attempt incorrectly assumed a gradient immediately after clicking, while the hovered button uses a solid background. Its four precondition failures, original spec, traces and logs are retained as a **test-adaptation failure**, not the product red.

The corrected four-case spec explicitly measures hovered solid and resting gradient states for both All and Clients at 1440px/390px in light/dark. Its unchanged SHA256 is `8c0949fe589bc9d70ce908fdc65cc7da4244be243f72bcf4580dda659d311da9`. The valid red has two light failures at **2.484436491271581:1 < 4.5:1** and two dark passes. The only production follow-up is:

```css
.tabs button[aria-pressed="true"] small {
  color: inherit;
}
```

It inherits the selected button's existing white foreground. Inactive counts, global tokens and dark tokens are unchanged; selected count text intentionally becomes white in both themes. The same four cases pass after this change: minimum hovered contrast **12.449637244033978:1**, resting gradient endpoints **15.522910417680388:1** and **19.79814571052481:1**. Both Portfolio full-document axe cases also pass on that final CSS. No text was hidden or assertion weakened.

## Receipt review

Existing root-produced JSON was independently parsed, including all result attempts and raw attached axe/contrast evidence:

| Cohort | Observed result | Scope |
| --- | --- | --- |
| Portfolio behavior + default axe | 11/11 | Nine interaction/semantic cases plus two full-document axe cases; final helper and formatted ProductShell, before selected-count CSS follow-up. |
| Shared behavior + default axe | 11/11 | Seven Meri/Modules behavior/semantic cases plus four full-document axe cases. |
| Final selected-count regression + Portfolio axe | 6/6 | Four unchanged contrast cases and two axe cases on final CSS. |
| Canonical navigation | 2/2 | Both index aliases; included in the earlier four-case navigation/Portfolio-axe receipt. |
| Original Portfolio controls | 16/16 | Existing original scenarios retained unchanged. |
| Original Meri mobile navigation | 2/2 | Existing keyboard/history/client-preservation controls retained unchanged. |

All successful cohorts have zero test errors, retries, skips or flaky outcomes. Portfolio behavior used two workers; shared behavior and final contrast used one. The new 16 interaction/semantic cases have candidate receipts; they do **not** have an independently executed untouched-source red/positive baseline in this packet. The six default-axe regressions and selected-count correction have separate preserved baseline evidence. Repeated axe cases across cohorts are not counted as additional unique scenarios.

Default axe remains `axe.run(document)`, unfiltered, with complete results attached. The six behavior-era raw audits still contain 32 incomplete node instances: Portfolio 14 at each size, Meri desktop one, Modules desktop two and phone one. These are not silently treated as passed. The selected-count manual finding demonstrates why that distinction matters. Final Portfolio axe retains incomplete findings even after the readable count correction. Source/contrast calculations and browser checks do not establish real assistive-technology announcements, every gradient/compositing state, zoom/reflow, all-route focus/target behavior or native authorization.

Root's `check-v3` completed successfully before the final three-line selected-count CSS: package pins, typechecks, 94 root tests, architecture, 21 transport tests, lint/format, 1631 web tests, 288 Capiro tests, and Newsletter qualification/declarations. Final CSS architecture and formatting pass separately. These receipts do **not** replace the planned complete qualification after the one final source commit, including build and full browser gates.

## Dependencies and structure

The lock comparison proves that adding direct web dev dependency `axe-core: 4.14.0` changes only `packages["apps/web"].devDependencies`. The existing resolved package, integrity, version and all other lock content are identical to the base. There is no production dependency or browser application import of axe.

Final Portfolio stylesheet: **490 nonblank lines**, full SHA256 `d4d23b4f53c643a1c4da9f5174bec62f8b5fc7cd12faa9f499df1907d7fe16ca`, scanner fingerprint `f15942ff74b4dea83bf1157fca7bacacd8cd414f1592485f2ae6c95a4fa16a3b`. It remains the existing index/card/filter presentation owner: the card pointer/ellipsis correction plus the selected-count rule introduce no new data, navigation or shared-foundation responsibility. The earlier 487-line review is retained as superseded provenance.

PortfolioAttention remains an 88-line attention/status/retry presentation function, fingerprint `76e8ccdf0c111b56476f143a5bb6204a084807b0b19d3e4f81cacaa39fab2d3c`; its sole new responsibility is a valid role for the existing count annotation. Root recorded these exact two production review entries. Fixture RoutedApp retains its 107-line route-composition body with only the two notice element substitutions; its explicit test-owner rationale remains in the prior static review. No blanket exemption, threshold-driven split or assertion waiver is introduced. Final architecture reports 475 signals, 452 reviewed, 23 inherited and zero blockers/errors.

The independent packet is `/tmp/capiro-unified-a11y-integration-review-20261013`; it includes source copies/hash bindings, tracked diff, parsed runtime receipts and raw log hashes. Prior proposal, behavior, helper-type and shell-format review packets remain immutable. Root owns final source commit, evidence publication and full successor qualification.
