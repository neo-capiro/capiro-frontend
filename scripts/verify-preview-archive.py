"""Append a remote source marker to a tree-equivalent Git ZIP and verify it."""

import base64
import hashlib
import json
import subprocess
import sys
import zipfile
from pathlib import Path


def main() -> None:
    if len(sys.argv) != 6:
        raise ValueError(
            "Usage: verify-preview-archive.py ZIP REPO LOCAL_TREEISH "
            "REMOTE_COMMIT_SHA EXPECTED_TREE_SHA"
        )
    archive_path = Path(sys.argv[1])
    repo_path = Path(sys.argv[2])
    treeish, commit, expected_tree = sys.argv[3:6]
    for value in (commit, expected_tree):
        if len(value) != 40 or any(c not in "0123456789abcdef" for c in value):
            raise ValueError("Expected lowercase full Git SHA values")
    actual_tree = subprocess.check_output(
        ["git", "-C", str(repo_path), "rev-parse", f"{treeish}^{{tree}}"]
    ).decode("ascii").strip()
    if actual_tree != expected_tree:
        raise ValueError("Local source tree does not match the published tree")

    tracked_bytes = subprocess.check_output(
        ["git", "-C", str(repo_path), "ls-tree", "-r", "-z", treeish]
    )
    tracked = {}
    for item in tracked_bytes.split(b"\0"):
        if not item:
            continue
        header, path_bytes = item.split(b"\t", 1)
        mode, object_type, object_id = header.split(b" ")
        if object_type != b"blob" or mode not in (b"100644", b"100755", b"120000"):
            raise ValueError("Git tree contains an unsupported member")
        path = path_bytes.decode("utf-8", "surrogateescape")
        if path in tracked:
            raise ValueError("Git tree contains duplicate paths")
        tracked[path] = object_id.decode("ascii")
    if "source-commit.txt" in tracked:
        raise ValueError("Git tree contains duplicate paths or source marker")

    with zipfile.ZipFile(archive_path, mode="a", allowZip64=True) as archive:
        if "source-commit.txt" in archive.namelist():
            raise ValueError("ZIP already has a source marker")
        archive.writestr(
            "source-commit.txt", commit + "\n", compress_type=zipfile.ZIP_STORED
        )

    uncompressed_bytes = 0
    with zipfile.ZipFile(archive_path, mode="r", allowZip64=True) as archive:
        members = [info for info in archive.infolist() if not info.is_dir()]
        names = [info.filename for info in members]
        if len(names) != len(set(names)):
            raise ValueError("ZIP has duplicate file members")
        expected = set(tracked) | {"source-commit.txt"}
        actual = set(names)
        if actual != expected:
            raise ValueError(
                f"ZIP member mismatch: missing={sorted(expected - actual)[:8]}, "
                f"unexpected={sorted(actual - expected)[:8]}"
            )
        if archive.read("source-commit.txt") != (commit + "\n").encode("ascii"):
            raise ValueError("Source marker mismatch")
        for info in members:
            size = 0
            digest = hashlib.sha1(f"blob {info.file_size}\0".encode("ascii"))
            with archive.open(info, mode="r") as member:
                while block := member.read(4 * 1024 * 1024):
                    size += len(block)
                    digest.update(block)
            if size != info.file_size:
                raise ValueError(f"Uncompressed size mismatch: {info.filename}")
            if info.filename != "source-commit.txt" and digest.hexdigest() != tracked[info.filename]:
                raise ValueError(f"Git blob mismatch: {info.filename}")
            uncompressed_bytes += size

    digest = hashlib.sha256()
    with archive_path.open("rb") as archive_bytes:
        while block := archive_bytes.read(4 * 1024 * 1024):
            digest.update(block)
    print(
        json.dumps(
            {
                "commit": commit,
                "tree": expected_tree,
                "local_treeish": treeish,
                "tracked_files": len(tracked),
                "zip_file_members": len(members),
                "uncompressed_bytes": uncompressed_bytes,
                "zip_bytes": archive_path.stat().st_size,
                "sha256_hex": digest.hexdigest(),
                "sha256_base64": base64.b64encode(digest.digest()).decode("ascii"),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
