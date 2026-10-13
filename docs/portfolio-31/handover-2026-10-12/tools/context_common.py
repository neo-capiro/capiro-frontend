#!/usr/bin/env python3
"""Integrity and safe-path rules for the exact context package (stdlib only)."""
from __future__ import annotations

import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import tarfile

FORMAT = "portfolio-context-sha256-ustar-gzip-v1"
CHUNK = 1024 * 1024
HASH_RE = re.compile(r"[0-9a-f]{64}\Z")


class PreservationError(RuntimeError):
    pass


def canonical_json(value):
    return (json.dumps(value, ensure_ascii=True, sort_keys=True, indent=2) + "\n").encode("utf-8")


def no_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise PreservationError("Duplicate JSON object key")
        result[key] = value
    return result


def load_json(data):
    return json.loads(data, object_pairs_hook=no_duplicate_keys)


def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def hash_file(path):
    digest = hashlib.sha256()
    size = 0
    with Path(path).open("rb") as stream:
        while block := stream.read(CHUNK):
            digest.update(block)
            size += len(block)
    return digest.hexdigest(), size


def checked_relative(value):
    if not isinstance(value, str) or not value or "\x00" in value or "\\" in value:
        raise PreservationError("Unsafe or empty relative path")
    if re.match(r"^[A-Za-z]:", value):
        raise PreservationError("Drive-qualified path is not allowed")
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in ("", ".", "..") for part in value.split("/")):
        raise PreservationError("Absolute, dot or traversal path is not allowed")
    if path.as_posix() != value:
        raise PreservationError("Noncanonical relative path")
    if ".git" in path.parts:
        raise PreservationError("Git administrative paths are not restorable context")
    return path


def assert_no_symlink_ancestors(path):
    path = Path(os.path.abspath(path))
    for item in reversed((path, *path.parents)):
        if item.is_symlink():
            raise PreservationError("Symlink ancestor is not allowed: " + str(item))


def package_file(package, relative):
    checked_relative(relative)
    path = package / relative
    assert_no_symlink_ancestors(path)
    if not path.is_file() or not stat.S_ISREG(path.stat().st_mode):
        raise PreservationError("Missing/nonregular package file: " + relative)
    return path


def validate_digest(value):
    if not isinstance(value, str) or HASH_RE.fullmatch(value) is None:
        raise PreservationError("Invalid SHA256 field")


def check_size(value):
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise PreservationError("Invalid byte size")


def verify_record(package, record):
    validate_digest(record["sha256"])
    check_size(record["size"])
    path = package_file(package, record["path"])
    if hash_file(path) != (record["sha256"], record["size"]):
        raise PreservationError("File integrity mismatch: " + record["path"])


def inspect_manifest(package, expected=None):
    package = Path(package).absolute()
    assert_no_symlink_ancestors(package)
    manifest_path = package_file(package, "manifest.json")
    data = manifest_path.read_bytes()
    digest = sha256_bytes(data)
    anchor = package_file(package, "manifest.sha256").read_text("ascii")
    if anchor != digest + "  manifest.json\n":
        raise PreservationError("Manifest checksum anchor mismatch")
    if expected is not None:
        validate_digest(expected)
        if digest != expected:
            raise PreservationError("Manifest does not match trusted outside hash")
    manifest = load_json(data)
    if manifest.get("format") != FORMAT or manifest.get("schemaVersion") != 1:
        raise PreservationError("Unsupported package format")
    if canonical_json(manifest) != data:
        raise PreservationError("Manifest is not canonical JSON")
    records = manifest["files"]
    paths = [record["path"] for record in records]
    if paths != sorted(set(paths)):
        raise PreservationError("File paths are not uniquely sorted")
    path_set = set(paths)
    for record in records:
        path = checked_relative(record["path"])
        if path.parts[0] in ("__context_metadata__", "__context_restore_receipt__.json"):
            raise PreservationError("Manifest collides with reserved restoration metadata")
        for parent in path.parents:
            if parent.as_posix() in path_set:
                raise PreservationError("File/parent path collision")
        if record["type"] not in ("file", "symlink"):
            raise PreservationError("Unsupported original filesystem type")
        if not re.fullmatch(r"0[0-7]{3,4}", record["mode"]):
            raise PreservationError("Invalid original mode")
        if int(record["mode"], 8) > 0o7777:
            raise PreservationError("Unsupported original mode bits")
        validate_digest(record["sha256"])
        check_size(record["size"])
    blobs = manifest["blobs"]
    if set(blobs) != {record["sha256"] for record in records}:
        raise PreservationError("Unreferenced or missing blob mapping")
    for digest_key, blob in blobs.items():
        validate_digest(digest_key)
        check_size(blob["size"])
        if blob["member"] != "sha256/" + digest_key:
            raise PreservationError("Noncanonical blob member path")
    for record in records:
        if blobs[record["sha256"]]["size"] != record["size"]:
            raise PreservationError("Path/blob size mismatch")
    metadata_paths = set()
    for item in manifest["metadata"]:
        if not item["path"].startswith("metadata/") or item["path"] in metadata_paths:
            raise PreservationError("Invalid or duplicate metadata path")
        metadata_paths.add(item["path"])
        verify_record(package, item)
    packs = manifest["packs"]
    pack_paths = [p["path"] for p in packs]
    if pack_paths != sorted(set(pack_paths)):
        raise PreservationError("Duplicate/unsorted pack paths")
    for i, pack in enumerate(packs, 1):
        if pack["path"] != f"packs/context-{i:05d}.tar.gz":
            raise PreservationError("Noncanonical pack path")
        verify_record(package, pack)
    if {blob["pack"] for blob in blobs.values()} != set(pack_paths):
        raise PreservationError("Unused or absent pack")
    return manifest, digest


class CountingReader:
    def __init__(self, stream):
        self.stream = stream
        self.count = 0

    def read(self, amount=-1):
        data = self.stream.read(amount)
        self.count += len(data)
        return data


def read_pack(package, pack, blobs, sink=None):
    """Verify regular blob members; optional sink consumes validated-name bytes."""
    expected = {key for key, item in blobs.items() if item["pack"] == pack["path"]}
    observed = []
    payload = 0
    with gzip.open(package_file(package, pack["path"]), "rb") as decompressed:
        counted = CountingReader(decompressed)
        with tarfile.open(fileobj=counted, mode="r|") as archive:
            for member in archive:
                if not member.isfile() or not member.name.startswith("sha256/"):
                    raise PreservationError("Pack contains non-blob or nonregular member")
                digest_key = member.name.removeprefix("sha256/")
                validate_digest(digest_key)
                if digest_key not in expected or digest_key in observed:
                    raise PreservationError("Unexpected or duplicate packed blob")
                record = blobs[digest_key]
                if member.size != record["size"] or member.name != record["member"]:
                    raise PreservationError("Packed blob size/name mismatch")
                if member.uid != 0 or member.gid != 0 or member.mtime != 0 or member.mode != 0o644 or member.pax_headers:
                    raise PreservationError("Nondeterministic tar member metadata")
                stream = archive.extractfile(member)
                digest = hashlib.sha256()
                count = 0
                destination = sink(digest_key) if sink else None
                try:
                    while block := stream.read(CHUNK):
                        digest.update(block)
                        count += len(block)
                        if destination:
                            destination.write(block)
                finally:
                    if destination:
                        destination.close()
                    stream.close()
                if count != record["size"] or digest.hexdigest() != digest_key:
                    raise PreservationError("Uncompressed blob integrity mismatch")
                observed.append(digest_key)
                payload += count
        # Consume padding to EOF so gzip CRC/truncation is checked as well.
        while remaining := counted.read(CHUNK):
            if remaining.strip(b"\0"):
                raise PreservationError("Unexpected trailing tar data")
        if counted.count != pack["tarBytes"]:
            raise PreservationError("Uncompressed tar byte count mismatch")
    if observed != sorted(expected) or payload != pack["payloadBytes"] or len(observed) != pack["blobCount"]:
        raise PreservationError("Pack inventory mismatch")


def verify_package(package, expected=None, history_bundle=None, progress=None):
    package = Path(package).absolute()
    manifest, digest = inspect_manifest(package, expected)
    for index, pack in enumerate(manifest["packs"], 1):
        read_pack(package, pack, manifest["blobs"])
        if progress:
            progress(index, len(manifest["packs"]))
    bundle_verified = False
    if history_bundle:
        assert_no_symlink_ancestors(history_bundle)
        history = manifest["sourceHistoryBundle"]
        if hash_file(history_bundle) != (history["sha256"], history["size"]):
            raise PreservationError("Separate source-history bundle hash/size mismatch")
        bundle_verified = True
    summary = {
        "verified": True, "manifestSha256": digest, "files": len(manifest["files"]),
        "uniqueBlobs": len(manifest["blobs"]), "packs": len(manifest["packs"]),
        "metadataFiles": len(manifest["metadata"]), "historyBundleVerified": bundle_verified,
        "credentialReview": manifest["credentialScan"]["disposition"],
    }
    return manifest, summary
