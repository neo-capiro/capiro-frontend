# Portfolio 3.4 design gaps — completed 16 October 2026

Status: **Applied in Figma and visually verified.** No application code, backend configuration, branch implementation, or shared data was changed.

[Open the linked review index](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3043-54839).

## Coverage

- All 29 requested Portfolio states are represented. The existing empty Objective page is filled in place; 41 additional editable frames include the remaining requested states, blank validation/save examples, requested/applied association examples, removal confirmations, and the review index.
- Objective intake contains Outcome, Government problem, Type of ask, Minimum win and optional Limits. An empty draft saves with readiness 0 of 4; a draft with an Outcome saves with readiness 1 of 4. Request review on a blank form identifies all four required fields. A separate example preserves an entered Outcome while validating the other three required fields. Saving never generates or links work automatically.
- Strategy/project/task selection is client-scoped and remains requested until a confirmed receipt. Current links are marked separately. Removal changes an association without deleting the source record. Direct and inherited support are labelled; shared tasks can remain through another relationship. Conflict and delivery uncertainty preserve the draft and offer reconciliation rather than blind resubmission. Existing Planner wording now supports multiple projects and shared tasks.
- Location loading, read error/retry, partial coverage, access removed, moved and deleted states are present. Private details/editing actions are hidden after access loss. Evidence separates client workforce from public district context and includes units, reporting period, observation/retrieval dates, source and review status. Invented values are clearly marked as synthetic design examples.
- The existing combined Government/Federal modal is reused. Identity and Federal tabs have independently denied, unmatched, partial and stale states. Missing funding is Not available, a source/period-supported zero is labelled distinctly, and requested program context remains separate from client-attributable awards.
- Original combined Government/Federal and ten-area location profile layouts are preserved.

## Motion and prototype

Native Location enter keyframes: 180 ms, opacity 0→1, translation Y 8→0 px, ease out. Exit: 120 ms, opacity 1→0, Y 0→4 px, ease in. Close, Done, Escape and backdrop return to Overview 1064:158895; the normal location path passes through the exit frame. Reduced motion has no spatial/fade tracks and uses immediate navigation. Recovery/access-removed states close directly so protected content never flashes through a canonical exit fixture. Keyboard focus return to the originating map trigger remains an implementation requirement; Figma verifies the destination. Keyframes were read back through the API; video export was not run for this simple motion.

Final prototype audit: **42 frames, 887 edges, 75 unique destinations, no missing or self destinations**.

## Validation

- 42 frame screenshots exported and downloaded; nonzero file sizes and SHA-256 are recorded in local authoring evidence. The native Figma links below are the portable handoff.
- Visible text bounds and TEXT sibling-overlap audit: zero issues across all 42 frames.
- Geist typography, native editable layers, existing semantic color tokens and native button/field instances reused. A compact Objective multiline field component fixes the inherited field-height constraint without detaching instances.
- Representative final screenshots visually checked: empty/validation intake, review index, selectors, delivery uncertainty, location evidence/access removed, funding missing versus zero, requested selection and project removal receipt.
- These are design/prototype states, not evidence of qualified live service writes or actual client facts.

## Native frame index

- [P01.02 · Objective intake · validation](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-49658)
- [P01.03 · Objective intake · saved](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-49665)
- [P02.01 · Objective links · Linked work](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-49672)
- [P02.02 · Objective links · Select Strategies](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-49832)
- [P02.03 · Objective links · Select Planner projects](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-49992)
- [P02.04 · Objective links · Select tasks](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-50152)
- [P02.05 · Objective links · Remove a direct task link?](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-50312)
- [P02.06 · Objective links · Links changed since you opened them](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-50472)
- [P02.07 · Objective links · Sending changes](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-50632)
- [P02.08 · Objective links · We cannot confirm this save yet](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-50792)
- [P02.09 · Objective links · Links applied](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-50952)
- [P03.01 · Location · Loading location](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-51112)
- [P03.02 · Location · Location could not load](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-51401)
- [P03.03 · Location · Some location details are unavailable](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-51690)
- [P03.04 · Location · Access to this location was removed](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-51979)
- [P03.05 · Location · This location record has moved](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-52268)
- [P03.06 · Location · This location was deleted](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-52557)
- [P03.07 · Location · Evidence and review](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-52846)
- [P04.01 · Government & federal · Identity & registration · Access denied](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-53135)
- [P04.02 · Government & federal · Identity & registration · No verified identity match](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-53255)
- [P04.03 · Government & federal · Identity & registration · Partial identity record](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-53375)
- [P04.04 · Government & federal · Identity & registration · Identity data is stale](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-53495)
- [P04.05 · Government & federal · Federal activity · Access denied](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-53615)
- [P04.06 · Government & federal · Federal activity · Recipient match not established](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-53735)
- [P04.07 · Government & federal · Federal activity · Partial funding coverage](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-53855)
- [P04.08 · Government & federal · Federal activity · Federal data is stale](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-53975)
- [P05.01 · Location modal · Exit 120 ms](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-54095)
- [P05.02 · Location modal · Reduced motion](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3034-54384)
- [P01.03A · Empty draft saved · 0 of 4](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3043-53388)
- [P02.02A · Requested Strategy selection](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3043-53587)
- [P02.02B · Strategy link applied · confirmed receipt](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3043-53628)
- [P02.03A · Requested project selection](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3043-54002)
- [P02.03B · project link applied · confirmed receipt](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3043-54043)
- [P02.04A · Requested task selection](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3043-54420)
- [P02.04B · task link applied · confirmed receipt](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3043-54460)
- [Portfolio 3.4 · Gap review index](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3043-54839)
- [P02.02C · Remove direct Strategy link](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3047-53349)
- [P02.02D · Strategy removal applied · confirmed receipt](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3047-53532)
- [P02.03C · Remove direct project link](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3047-53744)
- [P02.03D · project removal applied · confirmed receipt](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3047-53927)
- [P01.02A · Blank review validation · 4 required fields](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3049-54009)
- [P01.01 · Objective intake · empty](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-175186)
