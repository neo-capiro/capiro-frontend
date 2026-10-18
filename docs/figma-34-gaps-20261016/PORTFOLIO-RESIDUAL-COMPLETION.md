# Portfolio 3.1 → 3.4 residual behavior comparison

Completed 17 October 2026 in Portfolio file `mpXWnySldUFzdVna8i69Ki`, page `1064:140864`. The earlier 293-entry frame comparison and 398-entry directory remain intact. This pass checked component families excluded by the FRAME-only manifest and repaired real prototype handoffs lost during the three-file split.

## Component presence

No missing section-boundary INSTANCE or COMPONENT product views were found. Five source COMPONENT_SET families exist natively in 3.4. All 21 variant names and dimensions match the source exactly:

| Family | 3.1 source | 3.4 target | Variants |
| --- | --- | --- | --- |
| Meeting workspace | `373:38027` | `1064:178407` | 8 |
| Client Work document row | `762:146528` | `1064:190303` | 4 |
| Saved submissions | `1019:187927` | `1064:270380` | 2 |
| Phone verification | `1028:188271` | `1064:270517` | 4 |
| Test alert | `1028:188272` | `1064:270535` | 3 |

The Meeting workspace includes upcoming, completed, empty and unavailable Prep/Notes states and draft/source Debrief states. Existing masters and instances were retained, not recreated or detached. No catalog rebuild was necessary.

## Repairs

335 unique native controls were updated. Existing non-click hover/press reactions and click variable assignments were retained where applicable.

- 23 Open workspace actions and 12 client document rows now open Modules → Workspace Documents (`1064:253915`).
- Five Open in Planner controls open the current Planner Objective project list (`1064:209988`), preserving the current multi-project/shared-task design.
- Manage templates and New template open Template Studio (`1064:261139`) and its New template modal (`1064:261340`).
- Directory handoffs open Congressional Staff (`1064:239919`) or Committee Staff (`1064:240106`) according to the originating drawer. All 17 member text links are connected.
- Fourteen Strategies pulse row controls open the current Strategies library (`1064:227836`).
- All 227 account/avatar controls now work: 186 desktop headers open Account menu Standard (`1064:242791`); 18 tablet headers open tablet settings (`1064:252034`); 23 phone headers open mobile settings (`1064:252219`).
- Budget, billing and overdue notification cards open Defense Budget line detail (`1064:241804`), Settings Profiles (`1064:244975`) and Planner Firm Tasks (`1064:193172`). The separate profile-request review controls were preserved.
- Contextual calendar links inside the client profile open the local Client Meetings calendar. Month/Week controls and the meeting workspace’s Today return no longer send users to the global calendar. The event-popover scrim returns to the local Client Meetings month view. The selected Today control on the current Agenda fixture remains without self-navigation.

Cross-file destinations are native Figma URL prototype actions. Existing current client context remains in local meeting views; only the top navigation’s Master calendar action opens the global calendar.

## Verification

- All 84 original non-header cross-area Portfolio actions have a matching current 3.4 control and intended destination: 84 passed, zero failed.
- Original conditional actions were inspected recursively: no additional conditional cross-file destinations were omitted.
- Final recursive local graph: 8,807 NODE actions, 555 unique local destinations, zero missing destinations.
- Five component families / 21 variants match source names and dimensions exactly.
- No layout, typography, artwork or screen membership changed, so the passing prior visual evidence remains applicable; unchanged screens were not rerendered.
- The 3.1 source file, Dashboard placement, intentional removals, recent 3.4 Objective/Location/Government-Federal changes and application code were not modified.

## Evidence files

- `residual-component-parity.csv` / `.json` — five component-family mappings and variant equality.
- `residual-source-product-actions.json` — original 84 non-header product actions.
- `residual-product-repair-result.json` and `residual-text-notification-repair.json` — all returned mutated node IDs and destinations.
- `residual-source-conditionals.json` — original recursive conditional cross-file audit.
- `residual-validation-final.json` — 84/84 destination matches and final recursive destination graph.
- `residual-target-components-and-graph.json` — native component/variant inventory and initial graph.
- `residual-repair-products.js` — main authoring script.

This is a Figma design/prototype parity result. It does not claim backend persistence or production service qualification.
