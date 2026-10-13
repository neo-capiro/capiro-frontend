# PR15 handover — draft for final integration

**Draft, not a final acceptance verdict.** Source is frozen at `1585438295776604f23a5cb5ab592729f7c468ca`. The 1,118-case Portfolio browser gate is **PENDING**. Completed gates and preserved failures are recorded in [QUALIFICATION.md](QUALIFICATION.md); archive and evidence totals below remain placeholders until root creates and verifies them.

[PR15](https://github.com/neo-capiro/capiro-frontend/pull/15) integrates the bounded frontend facets of all 18 remaining findings. It preserves one Next application, canonical session/client lifetimes, separate Core/Intel transports, the fixed Modules gateway and Meri public contracts. It does not merge or deploy the application.

| Findings | Delivered bounded change |
| --- | --- |
| CI-01–04 | Supplied profile fields, searchable view picker/shortcuts, team roster and intake choice layouts. |
| CP-04–06 | Facilities manager, reviewed-record recovery, dated/read-only expanded activity, native Files provenance/folder presentation. |
| CR-05/06/08/09 | Calendar lifecycle/context, selected-artifact sharing receipts and a separate current-client shared-materials feed. |
| CR-10 | Rich formatting, safe HTML review and guarded rewrite/Undo in the existing mail draft. |
| OWI-F03/04 | Registration section geometry and compact phone capabilities/header. |
| MS06–09 | Supplied safe meeting join link and split detail, compact filters, current-page task grouping and public-form hierarchy. |

The [row audit](evidence/final-ledger-review/REPORT.md) maps these facets to 34 original rows, including one related Modules variant; MS07–09 have no original row allocation. **All 337 in-scope native rows remain held, all eight exclusions are unchanged, and zero full rows are newly accepted.** The other 303 in-scope rows receive no new assessment here. [Scope gaps](evidence/final-ledger-review/SCOPE-GAPS.md) retain missing Files union/hierarchy/quota, richer registration fields, shared-material body/download limitations and native authorization/durability requirements. These are not silently classified as complete or uniformly backend-blocked.

## Source and integration custody

| Binding | Exact value |
| --- | --- |
| Frozen PR14 base | `7aca86e7d64cfdb85d09d424a07e6186339fc24c` |
| PR15 source | `1585438295776604f23a5cb5ab592729f7c468ca` |
| Root tree | `2c2236b9004b04f309dc0cdd9b360d8c6b97a2bd` |
| Application tree | `82cf7118a68c6ac45087a0198e1917fbd001cc6e` |
| Runtime source tree | `fa4ca7b5ca126f7bcdc1cf816584fa0303d61704` |

The [integration map](evidence/root/integration-map-final-1585438.json) records 21 owner/integration mappings; the [source receipt](evidence/root/FROZEN-SOURCE-RECEIPT-1585438.json) binds 140 changed source/test/asset/configuration records. The superseded Intake callback `24ac231` stays excluded; timeline logging uses the sole existing URL-driven QuickLog owner. Exact responsibility reviews are in [STRUCTURE-REVIEW.md](STRUCTURE-REVIEW.md); review does not waive acceptance gates.

The [frozen remote-head receipt](evidence/root/REMOTE-HEADS-FROZEN-1585438.txt) preserves these original heads, each verified as an ancestor of PR15 source:

| Original branch | Head |
| --- | --- |
| main | `02c02d95bdf3949662b9123f425271c6491ffdab` |
| Portfolio | `c330cebbd021eb984b4bf64ae13dbb991ae6b1c0` |
| Meri | `3cc30ff3182e8050d563516607866cf07efe2aef` |
| Modules/Settings | `50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a` |

PR13/14 and prior evidence remain intact. [The coordinated plan](PLAN.md) records feature and shared ownership. No legacy implementation, new authority bridge or alternate runtime owner was introduced.

## Evidence and remaining handoff

The source ZIP will stay outside Git; its exact tracked-file count, bytes, SHA-256 and Git verification are **PENDING_ROOT_ARCHIVE** in the planned [archive receipt](evidence/root/source-archive-1585438/SOURCE-ARCHIVE-RECEIPT.json). Do not reuse the earlier adbc archive count or hash. Evidence counts/bytes/hash are **PENDING_ROOT_EVIDENCE** in [EVIDENCE-MANIFEST.json](EVIDENCE-MANIFEST.json), with separate [preservation verification](PRESERVATION-VERIFICATION.json). These links are publication targets until root creates their receipts. The preservation helper retains regular files, including failed attempts; it excludes borrowed links and encodes literal `.git` path components without changing file bytes.

Original shipping Library attachments were readable through metadata, but byte materialization returned proxy 403. The prepared archive-save workflow failed during tool discovery with a network error; no Library file/version or successful save is claimed. Local source custody, Git preservation and Library availability are separate outcomes.

The [original Figma preservation audit](design-baseline/README.md) and [additive captures](design-baseline/ADDITIONAL-CAPTURES.md) retain exact contexts, screenshots and asset provenance. The added CR-08 captures and timeline icons resolve their earlier capture gaps. A complete immutable editable Figma backup remains unverified; composer renders remain clipped/1×1, some timeline captures are clipped and CR-09 has no assigned frame. Keep original file `Zc2dEN5aLU47dVdsewDmiJ`, its referenced nodes and libraries unchanged; design edits may use a duplicate. Full design/accessibility acceptance is still open.

[PR16](https://github.com/neo-capiro/capiro-frontend/pull/16), head `b680b65e14134be736942b29d715e49c2c6a8b19`, is separate newsletter source/179-asset preservation. Rich runtime parity remains blocked on the governed immutable public packed-artifact handoff; no UUID bridge is introduced. The read-only backend PR2424 check at 22:18 UTC still showed draft head `5470c6df029c9553dd49e531229c3c91b26275ef` with no new handoff visible. PR16 is outside PR15 qualification.

Root must finish the pending Portfolio gate, finalize independent gate/preservation review and replace only the pending receipt fields before publication. Native identity/services/providers/durability, full Meri workspace interactions, full Figma/accessibility, the actual container image and scan, deployed-origin behavior and shipping remain open. No merge, deployment, AWS action, real provider message, billing or paid-model activity occurred.
