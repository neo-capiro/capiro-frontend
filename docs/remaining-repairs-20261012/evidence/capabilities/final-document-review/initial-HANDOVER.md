# PR15 integration handover

**Source integration and host qualification are complete at `1585438295776604f23a5cb5ab592729f7c468ca`.** Portfolio passed 1,118/1,118 and Modules passed 208/208, with no failures, retries, skips or flaky cases. The actual application image remains blocked locally by Alpine DNS; native acceptance remains open. [QUALIFICATION.md](QUALIFICATION.md) records each passed, failed and unrun gate.

[PR15](https://github.com/neo-capiro/capiro-frontend/pull/15) integrates the bounded frontend facets of all 18 remaining findings. It preserves one Next application, canonical session/client lifetimes, separate Core/Intel transports, the fixed Modules gateway and Meri public contracts. It does not merge or deploy the application.

| Findings | Delivered bounded change |
| --- | --- |
| CI-01–04 | Supplied profile fields, searchable view picker/shortcuts, team roster and intake choice layouts. |
| CP-04–06 | Facilities manager, reviewed-record recovery, dated/read-only expanded activity, native Files provenance/folder presentation. |
| CR-05/06/08/09 | Calendar lifecycle/context, selected-artifact sharing receipts and a separate current-client shared-materials feed. |
| CR-10 | Rich formatting, safe HTML review and guarded rewrite/Undo in the existing mail draft. |
| OWI-F03/04 | Registration section geometry and compact phone capabilities/header. |
| MS06–09 | Supplied safe meeting join link and split detail, compact filters, current-page task grouping and public-form hierarchy. |

The [row audit](evidence/final-ledger-review/REPORT.md) and [final source addendum](evidence/final-ledger-review/addendum-1585438/REPORT.md) map these facets to 34 original rows, including one related Modules variant; MS07–09 have no original row allocation. **All 337 in-scope native rows remain held, all eight exclusions are unchanged, and zero full rows are newly accepted.** The other 303 in-scope rows receive no new assessment here. [Scope gaps](evidence/final-ledger-review/SCOPE-GAPS.md) retain missing Files union/hierarchy/quota, richer registration fields, shared-material body/download limitations and native authorization/durability requirements. These are not silently classified as complete or uniformly backend-blocked.

## Source and integration custody

| Binding | Exact value |
| --- | --- |
| Frozen PR14 base | `7aca86e7d64cfdb85d09d424a07e6186339fc24c` |
| PR15 source | `1585438295776604f23a5cb5ab592729f7c468ca` |
| Root tree | `2c2236b9004b04f309dc0cdd9b360d8c6b97a2bd` |
| Application tree | `82cf7118a68c6ac45087a0198e1917fbd001cc6e` |
| Runtime source tree | `fa4ca7b5ca126f7bcdc1cf816584fa0303d61704` |

The [integration map](evidence/root/integration-map-final-1585438.json) records 21 owner/integration mappings; the [source receipt](evidence/root/FROZEN-SOURCE-RECEIPT-1585438.json) binds 140 changed source/test/asset/configuration records. The superseded Intake callback `24ac231` stays excluded; timeline logging uses the sole existing URL-driven QuickLog owner. The supplemental root architecture review binding is `334bbbf14a5d9e8ae476f519bbae6561acd96fbf`, outside the 21 owner entries and unchanged from adbc/d68. Exact responsibility reviews are in [STRUCTURE-REVIEW.md](STRUCTURE-REVIEW.md); review does not waive acceptance gates.

The [frozen remote-head receipt](evidence/root/REMOTE-HEADS-FROZEN-1585438.txt) preserves these original heads, each verified as an ancestor of PR15 source:

| Original branch | Head |
| --- | --- |
| main | `02c02d95bdf3949662b9123f425271c6491ffdab` |
| Portfolio | `c330cebbd021eb984b4bf64ae13dbb991ae6b1c0` |
| Meri | `3cc30ff3182e8050d563516607866cf07efe2aef` |
| Modules/Settings | `50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a` |

PR13/14 and prior evidence remain intact. [The coordinated plan](PLAN.md) records feature and shared ownership. No legacy implementation, new authority bridge or alternate runtime owner was introduced.

## Evidence and remaining handoff

The source ZIP stays outside Git at `/workspace/capiro-source-archives/source-1585438/source-1585438.zip`: **841,126,268 bytes**, SHA-256 **`0feb5ef3a18f4dffa872da5f733bb16eede65c8e2d3f25c0d13c136d4985bff1`**. All **9,191 tracked files** match the exact source commit. The [archive receipt](evidence/root/source-archive-1585438/SOURCE-ARCHIVE-RECEIPT.json), [reproduction recipe](evidence/root/source-archive-1585438/REPRODUCTION.md) and [independent archive review](evidence/profile/source-archive-1585438-review/REPORT.md) bind its bytes, paths, modes and Git blobs. Do not substitute an older source archive.

[EVIDENCE-MANIFEST.json](EVIDENCE-MANIFEST.json) records every preserved file, byte count, SHA-256 and mode; [preservation verification](PRESERVATION-VERIFICATION.json) checks the exact Git index set and blobs. The helper retains regular files, including failed attempts; it records borrowed links without following them and encodes literal `.git` components without changing bytes. Completed proof and prior ZIPs were moved only to provide storage headroom, with original paths retained as links and all bytes/modes checked. The final evidence commit adds documentation only; its application, packages, scripts, manifests and configuration remain identical to qualified source `1585438`.

Harmless Library read/metadata calls for the original shipping attachments succeeded, but original attachment-byte materialization returned proxy 403. Those calls do not establish custody of the attachment bytes or an authoritative content version. The historical adbc84b archive-save workflow failed during tool discovery with a network error; no Library file/version or successful save was created. No Library save of the final 1585438 ZIP was attempted or claimed. Local source custody, Git preservation and Library availability are separate outcomes.

The [original Figma preservation audit](design-baseline/README.md) and [additive captures](design-baseline/ADDITIONAL-CAPTURES.md) retain exact contexts, screenshots and asset provenance. The added CR-08 captures and timeline icons resolve their earlier capture gaps. A complete immutable editable Figma backup remains unverified; composer renders remain clipped/1×1, some timeline captures are clipped and CR-09 has no assigned frame. Keep original file `Zc2dEN5aLU47dVdsewDmiJ`, its referenced nodes and libraries unchanged; design edits may use a duplicate. No Figma backup-creation task is required. Full design/accessibility acceptance is still open.

[PR16](https://github.com/neo-capiro/capiro-frontend/pull/16), head `b680b65e14134be736942b29d715e49c2c6a8b19`, is separate newsletter source/179-asset preservation. Rich runtime parity remains blocked on the governed immutable public packed-artifact handoff; no UUID bridge is introduced. The read-only backend PR2424 check at 22:18 UTC still showed draft head `5470c6df029c9553dd49e531229c3c91b26275ef` with no new handoff visible. PR16 is outside PR15 qualification.

The [final gate review](evidence/final-gate-review/addendum-1585438/REPORT.md) and [coverage addendum](evidence/calendar-independent-review/final-1585438-coverage/coverage-and-limits.md) verify completed results and their limits. Native identity/services/providers/durability, full Meri workspace interactions, full Figma/accessibility, the actual container image and scan, deployed-origin behavior and shipping remain open. The designated shipping session owns the separately approved third AWS image-build attempt under the same $2 scope; it must bind this corrected source and completed qualification, never defective d5. This integration session performed no merge, deployment, AWS action, resource/credential/security/database change, real provider message, billing or paid-model activity.
