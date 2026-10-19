#!/usr/bin/env python3
"""Read-only ZIP verification against an exact Git commit; never extracts or writes.

Usage: python3 verify-source-zip.py --repo REPO --commit FULL_SHA --zip FILE
Exit 0: verified JSON receipt; 1: mismatch/unsupported archive; 2: usage error.
This independent review tool does not qualify an application or authorize a build.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import struct
import subprocess
import sys
import unicodedata
import zipfile

CHUNK = 1024 * 1024
MARKER = "source-commit.txt"


class Rejected(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise Rejected(message)


def safe_path(name, directory=False):
    require(isinstance(name, str) and bool(name), "Empty ZIP/Git path")
    require("\\" not in name and ":" not in name, "Nonportable path separator/drive")
    require(not any(ord(c) < 32 or ord(c) == 127 for c in name), "Control character in path")
    if directory:
        require(name.endswith("/"), "Directory missing slash")
        name = name[:-1]
    parts = name.split("/")
    require(all(p and p not in (".", "..") for p in parts), "Unsafe path component")
    for part in parts:
        require(not part.endswith((".", " ")), "Ambiguous Windows path component")
        require(part.casefold() != ".git", "Git metadata path refused")
        require(not re.fullmatch(r"(?i)(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?", part),
                "Reserved Windows path component")
    return name


def git(repo, *args):
    result = subprocess.run(["git", "--no-replace-objects", "-C", str(repo), *args],
                            check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return result.stdout


def committed_files(repo, commit):
    require(re.fullmatch(r"[0-9a-f]{40}", commit), "Use an exact lowercase 40-hex commit")
    require(git(repo, "cat-file", "-t", commit).strip() == b"commit", "Object is not a commit")
    tree = git(repo, "rev-parse", commit + "^{tree}").decode("ascii").strip()
    rows = git(repo, "ls-tree", "-r", "-z", "--full-tree", "--long", commit)
    files, aliases = {}, {}
    for row in rows.split(b"\0"):
        if not row:
            continue
        metadata, raw_name = row.split(b"\t", 1)
        mode, kind, object_id, length = metadata.split()
        name = safe_path(raw_name.decode("utf-8"))
        require(name != MARKER, "Source commit already tracks the reserved marker")
        require(kind == b"blob" and mode in (b"100644", b"100755"),
                "Git symlink/gitlink/nonregular mode refused: " + name)
        alias = unicodedata.normalize("NFC", name).casefold()
        require(alias not in aliases, "Case/Unicode-colliding Git path: " + name)
        aliases[alias] = name
        require(name not in files, "Duplicate Git path")
        files[name] = {"mode": mode.decode(), "size": int(length), "object": object_id.decode()}
    require(bool(files), "Empty source tree refused")
    directories = {name[:index] + "/" for name in files
                   for index, character in enumerate(name) if character == "/"}
    return tree, files, directories


def add_git_sha256(repo, files):
    process = subprocess.Popen(["git", "--no-replace-objects", "-C", str(repo), "cat-file", "--batch"],
                               stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    try:
        for name, expected in files.items():
            process.stdin.write((expected["object"] + "\n").encode("ascii"))
            process.stdin.flush()
            header = process.stdout.readline(256).split()
            require(header == [expected["object"].encode(), b"blob", str(expected["size"]).encode()],
                    "Unexpected Git blob response: " + name)
            remaining, digest = expected["size"], hashlib.sha256()
            while remaining:
                block = process.stdout.read(min(remaining, CHUNK))
                require(bool(block), "Truncated Git blob: " + name)
                remaining -= len(block)
                digest.update(block)
            require(process.stdout.read(1) == b"\n", "Invalid Git blob delimiter")
            expected["sha256"] = digest.hexdigest()
        process.stdin.close()
        require(process.wait(timeout=10) == 0, "Git blob reader failed")
    finally:
        if process.poll() is None:
            process.kill()
            process.wait()
        process.stdout.close()
        if not process.stdin.closed:
            process.stdin.close()


def zip_mode(info, directory):
    upper = info.external_attr >> 16
    kind = stat.S_IFMT(upper)
    require(kind not in (stat.S_IFLNK, stat.S_IFCHR, stat.S_IFBLK, stat.S_IFIFO, stat.S_IFSOCK),
            "Nonregular ZIP member: " + info.filename)
    require(not upper & 0o7000, "Special permission bits refused: " + info.filename)
    if directory:
        require(kind in (0, stat.S_IFDIR), "Directory mode mismatch")
        return None
    require(not info.external_attr & 0x10 and kind in (0, stat.S_IFREG), "File mode/type mismatch")
    if info.create_system == 3:
        require(upper != 0, "Unix member lacks mode metadata")
        executable = bool(upper & 0o111)
    else:
        require(upper == 0, "Unsupported non-Unix permission metadata")
        executable = False
    return "100755" if executable else "100644"


def extra_fields(raw):
    fields = {}
    while raw:
        require(len(raw) >= 4, "Truncated extra-field header")
        tag, length = struct.unpack_from("<HH", raw)
        require(len(raw) >= 4 + length and tag not in fields, "Malformed/duplicate ZIP extra field")
        # Unknown name/link/permission metadata must not change another extractor's behavior.
        require(tag in (0x0001, 0x000A, 0x5455, 0x7875), "Unsupported ZIP extra field")
        fields[tag] = raw[4:4 + length]
        raw = raw[4 + length:]
    return fields


def check_layout(stream, archive, members):
    """Reject unindexed local members, prefixes, overlaps and trailing content."""
    ordered = sorted(members, key=lambda item: item.header_offset)
    require(ordered[0].header_offset == 0, "ZIP prefix or unindexed first member")
    for index, info in enumerate(ordered):
        boundary = ordered[index + 1].header_offset if index + 1 < len(ordered) else archive.start_dir
        stream.seek(info.header_offset)
        header = stream.read(30)
        require(len(header) == 30, "Truncated local header")
        signature, version, flags, method, time, date, crc, compressed, size, names, extras = struct.unpack("<I5H3I2H", header)
        require(signature == 0x04034B50 and flags == info.flag_bits and method == info.compress_type,
                "Local/central format mismatch")
        raw_name = stream.read(names)
        decoded = raw_name.decode("utf-8" if flags & 0x800 else "cp437")
        require(decoded == info.orig_filename, "Local/central path mismatch")
        extra = extra_fields(stream.read(extras))
        if size == 0xFFFFFFFF or compressed == 0xFFFFFFFF:
            zipped = extra.get(0x0001, b"")
            if size == 0xFFFFFFFF:
                require(len(zipped) >= 8, "Missing local ZIP64 size")
                size, zipped = struct.unpack_from("<Q", zipped)[0], zipped[8:]
            if compressed == 0xFFFFFFFF:
                require(len(zipped) >= 8, "Missing local ZIP64 compressed size")
                compressed = struct.unpack_from("<Q", zipped)[0]
        data_end = stream.tell() + info.compress_size
        require(data_end <= boundary, "Overlapping ZIP members")
        if not flags & 8:
            require((crc, compressed, size) == (info.CRC, info.compress_size, info.file_size),
                    "Local/central size or CRC mismatch")
            require(data_end == boundary, "Unindexed bytes/member between ZIP records")
        else:
            require(crc in (0, info.CRC) and compressed in (0, info.compress_size)
                    and size in (0, info.file_size), "Invalid descriptor placeholders")
            stream.seek(data_end)
            length = boundary - data_end
            require(length in (12, 16, 20, 24), "Unindexed bytes or invalid descriptor")
            descriptor = stream.read(length)
            if length in (16, 24):
                require(descriptor[:4] == b"PK\x07\x08", "Invalid descriptor signature")
                descriptor = descriptor[4:]
            values = struct.unpack("<III" if len(descriptor) == 12 else "<IQQ", descriptor)
            require(values == (info.CRC, info.compress_size, info.file_size), "Descriptor mismatch")
    stream.seek(archive.start_dir)
    for info in members:
        fixed = stream.read(46)
        require(len(fixed) == 46 and fixed[:4] == b"PK\x01\x02", "Invalid central directory")
        names, extras, comments = struct.unpack_from("<HHH", fixed, 28)
        stream.seek(names + extras + comments, 1)
    central_end = stream.tell()
    trailer = stream.read(22 + 65535 + 76)
    require(len(trailer) <= 22 + 65535 + 76 and not stream.read(1), "Excess ZIP trailer")
    if trailer.startswith(b"PK\x06\x06"):
        require(len(trailer) >= 76 and struct.unpack_from("<Q", trailer, 4)[0] == 44,
                "Unsupported ZIP64 end record")
        require(trailer[56:60] == b"PK\x06\x07", "Missing ZIP64 locator")
        require(struct.unpack_from("<IIQQQQ", trailer, 16) ==
                (0, 0, len(members), len(members), central_end - archive.start_dir, archive.start_dir),
                "ZIP64 directory mismatch")
        require(struct.unpack_from("<IQI", trailer, 60) == (0, central_end, 1), "ZIP64 locator mismatch")
        trailer = trailer[76:]
    require(len(trailer) >= 22 and trailer[:4] == b"PK\x05\x06", "Invalid ZIP end record")
    disk, central_disk, count_disk, count, size, offset, comments = struct.unpack_from("<4H2IH", trailer, 4)
    require(disk == central_disk == 0 and len(trailer) == 22 + comments, "Multipart or trailing ZIP content")
    require(count_disk in (len(members), 65535) and count in (len(members), 65535), "ZIP count mismatch")
    require(size in (central_end - archive.start_dir, 0xFFFFFFFF)
            and offset in (archive.start_dir, 0xFFFFFFFF), "ZIP directory extent mismatch")


def verify_zip(repo, commit, path):
    tree, files, directories = committed_files(repo, commit)
    add_git_sha256(repo, files)
    manifest = [{"path": name, "mode": row["mode"], "bytes": row["size"], "sha256": row["sha256"]}
                for name, row in sorted(files.items())]
    marker = (commit + "\n").encode("ascii")
    with path.open("rb") as stream:
        initial_stat = os.fstat(stream.fileno())
        require(stat.S_ISREG(initial_stat.st_mode), "Archive must be a regular file")
        before = hashlib.file_digest(stream, "sha256").hexdigest()
        stream.seek(0)
        with zipfile.ZipFile(stream) as archive:
            members = archive.infolist()
            require(0 < len(members) <= len(files) + len(directories) + 1, "Unexpected ZIP member count")
            seen, seen_files, marker_count = set(), set(), 0
            for info in members:
                require(info.filename == info.orig_filename, "Truncated/NUL ZIP filename")
                directory = info.is_dir()
                safe_path(info.filename, directory)
                require(info.filename not in seen, "Duplicate ZIP path: " + info.filename)
                seen.add(info.filename)
                require(not info.flag_bits & ~0x080E, "Unsupported/encrypted ZIP flags")
                require(info.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED), "Unsupported compression")
                extra_fields(info.extra)
                mode = zip_mode(info, directory)
                if directory:
                    require(info.filename in directories and info.file_size == 0, "Extra/nonempty directory")
                    expected_size, expected_hash = 0, hashlib.sha256(b"").hexdigest()
                elif info.filename == MARKER:
                    marker_count += 1
                    require(mode == "100644", "Marker must not be executable")
                    expected_size, expected_hash = len(marker), hashlib.sha256(marker).hexdigest()
                else:
                    require(info.filename in files, "Extra ZIP file: " + info.filename)
                    expected = files[info.filename]
                    require(mode == expected["mode"], "Git/ZIP mode mismatch: " + info.filename)
                    expected_size, expected_hash = expected["size"], expected["sha256"]
                    seen_files.add(info.filename)
                require(info.file_size == expected_size, "ZIP payload size mismatch: " + info.filename)
                total, digest = 0, hashlib.sha256()
                with archive.open(info, "r") as member:
                    while block := member.read(min(CHUNK, expected_size - total + 1)):
                        total += len(block)
                        require(total <= expected_size, "Oversized expanded ZIP payload")
                        digest.update(block)
                require(total == expected_size and digest.hexdigest() == expected_hash,
                        "Git/ZIP payload mismatch: " + info.filename)
            require(seen_files == set(files) and marker_count == 1, "Missing tracked file or exact marker")
            check_layout(stream, archive, members)
        stream.seek(0)
        after = hashlib.file_digest(stream, "sha256").hexdigest()
        final_stat = os.fstat(stream.fileno())
        require(before == after and initial_stat.st_size == final_stat.st_size
                and initial_stat.st_mtime_ns == final_stat.st_mtime_ns, "Archive changed during verification")
    return {"verified": True, "commit": commit, "tree": tree,
            "archiveSHA256": after, "archiveBytes": initial_stat.st_size,
            "trackedBlobs": len(files), "trackedPayloadBytes": sum(row["size"] for row in files.values()),
            "zipMembers": len(members), "marker": MARKER,
            "independentManifestSHA256": hashlib.sha256(json.dumps(manifest, separators=(",", ":"), ensure_ascii=True).encode()).hexdigest(),
            "metadataPolicy": "ZIP timestamps/comments/compression may vary; source paths, Git modes and all payload bytes must match",
            "cloudActions": []}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--zip", dest="archive", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = verify_zip(args.repo, args.commit, args.archive)
    except Exception as error:
        print(json.dumps({"verified": False, "error": str(error)[:500]}))
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
