# Complete Portfolio preservation handoff

Archive location: `docs/portfolio-31/handover-2026-10-12/`, inherited unchanged
from Portfolio owner head `c330cebbd021eb984b4bf64ae13dbb991ae6b1c0`.
The integration and owner Git subtrees are both
`67b25ecb1eac4d4dd618748f51660e004f5a7028`.

This session independently checked all 477 inventoried direct files
(360,325,228 bytes), all eight transport parts and all three reconstructed
original hashes in memory. The inventory and later publication receipt are its
two explicit self/publication exclusions, giving 479 published files total.
See `evidence/portfolio-archive-integrity.json` for the exact hashes, paths and
scope. No existing worktree was restored over, no historical branch was replaced,
and no feature rebuild was started from the archived snapshots.

## Qualified Git history

File: `history/portfolio-continuation-760dcc6-requires-02c02d9.bundle`

SHA256: `591d293dee1b903e31c70e8b659beae928b04d4c1ed87c8e7a6e27416eabc8af`

The 1,389,324-byte bundle requires published base
`02c02d95bdf3949662b9123f425271c6491ffdab`. It preserves 26 refs, including 13
continuation branch refs and all 33 continuation commits through original source
`760dcc6c1179312c7f4b762e64cf3af1aad60c3e`. That source's tree
`46417a01484727747b0a2d81b3b4f278285cb709` is the published implementation tree
at `abaeab37b36d60b3e5185755e1b2c9169d7c92f3`.

Original-owner restoration evidence:
`history/qualified-history-restoration.json`, SHA256
`de4ca7729497303349ec742f6a61c42119b15ea3648df03dca5f2f08cad71f5b`.
It records an isolated prerequisite clone, bundle verification, import into a
recovered namespace, exact HEAD/tree/33-commit count, and `git fsck --full`, all
with exit0. This integration session independently ran `git bundle verify` and
checked the bundle hash; it did not repeat the import. Its verification log is
`evidence/candidate-9fa5e2c/portfolio-history-bundle-verify.txt`.

The older all-ref bundle remains historical evidence. Its earlier same-repository
verification does not establish self-contained restoration of older GitHub
ancestry. Use the qualified prerequisite bundle and the retained restoration guide.

## Complete working context

Original context manifest SHA256:
`c23fb2a329d4a6c314ef41bec572603049e2601168579b86d2dd94bba4aa2575`.

Delivery descriptor `context-delivery.json` SHA256:
`2e64be7670e860809a63781e17e683f1d1a10ad5857a23b5bce305e7c3e09ed5`.

The immutable context contains 35,264 original paths from 14 worktrees,
9,729 unique byte blobs, 166 packs and 202 metadata files. The original manifest
and two large compressed packs are represented as eight exact parts under
`context-parts/`; the other 164 packs and metadata remain under `context/`.
Read `CONTEXT-DELIVERY.md` before using `tools/prepare_context.py` to materialize
into a new external directory, then use the unchanged verifier and restorer.

Original-owner evidence `receipts/context-delivery-qualification.json` records
reconstruction of all 370 original package files, exact byte preservation, the
full context verifier pass and refusal controls. Its SHA256 is
`afb7cbd1faeb69c23dcab189879d1d9c9704084d42b9a48e60157eb9c5efd0a3`.
`receipts/context/self-check-final-receipt.json` records eight synthetic helper
checks including new-target restoration, executable modes, deleted-path absence
and overwrite/traversal/link refusal. That helper check is not a claimed full
real-context worktree restoration. This session verified delivery bytes and
reconstructed hashes without materializing or restoring the context.

Archive preservation and restoration evidence establish recoverability, not
product acceptance. All 337 Portfolio rows remain unaccepted. The whole archive
is retained in Git/source archives and excluded from the runtime Docker context.
