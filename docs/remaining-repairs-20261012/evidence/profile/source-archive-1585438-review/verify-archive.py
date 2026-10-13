"""Read-only, bounded-memory ZIP/Git content-address verification; no extraction."""
from pathlib import Path, PurePosixPath
import collections
import datetime
import hashlib
import json
import subprocess
import time
import zipfile

ROOT = Path('/workspace/capiro-remaining')
ARCHIVE = Path('/workspace/capiro-source-archives/source-1585438/source-1585438.zip')
RECEIPT = ARCHIVE.with_name('SOURCE-ARCHIVE-RECEIPT.json')
OUT = Path(__file__).parent
SOURCE = '1585438295776604f23a5cb5ab592729f7c468ca'
EXPECTED_SHA = '0feb5ef3a18f4dffa872da5f733bb16eede65c8e2d3f25c0d13c136d4985bff1'
EXPECTED_BYTES = 841126268
EXPECTED_COUNT = 9191
EXPECTED_TREES = ['2c2236b9004b04f309dc0cdd9b360d8c6b97a2bd', '82cf7118a68c6ac45087a0198e1917fbd001cc6e', 'fa4ca7b5ca126f7bcdc1cf816584fa0303d61704']
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
started_mono = time.monotonic()
failures = []

def check(condition, message):
    if not condition:
        failures.append(message)

def git(*args, **kwargs):
    return subprocess.check_output(['git', *args], cwd=ROOT, **kwargs)

def sha_file(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

def metadata(path):
    value = path.stat()
    return {'bytes': value.st_size, 'mtimeNs': value.st_mtime_ns, 'inode': value.st_ino}

before_archive = metadata(ARCHIVE)
before_receipt = metadata(RECEIPT)
receipt_bytes = RECEIPT.read_bytes()
receipt_sha = hashlib.sha256(receipt_bytes).hexdigest()
receipt = json.loads(receipt_bytes)
trees = git('rev-parse', f'{SOURCE}^{{tree}}', f'{SOURCE}:apps/web', f'{SOURCE}:apps/web/src').decode().splitlines()
check(trees == EXPECTED_TREES, 'Frozen source tree identity mismatch')
check(git('rev-parse', '--show-object-format').decode().strip() == 'sha1', 'Unexpected Git object format')
check(receipt['commit'] == SOURCE, 'Receipt source mismatch')
check([receipt['rootTree'], receipt['applicationTree'], receipt['appSourceTree']] == trees, 'Receipt tree identity mismatch')
archive_sha = sha_file(ARCHIVE)
check(archive_sha == EXPECTED_SHA == receipt['archiveSHA256'], 'Archive SHA256 mismatch')
check(before_archive['bytes'] == EXPECTED_BYTES == receipt['archiveBytes'], 'Archive byte count mismatch')
print(json.dumps({'stage': 'archive-hash', 'sha256': archive_sha, 'bytes': before_archive['bytes'], 'failures': len(failures)}), flush=True)

tree_rows = []
for entry in git('ls-tree', '-r', '-t', '-z', SOURCE).split(b'\0'):
    if not entry:
        continue
    header, path = entry.split(b'\t', 1)
    mode, kind, oid = header.decode().split()
    tree_rows.append({'path': path.decode('utf8'), 'mode': mode, 'kind': kind, 'oid': oid})
blobs = {row['path']: row for row in tree_rows if row['kind'] == 'blob'}
directories = {row['path'] + '/' for row in tree_rows if row['kind'] == 'tree'}
check(all(row['kind'] in {'blob', 'tree'} for row in tree_rows), 'Unexpected submodule or other tree object')
check(len(blobs) == EXPECTED_COUNT == receipt['trackedBlobs'], 'Tracked blob count mismatch')
receipt_rows = {row['path']: row for row in receipt['files']}
check(len(receipt_rows) == len(receipt['files']) == len(blobs), 'Receipt paths are duplicated or incomplete')
check(set(receipt_rows) == set(blobs), 'Receipt path set differs from Git')
objects = sorted({row['oid'] for row in blobs.values()})
batch = subprocess.run(['git', 'cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'], cwd=ROOT, input=('\n'.join(objects) + '\n').encode(), stdout=subprocess.PIPE, check=True)
object_sizes = {}
for row in batch.stdout.decode().splitlines():
    oid, kind, size = row.split()
    check(kind == 'blob', f'Object is not a blob: {oid}')
    object_sizes[oid] = int(size)
check(set(object_sizes) == set(objects), 'Git object metadata coverage mismatch')

total_uncompressed = 0
mode_counts = collections.Counter()
zip_creator_counts = collections.Counter()
verified = 0
with zipfile.ZipFile(ARCHIVE) as archive, (OUT / 'MEMBER-VERIFICATION.jsonl').open('w') as records:
    infos = archive.infolist()
    names = [info.filename for info in infos]
    check(len(set(names)) == len(names), 'ZIP has duplicate entry names')
    check(archive.comment.decode() == SOURCE, 'ZIP comment source mismatch')
    check({info.filename for info in infos if not info.is_dir()} == set(blobs), 'ZIP file set differs from Git')
    check({info.filename for info in infos if info.is_dir()} == directories, 'ZIP directory set differs from Git')
    for info in infos:
        relative = PurePosixPath(info.filename)
        check(not relative.is_absolute() and '..' not in relative.parts and '\\' not in info.filename, f'Unsafe archive path: {info.filename}')
        check(not info.flag_bits & 1, f'Encrypted archive member: {info.filename}')
        zip_creator_counts[str(info.create_system)] += 1
        if info.is_dir():
            check(info.file_size == 0, f'Nonempty directory entry: {info.filename}')
            continue
        tracked = blobs[info.filename]
        mode_counts[tracked['mode']] += 1
        size = object_sizes[tracked['oid']]
        check(info.file_size == size, f'ZIP/Git size mismatch: {info.filename}')
        check(tracked['mode'] == '100644', f'Unexpected executable/symlink Git mode: {info.filename}')
        check(info.create_system == 0 and (info.external_attr >> 16) == 0 and not info.external_attr & 0x10, f'Unexpected ZIP file mode: {info.filename}')
        blob_hash = hashlib.sha1(f'blob {size}\0'.encode())
        content_hash = hashlib.sha256()
        count = 0
        with archive.open(info, 'r') as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                blob_hash.update(chunk)
                content_hash.update(chunk)
                count += len(chunk)
        # Reading every byte through ZipExtFile also validates its stored CRC.
        actual_blob = blob_hash.hexdigest()
        actual_sha = content_hash.hexdigest()
        row = receipt_rows[info.filename]
        check(actual_blob == tracked['oid'], f'ZIP content differs from Git blob: {info.filename}')
        check(count == size == row['bytes'], f'Receipt byte count mismatch: {info.filename}')
        check(row['gitBlob'] == actual_blob and row['sha256'] == actual_sha and row['mode'] == tracked['mode'], f'Receipt metadata mismatch: {info.filename}')
        records.write(json.dumps({'path': info.filename, 'mode': tracked['mode'], 'bytes': count, 'gitBlob': actual_blob, 'sha256': actual_sha, 'zipCRC32': f'{info.CRC:08x}', 'matchesFrozenGitBlob': actual_blob == tracked['oid'], 'matchesReceipt': row['sha256'] == actual_sha}, separators=(',', ':')) + '\n')
        total_uncompressed += count
        verified += 1
        if verified % 2000 == 0:
            print(json.dumps({'stage': 'members', 'verified': verified, 'uncompressedBytes': total_uncompressed, 'failures': len(failures)}), flush=True)

check(metadata(ARCHIVE) == before_archive, 'Archive stat changed during review')
check(metadata(RECEIPT) == before_receipt and sha_file(RECEIPT) == receipt_sha, 'Receipt changed during review')
result = {
    'status': 'PASS' if not failures else 'FAIL',
    'startedUTC': started,
    'endedUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'durationSeconds': time.monotonic() - started_mono,
    'source': SOURCE,
    'rootTree': trees[0],
    'applicationTree': trees[1],
    'runtimeSourceTree': trees[2],
    'archive': str(ARCHIVE),
    'archiveBytes': before_archive['bytes'],
    'archiveSHA256': archive_sha,
    'ownerReceipt': str(RECEIPT),
    'ownerReceiptSHA256': receipt_sha,
    'zipEntries': len(infos),
    'zipDirectories': len(directories),
    'trackedBlobs': len(blobs),
    'verifiedMembers': verified,
    'uncompressedBytes': total_uncompressed,
    'gitModeCounts': dict(mode_counts),
    'zipCreatorCounts': dict(zip_creator_counts),
    'method': 'Independent git ls-tree and cat-file metadata; streamed ZIP SHA256; each streamed member recomputed SHA1(blob <size>\\0 + content) against the frozen Git tree, SHA256 against owner receipt, and ZIP CRC. Exact path-set and directory-set equality; no extraction.',
    'archiveAndReceiptUnchanged': metadata(ARCHIVE) == before_archive and metadata(RECEIPT) == before_receipt,
    'extractedFiles': 0,
    'runtimeServerBuildSourceEdits': False,
    'qualification': 'Separate; Portfolio full browser gate remains pending. This is source archive integrity only.',
    'failures': failures,
}
(OUT / 'REVIEW.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({key: result[key] for key in ['status', 'verifiedMembers', 'archiveBytes', 'archiveSHA256', 'zipEntries', 'zipDirectories', 'durationSeconds', 'failures']}), flush=True)
raise SystemExit(0 if not failures else 1)
