# Recovering the transport-split context package

The original context package remains immutable. Two compressed packs exceeded the
connector's request limit, so their exact bytes are published as six ordered parts
of at most 8 MiB. This is a delivery representation, not a change to the package's
manifest, metadata, compressed contents or original pack hashes.

The published handover directory contains:

- `context/`: the original metadata, manifest and ordinary package files, including
  all 164 packs that fit the delivery threshold. The two split originals can be
  absent here.
- `context-parts/`: the six exact transport parts.
- `context-delivery.json`: each original pack's path, byte size and SHA-256, and its
  ordered part filenames, sizes and SHA-256 values. Original paths are relative to
  `context/`; part filenames are relative to `context-parts/`.
- `tools/prepare_context.py`, `tools/context_delivery.py` and the unchanged
  `tools/context_common.py`: the materializer and its stdlib-only dependencies.
- The unchanged context verification/restoration helpers and their original guide.

## Materialize before running the existing verifier

From the published handover directory, choose an explicit **new** directory outside
that handover. Its parent must already exist. Use an absolute path for the target.

```sh
python3 tools/prepare_context.py . --target /absolute/path/new-capiro-context
python3 tools/verify_context.py /absolute/path/new-capiro-context \
  --expected-manifest-sha256 c23fb2a329d4a6c314ef41bec572603049e2601168579b86d2dd94bba4aa2575 \
  --history-bundle history/portfolio-continuation-760dcc6-requires-02c02d9.bundle
```

The materializer copies ordinary context files without modifying the source. It
validates the delivery paths and every part, reassembles each declared original only
under the new target's `packs/` directory, and verifies the complete pack hash and
size. If a split original is also present in the input, its recorded hash must match;
the materializer still reconstructs it from the parts.

The existing verifier then validates the materialized package against the trusted
original manifest hash and history binding. Run the existing restoration workflow
against this materialized package only after that verification succeeds. The history
bundle itself requires the published base `02c02d95bdf3949662b9123f425271c6491ffdab`;
its separate qualified restoration receipt remains authoritative.

Existing targets, symlinks, traversal paths, nonregular files, duplicate or invalid
records, mismatched parts and mismatched reassembled packs are refused. A failure
after target creation can leave partial output. That output is unverified; the tool
does not silently delete or reuse it. Inspect it and choose a new target for a retry.

## Preserved originals

| Original path within context | Bytes | SHA-256 |
| --- | ---: | --- |
| `packs/context-00005.tar.gz` | 20,401,940 | `930a0d1bc7ab99ba06996a35a65d3af0dce1466e28d495f218c2e2704c4aa8ac` |
| `packs/context-00132.tar.gz` | 19,860,818 | `3d4b12a71d25920ebb8e652a93dd897139e4bc329fed35b9da6e26a909070c02` |

Delivery descriptor SHA-256:
`fae8e3661df3c26dbe501193f1fe5cfa9d009568ccbdf60fa4a6276d584ce875`.

Original context manifest SHA-256:
`c23fb2a329d4a6c314ef41bec572603049e2601168579b86d2dd94bba4aa2575`.

## Reproducing parts during preservation

For a complete local package that still contains its original packs:

```sh
python3 split_context.py /absolute/path/to/handover-preparation
```

The splitter writes only sibling `context-parts/` files and the separate delivery
descriptor. It never removes or modifies original context files. Existing identical
parts are reused; differing parts and changed or missing previously recorded originals
are refused. A later appended oversized pack can add records without replacing the
earlier parts. The descriptor is replaced atomically only after a successful pass.

`context-delivery-qualification.json` records actual full-package materialization,
the unchanged verifier result, exact original-source preservation and the focused
refusal/rerun checks. These are delivery checks, not Portfolio product acceptance.
