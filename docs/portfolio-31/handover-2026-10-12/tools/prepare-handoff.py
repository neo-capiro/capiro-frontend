"""Copy exact reviewable preservation artifacts; no product or historical evidence edits."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess

WORKSPACE = Path('/workspace/scratch/158b6018a5d3')
ROOT = WORKSPACE / 'capiro-frontend-portfolio'
PREP = WORKSPACE / 'handover-preparation'
DEST = ROOT / 'docs/portfolio-31/handover-2026-10-12'
SOURCE = '760dcc6c1179312c7f4b762e64cf3af1aad60c3e'

def copy(source, relative):
    target = DEST / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.read_bytes() != source.read_bytes():
        raise RuntimeError('Existing differing handover artifact: ' + str(target))
    shutil.copyfile(source, target)
    return {'path': relative, 'originalPath': str(source.relative_to(WORKSPACE)),
            'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'bytes': target.stat().st_size}

def main():
    DEST.mkdir(parents=True, exist_ok=True)
    copied = []
    for name in ['portfolio-local-history-through-760dcc6.bundle', 'local-history-bundle-receipt.json', 'local-history.log']:
        copied.append(copy(PREP / name, 'history/' + name))
    p = ROOT / 'outputs/evidence/handover-preservation-20261012'
    for name in ['source-publication-receipt.json', 'watchlist-integration.json', 'alert-channels-integration.json', 'meri-pr4-final-read.json', 'github-publication-preflight.json', 'github-cli-auth-status.json', 'github-cli-auth-status.log']:
        copied.append(copy(p / name, 'receipts/' + name))
    p = WORKSPACE / 'capiro-portfolio-alert-channels/outputs/evidence/watchlist-review-preservation-20261012'
    for name in ['REVIEW.md', 'review.json']:
        copied.append(copy(p / name, 'reviews/watchlist-accepted-projection-' + name))
    p = WORKSPACE / 'capiro-portfolio-file-arrival/outputs/evidence/core-109-alert-portable-proposal-20261012'
    for name in ['PR4-SOURCE-ADVANCE-20261012.md', 'portable-evidence-and-ledger-proposal.json', 'supplemental-selection-and-source-note.json', 'context-roots.json']:
        copied.append(copy(p / name, 'reviews/' + name))
    p = ROOT / 'outputs/evidence/portfolio-shared-integration-20261011'
    copied.append(copy(p / 'PHASE-GATES-20261012.md', 'planning/PHASE-GATES-20261012.md'))
    for name in ['alert-channels-independent-review-20261012.json', 'file-arrival-final-integration.json', 'final-helper-independent-review.json']:
        copied.append(copy(p / name, 'reviews/' + name))
    for name in ['run-final-checkpoint.py', 'assemble-portable-verification.py']:
        copied.append(copy(p / name, 'tools/' + name))
    copied.append(copy(PREP / 'integrate-frozen.py', 'tools/integrate-frozen.py'))
    checks = p / 'final-760dcc6/attempts/check-20261012T012155924364Z-f3e9fc9c'
    for source in sorted(checks.iterdir()):
        if source.is_file():
            copied.append(copy(source, 'verification/root-check/' + source.name))
    copied.append(copy(WORKSPACE / 'upload/Capiro-3.1-Portfolio-Audit (1).xlsx', 'references/Capiro-3.1-Portfolio-Audit.xlsx'))
    source_entries = []
    for line in subprocess.check_output(['git', 'ls-tree', '-rz', '--full-tree', SOURCE], cwd=ROOT).split(b'\0'):
        if not line:
            continue
        metadata, path_bytes = line.split(b'\t', 1)
        mode, kind, blob = metadata.decode().split()
        path = path_bytes.decode()
        data = subprocess.check_output(['git', 'cat-file', 'blob', blob], cwd=ROOT)
        source_entries.append({'path': path, 'mode': mode, 'type': kind, 'gitBlob': blob,
                               'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
    (DEST / 'SOURCE-INVENTORY.json').write_text(json.dumps({'sourceCommit': SOURCE,
        'publishedSourceCommit': 'abaeab37b36d60b3e5185755e1b2c9169d7c92f3',
        'sourceTree': '46417a01484727747b0a2d81b3b4f278285cb709', 'files': source_entries}, indent=2) + '\n')
    log = subprocess.check_output(['git', 'log', '--reverse', '--format=%H%x09%s',
                                  '02c02d95bdf3949662b9123f425271c6491ffdab..' + SOURCE], cwd=ROOT, text=True)
    lines = ['# Complete local continuation history', '',
             'The GitHub source commit is source-equivalent to the final local checkpoint. All original commits below remain recoverable in the complete history bundle; they were not replayed as separately authored GitHub commits.', '',
             '| Exact local commit | Work preserved |', '| --- | --- |']
    for row in log.splitlines():
        commit, message = row.split('\t', 1)
        lines.append('| `' + commit + '` | ' + message.replace('|', '\\|') + ' |')
    lines += ['', 'See [the bundle receipt](history/local-history-bundle-receipt.json) and [complete messages and parent references](history/local-history.log).', '']
    (DEST / 'SOURCE-COMMITS.md').write_text('\n'.join(lines))
    (DEST / 'DIRECT-ARTIFACTS.json').write_text(json.dumps(copied, indent=2) + '\n')
    print(json.dumps({'handoverDirectory': str(DEST), 'directArtifacts': len(copied), 'sourceFiles': len(source_entries)}))

if __name__ == '__main__':
    main()
