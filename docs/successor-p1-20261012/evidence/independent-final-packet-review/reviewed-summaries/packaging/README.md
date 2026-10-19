# Bind a source archive to the reviewed commit

This offline route removes byte-identical ZIP reproduction as a prerequisite for source verification. It does not approve a build or deployment. The application source is explicitly `49f6609c7277ce8701b0d38c3ba163860633e668`, root tree `fb895410ba3be77003977d9d5fdf33f2a525c7c8`, application source tree `964c8c51b1449d303a9286cf902133d02c2e4301`. Do not substitute the later evidence-only PR head.

Obtain `source_archive.py` and its sibling `zip_layout.py` from the same published evidence commit, verify their published SHA256 hashes, and retain them together. Python 3.11 or later and local Git are required. The repository must contain the full source commit and blobs. The tool reads Git objects with replacement objects disabled, never the possibly modified working tree. No extraction, installation, network call, cloud action or credential is performed. Every output path must be new; original archives and receipts are never overwritten.

From a checkout containing the commit, replace the paths in this command with local paths (PowerShell and POSIX shells both accept the argument form):

```text
python source_archive.py create REPOSITORY 49f6609c7277ce8701b0d38c3ba163860633e668 NEW-SOURCE.zip NEW-RECEIPT.json
```

To verify an already created archive against that same immutable source:

```text
python source_archive.py verify REPOSITORY 49f6609c7277ce8701b0d38c3ba163860633e668 SOURCE.zip NEW-VERIFICATION.json
```

Exit 0 means complete local source verification passed; exit1 means a mismatch or unsupported input; exit2 means invalid command arguments. A receipt includes the exact archive byte count/SHA256, commit/root/application trees, tracked blob count, and every committed path, Git mode/blob ID, byte count and SHA256. Shipping must review and bind the resulting archive identity explicitly before use. A new ZIP SHA256 may be valid when all source checks pass; it must not silently replace a prior archive identity. Qualification status and admission remain separate gates.

The supported profile is a single-volume ZIP32 with exactly all tracked regular files plus `source-commit.txt` containing the full commit and LF. Optional empty tracked parent directories are allowed. Symlinks, gitlinks, duplicate/extra/missing files, unsafe or Windows-nonportable names, conflicting modes, encryption, mismatched local/central records, prefixed/trailing/unindexed data and inconsistent CRC/size/payload are rejected. Extra fields are limited to well-formed extended timestamps (0x5455); unknown fields, Unicode path overrides, mode overrides and duplicate/truncated extras are refused. ZIP64 is explicitly unsupported by this small canonical verifier; the current source has4862 regular non-executable blobs and fits ZIP32. This is a format scope limit, not a failure to authenticate the current source.

The creator uses fixed timestamps and explicit Unix modes; compressed output may still differ by Python/zlib/platform. The verifier accepts supported alternate timestamps, ordering, compression and compatible DOS/Unix creator headers. It validates every Git blob and ZIP member, compares archive SHA256 before and after validation on one held unbuffered descriptor, and verifies descriptor/path identity and metadata have not changed. Keep the verified file immutable afterward and recheck its receipt hash at the next transfer/build boundary.

The independent review packet preserves initial red adversarial cases and their final outcomes. A separate independent verifier must also confirm the selected shipping archive against the commit; its receipt does not replace the canonical receipt. No old ZIP, frozen4a source, original hash or rejected Windows reproduction is changed by this route.

The original Library transfer remains blocked before upload preparation: the required helper's hosted apps tools/list call returned network on both attempts. No Library ID or size-limit rejection exists. This GitHub-published source/tool/manifest route lets shipping produce and review a new bound archive locally without another storage service. A direct original/successor Library transfer has not succeeded.
