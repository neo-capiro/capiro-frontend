# Portfolio QA design references

The November 3, 2026 Portfolio fixes use the current [Capiro 3.4 Portfolio file](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio). Fill with Meri and Objectives are outside this change.

Existing high-fidelity references reviewed: Prospect Overview `1064:179393` and New Folder dialog `1064:167963`. The current collapsed-sidebar prospect activity card `3155:85736` was also inspected for its structure and style properties. The new components reuse the existing Geist text styles, card/dialog fills and borders, rounded controls, and prospect status marker. Existing prototype screens were not changed.

The reused treatment has white cards, `#e2e6e6` borders, `#636a6a` secondary text, 12px card/dialog corners, 12–15px Geist interface text, and 28/36px compact/default controls. Implementation should compose the existing Portfolio primitives and tokens rather than copy generated absolute positioning.

The [QA component review frame](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=3171-88648) contains instances of these additions on the Components page:

| Finding | Component | Figma node | Behavior |
| --- | --- | --- | --- |
| F22 | Prospect lifecycle | [3171:88647](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=3171-88647) | Archived/Converted state near the title, clear restriction text, Restore prospect/Open linked client action. Pipeline stage remains separate. |
| F13 | Activity navigation | [3171:88639](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=3171-88639) | Exact visible count, Load more, and full activity history after a bounded initial page. |
| F13 | Section navigation | [3171:88640](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=3171-88640) | Native anchors keep prospect work sections reachable. |
| F12 | New folder | [3171:88641](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=3171-88641) | Empty-folder creation does not require a selected file; existing inline field-error treatment remains applicable. |
| F12 | Upload destination | [3171:88643](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=3171-88643) | Upload here preselects the current folder before files are uploaded. |
| F06 | Proposal template selection and preview | [3171:88645](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=3171-88645) | Meaningful title, version, product type and ownership identify the choice; preview reads the selected published template. |

The review frame was inspected at its native 800×1480 size; [the captured design evidence](figma-components.png) is included. All labels and controls were visible without clipping or overlap. A high-fidelity design-context read also returned the rendered review frame. Design examples are illustrative; actual counts, record state, template metadata and permitted actions must come from the current application contracts. This design review does not establish code or browser acceptance.
