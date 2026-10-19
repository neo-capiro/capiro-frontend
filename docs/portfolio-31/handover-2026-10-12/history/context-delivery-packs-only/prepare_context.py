#!/usr/bin/env python3
"""Materialize an exact context package from published ordinary files and parts."""
from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path
import shutil
import stat
import sys

from context_common import (
    CHUNK, PreservationError, assert_no_symlink_ancestors, canonical_json,
    checked_relative, hash_file, package_file, verify_record,
)
from context_delivery import directory, new_target, read_delivery


def ordinary_files(context):
    result = []
    for root, directories, files in os.walk(context, followlinks=False):
        for name in sorted(directories + files):
            path = Path(root) / name
            relative = path.relative_to(context).as_posix()
            checked_relative(relative)
            assert_no_symlink_ancestors(path)
            mode = path.lstat().st_mode
            if stat.S_ISREG(mode):
                result.append(relative)
            elif not stat.S_ISDIR(mode):
                raise PreservationError("Nonregular context input: " + relative)
    return sorted(result)


def copy_exact(context, relative, target):
    source = package_file(context, relative)
    expected = hash_file(source)
    destination = target / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    assert_no_symlink_ancestors(destination)
    with source.open("rb") as input_file, destination.open("xb") as output:
        shutil.copyfileobj(input_file, output, CHUNK)
    if hash_file(destination) != expected:
        raise PreservationError("Copied file changed: " + relative)


def assemble(parts, record, target):
    destination = target / record["path"]
    destination.parent.mkdir(parents=True, exist_ok=True)
    assert_no_symlink_ancestors(destination)
    full_digest = hashlib.sha256()
    full_size = 0
    with destination.open("xb") as output:
        for part in record["parts"]:
            source = package_file(parts, part["path"])
            digest = hashlib.sha256()
            size = 0
            with source.open("rb") as input_file:
                while block := input_file.read(CHUNK):
                    digest.update(block)
                    full_digest.update(block)
                    size += len(block)
                    output.write(block)
            if (digest.hexdigest(), size) != (part["sha256"], part["size"]):
                raise PreservationError("Part changed during assembly: " + part["path"])
            full_size += size
    if (full_digest.hexdigest(), full_size) != (record["sha256"], record["size"]):
        raise PreservationError("Reassembled pack hash/size mismatch: " + record["path"])
    verify_record(target, record)


def prepare(handover, target):
    handover = directory(handover)
    target = new_target(target, handover)
    context = directory(handover / "context")
    delivery = read_delivery(handover)
    package_file(context, "manifest.json")
    package_file(context, "manifest.sha256")
    parts = directory(handover / "context-parts")
    split_paths = {record["path"] for record in delivery["packs"]}
    ordinary = ordinary_files(context)
    if split_paths and "packs" in ordinary:
        raise PreservationError("Context file collides with the packs directory")
    for record in delivery["packs"]:
        if record["path"] in ordinary:
            verify_record(context, record)
        for part in record["parts"]:
            verify_record(parts, part)
    target.mkdir(mode=0o700)
    copied = 0
    for relative in ordinary:
        if relative not in split_paths:
            copy_exact(context, relative, target)
            copied += 1
    for record in delivery["packs"]:
        assemble(parts, record, target)
    return {"target": str(target), "ordinaryFilesCopied": copied, "packsReassembled": len(split_paths), "manifestSha256": hash_file(target / "manifest.json")[0], "nextStep": "Run the existing verify_context.py against this target and the trusted manifest hash."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("handover", help="Published directory containing context/, context-parts/ and context-delivery.json")
    parser.add_argument("--target", required=True, help="NEW directory outside the handover; its parent must already exist")
    args = parser.parse_args()
    try:
        print(canonical_json(prepare(args.handover, args.target)).decode(), end="")
    except (PreservationError, OSError, ValueError, TypeError, KeyError) as error:
        print("Preparation refused: " + str(error) + ". Any partial target is unverified; do not reuse it.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
