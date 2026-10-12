# Capability registrations and compact phone list

Integrate feature commit `e3d1cbb91a31cadff90898fcf2143ff5ce17318e` only. The final browser head `31ce56f6f3e7edde47fcb83b7f5f81c31b5d9862` also includes the root-owned header commit `98d18058263289293c8acf82aaeb4534d7e93317` as a separate cherry-pick; root already owns that header change.

OWI-F03 / CAP-08 / Figma 411:55825: the existing registration dialog uses aligned label/value columns, padded divided rows and a 680px desktop width. Long and missing supplied values wrap; persisted EIN warnings and all eight native-backed rows remain truthful. Existing edit, permission, draft, pending and dismissal behavior is preserved.

OWI-F04 / CAP-01 / Figma 411:86453: phone capability cards become one compact grouped list with name+maturity above actual program mapping/fallback. Decorative icons/descriptions remain in desktop cards/editor. The same buttons and URL selection owner handle both layouts.

## Verification

- Preserved baseline: 3 intended geometry failures on immutable 7aca86e feature source.
- Owned cases: 5/5 pass before the root header repair. A preserved 320px whole-page assertion exposed an inherited 329px shared header; exact overflow nodes/screenshots and both diagnosis attempts are retained.
- Existing cases: 42/42 pass with all original assertions unchanged, on the exact feature bytes.
- Final combined pin: 6/6 new cases pass, including restored whole-page 320 assertion and visible/in-bounds keyboard order for all seven enabled header controls. Updates remains visible-disabled.
- Writer units: 34/34 pass. Full web TypeScript passed before the test-only diagnostic/header additions; final focused test typecheck, changed-file lint and format pass.
- Architecture: zero boundary errors. CapabilitiesPage 122-line and Registrations 214-line changed function fingerprints/rationale are in source-review.json; root's independent static review matches all four final production hashes. No file or test function adds an unreviewed 400/80 trigger.
- Server released:owned PID 725868 absent and port 5191 closed at 19:50:54 UTC. No install, production build, native/provider writes, registry edits, push or deployment.

## Evidence and limits

`repair-report.json` binds every run and commit; `figma-baseline-manifest.json` seals the exact original live design snapshots; `design-mapping.json` records supplied geometry/tokens and responsive adaptations. `NATIVE-LIMITS.md` distinguishes bounded presentation closure from held native/full-row acceptance. New in-scope rows/list use text, dividers and existing chips, so no downloaded image asset is required. Current raw snapshots are local until root preserves them in its evidence commit.

The Figma frame's additional Small business/LDA/contracts data, decorative info/footer variant and surrounding page fidelity are not invented or claimed accepted. The eight existing supplied registration projections and native five-field edit boundary remain unchanged. Root owns shared-header integration, size registry updates and one combined qualification. All 337 native acceptance rows remain held.

Independent MS06 source review and accepted corrections are preserved separately under `ms06-independent-review/`; no source in that worktree was edited by this lane.
