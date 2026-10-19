#!/usr/bin/env python3
"""Add exact <=8 MiB delivery parts; never rewrite original context packs."""
from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path
import sys
import tempfile

from context_common import (
    PreservationError, assert_no_symlink_ancestors, canonical_json,
    hash_file, package_file, verify_record,
)
from context_delivery import FORMAT, PART_SIZE, directory, read_delivery, validate_delivery


def split_pack(context, path, parts):
    relative = path.relative_to(context).as_posix()
    source = package_file(context, relative)
    before = hash_file(source)
    digest = hashlib.sha256()
    records = []
    with source.open("rb") as stream:
        while block := stream.read(PART_SIZE):
            digest.update(block)
            record = {
                "path": f"{source.name}.part-{len(records) + 1:05d}",
                "size": len(block), "sha256": hashlib.sha256(block).hexdigest(),
            }
            destination = parts / record["path"]
            assert_no_symlink_ancestors(destination)
            if destination.exists():
                verify_record(parts, record)
            else:
                with destination.open("xb") as output:
                    output.write(block)
                verify_record(parts, record)
            records.append(record)
    size = sum(part["size"] for part in records)
    if (digest.hexdigest(), size) != before or hash_file(source) != before:
        raise PreservationError("Original changed during split: " + relative)
    return {"path": relative, "size": size, "sha256": digest.hexdigest(), "parts": records}


def split(handover):
    handover = directory(handover)
    context = directory(handover / "context")
    packs = directory(context / "packs")
    index = handover / "context-delivery.json"
    assert_no_symlink_ancestors(index)
    old_bytes = index.read_bytes() if index.exists() else None
    old = read_delivery(handover) if old_bytes is not None else {"format": FORMAT, "partSize": PART_SIZE, "packs": []}
    for record in old["packs"]:
        verify_record(context, record)
    parts = handover / "context-parts"
    assert_no_symlink_ancestors(parts)
    parts.mkdir(exist_ok=True)
    directory(parts)
    records = []
    for path in sorted(packs.glob("*.tar.gz")):
        source = package_file(context, path.relative_to(context).as_posix())
        if source.stat().st_size > PART_SIZE:
            records.append(split_pack(context, source, parts))
    current = validate_delivery({"format": FORMAT, "partSize": PART_SIZE, "packs": records})
    current_by_path = {item["path"]: item for item in current["packs"]}
    if any(current_by_path.get(item["path"]) != item for item in old["packs"]):
        raise PreservationError("An existing delivery record changed or disappeared")
    encoded = canonical_json(current)
    if encoded != old_bytes:
        with tempfile.NamedTemporaryFile(dir=handover, prefix="context-delivery-", suffix=".tmp", delete=False) as output:
            temporary = Path(output.name)
            output.write(encoded)
            output.flush()
            os.fsync(output.fileno())
        try:
            assert_no_symlink_ancestors(index)
            if (index.read_bytes() if index.exists() else None) != old_bytes:
                raise PreservationError("Delivery index changed during this run")
            os.replace(temporary, index)
        finally:
            temporary.unlink(missing_ok=True)
    return {"delivery": str(index), "sha256": hashlib.sha256(encoded).hexdigest(), "packs": len(records), "parts": sum(len(item["parts"]) for item in records)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("handover", help="Directory containing the immutable context/ package")
    args = parser.parse_args()
    try:
        print(canonical_json(split(args.handover)).decode(), end="")
    except (PreservationError, OSError, ValueError, TypeError, KeyError) as error:
        print("Split refused: " + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
