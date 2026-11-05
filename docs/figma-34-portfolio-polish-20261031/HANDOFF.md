# Portfolio 3.4 polish — 31 October 2026

The Portfolio design pass preserves all **604 original screen/state targets** and adds four shell previews. It applies a consistent visual hierarchy to the landing page, client tabs and subtabs, Prospect workflows, dialogs and recovery states. This handoff concerns Figma only; no application code or deployment changed.

Start with the [shell review section](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3155-84314), [Portfolio landing](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-153351), [Client Overview](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-158895), or [Prospect detail](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-179393).

| Client tab | Main frame |
| --- | --- |
| Overview | [1064:158895](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-158895) |
| Objectives | [1064:174996](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-174996) |
| Calendar | [1064:179149](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-179149) |
| Relationships | [1064:164763](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-164763) |
| Work | [1064:166690](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-166690) |
| Capabilities | [1064:169534](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-169534) |
| Bill Tracker | [1064:171199](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-171199) |
| Opportunities | [1064:170699](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-170699) |
| Files | [1064:167100](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-167100) |

The shell keeps the top bar and navigation stationary while the main content scrolls. The sidebar switches between 232px expanded navigation and a 72px icon rail. Conditional click actions bind width, brand width and label visibility; tablet expansion is available too. Review [collapsed landing](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3155-84315), [collapsed Overview](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3155-84840), [collapsed Prospect](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3155-85637), and [expanded tablet](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3158-90118). [Shell QA](FINAL-SHELL-QA.json) and [preview receipt](PREVIEW-RECEIPT.json) record exact nodes and variables. This verifies saved prototype configuration; input simulation was not performed.

Implementation requirements: preserve keyboard focus on the sidebar toggle, give collapsed icons accessible names and tooltips, expose `aria-expanded`, and retain the same destinations and order at both widths. Keep body and horizontal page scrolling disabled so only the main view scrolls. An instant state change is acceptable, including for reduced motion; retain existing hover feedback. These are implementation requirements, not browser-tested claims.

The polish retains Geist, Geist Mono, Newsreader, the charcoal gradient and restrained teal selections. Targeted corrections include 42 capability cards, 48 file rows, 77 page titles, 12 additional Client files titles, and 14 pulse cards with their surrounding layout. Existing components were sufficient; no new third-party library was added. Recharts, Plate and Kibo remain earlier approved design references, not newly installed source dependencies.

Approved metric definitions, exclusion of Awaiting reply, unknown-versus-zero distinctions, original-request recovery, preserved drafts and focus restoration remain intact. Current frontend metric semantics differ in places; [source review](source/SOURCE-REVIEW.md) records the remaining implementation parity work rather than changing the approved designs.

Cleanup removed **116 unused unpublished component families**, one Meri showroom and its dependency section. All 118 expected root IDs are absent. All **24,759 retained instances** resolve to a main component, and all native prototype destinations resolve. See [cleanup receipt](CLEANUP-RECEIPT.json), [cleanup report](FINAL-CLEANUP-QA.md) and [exact QA](FINAL-CLEANUP-QA.json).

Validation:

- [Structural QA](FINAL-STRUCTURAL-QA.json): 604/604 original targets retained; zero missing targets; zero unapproved fonts. Font counts are Geist 37,896, Geist Mono 206 and Newsreader 98.
- Main-scroll configuration passes for 304 exact-name workspace bodies in the original inventory and all 409 workspace bodies including alternate names and previews.
- [Mutation receipt](FINAL-MUTATION-RECEIPT.json) supplements the [13-batch polish ledger](POLISH-LEDGER.json).
- [Final visual review](FINAL-VISUAL-REVIEW.md): all nine representative desktop/tablet samples pass. The [JSON record](FINAL-VISUAL-REVIEW.json) includes the 54 node mutations that resolved the two tablet map layouts. This is representative visual review, not screenshots of all 604 targets.

Source review is pinned to [capiro-frontend 87d0dc85](https://github.com/neo-capiro/capiro-frontend/commit/87d0dc8589c80a00ae0c2b4c7532a8a2a89ada6c); the [inventory](source/SOURCE-INVENTORY.json) covers the relevant source. The user-designated preview is app.capiro.ai, but it was inaccessible to the web tool. Structural coverage and representative Figma screenshots do not establish live application acceptance. No application tests, build, deployment or external-URL behavior were exercised.
