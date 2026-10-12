# Source archive representation mismatch

The reported shipping hash is reproduced exactly by changing only ZIP DOS timestamps from 22:07:40 to 18:07:40 (a four-hour local-time shift). The original source, archive binding and every compressed payload remain unchanged. A fresh full Git archive with explicit `TZ=UTC` reproduces the original producer hash. No new source or hash binding is proposed.

| Binding | Value |
| --- | --- |
| Qualified source | `1585438295776604f23a5cb5ab592729f7c468ca` |
| Frozen published evidence | `3a83e874383d9129726689bb8fc66438c2f18f18` |
| Both archive lengths | 841,126,268 bytes |
| Original producer SHA256 | `0feb5ef3a18f4dffa872da5f733bb16eede65c8e2d3f25c0d13c136d4985bff1` |
| Reported shipping SHA256 | `5a21de580abd7e9b19401d9903f598439cda8df6e8a46d415a3bc239c64ae714` |
| Exact prediction after DOS-only minus-four-hour change | `5a21de580abd7e9b19401d9903f598439cda8df6e8a46d415a3bc239c64ae714` |

The read-only [timestamp experiment](producer/DOS-TIMESTAMP-HYPOTHESIS.json) hashes the original ZIP with only four-byte DOS timestamp fields substituted in each local and central header. For the matching shift, one byte per header actually differs: `b0` becomes `90` in the time word, at local-header offset 11 and central-header offset 13. There are 22,886 such bytes across 11,443 entries. UTC extras, archive comment, compressed payloads, entry ordering, sizes and every other byte are held fixed. No candidate ZIP was written and no original archive was edited. The [independent full-byte reproduction](timestamp-proof-review/REPORT.md) reached the same hash and counted exactly22,886 changed bytes; its sealed manifest SHA256 is `d8b27c4b7b6f293234ad479c5cd22a84d1fdd5fa657448a9d2df35c990b2ac54`. Shipping's physical ZIP has not been downloaded here; its reported cryptographic binding is the target of this exact reproduction.

The original [packaging script](original-create-source-archive.py) uses bare `git archive` and inherits timezone. The [independent tiny-member probes](independent/REPORT.md) establish that this Git build changes local/central DOS time with `TZ`, while preserving the UTC extra and compressed content. This is a demonstrated representation dependency, not an assumed creator or source mismatch.

## Exact reproduction

Use a new output path and retain the earlier archive:

```sh
TZ=UTC git archive --format=zip --output=source-1585438-utc-reproduction.zip 1585438295776604f23a5cb5ab592729f7c468ca
wc -c source-1585438-utc-reproduction.zip
sha256sum source-1585438-utc-reproduction.zip
```

The fresh full [UTC reproduction](producer/GIT-UTC-REPRODUCTION.json) ran to completion here and produced 841,126,268 bytes with the exact original `0feb5ef3…` hash. It streamed output to SHA256 without retaining a duplicate 841MB file. The original packaging command was `git archive --format=zip --output=<new path> 1585438295776604f23a5cb5ab592729f7c468ca`; this clarification adds explicit timezone and preserves its default compression. Verify exact size and SHA256 before using the reproduction.

The producer environment has Git 2.52.0, x86_64 Linux, Git build zlib1.3.1; Git executable SHA256 `9dae295c1a4ffae4ee772e6205fcf22b26e1bfeeb5ee98f278b5139bda7ca22f`. The currently captured environment has `TZ` unset with system UTC; no selected tar/zip/core compression/EOL override was found. The original invocation did not preserve its environment separately; the existing ZIP fields and matching fresh UTC reproduction provide the binding. Python 3.12.14 with zlib1.3.2 inspected the archive; Python did not create it. Full build/runtime/configuration facts are in [root runtime](producer/RUNTIME-AND-TRANSFER.json) and [independent runtime](independent/CURRENT-RUNTIME-AND-RECIPE.json).

## Raw producer metadata and content binding

[ZIP-ENTRIES.json](producer/ZIP-ENTRIES.json) records every entry's compressed and uncompressed SHA256, CRC, sizes, timestamps, creator/extractor versions, flags, attributes, extras/comments, offsets and local/central header hashes. Every one of 9,191 regular entries was decompressed and checked against the original receipt's Git blob, uncompressed SHA256, size and100644 mode. There are 2,252 directory entries. CRC validation occurred while reading each entry. The comparator additionally rehashed the complete physical producer ZIP and matched its original binding.

- [CENTRAL-DIRECTORY-AND-END.bin](producer/CENTRAL-DIRECTORY-AND-END.bin) contains raw bytes from archive offset 839,276,362 to EOF:1,849,844 central-directory bytes plus 62 end/comment bytes.
- [LOCAL-HEADERS.bin](producer/LOCAL-HEADERS.bin) concatenates all raw local headers, names and extras in archive order. Each entry's concatenation offset/length and original archive offset are in the JSON manifest.
- All DOS timestamps are `2026-10-12T22:07:40`; the commit timestamp is `2026-10-12T22:07:41Z` (DOS two-second precision). UTC extra is `55540500012d5acd6a`, encoding 1791842861. Creator system/version is 0/0, extractor version10, flags0. Compression is stored or deflated. The archive comment is the 40-character source commit.

To compare the existing shipping ZIP without extracting or rewriting it:

```sh
python3 compare_zip.py /absolute/path/shipping.zip producer/ZIP-ENTRIES.json > shipping-comparison.json
```

This compares names/order, all entry content hashes and metadata, then reports changed fields and the first 40 detailed differences. It supports `--help`, imports without work and writes only stdout. Exit0 means exact archive match, exit1 mismatch/read failure, exit2 invalid arguments. [The actual producer self-comparison](PRODUCER-SELF-COMPARISON.json) passed all 11,443 entries with no differences; CLI import/help/refusal checks passed. A shipping archive with the reported hash is expected to differ only in DOS timestamps/local-header hashes and the resulting raw central hash.

## Transfer and scope

A supported Library transfer of the original ZIP was attempted using the freshly fetched required upload helper. It failed before upload with `hosted apps tools/list request failed: network`; no Library file ID/version was created. No alternate upload destination or credential was used. The reproducible UTC recipe and exact producer metadata provide the current handoff.

This dedicated diagnostic branch starts at frozen evidence `3a83e874` and adds only this documentation/proof directory. PR15's source and evidence heads, the original ZIP, prior artifacts and newsletter work remain preserved. No application rebuild, image creation, deployment, AWS, native service, security/database or paid workload occurred in this investigation. The shipping owner still verifies its own UTC reproduction before continuing its separately authorized build.
