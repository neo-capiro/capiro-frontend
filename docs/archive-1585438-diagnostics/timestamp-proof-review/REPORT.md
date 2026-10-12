# Independent timestamp-only reproduction: PASS

The reported shipping SHA-256 is reproduced exactly by changing only the producer ZIP's DOS timestamps from `2026-10-12 22:07:40` to `2026-10-12 18:07:40`.

| Verified property | Result |
| --- | --- |
| Source commit | `1585438295776604f23a5cb5ab592729f7c468ca` |
| Stream length | 841,126,268 bytes, unchanged |
| Original SHA-256 | `0feb5ef3a18f4dffa872da5f733bb16eede65c8e2d3f25c0d13c136d4985bff1` |
| Transformed SHA-256 | `5a21de580abd7e9b19401d9903f598439cda8df6e8a46d415a3bc239c64ae714` |
| Shift | Minus four hours; date unchanged |
| Changed bytes | Exactly 22,886 |
| Changed fields | One DOS time high byte in each of 11,443 local headers and 11,443 central-directory records |

The independent script parses each central-directory record directly, matches its filename/time against the corresponding local header, and computes offsets itself. It does not use root's patch-offset list. The original and modified streams are hashed concurrently in 4 MiB chunks. Each replacement verifies its original byte; every other byte—including UTC extras, compressed data, CRCs, ordering, names, lengths and comments—is held fixed. Original file identity, size, modification timestamp and SHA-256 remain unchanged.

[PROOF.json](PROOF.json), [PATCH-OFFSETS.jsonl](PATCH-OFFSETS.jsonl), [verify.py](verify.py) and [verification.log](verification.log) preserve the method and result. No archive was extracted or written, no source or earlier sealed packet was changed, and no runtime/build/deployment action occurred.

This establishes the exact byte-level explanation for the **reported** shipping hash, assuming that hash identifies its archive. The shipping archive itself was not directly inspected, and this proof does not identify a particular timezone name. Producer-side `TZ=UTC` regeneration already reproduces the immutable producer hash in root's separate diagnostic receipt.
