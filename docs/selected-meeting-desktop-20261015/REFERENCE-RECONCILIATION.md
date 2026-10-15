# Selected-meeting desktop reference reconciliation

This documentation-only review starts from frontend `e9df91d876eaad05d13fdd0707c1fe39d5affb62` in the isolated `fix/selected-meeting-desktop-parity` worktree. It corrects the broad claim that no complete Modules selected-meeting reference is retained. It does not replace a design baseline, change behavior, amend earlier receipts, or qualify pixel parity. PR53 and its source remain unchanged.

## Retained reference and provenance

The retained [context](../remaining-repairs-20261012/design-baseline/fresh-captures/root/figma-411-94827.txt), [PNG](../remaining-repairs-20261012/design-baseline/fresh-captures/root/figma-411-94827.png) and [raw MCP response](../remaining-repairs-20261012/design-baseline/fresh-captures/root/figma-411-94827.json) identify node `411:94827`, `Engagement Manager · Meetings (list, 1440)`; the context export/root is at lines 44/46. The [Modules inventory](../modules-settings/FIGMA-INVENTORY.json) independently maps that node to the same desktop screen at lines 147–151. The source Figma file is `Zc2dEN5aLU47dVdsewDmiJ`, page `411:40601` ([preservation inventory](../remaining-repairs-20261012/design-baseline/INVENTORY.json):2–8).

| Retained artifact | Bytes | SHA256 | Git blob at reviewed source |
| --- | ---: | --- | --- |
| `figma-411-94827.json` | 226644 | `fa2fa74d6b7aa9f2905705993d0c3de63a2b55ef8d3d554e0eb5c8dd2cfc8c06` | `ecb40055f69a2638eb922b212dd183a3e2cb2c0c` |
| `figma-411-94827.png` | 115687 | `984837edb3e6858f36dfc7e4433115a49c81309573ffb34a7e3abb73e7e01735` | `c656a977ef2cd12e2e34303f4c123b61eac670d5` |
| `figma-411-94827.txt` | 70021 | `236766666763bcd17e736e4c7dc39e156cc3ebc7682dd539b336fca6018d0f8b` | `88bcef92bfaba5a4074d4e1b5ff1c32e3f6be08b` |

The raw response has `isError: false`. Its seventh content block (`content[6]`) is `image/png`; decoding it in memory produces 115687 bytes and the same SHA256 as the retained PNG. No image was regenerated or modified. All three current hashes/lengths match the preserved inventory at lines 2863–2888. Git history records their containing preservation commit as `c0ff28152de4753c81c232e6203d2c1249ceb30d`, dated `2026-10-12T19:30:11Z`.

The inventory records original local mtimes of `2026-10-12T19:22:04.072029+00:00` for JSON and `19:22:24.244859/244944+00:00` for PNG/text. These are saved-file observations, not a precise atomic Figma capture time. Every capture's immutable Figma version is null. Git fixes the retained bytes; it does not establish an immutable or current Figma-file revision ([preservation README](../remaining-repairs-20261012/design-baseline/README.md):12–14).

## Frame, viewport and exact illustrated state

The PNG is **1024×740**, with aspect ratio `1.3837837838`. The frame name asserts a 1440-wide desktop reference. The later [desktop coverage record](../desktop-details-20261014/COVERAGE.json):4–6 fixes the QA viewport at **1440×1040**, aspect `1.3846153846`. Their aspect ratios differ by about 0.0601%; scaling this PNG to width 1440 gives height 1040.625. This is compatible with a reduced raster of that viewport, but is not independent proof of the original frame's exact intrinsic dimensions. The raw response has no separately verified numeric root width/height or immutable version metadata.

Visual inspection confirms a complete Modules screen composition: shared header and rail, Engagement navigation/filters, selectable meeting list, and selected inline detail with Prep active. It is not a cropped Portfolio meeting modal. “Complete” here describes that viewport composition, not all offscreen detail content or a complete editable Figma file. The preserved [MS06 audit](../remaining-repairs-20261012/design-baseline/README.md):34 already calls this full context/PNG usable for the bounded split-detail repair.

The illustration contains mixed lifecycle labels, which must stay explicit:

- Upcoming is the highlighted filter (context:300–302), and the selected list card says Needs prep (357–359).
- The selected detail header says Completed · Needs debrief (412), while Prep is active (451–453) and Debrief is visually locked (461–463).
- Component annotation `Tab=Prep, State=Upcoming` names three material tabs (656–659); a separate workspace annotation says lifecycle-dependent initial entry and “All four tabs remain available” (664), without identifying a fourth tab.

These inconsistencies do not authorize a new status rule, fourth tab, lifecycle transition, or automatic tab change. Use this retained frame for the established shell/list/detail layout target. Use the canonical receipt and existing accepted behavior for runtime state. Any later visual comparison must disclose a coherent synthetic fixture's differences from these mixed reference labels rather than force production logic to reproduce them.

## Reconciliation with the later null record

The later [coverage entry](../desktop-details-20261014/COVERAGE.json):45–48 records `nodeId: null` and `LOCAL_BEHAVIOR_CAPTURE_NO_ADMITTED_FULL_FRAME`; its own qualified source is `8de8d0ebefa61b4c97e442c87ce9b6f3ec42f772`. Git records that file's latest retained change as `462e7b554200f9b4a96c1589d55b6df7ce4a7df5`, dated `2026-10-14T16:16:27Z`.

That record establishes that its qualification did not admit a complete frame. It does **not** establish that no complete Modules reference exists anywhere in retained evidence. This addendum connects the existing node 411:94827 evidence to the selected-meeting target, leaving the historical record unchanged. The corrected status is: **retained complete screen reference located and hash-verified; fresh full-frame pixel acceptance remains unqualified**.

## Established behavior and remaining verification

The approved [MS06 plan](../remaining-repairs-20261012/MS06-PLAN.md):3–7 already requires Meetings List selection to open inline Prep; existing Calendar/Library callers retain modal Notes. The feature owns split geometry, and shared `MeetingDetail` owns the current detail read/header/materials and safe supplied Join. Existing [MeetingDetail](../../apps/web/src/shared/meetings/MeetingDetail.tsx):22–35 implements inline Prep versus modal Notes and requested meeting/client checks; its three tabs remain at lines55–59.

No new mode, viewport, meeting API, provider operation, data identity or permission model is selected here. Focused 1440×1040 QA and visual review belong to the separately allocated root run. This read-only reference review executed no browser, application runtime, tests, build, network or installation. It establishes neither fresh Figma equivalence, dark/mobile parity, live authorization/provider joining nor complete pixel parity. A genuine unresolved visual conflict may require design-owner reference acceptance; the existence of the previous null record alone is not a new Neo feature question.

## Objective and Engagement coordination clarification

Active Objective operational association and Engagement plan/wave/office bindings remain engineering contract-mapping work, not three blanket questions for Neo. Existing approved behavior and full desktop scope remain in force. Parent coordination on 2026-10-15 reports the Core/Objective lane `01a13d85-a042-7236-b84f-a797c4cd3030` and Engagement lane prefix `01a141b6` resumed; this is an allocation/status report, not a public contract freeze.

The [existing owner map](../non-meri-settings-comment-closure-20261015/OWNER-DECISIONS.md):7–8 names the needed operational association and plan/wave contracts. Objective current/requested/applied source truth and independently authorized manual/generated outputs must remain distinct; no ready-to-active relabel, project/task/date cap, or invented association follows from an old illustration. Permitted cross-client offices and Team follow-up workload are already reference requirements ([Engagement reference](../desktop-detail-content-20261014/figma/engagement-desktop.context.txt):550–616). A one-client/read-only increment would be partial sequencing, not approved scope reduction. Proposals remain unfrozen; this addendum invents no route, DTO, enum, action or authority. Escalate only a demonstrated policy conflict that existing canonical owners cannot resolve.
