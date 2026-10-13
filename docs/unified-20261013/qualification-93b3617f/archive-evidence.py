#!/usr/bin/env python3
"""Build, verify or restore byte-preserving evidence without traversing links."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import tarfile


def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def save(path, value):
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")


def inventory(directory):
    config = json.loads((directory / "SOURCES.json").read_text())
    records, omissions, links, scan = [], [], [], []
    for root_record in config["roots"]:
        root = Path(root_record["path"])
        for parent, dirs, names in os.walk(root, followlinks=False):
            for name in sorted(dirs + names):
                path = Path(parent) / name
                relative = path.relative_to(root).as_posix()
                if path.is_symlink():
                    target = os.readlink(path)
                    links.append({"source": str(path), "logicalPath": root.name + "/" + relative,
                                  "target": target, "linkTextSha256": hashlib.sha256(target.encode()).hexdigest(),
                                  "reason": "Borrowed/symlink path retained locally; not followed or archived."})
                    if name in dirs:
                        dirs.remove(name)
                    continue
                if not path.is_file():
                    continue
                record = {"source": str(path), "logicalPath": root.name + "/" + relative,
                          "group": root_record["group"], "bytes": path.stat().st_size,
                          "sha256": digest(path)}
                omitted = ("node_modules" in path.parts or "__pycache__" in path.parts
                           or ("elements-work/tool/" in str(path) and path.name in {"esbuild", "archive.tgz"}))
                if omitted:
                    record["reason"] = "Reproducible local tool/dependency graph or bytecode; original bytes retained locally. Metadata/logs/receipts remain included."
                    omissions.append(record)
                else:
                    records.append(record)
                    if path.suffix in {".json", ".md", ".log", ".txt", ".html"} and path.stat().st_size < 8_000_000:
                        data = path.read_text(errors="replace")
                        hits = len(re.findall(r'https?[^\s"<>]*[?&](?:token|access_token|x-amz-signature|signature)=', data, flags=re.I))
                        if hits:
                            scan.append({"source": str(path), "queryCredentialPatternCount": hits,
                                         "note": "Manual publication review required; no matched URL/value printed."})
    records.sort(key=lambda row: row["logicalPath"])
    save(directory / "SOURCE-FILES.json", {"records": records})
    save(directory / "OMITTED-LOCAL-GRAPH.json", {"regularFiles": omissions, "links": links,
         "limitation": "This publication preserves evidence, not a runnable dependency installation. Symlink targets are not inventoried recursively or copied."})
    save(directory / "PUBLICATION-URL-SCAN.json", {"scope": "Heuristic query-credential check; raw bytes unchanged", "matches": scan})
    return records


def build(directory):
    records = inventory(directory)
    unique = {}
    for row in records:
        unique.setdefault(row["sha256"], row)
    archive = directory / "evidence-objects.tar.gz"
    with open(archive, "wb") as output:
        with gzip.GzipFile(fileobj=output, mode="wb", filename="", mtime=0, compresslevel=9) as gz:
            with tarfile.open(fileobj=gz, mode="w|", format=tarfile.PAX_FORMAT) as tar:
                for sha, row in sorted(unique.items()):
                    path = Path(row["source"])
                    if path.stat().st_size != row["bytes"] or digest(path) != sha:
                        raise ValueError("Evidence changed during publication: " + str(path))
                    info = tarfile.TarInfo("objects/" + sha)
                    info.size, info.mode, info.mtime = row["bytes"], 0o444, 0
                    info.uid = info.gid = 0
                    info.uname = info.gname = ""
                    with open(path, "rb") as stream:
                        tar.addfile(info, stream)
    result = verify(directory)
    save(directory / "ARCHIVE-VERIFICATION.json", result)
    print(json.dumps(result, indent=2))


def verify(directory):
    records = json.loads((directory / "SOURCE-FILES.json").read_text())["records"]
    expected = {row["sha256"]: row["bytes"] for row in records}
    seen = set()
    archive = directory / "evidence-objects.tar.gz"
    with tarfile.open(archive, "r:gz") as tar:
        for member in tar:
            sha = member.name.removeprefix("objects/")
            if (not member.isfile() or member.name != "objects/" + sha
                    or not re.fullmatch(r"[a-f0-9]{64}", sha) or sha in seen
                    or expected.get(sha) != member.size):
                raise ValueError("Unexpected archive member: " + member.name)
            h = hashlib.sha256()
            with tar.extractfile(member) as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                    h.update(chunk)
            if h.hexdigest() != sha:
                raise ValueError("Archive byte mismatch: " + member.name)
            seen.add(sha)
    if seen != set(expected):
        raise ValueError("Archive object set is incomplete")
    return {"archive": archive.name, "bytes": archive.stat().st_size, "sha256": digest(archive),
            "sourceRecords": len(records), "sourceBytes": sum(row["bytes"] for row in records),
            "uniqueObjects": len(expected), "uniqueBytes": sum(expected.values()),
            "allMembersReopenedAndHashVerified": True,
            "restoration": "Each logicalPath maps to its immutable sha256 object; no archive symlinks, hardlinks, absolute paths or traversal entries."}


def restore(directory, destination):
    verify(directory)
    if destination.is_symlink():
        raise ValueError("Restore destination must not be a symlink")
    if destination.exists() and any(destination.iterdir()):
        raise ValueError("Restore destination must be absent or empty")
    destination.mkdir(parents=True, exist_ok=True)
    records = json.loads((directory / "SOURCE-FILES.json").read_text())["records"]
    with tarfile.open(directory / "evidence-objects.tar.gz", "r:gz") as tar:
        for row in records:
            name = PurePosixPath(row["logicalPath"])
            if name.is_absolute() or ".." in name.parts:
                raise ValueError("Unsafe logical path")
            target = destination.joinpath(*name.parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            with tar.extractfile("objects/" + row["sha256"]) as src, open(target, "xb") as dst:
                for chunk in iter(lambda: src.read(1024 * 1024), b""):
                    dst.write(chunk)
            if digest(target) != row["sha256"]:
                raise ValueError("Restored byte mismatch")
    print(f"Restored and verified {len(records)} regular evidence paths; borrowed links omitted.")


def main():
    parser = argparse.ArgumentParser(description=__doc__, epilog="Exit 0: complete; 1: validation/I/O failure; 2: invalid CLI arguments. Restore can require the uncompressed sourceBytes shown in ARCHIVE-VERIFICATION.json.")
    parser.add_argument("action", choices=["inventory", "build", "verify", "restore"])
    parser.add_argument("directory", type=Path)
    parser.add_argument("--destination", type=Path)
    args = parser.parse_args()
    if args.action == "inventory":
        rows = inventory(args.directory)
        print(json.dumps({"records": len(rows), "bytes": sum(row["bytes"] for row in rows)}))
    elif args.action == "build":
        build(args.directory)
    elif args.action == "verify":
        print(json.dumps(verify(args.directory), indent=2))
    else:
        if args.destination is None:
            parser.error("restore requires --destination")
        restore(args.directory, args.destination)


if __name__ == "__main__":
    main()
