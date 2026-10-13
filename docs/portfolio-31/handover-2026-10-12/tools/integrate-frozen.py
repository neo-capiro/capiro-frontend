"""Preserve the already reviewed Portfolio lane snapshots without modifying their bytes."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
from datetime import datetime, timezone

WORKSPACE = Path('/workspace/scratch/158b6018a5d3')
ROOT = WORKSPACE / 'capiro-frontend-portfolio'
OUT = ROOT / 'outputs/evidence/handover-preservation-20261012'
REGISTRY = 'scripts/architecture/reviewed-size-findings.json'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()

def require(value, message):
    if not value:
        raise RuntimeError(message)

def main():
    p2_path = WORKSPACE / 'capiro-portfolio-watchlist-current-state/outputs/evidence/watchlist-current-state-20261011/frozen-final/manifest.json'
    p3_path = WORKSPACE / 'capiro-portfolio-alert-channels/outputs/evidence/alert-channels-20261012/frozen-manifest.json'
    require(digest(p2_path) == 'b9027e5949bfdef32fe460f05eddb99f0cd5974630dad594ce477e63a24ae75f', 'P2 manifest changed')
    require(digest(p3_path) == 'c1162e5fc5f9f8fa759017480530e941d0ed32f0a63b37a72cf1a75f82fc67fc', 'P3 manifest changed')
    p2, p3 = json.loads(p2_path.read_text()), json.loads(p3_path.read_text())
    require(not git('status', '--porcelain'), 'Root must start clean')
    require(git('rev-parse', 'HEAD') == 'ff7eabf152bcc62d1e8a481d5165ae6d1ff9b7b2', 'Unexpected root HEAD')
    entries2 = [{**x, 'source': p2_path.parent / 'files' / x['file'], 'before': x['baseSha256'], 'after': x['sha256']} for x in p2['files'] + p2['reviewArtifacts']]
    entries3 = [{**x, 'source': Path(x['frozenPath']), 'before': x['beforeSha256'], 'after': x['afterSha256']} for x in p3['files']]
    all_entries = entries2 + entries3
    require(len({x['file'] for x in all_entries}) == len(all_entries), 'Unexpected owner overlap')
    for x in all_entries:
        require(digest(x['source']) == x['after'], 'Frozen mismatch: ' + x['file'])
        require(digest(ROOT / x['file']) == x['before'], 'Root preimage mismatch: ' + x['file'])
    for x in p2['canonicalReferences'] + p3['unchangedReferences']:
        require(digest(ROOT / x['file']) == x['sha256'], 'Canonical reference mismatch: ' + x['file'])
    producer = {x['file']: x['after'] for x in entries3}
    producer.update({x['file']: x['sha256'] for x in p3['unchangedReferences']})
    for x in p2['excludedProducerDependency']['files']:
        require(producer.get(x['file']) == x['sha256'], 'Excluded producer mismatch: ' + x['file'])
    facade = 'apps/web/src/features/portfolio/client-profile/read-public.ts'
    require(next(x['after'] for x in entries2 if x['file'] == facade) == p3['excludedPrerequisites'][0]['sha256'], 'Facade contract mismatch')
    reviews2 = json.loads((p2_path.parent / 'files' / p2['reviewArtifacts'][0]['file']).read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    receipts = []
    for lane, entries, reviews, manifest in [
        ('watchlist', entries2, reviews2, p2_path),
        ('alert-channels', entries3, p3['reviews'], p3_path),
    ]:
        before = git('rev-parse', 'HEAD')
        for x in entries:
            target = ROOT / x['file']
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(x['source'], target)
        registry_path = ROOT / REGISTRY
        registry = json.loads(registry_path.read_text())
        key = lambda x: (x['file'], x['kind'], x['symbol'])
        replacements = {key(x): x for x in reviews}
        require(len(replacements) == len(reviews), 'Duplicate review keys')
        updated = [replacements.pop(key(x), x) for x in registry]
        updated.extend(replacements.values())
        require(len({key(x) for x in updated}) == len(updated), 'Duplicate registry keys')
        registry_path.write_text(json.dumps(updated, indent=2) + '\n')
        for x in entries:
            require(digest(ROOT / x['file']) == x['after'], 'Copied-byte mismatch: ' + x['file'])
        subprocess.run(['git', 'diff', '--check'], cwd=ROOT, check=True)
        subprocess.run(['git', 'add', '--', *[x['file'] for x in entries], REGISTRY], cwd=ROOT, check=True)
        message = ('Preserve Portfolio ' + lane + ' continuation for session handover\n\n'
                   'Copy immutable lane bytes and exact cohesion reviews. This is source preservation, not final acceptance. '
                   'The Intel accepted-projection finding, PhoneVerification copy correction, Core-404 entry assertion and combined gates remain open. '
                   'No backend, merge, deployment or credential action is included.')
        subprocess.run(['git', 'commit', '-m', message], cwd=ROOT, check=True)
        receipt = {'recordedAt': datetime.now(timezone.utc).isoformat(), 'lane': lane, 'parent': before,
                   'commit': git('rev-parse', 'HEAD'), 'tree': git('rev-parse', 'HEAD^{tree}'),
                   'manifest': str(manifest.relative_to(WORKSPACE)), 'manifestSha256': digest(manifest),
                   'files': [{'file': x['file'], 'beforeSha256': x['before'], 'sha256': x['after']} for x in entries],
                   'cohesionReviews': reviews, 'qualification': 'Verbatim preservation and preimage/hash/diff checks only; lane receipts remain bound to their candidate files. No final combined acceptance.'}
        (OUT / (lane + '-integration.json')).write_text(json.dumps(receipt, indent=2) + '\n')
        receipts.append(receipt)
    require(not git('status', '--porcelain'), 'Root should be clean after source preservation')
    print(json.dumps([{'lane': x['lane'], 'commit': x['commit'], 'files': len(x['files'])} for x in receipts]))

if __name__ == '__main__':
    main()
