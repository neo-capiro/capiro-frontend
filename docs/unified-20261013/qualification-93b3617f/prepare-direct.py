#!/usr/bin/env python3
"""Publish selected unchanged human-readable entrypoints from verified objects."""
import hashlib
import json
from pathlib import Path
import sys
import tarfile


def main():
    if len(sys.argv) != 2 or sys.argv[1] in {"-h", "--help"}:
        print("Usage: prepare-direct.py PUBLICATION_DIRECTORY\nExit 0: complete/help; 1: validation/I/O failure; 2: invalid arguments. No original evidence is modified.")
        return 0 if len(sys.argv) == 2 else 2
    root = Path(sys.argv[1])
    rows = json.loads((root / "SOURCE-FILES.json").read_text())["records"]
    selected = []
    for row in rows:
        path = Path(row["logicalPath"])
        top = len(path.parts) == 2
        final = path.parts[0] == "capiro-unified-final-93b3617f-20261013"
        figures = path.parts[0] == "capiro-unified-figma-capture-plan-20261013"
        if ((final and (top or path.parts[1] == "figma-references"))
                or (row["group"] == "independent_reviews" and top)
                or (figures and (path.parts[1] == "captures" or path.name in {"REPORT.md", "A11Y-REPORT.md", "A11Y-SUMMARY.json"}))
                or (top and row["group"] in {"figures_and_failure_baselines", "bounded_fix_proposals"} and path.suffix in {".md", ".json"})):
            selected.append(row)
    by_hash = {}
    for row in selected:
        by_hash.setdefault(row["sha256"], []).append(row)
    written = []
    with tarfile.open(root / "evidence-objects.tar.gz", "r|gz") as archive:
        for member in archive:
            sha = member.name.removeprefix("objects/")
            if sha not in by_hash:
                continue
            content = archive.extractfile(member).read()
            if hashlib.sha256(content).hexdigest() != sha:
                raise ValueError("Object hash mismatch")
            for row in by_hash[sha]:
                target = root / "direct" / row["logicalPath"]
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(content)
                written.append({"path": target.relative_to(root).as_posix(), "source": row["source"], "bytes": len(content), "sha256": sha})
    if len(written) != len(selected):
        raise ValueError("Direct entrypoint set incomplete")
    (root / "DIRECT-FILES.json").write_text(json.dumps(sorted(written, key=lambda row: row["path"]), indent=2) + "\n")
    print(json.dumps({"files": len(written), "bytes": sum(row["bytes"] for row in written)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
