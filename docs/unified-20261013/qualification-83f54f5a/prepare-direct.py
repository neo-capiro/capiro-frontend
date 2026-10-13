#!/usr/bin/env python3
"""Copy selected byte-exact entrypoints from the verified evidence archive."""
import argparse
import hashlib
import json
from pathlib import Path
import tarfile


def main():
    parser = argparse.ArgumentParser(description=__doc__, epilog="Exit 0: complete; 1: I/O or validation failure; 2: invalid CLI arguments. Original evidence is read-only.")
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    root = args.directory
    rows = json.loads((root / "SOURCE-FILES.json").read_text())["records"]
    selected = []
    for row in rows:
        path = Path(row["logicalPath"])
        top = len(path.parts) == 2
        final = row["group"] == "frozen_qualification"
        review = row["group"] == "independent_reviews"
        report = top and path.suffix in {".md", ".json", ".log", ".py", ".mjs"}
        small = row["bytes"] < 200_000
        figure = (final and path.suffix == ".png") or (
            "active-count-addendum" in path.parts[0] and top and path.suffix == ".png")
        portfolio_result = final and top and path.name.startswith("portfolio-") and path.suffix == ".json"
        failed_trace = row["group"] == "frozen_browser_artifacts" and path.suffix == ".zip"
        recovery_figure = path.parts[0].endswith("portfolio-enospc-case-rerun-v2-artifacts") and path.suffix == ".png"
        if (report and small and (final or review)) or figure or (
            final and top and path.name == "check.log") or portfolio_result or failed_trace or recovery_figure:
            selected.append(row)
    objects = {}
    for row in selected:
        objects.setdefault(row["sha256"], []).append(row)
    written = []
    with tarfile.open(root / "evidence-objects.tar.gz", "r|gz") as archive:
        for member in archive:
            sha = member.name.removeprefix("objects/")
            if sha not in objects:
                continue
            data = archive.extractfile(member).read()
            if hashlib.sha256(data).hexdigest() != sha:
                raise ValueError("Archive object mismatch")
            for row in objects[sha]:
                target = root / "direct" / row["logicalPath"]
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                written.append({"path": target.relative_to(root).as_posix(),
                                "source": row["source"], "bytes": len(data), "sha256": sha})
    if len(written) != len(selected):
        raise ValueError("Incomplete direct entrypoint set")
    (root / "DIRECT-FILES.json").write_text(json.dumps(sorted(written, key=lambda row: row["path"]), indent=2) + "\n")
    print(json.dumps({"files": len(written), "bytes": sum(row["bytes"] for row in written)}, indent=2))


if __name__ == "__main__":
    main()
