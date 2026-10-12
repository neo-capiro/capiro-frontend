#!/usr/bin/env python3
"""Small synthetic qualification for preservation tools, never product source."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

from context_common import canonical_json, sha256_bytes


def main():
    tools = Path(__file__).absolute().parent
    base = Path(tempfile.mkdtemp(prefix="preservation-self-check-", dir=tools))
    workspace = base / "workspace"
    workspace.mkdir()
    repo = workspace / "repo"
    repo.mkdir()
    preparation = workspace / "handover-preparation"
    preparation.mkdir()
    checks = []
    def run(arguments, cwd=repo, ok=True):
        result = subprocess.run(arguments, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if (result.returncode == 0) != ok:
            raise RuntimeError("Unexpected synthetic command result: " + arguments[0] + ": " + result.stderr.decode("utf-8", "replace")[:500])
        return result
    run(["git", "init", "-b", "main"])
    (repo / ".gitignore").write_text("outputs/\nnode_modules/\n.next/\nwork/\ntest-results/\n*.tsbuildinfo\n")
    (repo / "tracked.txt").write_bytes(b"same exact bytes\n")
    (repo / "deleted.txt").write_text("deleted working file\n")
    (repo / "executable.sh").write_text("#!/bin/sh\nexit 0\n")
    os.chmod(repo / "executable.sh", 0o755)
    run(["git", "add", "."])
    run(["git", "-c", "user.name=Preservation self-check", "-c", "user.email=preservation@example.invalid", "commit", "-m", "synthetic baseline"])
    (repo / "deleted.txt").unlink()
    (repo / "untracked.txt").write_bytes(b"same exact bytes\n")
    (repo / "outputs/evidence").mkdir(parents=True)
    (repo / "outputs/evidence/retained-failure.json").write_text('{"passed":false}\n')
    (repo / "outputs/evidence/historical.tsbuildinfo").write_text("historical recorded compiler input\n")
    (repo / "work").mkdir()
    (repo / "work/context-notes.txt").write_text("ignored context must survive\n")
    (repo / "test-results").mkdir()
    (repo / "test-results/retained.json").write_text('{"passed":false}\n')
    (repo / "tsconfig.tsbuildinfo").write_text("reproducible live compiler cache\n")
    (repo / "node_modules").mkdir()
    (repo / "node_modules/excluded.bin").write_bytes(b"installed runtime")
    (workspace / "other-context.txt").write_text("context outside repositories\n")
    (preparation / "integrate-frozen.py").write_text("# exact metadata exception\n")
    history = preparation / "synthetic-history.bundle"
    run(["git", "bundle", "create", str(history), "--all"])
    def collect(name):
        output = preparation / name
        result = run([sys.executable, str(tools / "collect_context.py"), "--workspace", str(workspace),
                      "--output", str(output), "--history-bundle", str(history),
                      "--history-reference", "../history/synthetic-history.bundle",
                      "--ready-confirmation", "synthetic tool qualification only", "--pack-bytes", "20480"])
        return output, json.loads(result.stdout.splitlines()[-1])
    package, collected = collect("context-a")
    manifest = json.loads((package / "manifest.json").read_text())
    files = {record["path"]: record for record in manifest["files"]}
    assert files["repo/tracked.txt"]["sha256"] == files["repo/untracked.txt"]["sha256"]
    assert "repo/outputs/evidence/retained-failure.json" in files
    assert "repo/outputs/evidence/historical.tsbuildinfo" in files
    assert "repo/work/context-notes.txt" in files and "repo/test-results/retained.json" in files
    assert "repo/tsconfig.tsbuildinfo" not in files
    assert "other-context.txt" in files and "handover-preparation/integrate-frozen.py" in files
    assert not any("node_modules" in path for path in files)
    assert manifest["worktrees"][0]["missingTrackedPaths"] == ["deleted.txt"]
    checks.append("exact source, untracked, ignored evidence, other context, exclusions, dedup and deletion metadata")
    run([sys.executable, str(tools / "verify_context.py"), str(package),
         "--expected-manifest-sha256", collected["manifestSha256"], "--history-bundle", str(history)])
    checks.append("every pack/blob/metadata/manifest and separate Git bundle verified")
    target = base / "restored"
    run([sys.executable, str(tools / "restore_context.py"), str(package), "--target", str(target),
         "--expected-manifest-sha256", collected["manifestSha256"]])
    for relative, record in files.items():
        assert hashlib.sha256((target / relative).read_bytes()).hexdigest() == record["sha256"]
    assert (target / "repo/executable.sh").stat().st_mode & 0o777 == 0o755
    assert not (target / "repo/deleted.txt").exists() and not (target / "repo/.git").exists()
    checks.append("exact new-target restore, executable mode, no Git internals and deleted file remains absent")
    run([sys.executable, str(tools / "restore_context.py"), str(package), "--target", str(target)], ok=False)
    checks.append("existing target refused without overwrite")
    second, _ = collect("context-b")
    second_manifest = json.loads((second / "manifest.json").read_text())
    assert [p["sha256"] for p in manifest["packs"]] == [p["sha256"] for p in second_manifest["packs"]]
    checks.append("same exact inputs produce deterministic identical gzip/tar pack hashes")
    corrupted = preparation / "corrupt"
    shutil.copytree(package, corrupted)
    pack = corrupted / manifest["packs"][0]["path"]
    data = bytearray(pack.read_bytes()); data[-1] ^= 1; pack.write_bytes(data)
    run([sys.executable, str(tools / "verify_context.py"), str(corrupted)], ok=False)
    checks.append("changed compressed bytes refused")
    traversal = preparation / "traversal"
    shutil.copytree(package, traversal)
    bad = json.loads((traversal / "manifest.json").read_text())
    bad["files"][0]["path"] = "../escape"
    bad["files"].sort(key=lambda record: record["path"])
    encoded = canonical_json(bad)
    (traversal / "manifest.json").write_bytes(encoded)
    (traversal / "manifest.sha256").write_text(sha256_bytes(encoded) + "  manifest.json\n")
    refused_target = base / "refused"
    run([sys.executable, str(tools / "restore_context.py"), str(traversal), "--target", str(refused_target)], ok=False)
    assert not refused_target.exists()
    checks.append("traversal manifest refused before destination creation")
    (repo / "unsafe-link").symlink_to("../../outside")
    link_package, _ = collect("context-links")
    link_target = base / "link-refused"
    run([sys.executable, str(tools / "restore_context.py"), str(link_package), "--target", str(link_target)], ok=False)
    run([sys.executable, str(tools / "restore_context.py"), str(link_package), "--target", str(link_target), "--allow-safe-symlinks"], ok=False)
    assert not link_target.exists()
    checks.append("symlink opt-in and escaping-target refusal before creation")
    receipt = {"scope": "synthetic preservation tool self-check only", "passed": len(checks),
               "checks": checks, "evidenceRoot": str(base), "productSourceTouched": False,
               "browserBuildProviderOrNetworkCalls": False}
    path = tools / (sys.argv[1] if len(sys.argv) > 1 else "self-check-receipt.json")
    with path.open("xb") as output:
        output.write(canonical_json(receipt))
    print(json.dumps({"passed": len(checks), "receipt": str(path), "sha256": sha256_bytes(path.read_bytes())}))


if __name__ == "__main__":
    main()
