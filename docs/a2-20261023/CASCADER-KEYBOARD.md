# Cascader keyboard repair, 23 October 2026

The adopted ReUI level-change reset passed an empty `filteredItems` array to Base UI for one frame while keeping the new active rows mounted. Base UI then truncated its registered DOM element array after the rows registered. Restoring the array length left missing elements, so a highlighted single leaf could not be committed by Enter. Pointer selection still worked.

The local repair makes the active rendered rows empty during that existing reset frame as well. New rows register when Base UI restores the list. Ancestor columns are preserved. There is no added state, public API, dependency or keyboard implementation. Provenance retains the original upstream commit and every upstream hash; only the adapted Cascader hash and a clearly labelled local-repair note change.

Seven real Chromium controls cover async and static drill, Back, columns, columns Back, automatic virtualization with fewer rendered options than 200 source rows, and tree. They assert active-descendant identity, Enter selection, retained selection after reopening, and focus restoration. The test-only virtual renderer import is internal to the fixture because that renderer has no package public export; application code uses public exports only.

The exact original source from frontend 5a1dc9c0484c784825fb9d6be2c17e5db029fe1b fails the single-leaf async control: the highlighted row exists but the Selected work output remains None after Enter. The repaired source is restored byte-for-byte and all seven cases pass. Earlier two-leaf controls passed the old source because filtering out a sibling rebuilt the element registrations; those non-detecting runs are retained rather than described as killed mutations. The full Objective phone fixture independently reproduced the original failure and passes with the repair.

Local evidence: C:/Users/Administrator/Documents/Codex/2026-10-22/se/work/a2-repairs-20261023/cascader-swap-control/{baseline.log,baseline-direct-drill.log,baseline-single-leaf.log,baseline-single-leaf-artifacts}. Original-source failure screenshots and traces are preserved. This source repair requires independent review before integration.
