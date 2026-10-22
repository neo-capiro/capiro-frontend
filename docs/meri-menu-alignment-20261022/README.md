# Meri history filter alignment — 22 October 2026

This separate correction starts from frozen release `4e2c770fc6f888df4035ee2029bbf7f68a14f09d` (tree `78f76ea942da0a03acb0cfd7442ec075f5a7766b`). It does not move or amend the #119/#120 branches. Neo authorized the bounded Figma-first correction; the user completed the Manual overlay settings before this code change.

## Verified design

File **Capiro 3.4 — Meri**, `IXJzJUkXcUTkySHir5JNea`; not `Zc2dEN5aLU47dVdsewDmiJ`. Readback/export captured **22 October 2026, 12:14 EDT / 16:14 UTC**. This is a dated captured design, not an invented immutable Figma version. The exported PNGs and JSON are pinned by [SHA256SUMS](SHA256SUMS).

| Design node                                                                                           | Verified intent in the 1440 × 1040 history host                                                    |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [History host 1064:144425](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=1064-144425)   | Existing composition retained; [export](history.png)                                               |
| [Trigger row 1064:144467](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=1064-144467)    | X260/Y177, 1032 × 64; bottom alignment; 12 px gaps; 752 px search field; [export](trigger-row.png) |
| [Client trigger 1064:144472](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=1064-144472) | X1024/Y205, 120 × 36; minimum width 120, content can grow                                          |
| [Status trigger 1064:144473](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=1064-144473) | X1156/Y205, 136 × 36; minimum width 136, content can grow                                          |
| [Client menu 3034:37582](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3034-37582)      | Manual overlay X664/Y247, 480 × 292; 8 children; [export](client-menu.png)                         |
| [Status menu 3034:37596](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3034-37596)      | Manual overlay X812/Y247, 480 × 340; 9 children; [export](status-menu.png)                         |

[Exact readback](figma-readback.json) confirms both ON_CLICK actions use OVERLAY, the respective standalone menu destinations, exact relative coordinates, MANUAL positioning and the existing approximately 180 ms EASE_OUT Dissolve. The former full-screen navigation targets are no longer the trigger destinations; those screens were not deleted. Menu canvas positions are not overlay positions: only the reaction's `overlayRelativePosition` supplies the latter.

Both overlays sit 6 px below their triggers and share their right edges (1144 and 1292). Menus retain 20 px padding, 12 px gaps, title 18/27 px and description 13/19 px. Triggers retain Geist Medium 14 px / 1.2, -0.07 px letter spacing, 14 px horizontal padding, 8 px icon gap and 16 px icons. Existing local ChevronDown/ListFilter icons and shared outline primitives are reused. No asset or dependency replacement.

## Implementation and preserved behavior

Four Meri feature files implement the verified layout using existing CSS Modules and Radix menus. `HistoryFilters` supplies scoped minimum-width classes through `FilterMenu`; the wrapping flex row bottom-aligns its children. Menus already use `align="end"`, `sideOffset={6}` and collision padding 16, which remain unchanged. Remove the description's negative margin and use the captured 19 px line height. Button line height follows the design.

Search/filter state, option selection, menu content, radio semantics, focus handling, Escape/Close, mobile wrapping and collision protection are retained. No authentication, API, recovery, retry, authorization, shared-shell or other-lane change. Minimum widths allow longer selected values to grow instead of hard-coding the default text width.

The existing desktop browser case now targets the new verified X664/X812, Y247 anchors. Its position tolerance remains **<=3 px**, width tolerance **<=1 px**, with unchanged assertions for expanded state, open color, Escape and focus. Added <=1 px checks require trigger dimensions, input/trigger bottom alignment, menu heights, right-edge alignment and the 6 px offset. No timeout, retry, skip, negative case or declaration is removed or weakened.

## Checks and remaining gates

- Changed TS/TSX/browser-path ESLint: PASS, exit 0.
- Changed-path Prettier and `git diff --check`: PASS.
- Architecture checker: PASS, exit 0; no rule or exemption change.
- Figma readback and the four actual image exports were inspected. These are design evidence, not browser renders or prototype-playback evidence.
- Full TypeScript **not rerun**: the shared 8 GiB cgroup measured 8,496,467,968 / 8,589,934,592 bytes used, with prior OOM kills. Do not repeat earlier exit-137 attempts under the same resource pressure or treat lint as a full typecheck.
- No duplicate browser runner, full unit suite, production build, live model turn, SQL, merge or deployment. Dot must run the existing central synthetic alignment/functional comparison at the published head; Fable must run exact-head TypeScript and production qualification. Frozen-release PASS does not qualify this changed source.

**Qualification remains open; acceptance STOP 2/6 remains.** This draft is reviewable source and design evidence, not a ship request.
