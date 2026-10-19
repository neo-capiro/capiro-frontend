#!/usr/bin/env python3
"""Package immutable published inputs; do not build, configure or deploy."""
import gzip
import hashlib
import json
import subprocess
import tarfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path('/workspace/capiro-preview-receiving-20261013')
OUT = Path(__file__).resolve().parent
SOURCE = '5ca42049325881782bc9d2ac557450d642eccee8'
TESTED = '5ca42049325881782bc9d2ac557450d642eccee8'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def sha(data):
    return hashlib.sha256(data).hexdigest()

assert git('rev-parse', 'HEAD').decode().strip() == SOURCE
assert git('status', '--porcelain', '--untracked-files=all') == b''
delta = git('diff', '--name-only', TESTED, SOURCE).decode().splitlines()
assert delta == []

# Root docs is explicitly excluded by the pinned .dockerignore. No custom
# Docker pattern interpreter is used: Docker still applies that complete file.
# Keep every other tracked top-level input, including nested feature/work.
ignore = git('show', f'{SOURCE}:.dockerignore')
assert b'\ndocs\n' in ignore
top = git('ls-tree', '--name-only', '-z', SOURCE).decode().split('\0')
top = [name for name in top if name and name != 'docs']
expected = {}
for row in git('ls-tree', '-rlz', SOURCE, '--', *top).split(b'\0'):
    if not row:
        continue
    meta, raw_name = row.split(b'\t', 1)
    mode, kind, oid, size = meta.decode().split()
    name = raw_name.decode()
    assert kind == 'blob' and mode in ('100644', '100755')
    assert not any(p in ('.git', 'node_modules', '.next', '.qa') for p in Path(name).parts)
    assert all(not (p == '.env' or p.startswith('.env.')) or p == '.env.example' for p in Path(name).parts)
    expected[name] = {'path': name, 'gitBlob': oid, 'gitMode': mode, 'bytes': int(size)}

archive = OUT / f'preview-receiving-build-inputs-{SOURCE[:12]}.tar.gz'
assert not archive.exists(), 'Preserve existing artifacts; choose a new output directory.'
proc = subprocess.Popen(['git', 'archive', '--format=tar', SOURCE, '--', *top], cwd=ROOT, stdout=subprocess.PIPE)
with archive.open('xb') as raw, gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=0) as compressed:
    while chunk := proc.stdout.read(1024 * 1024):
        compressed.write(chunk)
assert proc.wait() == 0

seen = set()
with tarfile.open(archive, 'r:gz') as tar:
    for member in tar:
        if member.isdir():
            continue
        assert member.isfile() and member.name in expected and member.name not in seen
        data = tar.extractfile(member).read()
        record = expected[member.name]
        blob = hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()
        assert blob == record['gitBlob'] and len(data) == record['bytes']
        assert bool(member.mode & 0o111) == (record['gitMode'] == '100755')
        record['sha256'] = sha(data)
        seen.add(member.name)
assert seen == set(expected)

manifest = {'source': SOURCE, 'files': [expected[name] for name in sorted(expected)]}
manifest_bytes = (json.dumps(manifest, indent=2) + '\n').encode()
(OUT / 'BUILD-INPUT-MANIFEST.json').write_bytes(manifest_bytes)
receipt = {
    'preparedUTC': datetime.now(timezone.utc).isoformat(),
    'source': SOURCE,
    'testedSource': TESTED,
    'applicationTree': git('rev-parse', f'{SOURCE}:apps/web').decode().strip(),
    'productionSourceTree': git('rev-parse', f'{SOURCE}:apps/web/src').decode().strip(),
    'onlyChangesSinceTestedSource': delta,
    'allNonDocumentationBuildInputsUnchanged': True,
    'archive': archive.name,
    'archiveBytes': archive.stat().st_size,
    'archiveSha256': sha(archive.read_bytes()),
    'manifestSha256': sha(manifest_bytes),
    'files': len(expected),
    'uncompressedFileBytes': sum(item['bytes'] for item in expected.values()),
    'everyArchiveMemberMatchedPinnedGitBlobAndExecutableMode': True,
    'dockerignoreSha256': sha(ignore),
    'dockerfileSha256': expected['apps/web/Dockerfile']['sha256'],
    'lockfileSha256': expected['package-lock.json']['sha256'],
    'backendContractSource': '111f269d749cae0249c2141779bd6d7deb93f45c',
    'platform': 'linux/amd64',
    'dockerfile': 'apps/web/Dockerfile',
    'baseImage': 'node:24.21.0-alpine3.23@sha256:9ec4a2e289874ed0d722e1772ec2de45d2801541db8612f3638b26f128c69ac2',
    'excluded': 'Root docs only, already excluded by the pinned Docker ignore file; source, evidence and Git were not deleted.',
    'applicationBuildPerformed': True,
    'imageBuiltOrPushed': False,
    'deploymentPerformed': False,
    'readOnlyActivationQualified': False,
    'nativeAcceptance': False,
}
assert git('rev-parse', 'HEAD').decode().strip() == SOURCE
assert git('status', '--porcelain', '--untracked-files=all') == b''
(OUT / 'BUILD-INPUTS.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt, indent=2))
