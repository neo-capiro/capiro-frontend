#!/usr/bin/env python3
"""Finalize the WIP capture with discovered ignored context and qualified history.

The initial manifest is retained byte-exact in gzip metadata. Existing packs are
never rewritten. This bounded handover migration refuses a previously finalized
package and records both capture boundaries.
"""
from __future__ import annotations

import argparse
import gzip
import io
import json
import os
from pathlib import Path
import shutil
import sys

from collect_context import (
    capture, discover_worktrees, fingerprint, now, select_files,
    stability_metadata, worktree_metadata, write_packs,
)
from context_common import (
    PreservationError, assert_no_symlink_ancestors, canonical_json, hash_file,
    inspect_manifest, sha256_bytes,
)
from scan_credentials import CredentialScanner


def cleanup_generated(path):
    if not path.exists():
        return
    if path.is_symlink() or path.name not in (".blob-staging", ".union-blob-staging"):
        raise PreservationError("Refusing cleanup outside generated blob staging")
    for _ in range(5):
        for child in list(path.iterdir()):
            if child.is_symlink() or not child.is_file() or (len(child.name) != 64 and child.name != "current-blob.tmp"):
                raise PreservationError("Unexpected object in generated staging")
            child.unlink(missing_ok=True)
        try:
            path.rmdir()
            return
        except OSError:
            pass
    raise PreservationError("Generated staging cleanup needs explicit review")


def finalize(args):
    package = Path(args.package).absolute()
    workspace = Path(args.workspace).absolute()
    manifest, initial_hash = inspect_manifest(package)
    if "unionCapture" in manifest:
        raise PreservationError("Package is already finalized; refusing mutation")
    prior_bytes = (package / "manifest.json").read_bytes()
    started = now()
    worktrees = discover_worktrees(workspace)
    before = {path.relative_to(workspace).as_posix(): worktree_metadata(path) for path in worktrees}
    selected, exclusions, missing = select_files(workspace, worktrees, before)
    existing = {record["path"]: record for record in manifest["files"]}
    if not set(existing).issubset(selected):
        raise PreservationError("Previously captured input is absent from final selection")
    staging = package / ".union-blob-staging"
    staging.mkdir(mode=0o700, exist_ok=False)
    additions = []
    identities = {}
    new_blobs = {}
    scanner = CredentialScanner()
    scanner.seen.update(manifest["blobs"])
    for index, (relative, categories) in enumerate(sorted(selected.items()), 1):
        source = workspace / relative
        if relative in existing:
            identities[relative] = fingerprint(source)
            record = existing[relative]
            if record["type"] == "file":
                if hash_file(source) != (record["sha256"], record["size"]):
                    raise PreservationError("Previously captured source bytes changed: " + relative)
            elif sha256_bytes(os.fsencode(os.readlink(source))) != record["sha256"]:
                raise PreservationError("Previously captured symlink changed")
        else:
            record, identities[relative] = capture(source, staging)
            record.update({"path": relative, "category": sorted(categories)})
            additions.append(record)
            if record["sha256"] not in manifest["blobs"]:
                new_blobs[record["sha256"]] = record["size"]
                scanner.scan((staging / record["sha256"]).read_bytes(), relative, record["sha256"])
        if index % 5000 == 0 or index == len(selected):
            print(json.dumps({"stage": "union-capture", "checked": index, "total": len(selected), "addedPaths": len(additions)}), flush=True)
    after = {path.relative_to(workspace).as_posix(): worktree_metadata(path) for path in discover_worktrees(workspace)}
    after_selected, _, after_missing = select_files(workspace, worktrees, after)
    if selected != after_selected or missing != after_missing:
        raise PreservationError("Final context selection changed during union capture")
    if {k: stability_metadata(k, v) for k, v in before.items()} != {k: stability_metadata(k, v) for k, v in after.items()}:
        raise PreservationError("Final Git source state changed during union capture")
    for relative, original in identities.items():
        if fingerprint(workspace / relative) != original:
            raise PreservationError("Source changed during union capture: " + relative)
    stable_at = now()
    metadata = manifest["metadata"]
    def save_metadata(relative, data, category):
        path = package / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("xb") as output:
            output.write(data)
        metadata.append({"path": relative, "sha256": sha256_bytes(data), "size": len(data), "category": category})
    compressed_manifest = io.BytesIO()
    with gzip.GzipFile(filename="", fileobj=compressed_manifest, mode="wb", mtime=0) as archive:
        archive.write(prior_bytes)
    save_metadata("metadata/initial-context-manifest.json.gz", compressed_manifest.getvalue(), "unchanged-historical-initial-manifest")
    for key, value in before.items():
        save_metadata("metadata/union-working-state/" + key + "/ignored-root-paths.z",
                      value["ignored-root-paths.z"], "ignored-context-discovery")
        save_metadata("metadata/union-working-state/" + key + "/status-porcelain-v2.z",
                      value["status-porcelain-v2.z"], "exact-additional-capture-git-status")
    supplemental_scan = scanner.report()
    save_metadata("metadata/ignored-context-credential-scan.json", canonical_json(supplemental_scan), "value-free-credential-review")
    history = Path(args.history_bundle).absolute()
    assert_no_symlink_ancestors(history)
    history_hash, history_size = hash_file(history)
    history_receipt = Path(args.history_receipt).read_bytes()
    save_metadata("metadata/qualified-history-restoration.json", history_receipt, "root-qualified-history-receipt")
    old_history = manifest["sourceHistoryBundle"]
    manifest["sourceHistoryBundle"] = {
        "reference": args.history_reference, "sha256": history_hash, "size": history_size,
        "requiresPublishedBaseCommit": args.required_base, "notEmbeddedInPacks": True,
        "qualificationReceipt": "metadata/qualified-history-restoration.json",
        "historicalInitialBundle": {**old_history, "qualification": "Historical all-refs capture; not independently self-contained because original repository is shallow. Do not use as primary recovery bundle."},
    }
    added_packs, added_blobs = write_packs(package, staging, new_blobs, manifest["summary"]["targetUncompressedPackBytes"], len(manifest["packs"]))
    manifest["packs"].extend(added_packs)
    manifest["blobs"].update(added_blobs)
    manifest["files"] = sorted([*manifest["files"], *additions], key=lambda item: item["path"])
    manifest["metadata"] = sorted(metadata, key=lambda item: item["path"])
    manifest["selectionPolicy"]["ignoredWorktreePolicy"] = "All tracked working and untracked nonignored files, all outputs/ and every other ignored context root/file (including apps/web/work and test-results), except explicit installed/build/auth/new-handover exclusions."
    manifest["selectionPolicy"]["additionalBuildExclusion"] = "*.tsbuildinfo is reproducible incremental compiler cache; source, configuration and qualification logs are retained."
    manifest["selectionPolicy"]["sourceHistoryPolicy"] = "Primary history bundle is verified against the required published base02c02d9; historical allrefs bundle is preserved separately and not claimed independently self-contained."
    manifest["selectionPolicy"]["encountered"] = [{"path": key, "reason": value} for key, value in sorted(exclusions.items())]
    original_scan = json.loads((package / manifest["credentialScan"]["path"]).read_text())
    combined_scan = {
        "path": "metadata/credential-scan.json", "supplementalPath": "metadata/ignored-context-credential-scan.json",
        "candidateCount": len(original_scan["findings"]) + len(supplemental_scan["findings"]),
        "coverageLimitCount": len(original_scan["coverageLimits"]) + len(supplemental_scan["coverageLimits"]),
        "disposition": "ROOT_REVIEW_REQUIRED" if original_scan["findings"] or original_scan["coverageLimits"] or supplemental_scan["findings"] or supplemental_scan["coverageLimits"] else "NO_CANDIDATES_FOUND_WITHIN_RECORDED_SCAN",
    }
    manifest["credentialScan"] = combined_scan
    manifest["unionCapture"] = {
        "startedAt": started, "stabilityCheckedAt": stable_at,
        "initialManifestSha256": initial_hash, "initialManifestPreservedAt": "metadata/initial-context-manifest.json.gz",
        "additionalPaths": len(additions), "additionalBlobs": len(added_blobs), "additionalPacks": len(added_packs),
        "existingPackBytesChanged": False, "allPriorSourceBytesRechecked": True,
        "reason": "Root confirmed ignored work/test-results are context; root supplied a base-dependent history bundle qualified by isolated restoration.",
        "initialRunQualification": "Initial collector wrote complete manifest/packs then reported directory-not-empty only while deleting generated blob staging. This finalizer verifies those files and removes only generated staging. No original source/evidence was deleted or rewritten.",
    }
    manifest["summary"].update({
        "files": len(manifest["files"]), "uniqueBlobs": len(manifest["blobs"]),
        "originalBytes": sum(item["size"] for item in manifest["files"]),
        "uniqueBytes": sum(item["size"] for item in manifest["blobs"].values()),
        "compressedPackBytes": sum(item["size"] for item in manifest["packs"]), "packCount": len(manifest["packs"]),
    })
    encoded = canonical_json(manifest)
    digest = sha256_bytes(encoded)
    # The WIP manifest is the only replacement; its exact preimage is retained above.
    (package / "manifest.json").write_bytes(encoded)
    (package / "manifest.sha256").write_text(digest + "  manifest.json\n", encoding="ascii")
    cleanup_generated(staging)
    cleanup_generated(package / ".blob-staging")
    return {"finalized": True, "manifestSha256": digest, **manifest["summary"], "credentialScan": combined_scan}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package")
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--history-bundle", required=True)
    parser.add_argument("--history-receipt", required=True)
    parser.add_argument("--history-reference", required=True)
    parser.add_argument("--required-base", required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(finalize(args), sort_keys=True))
    except (PreservationError, OSError, ValueError, KeyError) as error:
        print("Finalization refused: " + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
