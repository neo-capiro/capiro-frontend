"""Stage only the requested repair documentation and manifest-listed proof.

Usage: python stage-evidence.py EXACT_SOURCE_COMMIT
Run after final evidence preservation, with qualification finished.
"""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess
import sys

root = Path('/workspace/capiro-remaining')
base = root / 'docs/remaining-repairs-20261012'
manifest_path = base / 'EVIDENCE-MANIFEST.json'
source = sys.argv[1]
def run(*args, data=None):
    return subprocess.check_output(['git', '--literal-pathspecs', *args], cwd=root, input=data)
assert run('rev-parse', 'HEAD').decode().strip() == source
manifest_raw = manifest_path.read_bytes()
manifest = json.loads(manifest_raw)
assert manifest['sourceCommit'] == source
control_files = {str((base / name).relative_to(root)) for name in ['.gitattributes', 'QUALIFICATION.md', 'HANDOVER.md', 'STRUCTURE-REVIEW.md', 'EVIDENCE-MANIFEST.json', 'PRESERVATION-VERIFICATION.json']}
allowed = {row['path'] for row in manifest['records']}
assert len(allowed) == len(manifest['records']), 'Evidence paths must be unique'
allowed_changes = allowed | control_files
def assert_document_scope():
    for command in [('diff', '--name-only', '-z', 'HEAD'), ('diff', '--cached', '--name-only', '-z', 'HEAD')]:
        paths = {p.decode() for p in run(*command).split(b'\0') if p}
        assert paths <= allowed_changes, f'Unexpected pending/staged paths: {paths - allowed_changes}'
assert_document_scope()
for row in manifest['records']:
    assert row['path'].startswith('docs/remaining-repairs-20261012/evidence/')
    raw = (root / row['path']).read_bytes()
    assert len(raw) == row['bytes']
    assert hashlib.sha256(raw).hexdigest() == row['sha256']
attributes = base / '.gitattributes'
assert attributes.read_bytes() == b'# Preserve original evidence bytes without line-ending conversion.\nevidence/** -text\n'
actual_evidence = {str(p.relative_to(root)) for p in (base / 'evidence').rglob('*') if p.is_file() or p.is_symlink()}
assert actual_evidence == allowed, f'Unmanifested or missing local evidence: {actual_evidence ^ allowed}'
existing_controls = sorted(path for path in control_files if (root / path).is_file())
run('add', '--', *existing_controls)
assert_document_scope()
paths = b''.join(row['path'].encode() + b'\0' for row in manifest['records'])
ignored_process = subprocess.run(['git', 'check-ignore', '-z', '--stdin'], cwd=root, input=paths, stdout=subprocess.PIPE)
assert ignored_process.returncode in [0, 1]
ignored = ignored_process.stdout
ignored_paths = [p.decode() for p in ignored.split(b'\0') if p]
assert set(ignored_paths) <= allowed
normal_paths = sorted(allowed - set(ignored_paths))
if normal_paths:
    run('add', '--pathspec-from-file=-', '--pathspec-file-nul', data=b''.join(path.encode() + b'\0' for path in normal_paths))
if ignored:
    run('add', '-f', '--pathspec-from-file=-', '--pathspec-file-nul', data=ignored)
entries = {}
for record in run('ls-files', '--stage', '-z', '--', 'docs/remaining-repairs-20261012').split(b'\0'):
    if not record:
        continue
    meta, path = record.decode().split('\t', 1)
    mode, oid, stage = meta.split()
    assert stage == '0'
    entries[path] = (mode, oid)
evidence_prefix = 'docs/remaining-repairs-20261012/evidence/'
indexed_evidence = {path for path in entries if path.startswith(evidence_prefix)}
assert indexed_evidence == allowed, f'Unmanifested or missing evidence: {indexed_evidence ^ allowed}'
for row in manifest['records']:
    mode, oid = entries[row['path']]
    raw = run('cat-file', 'blob', oid)
    assert mode == row['gitMode'], (row['path'], mode, row['gitMode'])
    assert len(raw) == row['bytes'] and hashlib.sha256(raw).hexdigest() == row['sha256']
assert_document_scope()
receipt = {
    'at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'sourceCommit': source,
    'manifestSha256': hashlib.sha256(manifest_raw).hexdigest(),
    'verifiedEvidenceRecords': len(manifest['records']),
    'verifiedBytes': manifest['bytes'],
    'forceAddedIgnoredProofPaths': ignored_paths,
    'sourceUnchanged': True,
    'scope': 'Every manifest-listed evidence blob and mode verified in Git index. This receipt and the manifest do not hash themselves; final commit verification is separate.',
}
target = base / 'PRESERVATION-VERIFICATION.json'
assert not target.exists()
target.write_text(json.dumps(receipt, indent=2) + '\n')
run('add', '--', str(target.relative_to(root)))
assert_document_scope()
print(json.dumps({'verifiedEvidenceRecords': len(manifest['records']), 'verifiedBytes': manifest['bytes'], 'forceAddedCount': len(ignored_paths), 'manifestSha256': receipt['manifestSha256']}))
