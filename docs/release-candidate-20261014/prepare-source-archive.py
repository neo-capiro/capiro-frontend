#!/usr/bin/env python3
"""Prepare the existing pipeline's exact committed root ZIP; no network/AWS action."""
import argparse
import hashlib
import re
import subprocess
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("repository", type=Path)
parser.add_argument("commit")
parser.add_argument("output", type=Path)
args = parser.parse_args()
if not re.fullmatch(r"[a-f0-9]{40}", args.commit):
    parser.error("commit must be a full immutable Git SHA")
repository = args.repository.resolve(strict=True)
output = args.output.resolve()
if output.exists():
    parser.error("output already exists; choose a new artifact path")
git = ["git", "-C", str(repository)]
resolved = subprocess.check_output(git + ["rev-parse", args.commit + "^{commit}"], text=True).strip()
if resolved != args.commit:
    parser.error("commit does not resolve exactly")
output.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(git + ["archive", "--format=zip", "--output=" + str(output), args.commit], check=True)
with zipfile.ZipFile(output, "a", compression=zipfile.ZIP_DEFLATED, allowZip64=True) as archive:
    if "source-commit.txt" in archive.namelist():
        raise ValueError("committed root already contains source-commit.txt; inspect before proceeding")
    archive.writestr("source-commit.txt", args.commit + "\n")
    for required in ["package.json", "package-lock.json", "apps/web/Dockerfile", "apps/web/deployment/portfolio/buildspec.yml"]:
        archive.getinfo(required)
with output.open("rb") as artifact:
    digest = hashlib.file_digest(artifact, "sha256").hexdigest()
print(f"source={args.commit}\narchive={output}\nbytes={output.stat().st_size}\nsha256={digest}")
