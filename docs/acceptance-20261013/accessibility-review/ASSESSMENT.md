# Retained axe incomplete review — frozen 90ccdd47

This read-only review found **12 axe reports, 8 with incomplete results, containing 35 node/rule occurrences**: 33 `color-contrast` and 2 `label-content-name-mismatch`. All 12 report zero automated violations. Four phone reports have no incomplete nodes. These facts do **not** constitute full accessibility or native acceptance.

Of the 35 occurrences, 7 can be disposed within the exact captured scope: 2 active-count contrast checks,2 synthetic account-name checks, and 3 redundant decorative elements. The other 28 have positive prior rendered and current source support; this review leaves their **exact current rendered contrast confirmation open**. No new source defect is established by these attachments. Preserve the earlier active-count failure and its subsequent correction as separate history.

## Provenance and complete inventory

Frozen application: `90ccdd47de7a989e822590d616d69baa15a37d5d`, published under `5875e240c7b266a0e63903c4d0ed9b30c08d4d9a`. [inventory.json](inventory.json) records exact Git blobs and SHA256 for 16 relevant source/test files; all working bytes matched frozen 90 when inspected. It preserves every rule, selector, captured HTML, check message/data, raw attachment hash, source reference, prior computed support and per-node disposition.

Both enclosing Playwright JSON blobs were read from retained ZIP objects and independently SHA256-checked, without extracting or executing them:

- `modules-browser-results.json`: `4c4be4783affcdb4e78334e438f5d0d2d5b4a183acb41868b6fe61b9c44f1af1`,5,339,214bytes; `completed-objects.zip` under `/workspace/capiro-unified-90ccdd47-publication-20261013`.
- `portfolio-shard-3-results.json`: `8091a2843f3acb3e6ddda175b09ce2a300fca057afb885012aa0ec90e7168ad3`,1,821,581bytes; `released-3-objects.zip` in the same publication.

Each attachment uses full-default axe-core 4.14.0. `apps/web/test/accessibility.ts:4–20` calls `axe.run(document)` without exclusions and asserts only `violations`, retaining `incomplete` for review. Files timestamps use the deliberate fixed fixture clock 2026-10-12T20:00; they do not date source qualification, which occurred 2026-10-13.

| Inventory | Captured view | Incomplete nodes | Manual disposition |
|---|---|---:|---|
| AXE-01 | DOCX Files1440 |1| Shared New conversation gradient; R1 |
| AXE-02 | DOCX Files390 |0| No incomplete recorded; bounded automated result |
| AXE-03 | XLSX Files1440 |1| Shared New conversation gradient; R1 |
| AXE-04 | XLSX Files390 |0| No incomplete recorded; bounded automated result |
| AXE-05 | Files unavailable1440 |1| `.bg-primary`, visible New conversation button; R1 |
| AXE-06 | Files unavailable390 |0| No incomplete recorded; bounded automated result |
| AXE-07 | Meri home1440 |1| New conversation gradient; R1 |
| AXE-08 | Modules home1440 |2| Decorative arrow resolved; Open Engagement R2 |
| AXE-09 | Meri home390 |0| No incomplete recorded; bounded automated result |
| AXE-10 | Modules home390 |1| Open Engagement R2 |
| AXE-11 | Portfolio home1440 |14|3 resolved;11 current contrast checks R3 |
| AXE-12 | Portfolio home390 |14|3 resolved;11 current contrast checks R3 |

## Bounded manual resolutions

**Active count: 2 occurrences.** The warning target `.primary > small` is the active All filter count. Exact 90 sibling tests retain 16 `active-count-contrast` attachments across 1440/390, light/dark, rest/hover. They show white text, opacity 1, and contrast 15.5229–19.7981:1 on the opaque gradient at rest; hover gives 12.4496:1 on `#343434`. This exceeds the conservative 4.5:1 normal-text threshold. The current CSS at `features/portfolio/index/portfolio.module.css:147` preserves `color: inherit` for active counts. Its SHA256 `d4d23b4f53c643a1c4da9f5174bec62f8b5fc7cd12faa9f499df1907d7fe16ca` matches the independently accepted active-count addendum. The historical 3.10–3.95:1 light count failure is superseded only for these reviewed states; it is not erased.

**Synthetic account name: 2 occurrences.** Both `label-content-name-mismatch` entries target `.monogram`: `<button aria-label="Test account" ...>T</button>`. The visible T is an account initial and the explicit name identifies that control and includes the initial. Its exact owner is `apps/web/tests/browser/clerk.tsx:15`. This resolves the captured fixture ambiguity; it says nothing about actual Clerk account controls, speech input, or a screen-reader session. No source rename is warranted from this evidence.

**Redundant decoration:3 occurrences.** The two Portfolio `TA` logos duplicate the adjacent full client name. `ProfileResults.tsx:103–118,141–150` keeps the logo separate from the link, marks only the redundant logo decorative, and keeps meaningful sector/location visible and described. Modules' arrow at `ModuleHub.tsx:143–164` decorates two complete written explanations; it is not a control or the sole communication of a relationship. These dispositions follow the actual redundant content, not an assumption that `aria-hidden` alone exempts meaningful content. Prior computed ratios also support these elements.

**The Portfolio profile link is not a current incomplete name warning.** Frozen source uses h2, an exact `Open <client name>` link name containing all visible link text, and `aria-describedby` pointing to visible sector/location. No meaningful sector information is hidden. The qualified tests at `portfolio-home-accessibility.spec.ts:12–22` pass both 1440/390 with `Open Test Aerospace`, description `Aerospace`, and level 2 heading. Preserve these assertions and naming behavior.

## Gradient evidence and calculation limits

The Files desktop warnings concern the shared **New conversation** button, not a document preview, immutable-version data, editor fields or a native file. Manually viewed retained screenshots include disabled1440 (`f2aca6a0…d88379`), DOCX1440 native-pending (`6492af32…8f1eb`), and XLSX390 native-pending (`4a53157b…b54`). Full paths, hashes and ZIP member identities are in the inventory. The mobile screenshot shows stacked editor/version sections with the desktop sidebar absent. Native-pending captures are representative states earlier in the same qualified flow, not the final revision-state axe instant; screenshots alone cannot measure compositing or prove all reflow/focus states.

Prior independent rendered captures in `/tmp/capiro-unified-a11y-render-review-20261013/captures/` include computed colors and ancestor opacity/filter/blend chains at corresponding widths. Every current incomplete selector maps to prior computed support (Files uses the shared Meri button correspondence). Current source pins support the retained styles. Nevertheless, the prior captures predate Files integration, and some surrounding source changed. The inventory explicitly distinguishes these prior measurements from exact90 computed captures; no blanket source-equivalence assertion upgrades them to current rendered acceptance.

Independent sRGB calculations, also recorded in the inventory:

| Text / background | Contrast |
|---|---:|
| White / `#242424` |15.5229:1|
| White / `#0a0a0a` |19.7981:1|
| White / `#343434` hover |12.4496:1|
| Pulse labels `#a8a29e` / `#242424` |6.1551:1|
| Pulse labels `#a8a29e` / `#0a0a0a` |7.8503:1|
| Muted `#756e69` / `#f5f5f4` |4.5934:1|
| Muted `#756e69` / white |5.0111:1|

These are conservative bounds for opaque two-stop grayscale backgrounds with the recorded foregrounds. They require the actual rendered opacity/filter/background conditions to hold. Axe's `contrastRatio:0` for `bgGradient` or `shortTextContent` means it could not compute the result; it is not a measured0:1 failure.

The 22 still-open Portfolio contrast occurrences are the synthetic avatar T, Add profile, Portfolio pulse label, “of work linked to an objective”, client numeral1, Clients/Need attention/Objectives/Off track/Strategies labels, and the active All button text, repeated at both widths. Their prior rendered rest values pass; R3 asks for a fresh exact-source binding and relevant interaction states rather than a speculative color change.

## Required root rendered follow-up and candidate changes

1. **R1 — shared Files/Meri gradient.** At 1440px, collect computed foreground, solid/gradient background, opacity/filter/blend and ancestor chain for New conversation on DOCX, XLSX, unavailable Files, and Meri, at rest/hover/keyboard focus with light/dark preference. Confirm the unavailable `.bg-primary` is the same control. At 390px verify mobile equivalents remain keyboard reachable; do not expect the hidden desktop sidebar button. Existing Files navigation controls already retain exact90 focus-visible 2px solid blue outline and in-viewport evidence.
2. **R2 — Modules.** At 1440/390, measure Open Engagement rest/hover/focus across light/dark preference, preserving its label and destination. No source change to the decorative arrow is justified by this packet.
3. **R3 — Portfolio.** At 1440/390, capture the remaining 11 targets per width above, including interactive hover/focus and both themes. Preserve the independently proved active-count inheritance. Do not reintroduce the old muted-count color or treat its old failed packet as current.
4. **R4 — names/navigation and limits.** Reuse existing accessibility/interaction fixtures to check exact profile name, visible sector/location description, h2, keyboard open/back navigation, focus, long names, and 320/390px reflow/zoom. Native Clerk naming and actual assistive-technology behavior need separate rendered/AT evidence. Existing synthetic name and focus checks are useful but do not supply that proof.

**Candidate source changes: none established by these 12 attachments.** If fresh computed checks fail, make the smallest actual foreground/background correction while preserving labels and interactions; do not suppress axe rules, hide meaningful text, or replace gradients just to eliminate an incomplete classification. Preserve all existing default-axe and semantic assertions. Root owns any future source correction and rendered checks.

No browser, server, tests, build, native/provider call, or source edit was performed for this review. No full WCAG, all-theme, all-state, all-browser, screen-reader, native 337-row or Figma acceptance is claimed.
