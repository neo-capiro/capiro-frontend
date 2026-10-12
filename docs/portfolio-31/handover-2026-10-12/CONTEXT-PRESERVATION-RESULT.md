# Portfolio context preservation — final local receipt

The context snapshot and preservation tools are frozen. No product source,
historical evidence, Git working state, account, provider or AWS resource was
changed by this lane. GitHub publication and transport packaging remain owned by
root; any split transport must reconstruct the original bytes before verification.

## Exact package

| Item | Final result |
| --- | --- |
| Package | `handover-preparation/context/` |
| Manifest SHA256 | `c23fb2a329d4a6c314ef41bec572603049e2601168579b86d2dd94bba4aa2575` |
| Preserved workspace-relative paths | 35,264 |
| Git worktrees | 14 |
| Distinct exact byte blobs | 9,729 |
| Original bytes across paths | 1,834,280,585 |
| Unique uncompressed blob bytes | 1,319,568,537 |
| Deterministic gzip/USTAR packs | 166 |
| Compressed pack bytes | 330,942,983 |
| Verified metadata files | 202 |
| Deleted tracked paths explicitly recorded | 1 |
| Selected symlinks | 0 |

The final verifier read every uncompressed blob and compressed pack, every
metadata file, the manifest and its checksum anchor, and the separate qualified
Git bundle. All matched. `context-verification-result.json` has SHA256
`17bbb656a1d8ff08d1907dade487d98e9754f4a2f199900a3a27c1d305819047`.
Generated staging directories were removed and their absence confirmed in a
separate filesystem read. They are not part of the package.

## Coverage

The package preserves the working tracked and untracked source in
`capiro-frontend-base`, `capiro-frontend-portfolio`, and the twelve isolated
Portfolio worktrees for Advocacy, alert channels, capability documents,
capability presentation, current reads, file arrival, Objective intake,
profile current state, saved submissions, Tracker preferences, Watchlist
current state and Work current reads. Every worktree has exact HEAD/branch,
status, index entries, staged/unstaged/HEAD binary diffs, and deleted-path
metadata. This preserves working state without copying Git administrative data.

All worktree `outputs/` files are included, including the archive directly under
the capability-documents outputs root. Ignored context in `apps/web/work/` and
`test-results/` is also included. The final union adds 3,832 such paths, 485 new
byte blobs and 14 packs while retaining every initial path and every original
pack byte. Before/after checks verified selection and Git state; all initial
source bytes were checked again at the union boundary. The initial manifest is
preserved byte-exact as gzip metadata, with the separate capture boundaries
recorded in the final manifest.

Other workspace context includes `evidence/`, `p4-cohesion-review/`,
`p4-visual-evidence/`, `tracker-native-reference-20261011/`, the uploaded audit
workbook, `migrate-portfolio.mjs`, the original prospect-stage SVG and saved
submission image downloads, runtime smoke/provenance evidence, workspace
configuration and the explicitly requested `integrate-frozen.py` copy. Native
source, Figma references and exports, frozen candidates, raw failed runs,
screenshots, traces, archives and review addenda are preserved as exact bytes.

Explicit exclusions are Git administration, installed dependencies and CLI/browser
binaries, build/runtime caches, runtime credential stores, and the newly authored
handover/preparation output, which root publishes directly. Historical compiler
inputs already saved inside evidence remain included. The manifest records the
complete exclusion policy and each encountered excluded root.

## Git history qualification

The primary reference is
`../history/portfolio-continuation-760dcc6-requires-02c02d9.bundle`,
1,389,324 bytes, SHA256
`591d293dee1b903e31c70e8b659beae928b04d4c1ed87c8e7a6e27416eabc8af`.
It requires published base commit
`02c02d95bdf3949662b9123f425271c6491ffdab`. The exact root-owned
`qualified-history-restoration.json` receipt is preserved in package metadata.
The historical all-refs bundle remains separately preserved; its shallow source
means it must not be described as independently self-contained.

## Credential and safety review

The scan covered raw preserved blobs and ordinary ZIP/gzip/tar members with zero
reported coverage limits. It found two candidates: the same plain approval-prose
`authorization` field in `watchlist-caller-prerequisite.json`, once as a member
and once inside its decompressed enclosing tar. Root independently inspected and
classified both as non-credential provenance. The raw findings are unchanged; no
matched values were printed by the scanner. This is a recorded scan and owner
review, not a guarantee that no possible secret format exists.

The final synthetic tool check passed eight bounded checks covering exact
selection/restore, ignored evidence, deduplication, modes/deletion records,
deterministic packs, changed bytes, existing targets and unsafe paths. Separate
checks qualified three symlink boundaries and the independent review's
changed-manifest-after-verification case. These were isolated preservation-tool
checks; no product tests or browser/build work ran.

`tools-final-manifest.json` pins all eight tool/document files with SHA256
`d05b3f3bdfd39e2527b01ba83d25ef9b383b42b4c043a25118ff90ae8ad411bf`.
`preservation-run-history.json` preserves the initial generated-staging cleanup
failure, the conservative first union refusal and their bounded corrections;
its SHA256 is `a51f35385439384f895b24df451a29866d37b8d615194492f0d738bc705de670`.

## Restore boundary

Use the trusted manifest hash above with `verify_context.py` and then
`restore_context.py --target /ABSOLUTE/NEW/PATH`. The target must not exist and
its parent must already exist. Restoration refuses traversal, overwrite and
symlink ancestors; it never extracts archive paths, executes source, initializes
Git or imports credentials. Restored files are checked against their hashes.
Original modes remain recorded; only ordinary rwx bits are applied. The working
state metadata is restored separately for deliberate Git recovery. See
`CONTEXT-TOOLS.md` for the exact invocation and root's handover for the published
source, unresolved work and account/deployment holds.
