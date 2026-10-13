#!/usr/bin/env python3
"""Verify prepared publication bytes and optionally original local evidence."""
import argparse
import hashlib
import json
import re
from pathlib import Path


def digest(path):
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1048576), b""):
            value.update(block)
    return value.hexdigest()


def check_file(path, record):
    if path.is_symlink() or not path.is_file():
        raise ValueError("Missing/nonregular evidence: " + str(path))
    if path.stat().st_size != record["bytes"] or digest(path) != record["sha256"]:
        raise ValueError("Evidence bytes changed: " + str(path))


def main():
    parser = argparse.ArgumentParser(description=__doc__, epilog="Exit 0: verified; 1: validation/I/O failure; 2: invalid arguments. Writes no evidence or source files.")
    parser.add_argument("directory", type=Path)
    parser.add_argument("--originals", action="store_true", help="Also rehash retained source files at recorded absolute local paths.")
    args = parser.parse_args()
    root = args.directory
    files = json.loads((root / "PUBLICATION-MANIFEST.json").read_text())["files"]
    for row in files:
        check_file(root / row["path"], row)
    actual = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}
    expected = {row["path"] for row in files} | {"PUBLICATION-MANIFEST.json"}
    if actual != expected:
        raise ValueError("Publication path set differs from manifest")
    direct = json.loads((root / "DIRECT-FILES.json").read_text())
    late = json.loads((root / "LATE-ADDITIONS.json").read_text())["files"]
    for row in direct + late:
        check_file(root / row["path"], row)
    originals = []
    if args.originals:
        originals = json.loads((root / "SOURCE-FILES.json").read_text())["records"]
        omitted = json.loads((root / "OMITTED-LOCAL-GRAPH.json").read_text())
        originals += omitted["regularFiles"] + late
        for row in originals:
            check_file(Path(row["source"]), row)
        for row in omitted["links"]:
            path = Path(row["source"])
            if not path.is_symlink() or str(path.readlink()) != row["target"]:
                raise ValueError("Borrowed link changed: " + str(path))
    links = re.findall(r"\]\(([^)]+)\)", (root / "README.md").read_text())
    for link in links:
        if link.startswith(("http:", "https:", "#", "../")):
            continue
        if not (root / link.split("#", 1)[0]).exists():
            raise ValueError("Missing README target: " + link)
    print(json.dumps({"status": "PASS", "manifestPayloadFiles": len(files),
                      "directFiles": len(direct), "lateAdditions": len(late),
                      "originalFilesRehashed": len(originals),
                      "scope": "Read-only path/byte/link verification; no application or browser qualification."}, indent=2))


if __name__ == "__main__":
    main()
