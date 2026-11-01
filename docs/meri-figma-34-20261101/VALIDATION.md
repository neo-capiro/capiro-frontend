# Meri 3.4 validation — 1 November 2026

This validates editable Figma design states and prototype examples. It does not certify a deployed application.

## Checks completed

| Area | Evidence and result |
|---|---|
| Existing active shell polish | 269 existing screen roots processed; 165 legacy sidebars replaced by the shared quiet sidebar. Root IDs preserved. Archive references excluded. Counts overlap subsequent screen-specific work. |
| Final canonical/chat check | 15 selected roots read back; no outer-frame scrolling, contained transcripts where applicable. 39 unique prototype destinations resolved. Final question Submit is disabled before selection and wired after selection. Collapsed desktop sidebar remains hidden and unbound. See [root QA](qa/FINAL-ROOT-QA.json). |
| Typography | Final canonical sample contains Geist and Newsreader. Technical styles use Geist Mono where applicable. Agent packs separately checked fonts and text-width bounds. This does not claim screenshots were taken of every frame. |
| Tools and usage | Final screenshots inspected for 3230:73693 and 3229:75327: no clipped controls or overlap, usage qualifications visible. See [visual QA](qa/FINAL-TWO-SURFACE-VISUAL-QA.json). |
| Runs removal | Two obsolete Tools launchers hidden, eight contextual links renamed and redirected. Read-back found zero active exact Runs/Open runs/View runs/Run view launch labels outside archives. See [receipt](qa/FINAL-RUNS-REMOVAL.json). |
| Office/files | 40 new views checked; six retained A7 states corrected. Desktop document/sheet/slide, mobile/tablet and failure examples visually reviewed. See [Office QA](qa/OFFICE-FINAL-QA.json). |
| Settings/MCP | Initial 37-view structural audit: no wrong fonts or dangling destinations; four additional states checked separately. Final family has 41 views, 34 new. Representative desktop/mobile/tablet screenshots reviewed. [Initial pack QA](qa/SETTINGS-MCP-QA.json). |
| Governance | Final family has 104 roots, 318 local wires, 39 responsive roots. The 17 identified phone/tablet gaps have 32 new matching-size detail/continuation states. [Final route verification](qa/GOVERNANCE-RESPONSIVE-ROUTES.json) confirms all 17 destinations. Phone Approve/Cancel fit above the composer after the final spacing correction. |
| Responsive chat | Eight updated/new views checked, with final phone, tablet and collapsed-desktop screenshots. Phone conversation scopes match Anduril; empty homes retain General. [Responsive QA](qa/RESPONSIVE-CHAT-VERIFIED.json). |
| Mobile navigation | Shared mobile header has a Workspace entry. Custom MCP phone control 3219:50470 was separately wired and read back to 1064:149061. [Custom-header QA](qa/CUSTOM-MOBILE-NAV-QA.json). An already-open menu needs no self-navigation. |
| Attachment/browser/search recovery | 13 additional states passed frame, typography and contained-scroll checks; three screenshots inspected. [Recovery QA](qa/RECOVERY-QA.json). |
| Visual review | Representative home, conversation, SDK question, Tools, usage, source/recovery, Office, preferences/MCP, memory, action review, routines, Updates, mobile/tablet and dark-preview screens inspected. Final review-index screenshot inspected. |
| Archives | 44 superseded entry roots moved to a clearly named reference section, without deleting their IDs. [Archive register](ARCHIVE-REGISTER.json). |

The numbers above describe separate, sometimes overlapping passes. They must not be summed into a total number of screens changed. The authoritative coverage total is 320 unique referenced frames across 24 groups / 41 areas.

## Prototype interpretation

The saved links demonstrate state changes. They do not submit messages, execute tools, approve actions or write data. Selection applies to the draft; sending is separate. Recovery examples retain original-request identity and do not invite duplicate writes.

The zero-unresolved statement applies to the 17 identified Governance responsive references and the read-back checks listed above. It is not a claim that every visible control across every legacy reference was exhaustively exercised. Read-only retry controls without a deterministic result, qualified catalog/documentation URLs and owner-module cross-file destinations remain explicitly bounded by their contracts.

## Not performed

No application formatting, lint, type, unit, build or end-to-end tests were run because no application code changed. No real OAuth/provider activation, model/tool execution, customer-data mutation, Office save/publish, native export, notebook execution, browser lifecycle or deployment verification was performed.

Design source presence does not establish feature-gate activation or accepted live behavior. Models, provider/tool catalog examples and illustrative SDK usage must be replaced by authorized server data. SDK estimates are not invoices or enforced budgets. The dark home is a local appearance preview, not a claim of global theme implementation.

Screenshots and raw mutation scripts remain local working evidence. This handoff includes portable frame IDs, source pins, coverage, representative QA snapshots and explicit qualifications; it omits short-lived asset URLs and execution scripts.

## Final source freshness check

The PR creation showed main had advanced during the pass. The final [eight-file comparison](qa/FINAL-MAIN-DELTA.json) through `e05d950a6a50cd3f2b344ac84ef3b9233c3448ca` was inspected. The only Meri product component change is readable memory-title fallback; the prior and new files were read. Existing readable headings remain consistent, and the fallback rule is documented in source reconciliation. Portfolio/Modules changes in that delta are outside this Meri task. This check does not assert deployment of that commit.
