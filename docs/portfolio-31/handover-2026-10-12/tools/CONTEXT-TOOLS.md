# Exact workspace context preservation

This toolset is separate from the product repositories. It preserves local context
for the 2026-10-12 handover without modifying source, Git state, evidence or a
previously created package. The final collection is held until the parent agent's
explicit READY message; the collector requires that message as a recorded input.

## Responsibilities

- `collect_context.py` discovers all workspace Git worktrees, takes their current
  tracked and untracked nonignored files, and adds every worktree's `outputs/`,
  other ignored context including `apps/web/work/` and `test-results/`, and all
  other workspace context outside explicit exclusions. It records HEAD,
  branch, complete status, index entries, deleted tracked paths and binary diffs.
  It checks that the selected paths, source file identities and Git metadata did
  not change during collection. It does not commit, reset or execute a diff.
- `context_common.py` owns canonical JSON, hash, safe path and package integrity
  rules. The package contains exact SHA256-addressed byte blobs in deterministic
  gzip/USTAR packs, aiming at 8 MiB of uncompressed tar bytes per pack. A single
  blob larger than that target receives its own pack. Duplicate paths retain
  their own modes and categories but refer to one exact byte blob.
- `scan_credentials.py` scans preserved bytes and ordinary ZIP/gzip/tar members
  for credential-shaped values. Its report contains rule names and locations,
  never matched values. Candidates require human review; a scan is not proof of
  absence of secrets. Unreadable/encrypted/over-limit archive members are explicit
  coverage limits. Nothing is silently redacted or discarded from the local
  package, and this collector performs no publication.
- `verify_context.py` verifies the manifest's external SHA256, every metadata
  file, every compressed pack, its exact regular-file member inventory and every
  uncompressed blob hash and size. It rejects unsafe paths, duplicate keys,
  unexpected archive members, links/devices in packs, and unreferenced blobs.
- `restore_context.py` first verifies the complete package, then creates an
  explicitly supplied new target. It never extracts archive member paths. It
  writes only validated manifest destinations with exclusive file creation and
  refuses an existing target or any symlink ancestor. It restores regular files
  with ordinary rwx mode bits, preserving the full original recorded mode in the
  manifest. It does not create `.git` internals or apply diffs. Safe relative
  symlinks require `--allow-safe-symlinks`; otherwise any symlink causes a refusal
  before target creation. The current inventoried workspace has no selected
  symlinks. Missing tracked files remain absent and are recorded in metadata.

## Selection and exclusions

All historical raw failures, traces, ZIPs, screenshots, native/Figma references,
source snapshots, uploaded input and handoff archives are eligible. `outputs/`
is included in full because at least one handoff archive is directly below that
directory, outside `outputs/evidence/` and `outputs/handoffs/`.

The selection excludes Git administrative data, installed `node_modules`, Next
build output, Python bytecode caches, installed CLI/browser trees and downloads,
runtime credential stores, and newly generated handover preparation/output so
the package cannot ingest itself. CLI public download provenance and the browser
smoke screenshot are retained. The parent's `integrate-frozen.py` is an explicit
preparation-directory exception and is copied as exact context. The generated
tools and handover documents are published separately. Every exclusion and every
encountered excluded root is recorded in the manifest. Lockfiles and project
configuration remain included; installed runtime packages can be recreated from
those records. No runtime credential value is copied from an excluded store.

## Qualified history and the bounded finalization

The primary Git bundle is `portfolio-continuation-760dcc6-requires-02c02d9.bundle`.
It requires the published base commit `02c02d95bdf3949662b9123f425271c6491ffdab`;
it is not a self-contained repository clone. Root qualified it with an isolated
base-dependent restoration. The earlier all-refs bundle is preserved as history
but must not be described as independently complete: its original base repository
was shallow. The final manifest pins the primary bundle and the exact root
qualification receipt.

`finalize_context.py` is the narrowly scoped WIP-package migration used for this
handover. It preserves the initial manifest in gzip metadata, verifies all prior
source bytes, adds discovered ignored context without rewriting any original
pack, records a second stability boundary, and replaces the external history
reference with the qualified base-dependent bundle. It refuses an already
finalized package. The reusable collector now includes this ignored-context
selection directly. Initial staging cleanup reported a directory-not-empty error
after all packs/manifest were written; the finalizer verifies and removes only
those generated staging blobs. Original context and evidence are untouched.

## Intended final invocation

Run only after root supplies READY and the completed source-history bundle path:

```sh
python3 collect_context.py --workspace /workspace/scratch/158b6018a5d3 \
  --output /workspace/scratch/158b6018a5d3/handover-preparation/context \
  --history-bundle /ABSOLUTE/portfolio-continuation-760dcc6-requires-02c02d9.bundle \
  --history-reference ../history/portfolio-continuation-760dcc6-requires-02c02d9.bundle \
  --required-base 02c02d95bdf3949662b9123f425271c6491ffdab \
  --ready-confirmation 'EXACT ROOT READY MESSAGE OR RECEIPT'
python3 verify_context.py /workspace/scratch/158b6018a5d3/handover-preparation/context
```

The `context/manifest.sha256` value should also be carried in the published
handover. That trusted outside value provides integrity anchoring; an attacker
who can replace both a package and its checksum can otherwise replace the data.

Safe restoration on the new machine:

```sh
python3 verify_context.py /PATH/TO/context --expected-manifest-sha256 TRUSTED_HASH
python3 restore_context.py /PATH/TO/context --target /ABSOLUTE/NEW/workspace \
  --expected-manifest-sha256 TRUSTED_HASH
```

The parent separately supplies the Git history bundle. Verification can verify
its bytes too with `--history-bundle /PATH/TO/SOURCE-HISTORY.bundle`. Restore does
not initialize Git, attach original worktrees, import credentials or run project
code. Consult the handover before recreating branches or applying saved changes.

## Preparation qualification

The scripts receive a small synthetic isolated self-check for deduplication,
mode and deleted-file records, deterministic repacking, modified/corrupt package
refusal, path traversal and existing-target refusal. This is preservation-tool
qualification only; no product source tests, browser, build or provider calls
are run. P4 independently reviews these tools before final collection.
