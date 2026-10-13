# Figma preservation audit — 12 October 2026

The existing reference is file `Zc2dEN5aLU47dVdsewDmiJ`, page `411:40601`. **A complete, immutable Figma-file baseline has not been verified. Keep this original unchanged and make design edits in a duplicate.** This audit does not modify Figma or adopt a revised design. The frozen shipping source d5dd0be and PR14 source ee01be3 remain unchanged.

## What GitHub actually preserves

- [PR11 assessment at e9ba4c32](https://github.com/neo-capiro/capiro-frontend/tree/e9ba4c32da8e9a499bf7fb3b1b34dad7acf913ac/docs/remaining-assessment-20261012/evidence): 265 Figma-named reference files, including raw tool contexts, extracted text and PNGs. This audit checked every listed file against its committed Git blob. A PNG can be clipped or 1×1; presence is not usable visual coverage.
- [PR14 at 7aca86e7](https://github.com/neo-capiro/capiro-frontend/tree/7aca86e7d64cfdb85d09d424a07e6186339fc24c): inherited references, exact downloaded runtime assets, asset provenance, and later bounded design captures. The application/browser screenshots establish implementation evidence, not a Figma source backup.
- [Portfolio handover context](https://github.com/neo-capiro/capiro-frontend/tree/c330cebbd021eb984b4bf64ae13dbb991ae6b1c0/docs/portfolio-31/handover-2026-10-12): packed historical context bytes, reconstruction tools and hashed manifest. The manifest was reconstructed in memory and verified as `c23fb2a329d4a6c314ef41bec572603049e2601168579b86d2dd94bba4aa2575`; it contains 138 Figma-named paths among 35,264 historical paths, with no `.fig` path. This is preserved working evidence, not a complete design-file export.
- [Modules inventory](https://github.com/neo-capiro/capiro-frontend/blob/50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a/docs/modules-settings/FIGMA-INVENTORY.json): 457 discovered frame/component references and ownership links. [Its archive manifest](https://github.com/neo-capiro/capiro-frontend/blob/50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a/docs/modules-settings/context/ARCHIVE.json) describes 764 Figma capture files inside the 19,401,243-byte Library ZIP, SHA256 `4a8ffea5bcdaf09f9ed1a619473b6623b338bb23d897de2e0b2b7e43110d0171`. Those archive bytes are **not verified as GitHub blobs**; the committed manifest and Library reference are distinct from the archive itself.
- Committed runtime manifests include `apps/web/design/home-assets.json` (Meri `442:81437`), `cited-answer-assets.json` (`442:81682`), `modules-shared-assets.json` (`411:93787`), calendar/district manifests and Portfolio exact exports under `apps/web/public/design`. They preserve selected asset bytes, source nodes and hashes, not all design assets/components.
- Raw per-node contexts preserve the returned typography/style/token values and geometry. Application CSS preserves implemented tokens. No complete file-wide variable collections, modes, component variants, prototype interactions, named-version export or immutable Figma revision ID has been verified. Meri's own Home handover explicitly describes separate live reads without an immutable revision identifier.

`INVENTORY.json` gives exact committed paths, blob IDs, SHA256 values, PNG dimensions, node mapping, and fresh captures. Fresh repair captures are copied under `fresh-captures/`; these copies become GitHub evidence only when the containing commit is pushed. Local timestamps establish when bytes were saved, not an atomic Figma revision. No version ID was returned by these tool calls.

## Remaining 18 findings

| Findings | Original node IDs | Preservation / remaining design dependence |
| --- | --- | --- |
| CI-01 | 411:47010, 411:47482, 411:47030 | Assessment context/PNG; fresh high-fidelity child 411:47063 also retained. Source repair can use frozen evidence; exact asset retrieval is being checked. |
| CI-02 | 411:47736 | Assessment and fresh context/PNG preserve search/shortcut reference. |
| CI-03 | 411:51801 | Assessment and fresh context/PNG preserve team roster reference. |
| CI-04 | 517:121532, 517:121876, 517:122239 | Assessment and fresh context/PNG preserve choice-group references. |
| CP-04 | 411:58068, 411:58269 | Assessment and fresh references; detailed child 58269 retained. |
| CP-05 | 411:48800, 411:48826, 411:49051, 411:60193 | Assessment references; fresh child 411:60524 retained. Some inline screenshots are ancestor-clipped. Two exact timeline SVGs still require read-only export/retrieval. |
| CP-06 | 411:52484, 411:53189 | Assessment and fresh full contexts/screens; native source/folder behavior remains a separate contract limit. |
| CR-05 | 411:63431 | Full assessment context/PNG; no additional live design read needed for current repair. |
| CR-06 | 679:142262, 679:142349 | Full assessment context/PNGs; no additional live design read needed for current repair. |
| CR-08 | 682:142827, 698:142722, 683:142902, 698:142952 | No assigned-frame capture found in assessment or by frame ID in the packed Portfolio/Modules manifests. Native sharing repair can proceed; design verification still needs these original live references or a stable export. |
| CR-09 | No assigned frame | Native shared-material feed defect has no assigned visual target. No invented design-parity claim. |
| CR-10 | 435:82147, 435:82656, 435:82802 | Context retained; original 82802 PNG is 1×1 and parent compose is clipped. Fresh child 435:82309 formatting context retained. Formatting/source repair can proceed; full rendered composer export is still needed for full visual acceptance. |
| OWI-F03 | 411:55825 | Assessment and fresh context/PNG sufficient for current bounded registration repair. |
| OWI-F04 | 411:86453 | Assessment and fresh context/PNG sufficient for current bounded mobile capability repair. |
| MS06 | 411:94827 | Full assessment and fresh context/PNG; safe join-link and split-detail repair can use frozen evidence. |
| MS07 | 411:112533 | Full assessment and fresh context/PNG sufficient for workspace-filter repair. |
| MS08 | 411:95475 | Full assessment and fresh context/PNG sufficient for Planner grouping repair. |
| MS09 | 411:108618 | Full assessment and fresh context/PNG sufficient for public-form hierarchy repair. |

The table reports bounded implementation dependencies, not full row acceptance. All 337 Portfolio native rows remain unaccepted until their own criteria are met. Current source repairs do not require adopting future Figma changes.

## Minimum preservation before editing

1. **Immediate safe option:** duplicate the Figma file and edit only the duplicate. Preserve the existing file/key/nodes and linked libraries unchanged for this work. Record the duplicate URL separately; it does not replace the current baseline.
2. **If the original must change:** first save a named Figma version and retain its immutable version identifier/link, download a complete native `.fig` backup (including relevant linked-library dependencies), and verify it opens. Preserve an old-to-new node mapping if duplication changes IDs.
3. Before treating GitHub alone as an offline design baseline, finish and commit the missing CR-08 references, usable full composer/affected clipped renders, exact remaining SVG bytes, and relevant variables/modes/components/prototype-state information. Copy and hash-verify the Library-only Modules archive into durable accessible storage. Pin each export to file, node, version, capture time, dimensions and SHA256; separate initial contexts from deeper child captures.

A named version or native backup protects the original design; per-frame captures protect implementation review. Neither screenshots nor generated reference code alone recreate the complete editable design. No Figma writes were performed for this audit.
