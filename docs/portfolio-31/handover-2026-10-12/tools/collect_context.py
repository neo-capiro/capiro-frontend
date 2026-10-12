#!/usr/bin/env python3
"""Collect exact worktree/context bytes only after the recorded owner READY."""
from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import datetime, timezone
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tarfile

from context_common import (
    CHUNK, FORMAT, PreservationError, assert_no_symlink_ancestors, canonical_json,
    checked_relative, hash_file, sha256_bytes,
)
from scan_credentials import CredentialScanner

BLOCKED_COMPONENTS = {".git", "node_modules", ".next", "__pycache__", "handover-preparation", "handover-output", "handover-2026-10-12"}
EXPLICIT_EXCEPTION = "handover-preparation/integrate-frozen.py"
RUNTIME_PREFIXES = (
    "browser-runtime/runtime", "browser-runtime/node_modules", "cli-runtime/aws",
    "cli-runtime/bin", "cli-runtime/auth-github", "cli-runtime/gnupg",
    "cli-runtime/downloads/aws-package",
)
GIT_COMMANDS = {
    "head.txt": ["rev-parse", "HEAD"],
    "branch.txt": ["symbolic-ref", "--quiet", "HEAD"],
    "status-porcelain-v2.z": ["status", "--porcelain=v2", "-z", "--untracked-files=all"],
    "status.txt": ["status", "--short", "--branch", "--untracked-files=all"],
    "index-stage.z": ["ls-files", "--stage", "-z"],
    "tracked-paths.z": ["ls-files", "--cached", "-z"],
    "untracked-nonignored-paths.z": ["ls-files", "--others", "--exclude-standard", "-z"],
    "ignored-root-paths.z": ["ls-files", "--others", "--ignored", "--exclude-standard", "--directory", "-z"],
    "diff-working.patch": ["diff", "--no-ext-diff", "--no-textconv", "--binary", "--full-index", "--no-color"],
    "diff-staged.patch": ["diff", "--cached", "--no-ext-diff", "--no-textconv", "--binary", "--full-index", "--no-color"],
    "diff-head.patch": ["diff", "HEAD", "--no-ext-diff", "--no-textconv", "--binary", "--full-index", "--no-color"],
    "worktree-list.z": ["worktree", "list", "--porcelain", "-z"],
}


def now():
    return datetime.now(timezone.utc).isoformat()


def git(worktree, arguments, allow_detached=False):
    command = ["git", "--no-optional-locks", "-c", "core.quotepath=false", "-C", str(worktree), *arguments]
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
                            env={**os.environ, "GIT_OPTIONAL_LOCKS": "0", "LC_ALL": "C"})
    if result.returncode and not (allow_detached and result.returncode == 1):
        raise PreservationError("Read-only Git command failed in " + worktree.name + ": " + arguments[0])
    return result.stdout


def exclude_reason(relative):
    if relative == EXPLICIT_EXCEPTION:
        return None
    parts = Path(relative).parts
    if ".git" in parts:
        return "Git administrative data; separate source-history bundle preserves object history"
    if "handover-2026-10-12" in parts or any(p in parts for p in ("handover-preparation", "handover-output")):
        return "New handover outputs/preparation published separately; prevents recursive capture"
    if "node_modules" in parts or ".next" in parts or "__pycache__" in parts:
        return "Installed dependency/build/bytecode output; lockfiles and logs remain included"
    if relative.endswith(".tsbuildinfo") and not any(part in parts for part in ("outputs", "work", "test-results")):
        return "Reproducible TypeScript incremental-build cache; source, config and qualification logs retained"
    if any(relative == prefix or relative.startswith(prefix + "/") for prefix in RUNTIME_PREFIXES):
        return "Installed runtime or credential store; public provenance is separately retained"
    if relative.startswith("cli-runtime/downloads/") and relative.endswith((".zip", ".tar.gz", ".tgz")):
        return "Downloaded installable CLI binary archive"
    return None


def walk_files(root, workspace, exclusions, stop_worktrees=()):
    if not root.exists() and not root.is_symlink():
        return
    if root.is_file() or root.is_symlink():
        yield root
        return
    for base, dirs, files in os.walk(root, topdown=True, followlinks=False):
        base_path = Path(base)
        keep = []
        for name in sorted(dirs):
            path = base_path / name
            relative = path.relative_to(workspace).as_posix()
            reason = exclude_reason(relative)
            if reason:
                exclusions[relative] = reason
            elif path in stop_worktrees:
                continue
            elif path.is_symlink():
                yield path
            else:
                keep.append(name)
        dirs[:] = keep
        for name in sorted(files):
            path = base_path / name
            relative = path.relative_to(workspace).as_posix()
            reason = exclude_reason(relative)
            if reason:
                exclusions[relative] = reason
            else:
                yield path


def discover_worktrees(workspace):
    seeds = []
    for base, dirs, files in os.walk(workspace, topdown=True, followlinks=False):
        path = Path(base)
        if ".git" in dirs or ".git" in files:
            seeds.append(path)
            dirs[:] = []
            continue
        dirs[:] = [name for name in sorted(dirs)
                   if not (path / name).is_symlink()
                   and not exclude_reason((path / name).relative_to(workspace).as_posix())]
    worktrees = set()
    for seed in seeds:
        for item in git(seed, ["worktree", "list", "--porcelain", "-z"]).split(b"\0"):
            if item.startswith(b"worktree "):
                path = Path(os.fsdecode(item[len(b"worktree "):])).absolute()
                try:
                    path.relative_to(workspace)
                except ValueError:
                    raise PreservationError("Registered worktree is outside requested workspace")
                if not path.exists():
                    raise PreservationError("Registered worktree is unavailable")
                assert_no_symlink_ancestors(path)
                worktrees.add(path)
    if not worktrees:
        raise PreservationError("No Git worktrees found; refusing an incomplete source inventory")
    return sorted(worktrees)


def worktree_metadata(worktree):
    return {name: git(worktree, arguments, name == "branch.txt") for name, arguments in GIT_COMMANDS.items()}


def stability_metadata(worktree_relative, captured):
    """Excluded newly authored handover files may vary, but source/index may not."""
    result = dict(captured)
    def included(encoded):
        return not exclude_reason(worktree_relative + "/" + os.fsdecode(encoded))
    result["untracked-nonignored-paths.z"] = b"\0".join(
        item for item in captured["untracked-nonignored-paths.z"].split(b"\0") if not item or included(item))
    if "ignored-root-paths.z" in captured:
        result["ignored-root-paths.z"] = b"\0".join(
            item for item in captured["ignored-root-paths.z"].split(b"\0") if not item or included(item.rstrip(b"/")))
    result["status-porcelain-v2.z"] = b"\0".join(
        item for item in captured["status-porcelain-v2.z"].split(b"\0")
        if not item.startswith(b"? ") or included(item[2:]))
    result["status.txt"] = b"\n".join(
        item for item in captured["status.txt"].split(b"\n")
        if not item.startswith(b"?? ") or included(item[3:]))
    return result


def select_files(workspace, worktrees, snapshots):
    selected = defaultdict(set)
    exclusions = {}
    missing = {}
    def add(path, category):
        relative = path.relative_to(workspace).as_posix()
        checked_relative(relative)
        reason = exclude_reason(relative)
        if reason:
            exclusions[relative] = reason
        else:
            selected[relative].add(category)
    for worktree in worktrees:
        key = worktree.relative_to(workspace).as_posix()
        missing[key] = []
        data = snapshots[key]
        tracked = set(filter(None, data["tracked-paths.z"].split(b"\0")))
        untracked = set(filter(None, data["untracked-nonignored-paths.z"].split(b"\0")))
        for collection, category in ((tracked, "worktree-tracked"), (untracked, "worktree-untracked-nonignored")):
            for encoded in sorted(collection):
                relative = os.fsdecode(encoded)
                checked_relative(relative)
                path = worktree / relative
                if not os.path.lexists(path):
                    if encoded in tracked:
                        missing[key].append(relative)
                    else:
                        raise PreservationError("Untracked file disappeared during inventory")
                elif path.is_dir() and not path.is_symlink():
                    raise PreservationError("Tracked Git submodule/directory needs separate explicit preservation")
                else:
                    add(path, category)
        for path in walk_files(worktree / "outputs", workspace, exclusions):
            relative = path.relative_to(worktree).as_posix()
            category = ("raw-evidence" if relative.startswith("outputs/evidence/") else
                        "handoff-archive" if relative.startswith("outputs/handoffs/") else "worktree-outputs-other")
            add(path, category)
        # Raw context also exists in ignored apps/web/work and test-results. Do
        # not equate "ignored" with "disposable"; retain every other ignored
        # file/root except explicit installed/build/auth/handover exclusions.
        for encoded in filter(None, data.get("ignored-root-paths.z", b"").split(b"\0")):
            relative = os.fsdecode(encoded).rstrip("/")
            checked_relative(relative)
            full_relative = key + "/" + relative
            reason = exclude_reason(full_relative)
            if reason:
                exclusions[full_relative] = reason
            elif relative == "outputs" or relative.startswith("outputs/"):
                continue
            else:
                for path in walk_files(worktree / relative, workspace, exclusions):
                    add(path, "additional-ignored-context")
    for path in walk_files(workspace, workspace, exclusions, set(worktrees)):
        add(path, "runtime-provenance" if path.relative_to(workspace).parts[0] in ("cli-runtime", "browser-runtime") else "top-level-context")
    exception = workspace / EXPLICIT_EXCEPTION
    if exception.is_file():
        add(exception, "explicit-preparation-context-exception")
    return dict(selected), exclusions, missing


def fingerprint(path):
    value = path.lstat()
    return (value.st_dev, value.st_ino, value.st_mode, value.st_size, value.st_mtime_ns, value.st_ctime_ns)


def capture(path, staging):
    before = fingerprint(path)
    mode = before[2]
    if stat.S_ISLNK(mode):
        data = os.fsencode(os.readlink(path))
        digest = sha256_bytes(data)
        size = len(data)
        kind = "symlink"
        destination = staging / digest
        if not destination.exists():
            destination.write_bytes(data)
    elif stat.S_ISREG(mode):
        assert_no_symlink_ancestors(path)
        digest = hashlib.sha256()
        size = 0
        temp = staging / "current-blob.tmp"
        flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
        with os.fdopen(os.open(path, flags), "rb") as source, temp.open("xb") as output:
            while block := source.read(CHUNK):
                digest.update(block)
                size += len(block)
                output.write(block)
        digest = digest.hexdigest()
        destination = staging / digest
        if destination.exists():
            temp.unlink()
        else:
            temp.rename(destination)
        kind = "file"
    else:
        raise PreservationError("Nonregular filesystem object requires review: " + str(path))
    if before != fingerprint(path):
        raise PreservationError("Source changed while being captured: " + str(path))
    return {"sha256": digest, "size": size, "mode": "0" + format(stat.S_IMODE(mode), "03o"), "type": kind}, before


def tar_size(sizes):
    raw = sum(512 + ((size + 511) // 512) * 512 for size in sizes) + 1024
    return ((raw + 10239) // 10240) * 10240


def write_packs(output, staging, unique, target, start_index=0):
    groups = []
    current = []
    for digest in sorted(unique):
        prospective = current + [digest]
        if current and tar_size([unique[h] for h in prospective]) > target:
            groups.append(current)
            current = []
        current.append(digest)
    if current:
        groups.append(current)
    (output / "packs").mkdir(exist_ok=bool(start_index))
    packs = []
    blobs = {}
    for offset, group in enumerate(groups, 1):
        index = start_index + offset
        relative = f"packs/context-{index:05d}.tar.gz"
        path = output / relative
        with path.open("xb") as raw, gzip.GzipFile(filename="", fileobj=raw, mode="wb", compresslevel=6, mtime=0) as compressed:
            with tarfile.open(fileobj=compressed, mode="w", format=tarfile.USTAR_FORMAT) as archive:
                for digest in group:
                    member = tarfile.TarInfo("sha256/" + digest)
                    member.size = unique[digest]
                    member.mode = 0o644
                    member.uid = member.gid = member.mtime = 0
                    member.uname = member.gname = ""
                    with (staging / digest).open("rb") as stream:
                        archive.addfile(member, stream)
                    blobs[digest] = {"size": unique[digest], "pack": relative, "member": member.name}
        packed_hash, packed_size = hash_file(path)
        packs.append({"path": relative, "sha256": packed_hash, "size": packed_size,
                      "tarBytes": tar_size([unique[h] for h in group]),
                      "payloadBytes": sum(unique[h] for h in group), "blobCount": len(group)})
        if offset % 10 == 0 or offset == len(groups):
            print(json.dumps({"stage": "packs", "completed": offset, "total": len(groups), "packNumber": index}), flush=True)
    return packs, blobs


def collect(args):
    workspace = Path(args.workspace).absolute()
    output = Path(args.output).absolute()
    assert_no_symlink_ancestors(workspace)
    assert_no_symlink_ancestors(output)
    if not args.ready_confirmation.strip():
        raise PreservationError("An explicit owner READY confirmation is required")
    if output.exists() or output.is_symlink():
        raise PreservationError("Output already exists; no overwrite or resnapshot in place")
    if not output.parent.is_dir():
        raise PreservationError("Output parent must already exist")
    history_path = Path(args.history_bundle).absolute()
    assert_no_symlink_ancestors(history_path)
    history_before = fingerprint(history_path)
    history_hash, history_size = hash_file(history_path)
    if not stat.S_ISREG(history_before[2]):
        raise PreservationError("History bundle is not a regular file")
    started = now()
    worktrees = discover_worktrees(workspace)
    snapshots = {path.relative_to(workspace).as_posix(): worktree_metadata(path) for path in worktrees}
    selected, exclusions, missing = select_files(workspace, worktrees, snapshots)
    if any(output == workspace / name or output in (workspace / name).parents for name in selected):
        raise PreservationError("Output directory is part of the selected context")
    output.mkdir(mode=0o700)
    staging = output / ".blob-staging"
    staging.mkdir(mode=0o700)
    records = []
    source_fingerprints = {}
    unique = {}
    representative = {}
    metadata = []
    scanner = CredentialScanner()
    def save_metadata(relative, data, category):
        checked_relative(relative)
        path = output / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("xb") as stream:
            stream.write(data)
        metadata.append({"path": relative, "sha256": sha256_bytes(data), "size": len(data), "category": category})
        return relative
    for index, (relative, categories) in enumerate(sorted(selected.items()), 1):
        record, identity = capture(workspace / relative, staging)
        record.update({"path": relative, "category": sorted(categories)})
        records.append(record)
        source_fingerprints[relative] = identity
        unique[record["sha256"]] = record["size"]
        representative.setdefault(record["sha256"], relative)
        if index % 5000 == 0 or index == len(selected):
            print(json.dumps({"stage": "capture", "completed": index, "total": len(selected), "uniqueBlobs": len(unique)}), flush=True)
    worktree_records = []
    for worktree in worktrees:
        relative = worktree.relative_to(workspace).as_posix()
        captured = snapshots[relative]
        paths = {}
        for name, data in sorted(captured.items()):
            paths[name] = save_metadata("metadata/worktrees/" + relative + "/" + name, data, "git-working-state")
        paths["missing-tracked-paths.json"] = save_metadata(
            "metadata/worktrees/" + relative + "/missing-tracked-paths.json",
            canonical_json(sorted(set(missing[relative]))), "deleted-tracked-paths")
        worktree_records.append({"path": relative, "head": captured["head.txt"].decode("ascii").strip(),
                                 "branch": captured["branch.txt"].decode("utf-8").strip() or None,
                                 "metadata": paths, "missingTrackedPaths": sorted(set(missing[relative])),
                                 "sourceHistoryReference": args.history_reference})
    # Re-evaluate all Git/file selections and identities before packaging the captured bytes.
    after_worktrees = discover_worktrees(workspace)
    after = {path.relative_to(workspace).as_posix(): worktree_metadata(path) for path in after_worktrees}
    after_selected, _, after_missing = select_files(workspace, after_worktrees, after)
    stable_before = {key: stability_metadata(key, value) for key, value in snapshots.items()}
    stable_after = {key: stability_metadata(key, value) for key, value in after.items()}
    if after_worktrees != worktrees or stable_after != stable_before or after_selected != selected or after_missing != missing:
        raise PreservationError("Workspace selection or Git working state changed during capture")
    for relative, before in source_fingerprints.items():
        if fingerprint(workspace / relative) != before:
            raise PreservationError("Source changed after capture: " + relative)
    if fingerprint(history_path) != history_before:
        raise PreservationError("History bundle changed during capture")
    stable_at = now()
    for index, digest in enumerate(sorted(unique), 1):
        scanner.scan((staging / digest).read_bytes(), representative[digest], digest)
        if index % 2000 == 0 or index == len(unique):
            print(json.dumps({"stage": "credential-scan", "completed": index, "total": len(unique), "candidateCount": len(scanner.findings)}), flush=True)
    for record in list(metadata):
        scanner.scan((output / record["path"]).read_bytes(), record["path"])
    scan = scanner.report()
    scan_path = save_metadata("metadata/credential-scan.json", canonical_json(scan), "value-free-credential-review")
    exclusion_policy = {
        "componentNames": sorted(BLOCKED_COMPONENTS), "runtimePrefixes": list(RUNTIME_PREFIXES),
        "binaryDownloadArchives": "cli-runtime/downloads/*.(zip|tar.gz|tgz)",
        "explicitException": EXPLICIT_EXCEPTION,
        "encountered": [{"path": key, "reason": value} for key, value in sorted(exclusions.items())],
        "ignoredWorktreePolicy": "All tracked working and untracked nonignored files; all outputs/ and every other ignored context file/root, including apps/web/work and test-results, except explicit installed/build/auth/handover exclusions.",
        "topLevelPolicy": "All files outside discovered worktrees and exclusions, including discovered context not on the initial requested list.",
        "sourceHistoryPolicy": "Git administration is excluded; root-owned history bundle is referenced separately. Its recorded prerequisite must be supplied for Git recovery.",
        "stabilityPolicy": "Exact recorded Git metadata is retained. Stability comparison excludes only untracked status/list entries whose paths are explicitly excluded; tracked HEAD/index/diffs and all selected file paths/identities must remain unchanged.",
    }
    save_metadata("metadata/selection-policy.json", canonical_json(exclusion_policy), "selection-and-exclusions")
    save_metadata("metadata/git-commands.json", canonical_json(GIT_COMMANDS), "read-only-git-command-inventory")
    packs, blobs = write_packs(output, staging, unique, args.pack_bytes)
    manifest = {
        "schemaVersion": 1, "format": FORMAT,
        "snapshot": {"originalWorkspace": str(workspace), "startedAt": started,
                     "sourceStabilityCheckedAt": stable_at, "packagingCompletedAt": now(),
                     "ownerReadyConfirmation": args.ready_confirmation},
        "sourceHistoryBundle": {"reference": args.history_reference, "sha256": history_hash, "size": history_size,
                                "requiresPublishedBaseCommit": args.required_base,
                                "notEmbeddedInPacks": True},
        "worktrees": worktree_records, "files": records, "blobs": blobs, "packs": packs,
        "metadata": sorted(metadata, key=lambda item: item["path"]),
        "credentialScan": {"path": scan_path, "disposition": scan["disposition"],
                           "candidateCount": len(scan["findings"]), "coverageLimitCount": len(scan["coverageLimits"])},
        "selectionPolicy": exclusion_policy,
        "summary": {"worktrees": len(worktrees), "files": len(records), "uniqueBlobs": len(unique),
                    "originalBytes": sum(record["size"] for record in records),
                    "uniqueBytes": sum(unique.values()), "compressedPackBytes": sum(pack["size"] for pack in packs),
                    "packCount": len(packs), "targetUncompressedPackBytes": args.pack_bytes,
                    "missingTrackedPaths": sum(len(set(items)) for items in missing.values()),
                    "symlinks": sum(record["type"] == "symlink" for record in records)},
        "restoration": {"explicitNewTargetRequired": True, "overwritesAllowed": False,
                        "gitAdministrativeStateRecreated": False, "specialModeBitsRestored": False,
                        "safeSymlinksRequireExplicitOption": True},
    }
    manifest_bytes = canonical_json(manifest)
    digest = sha256_bytes(manifest_bytes)
    (output / "manifest.json").write_bytes(manifest_bytes)
    (output / "manifest.sha256").write_text(digest + "  manifest.json\n", encoding="ascii")
    shutil.rmtree(staging)
    return {"collected": True, "output": str(output), "manifestSha256": digest,
            **manifest["summary"], "credentialReview": scan["disposition"],
            "credentialCandidates": len(scan["findings"]), "credentialCoverageLimits": len(scan["coverageLimits"])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--history-bundle", required=True)
    parser.add_argument("--history-reference", required=True)
    parser.add_argument("--required-base", help="Published Git base required by a thin/shallow-source recovery bundle")
    parser.add_argument("--ready-confirmation", required=True)
    parser.add_argument("--pack-bytes", type=int, default=8 * 1024 * 1024)
    args = parser.parse_args()
    try:
        if args.pack_bytes < 10240:
            raise PreservationError("Pack target must be at least one tar record")
        print(json.dumps(collect(args), sort_keys=True))
    except (PreservationError, OSError, ValueError, KeyError) as error:
        print("Collection refused: " + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
