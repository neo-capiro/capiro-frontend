"""The source seal must reject changed bytes even when ZIP names and sizes match."""

import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path


VERIFIER = Path(__file__).with_name("verify-preview-archive.py")


class ArchiveVerifierTest(unittest.TestCase):
    def test_accepts_exact_tree_and_rejects_same_length_tamper(self) -> None:
        temp_root = Path(tempfile.gettempdir()).resolve()
        with tempfile.TemporaryDirectory(prefix="capiro-preview-archive-") as name:
            root = Path(name).resolve()
            self.assertTrue(root.is_relative_to(temp_root))
            repo = root / "repo"
            repo.mkdir()
            subprocess.run(["git", "init", "--quiet", str(repo)], check=True)
            (repo / "sample.txt").write_bytes(b"good")
            subprocess.run(["git", "-C", str(repo), "add", "sample.txt"], check=True)
            tree = subprocess.check_output(
                ["git", "-C", str(repo), "write-tree"], text=True
            ).strip()
            marker = "a" * 40

            exact = root / "exact.zip"
            subprocess.run(
                ["git", "-C", str(repo), "archive", "--format=zip", f"--output={exact}", tree],
                check=True,
            )
            accepted = subprocess.run(
                [sys.executable, str(VERIFIER), str(exact), str(repo), tree, marker, tree],
                capture_output=True,
                text=True,
            )
            self.assertEqual(accepted.returncode, 0, accepted.stderr)

            tampered = root / "tampered.zip"
            with zipfile.ZipFile(tampered, "w") as archive:
                archive.writestr("sample.txt", b"bad!")
            rejected = subprocess.run(
                [sys.executable, str(VERIFIER), str(tampered), str(repo), tree, marker, tree],
                capture_output=True,
                text=True,
            )
            self.assertNotEqual(rejected.returncode, 0)
            self.assertIn("Git blob mismatch: sample.txt", rejected.stderr)


if __name__ == "__main__":
    unittest.main()
