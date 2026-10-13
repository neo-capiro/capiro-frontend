"""Copy final local repair evidence without following borrowed dependencies.

Usage: python preserve-evidence.py EXACT_SOURCE_COMMIT
Run only after all producers and qualification gates have completed. Existing
destination files must be identical; this script never deletes evidence.
"""
from pathlib import Path
import datetime
import hashlib
import json
import shutil
import subprocess
import sys

root = Path('/workspace/capiro-remaining')
source = subprocess.check_output(['git', 'rev-parse', sys.argv[1]], cwd=root).decode().strip()
assert len(source) == 40
base = root / 'docs/remaining-repairs-20261012'
folders = {
    'docker': Path('/tmp/capiro-remaining-docker-evidence'),
    'docker-independent-review': Path('/tmp/capiro-remaining-docker-independent-review'),
    'preservation-review': Path('/tmp/capiro-remaining-preservation-review'),
    'root': Path('/tmp/capiro-remaining-root-evidence'),
    'intake': Path('/tmp/capiro-remaining-intake-evidence'),
    'profile': Path('/tmp/capiro-remaining-profile-evidence'),
    'calendar': Path('/tmp/capiro-remaining-calendar-evidence'),
    'mail': Path('/tmp/capiro-remaining-mail-evidence'),
    'capabilities': Path('/tmp/capiro-remaining-capabilities-evidence'),
    'modules': Path('/tmp/capiro-remaining-modules-evidence'),
    'calendar-independent-review': Path('/tmp/capiro-remaining-calendar-independent-review'),
    'coordination': Path('/tmp/capiro-remaining-coordination'),
    'qualification': Path('/tmp/capiro-remaining-qualification'),
    'final-source-review-intake': Path('/tmp/capiro-remaining-final-source-review-intake'),
    'final-ledger-review': Path('/tmp/capiro-remaining-final-ledger-review'),
    'final-gate-review': Path('/tmp/capiro-remaining-final-gate-review'),
}
digest = lambda data: hashlib.sha256(data).hexdigest()
records, excluded, destinations = [], [], set()
for label, folder in folders.items():
    assert folder.is_dir(), folder
    for path in sorted(folder.rglob('*')):
        relative = path.relative_to(folder)
        if path.is_symlink():
            excluded.append({'source': str(path), 'reason': 'Borrowed dependency/reference link; never followed', 'target': str(path.readlink())})
            continue
        if not path.is_file():
            continue
        raw = path.read_bytes()
        stored_relative = Path(*('__literal_dot_git__' if part.casefold() == '.git' else part for part in relative.parts))
        if stored_relative != relative:
            assert not (folder / stored_relative).exists(), f'Reserved-path encoding collision: {stored_relative}'
        destination = base / 'evidence' / label / stored_relative
        assert destination not in destinations, f'Evidence destination collision: {destination}'
        destinations.add(destination)
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():
            assert destination.read_bytes() == raw, f'Evidence changed: {destination}'
        else:
            shutil.copy2(path, destination)
        assert digest(destination.read_bytes()) == digest(raw)
        records.append({'path': str(destination.relative_to(root)), 'source': str(path), 'sourceRelativePath': str(relative), 'encodedReservedGitPath': stored_relative != relative, 'bytes': len(raw), 'sha256': digest(raw), 'gitMode': '100755' if path.stat().st_mode & 0o111 else '100644'})
manifest = {'sourceCommit': source, 'createdUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'records': records, 'fileCount': len(records), 'bytes': sum(row['bytes'] for row in records), 'excludedLinks': excluded, 'notes': ['Every regular file under each named final evidence folder is preserved, including failed/setup attempts, source capsules and harness outputs.', 'Borrowed links are recorded without copying installed dependencies.', 'Literal .git path components in synthetic Docker fixtures are stored as __literal_dot_git__ to satisfy Git path rules. Original relative/full source paths remain in every manifest record; bytes are unchanged, and encoding collisions are refused.', 'This manifest does not hash itself. Committed/index verification is a separate receipt.']}
target = base / 'EVIDENCE-MANIFEST.json'
assert not target.exists(), 'Use a new manifest name instead of replacing a prior preservation receipt'
target.write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'files': manifest['fileCount'], 'bytes': manifest['bytes'], 'manifestSha256': digest(target.read_bytes()), 'excludedLinks': len(excluded)}))
