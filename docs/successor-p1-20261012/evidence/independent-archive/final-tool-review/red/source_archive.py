#!/usr/bin/env python3
"""Create or verify a source ZIP against an immutable local Git commit.

No extraction, upload or cloud action. Output paths must be new.
Exit 0: verified; 1: source/archive mismatch; 2: invalid CLI arguments.
ZIP compression, timestamps and creator headers are not source identity.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import zipfile


def git(repository, *args):
    return subprocess.check_output(
        ["git", "--no-replace-objects", "-C", str(repository), *args],
        env=dict(os.environ, GIT_NO_REPLACE_OBJECTS="1"),
    )


def safe_path(value):
    path = PurePosixPath(value)
    if (not value or "\\" in value or "\0" in value or path.is_absolute()
            or any(part in (".", "..", ".git") for part in value.split("/"))
            or str(path) != value):
        raise ValueError("Unsafe or noncanonical archive path: " + repr(value))
    return value


def source(repository, commit):
    if not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise ValueError("Supply the full immutable Git commit")
    resolved = git(repository, "rev-parse", "--verify", commit + "^{commit}").decode().strip()
    if resolved != commit:
        raise ValueError("Commit identity differs")
    tree = git(repository, "rev-parse", commit + "^{tree}").decode().strip()
    app_tree = git(repository, "rev-parse", commit + ":apps/web/src").decode().strip()
    entries = []
    for raw in git(repository, "ls-tree", "-rz", "--full-tree", commit).split(b"\0"):
        if not raw:
            continue
        metadata, raw_path = raw.split(b"\t", 1)
        mode, kind, oid = metadata.decode("ascii").split()
        path = safe_path(raw_path.decode("utf-8"))
        if mode not in ("100644", "100755") or kind != "blob" or path == "source-commit.txt":
            raise ValueError("Unsupported Git entry: " + path)
        entries.append((path, mode, oid))
    return {"commit": commit, "rootTree": tree, "appSourceTree": app_tree}, entries


def blobs(repository, entries):
    process = subprocess.Popen(
        ["git", "--no-replace-objects", "-C", str(repository), "cat-file", "--batch"],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE,
        env=dict(os.environ, GIT_NO_REPLACE_OBJECTS="1"),
    )
    try:
        for path, mode, oid in entries:
            process.stdin.write((oid + "\n").encode("ascii"))
            process.stdin.flush()
            header = process.stdout.readline().decode("ascii").split()
            if len(header) != 3 or header[:2] != [oid, "blob"]:
                raise ValueError("Invalid Git blob header: " + path)
            size = int(header[2])
            data = process.stdout.read(size)
            if len(data) != size or process.stdout.read(1) != b"\n":
                raise ValueError("Incomplete Git blob: " + path)
            identity = hashlib.sha1(b"blob " + str(size).encode() + b"\0" + data).hexdigest()
            if identity != oid:
                raise ValueError("Git blob digest differs: " + path)
            yield {"path": path, "mode": mode, "gitBlob": oid, "bytes": size,
                   "sha256": hashlib.sha256(data).hexdigest()}, data
    finally:
        process.stdin.close()
        process.stdout.close()
        process.wait(timeout=10)
    if process.returncode != 0:
        raise ValueError("Git blob reader failed")


def zip_mode(info):
    mode = info.external_attr >> 16
    # Git ZIP uses DOS creator/zero Unix bits for ordinary non-executable files.
    if mode == 0 and info.create_system == 0:
        return "100644"
    if mode in (0o100644, 0o100755):
        return format(mode, "o")
    raise ValueError("Unsupported or ambiguous ZIP file mode: " + info.filename)


def add_entry(archive, name, mode, data):
    info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
    info.create_system = 3
    info.external_attr = int(mode, 8) << 16
    info.compress_type = zipfile.ZIP_DEFLATED
    archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=6)


def create(repository, commit, output):
    binding, entries = source(repository, commit)
    with output.open("xb") as target, zipfile.ZipFile(target, "w") as archive:
        archive.comment = commit.encode("ascii")
        for item, data in blobs(repository, entries):
            add_entry(archive, item["path"], item["mode"], data)
        add_entry(archive, "source-commit.txt", "100644", (commit + "\n").encode())
    return binding


def verify(repository, commit, archive_path):
    binding, entries = source(repository, commit)
    expected = {entry[0] for entry in entries} | {"source-commit.txt"}
    parents = {str(parent) for name in expected for parent in PurePosixPath(name).parents
               if str(parent) != "."}
    manifest = []
    with zipfile.ZipFile(archive_path) as archive:
        names = set()
        for info in archive.infolist():
            if info.orig_filename != info.filename or info.filename in names or info.flag_bits & 1:
                raise ValueError("Duplicate, truncated or encrypted ZIP entry")
            names.add(info.filename)
            name = safe_path(info.filename[:-1] if info.is_dir() else info.filename)
            if info.is_dir():
                kind = (info.external_attr >> 16) & 0o170000
                if (kind not in (0, 0o040000) or name not in parents
                        or info.file_size != 0 or archive.read(info) != b""):
                    raise ValueError("Unexpected directory entry: " + name)
                continue
            if name not in expected:
                raise ValueError("Unexpected ZIP file: " + name)
        if {info.filename for info in archive.infolist() if not info.is_dir()} != expected:
            raise ValueError("ZIP does not contain the exact committed file set plus source marker")
        for item, _ in blobs(repository, entries):
            info = archive.getinfo(item["path"])
            if info.file_size != item["bytes"] or zip_mode(info) != item["mode"]:
                raise ValueError("ZIP size/mode differs: " + item["path"])
            with archive.open(info) as member:
                digest = hashlib.file_digest(member, "sha256").hexdigest()
            if digest != item["sha256"]:
                raise ValueError("ZIP payload differs: " + item["path"])
            manifest.append(item)
        marker = archive.getinfo("source-commit.txt")
        if (zip_mode(marker) != "100644" or marker.file_size != 41
                or archive.read(marker) != (commit + "\n").encode("ascii")):
            raise ValueError("Source marker differs")
    with archive_path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    return {**binding, "archiveSHA256": digest, "archiveBytes": archive_path.stat().st_size,
            "trackedBlobs": len(manifest), "files": manifest, "cloudActions": []}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("create", "verify"))
    parser.add_argument("repository", type=Path)
    parser.add_argument("commit")
    parser.add_argument("archive", type=Path)
    parser.add_argument("new_receipt", type=Path)
    args = parser.parse_args()
    if args.new_receipt.exists() or (args.action == "create" and args.archive.exists()):
        parser.error("Existing output is preserved; choose a new output path")
    try:
        if args.action == "create":
            create(args.repository, args.commit, args.archive)
        result = verify(args.repository, args.commit, args.archive)
        with args.new_receipt.open("x", encoding="utf-8") as receipt:
            json.dump(result, receipt, indent=2)
            receipt.write("\n")
        print(json.dumps({key: value for key, value in result.items() if key != "files"}))
    except (OSError, ValueError, subprocess.SubprocessError, zipfile.BadZipFile) as error:
        parser.exit(1, str(error) + "\n")


if __name__ == "__main__":
    main()
