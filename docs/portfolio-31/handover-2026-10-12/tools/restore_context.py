#!/usr/bin/env python3
"""Restore verified context into an explicit new target, never an existing tree."""
import argparse
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import sys
import tempfile
from context_common import (
    PreservationError, assert_no_symlink_ancestors, canonical_json, checked_relative,
    hash_file, read_pack, sha256_bytes, verify_package,
)


def safe_parent(target, relative):
    parts = checked_relative(relative).parts
    current = target
    for part in parts[:-1]:
        current = current / part
        try:
            current.mkdir(mode=0o755)
        except FileExistsError:
            if current.is_symlink() or not current.is_dir():
                raise PreservationError("Unsafe destination ancestor")
    return target.joinpath(*parts)


def validate_link(record, value, link_paths):
    if not value or b"\0" in value or b"\\" in value:
        raise PreservationError("Unsafe symlink target")
    text = os.fsdecode(value)
    target = PurePosixPath(text)
    if target.is_absolute() or (len(text) > 1 and text[1] == ":"):
        raise PreservationError("Absolute symlink target")
    stack = list(PurePosixPath(record["path"]).parent.parts)
    for part in target.parts:
        if part == "..":
            if not stack:
                raise PreservationError("Symlink escapes new restoration target")
            stack.pop()
        elif part not in ("", "."):
            stack.append(part)
        if "/".join(stack) in link_paths:
            raise PreservationError("Chained or self-referential symlink target is not supported")
    if ".git" in stack:
        raise PreservationError("Symlink targets Git administration")
    return text


def restore(args):
    if not Path(args.target).is_absolute():
        raise PreservationError("Target must be explicitly absolute")
    target = Path(args.target)
    assert_no_symlink_ancestors(target)
    if os.path.lexists(target):
        raise PreservationError("Target already exists; refusing all overwrites")
    if not target.parent.is_dir():
        raise PreservationError("Target parent must already exist")
    package = Path(args.package).absolute()
    manifest, receipt = verify_package(package, args.expected_manifest_sha256, args.history_bundle)
    links = [r for r in manifest["files"] if r["type"] == "symlink"]
    if links and not args.allow_safe_symlinks:
        raise PreservationError("Package has symlinks; review them and opt in explicitly")
    # Link bytes are gathered/validated before target creation, with no path extraction.
    link_hashes = {record["sha256"] for record in links}
    link_data = {}
    if link_hashes:
        import io
        class LinkBuffer(io.BytesIO):
            def __init__(self, key):
                super().__init__(); self.key = key
            def close(self):
                link_data[self.key] = self.getvalue(); super().close()
        for pack in manifest["packs"]:
            read_pack(package, pack, manifest["blobs"], lambda key: LinkBuffer(key) if key in link_hashes else None)
    link_paths = {record["path"] for record in links}
    link_targets = {record["path"]: validate_link(record, link_data[record["sha256"]], link_paths) for record in links}
    target.mkdir(mode=0o700, exist_ok=False)
    staging = Path(tempfile.mkdtemp(prefix=".context-blob-staging-", dir=target))
    try:
        for pack in manifest["packs"]:
            read_pack(package, pack, manifest["blobs"], lambda key: (staging / key).open("xb"))
        for record in manifest["files"]:
            if record["type"] != "file":
                continue
            destination = safe_parent(target, record["path"])
            with (staging / record["sha256"]).open("rb") as source, destination.open("xb") as output:
                shutil.copyfileobj(source, output, 1024 * 1024)
            os.chmod(destination, int(record["mode"], 8) & 0o777, follow_symlinks=False)
            if hash_file(destination) != (record["sha256"], record["size"]):
                raise PreservationError("Restored file hash mismatch")
        # Links go last; no subsequent writes can traverse a restored link.
        for record in links:
            destination = safe_parent(target, record["path"])
            os.symlink(link_targets[record["path"]], destination)
        metadata_root = target / "__context_metadata__"
        metadata_root.mkdir(mode=0o700)
        for record in manifest["metadata"]:
            relative = record["path"].removeprefix("metadata/")
            destination = safe_parent(metadata_root, relative)
            with (package / record["path"]).open("rb") as source, destination.open("xb") as output:
                shutil.copyfileobj(source, output, 1024 * 1024)
            if hash_file(destination) != (record["sha256"], record["size"]):
                raise PreservationError("Restored metadata changed after package verification")
        for name in ("manifest.json", "manifest.sha256"):
            data = (package / name).read_bytes()
            if name == "manifest.json" and sha256_bytes(data) != receipt["manifestSha256"]:
                raise PreservationError("Package manifest changed after verification")
            if name == "manifest.sha256" and data != (receipt["manifestSha256"] + "  manifest.json\n").encode("ascii"):
                raise PreservationError("Package manifest anchor changed after verification")
            with (metadata_root / name).open("xb") as output:
                output.write(data)
        receipt.update({"restored": True, "target": str(target), "originalModesRecorded": True,
                        "specialPermissionBitsRestored": False, "gitInitialized": False})
        with (target / "__context_restore_receipt__.json").open("xb") as stream:
            stream.write(canonical_json(receipt))
    except Exception:
        # Preserve any partial result for diagnosis; never delete user data or retry into it.
        raise
    finally:
        shutil.rmtree(staging)
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package")
    parser.add_argument("--target", required=True)
    parser.add_argument("--expected-manifest-sha256")
    parser.add_argument("--history-bundle")
    parser.add_argument("--allow-safe-symlinks", action="store_true")
    args = parser.parse_args()
    try:
        print(json.dumps(restore(args), sort_keys=True))
    except (PreservationError, OSError, ValueError, KeyError) as error:
        print("Restoration refused: " + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
