# Independent producer ZIP reproduction diagnosis

The producer recipe leaves a concrete reproducibility input unspecified: it inherits the process timezone when running `git archive --format=zip --output <path> <commit>`. A bounded in-memory probe confirms this Git build changes ZIP bytes, without changing archive length, when only `TZ` changes. This is a demonstrated recipe gap, **not yet a confirmed explanation of shipping hash `5a21de580abd7e9b19401d9903f598439cda8df6e8a46d415a3bc239c64ae714`**. The shipping archive was not available to this reviewer.

## Observed producer and recipe

- Exact producer archive: 841,126,268 bytes; prior independently verified SHA-256 `0feb5ef3a18f4dffa872da5f733bb16eede65c8e2d3f25c0d13c136d4985bff1`. No new full archive hash or extraction was performed in this diagnostic; root is independently streaming a fresh archive to a hash.
- All 11,443 ZIP entries use DOS time `2026-10-12 22:07:40`, creator system/version 0/0, extraction version 10 and flags 0. Methods: 8 for 8,909 entries, 0 for 2,534 entries. Central directory begins at 839,276,362; archive comment is exact commit `1585438295776604f23a5cb5ab592729f7c468ca`.
- Commit epoch `1791842861` is `2026-10-12 22:07:41Z`. The extended timestamp `55540500012d5acd6a` preserves that epoch. The DOS timestamp's even second is expected two-second precision, not evidence of mutation.
- Recipe [producer-recipe-readonly-copy.py](producer-recipe-readonly-copy.py), SHA-256 `7344623e3f2cc5a8a94cc57e5d6b645dfdd9cab06ac52b172af98d8a7f7f0dfb`, passes no environment override or explicit compression option. The initial recipe created the same output path and failed its UNIX-mode-only verification; the corrected recipe permits Git's DOS regular-file metadata and supports verifying the existing ZIP. No repack or postprocessing appears in either recipe.
- Receipt SHA-256 `6382443255886751cc9bd5acf2b43655af9b1019e8437d0221cd7aa6e9270e57` records source/tree identities, 9,191 blob bindings, archive bytes/hash and verification time, but does not capture producing Git binary, zlib binary, environment, compression settings or runtime configuration. `createdUTC` is the receipt's verification timestamp, not a reproducible ZIP member timestamp.
- Current runtime is `/usr/local/bin/git`, Git 2.52.0, zlib 1.3.1; current `TZ` is unset and `/etc/localtime` resolves to UTC. Selected archive/compression config lookup returns no values. The exact current binary hash/build/libraries are saved in [CURRENT-RUNTIME-AND-RECIPE.json](CURRENT-RUNTIME-AND-RECIPE.json). This current observation cannot reconstruct an unrecorded historical environment.

## Controlled timezone evidence

Each in-memory archive contains only `.gitattributes` from the exact commit and is 229 bytes. No temporary ZIP was written.

| TZ | DOS member time | ZIP SHA-256 |
| --- | --- | --- |
| unset / UTC | Oct 12 22:07:40 | `824138c5ce13c65eee8bb384ea6d443178fa07456b7bcb2b5997178a729ba5e6` |
| America/Los_Angeles | Oct 12 15:07:40 | `5fe7f9f1d2df9d9bf3b0e395ef35f9be8009dd5361f81683e96294b9171cff91` |
| Pacific/Kiritimati | Oct 13 12:07:40 | `037d89660efaf731955bc64d3fa1ae02e1ab77d638bbe8aec857dca8b9257c8a` |

Raw byte comparison proves every changed byte lies in the local-header or central-directory DOS date/time fields. Extended UTC timestamp, compressed content, CRC, names and other metadata are unchanged. The UTC probe's compressed `.gitattributes` bytes also match the corresponding producer member exactly. See [TZ-SINGLE-MEMBER-PROBES.json](TZ-SINGLE-MEMBER-PROBES.json), [TZ-BYTE-DIFF.json](TZ-BYTE-DIFF.json) and [SINGLE-MEMBER-COMPRESSED-CONTINUITY.json](SINGLE-MEMBER-COMPRESSED-CONTINUITY.json).

## Next discriminating comparison

Compare the shipping ZIP's DOS date/time fields with the producer before attributing the mismatch. If they differ while UT timestamps, central metadata and compressed member hashes agree, timezone explains the byte divergence without a source-content difference. If DOS fields match, compare creator/extraction versions, flags, extras, external attributes, comments, ordering and compressed-stream hashes. Equal archive length alone proves none of these identities. Different compression implementations can also require runtime binding; this diagnostic does not claim such a difference occurred.

Do not substitute the recreated shipping archive for the immutable producer solely because blob contents match. Preserve both hashes and compare their exact bytes/metadata before choosing custody or a deliberately revised reproducible recipe. The original ZIP, prior evidence, PR15, repositories and runtime/build/deployment state were not modified.

Root subsequently supplied a successful full UTC streaming reproduction receipt: exact 841,126,268 bytes and producer SHA-256 `0feb5ef3a18f4dffa872da5f733bb16eede65c8e2d3f25c0d13c136d4985bff1`. This receipt was read and hash-bound in `INSPECTED-ROOT-UTC-REPRODUCTION.json`; the full reproduction was root-executed. It establishes repeatability in this producer runtime, while the shipping metadata comparison remains necessary to attribute its different hash.
