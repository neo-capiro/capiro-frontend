"""Inventory the final handover and check all preserved source bytes before publication."""
import argparse
import hashlib
import json
from pathlib import Path


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def inventory(repo, handover):
    source = json.loads((handover / 'SOURCE-INVENTORY.json').read_text())
    for entry in source['files']:
        path = repo / entry['path']
        assert path.is_file() and not path.is_symlink(), entry['path']
        data = path.read_bytes()
        assert sha256(data) == entry['sha256'], entry['path']
        assert len(data) == entry['bytes'], entry['path']
    excluded = ['DELIVERY-INVENTORY.json', 'PUBLICATION.json']
    files = []
    for path in sorted(handover.rglob('*')):
        assert not path.is_symlink(), str(path)
        if not path.is_file():
            continue
        relative = str(path.relative_to(handover))
        if relative in excluded:
            continue
        data = path.read_bytes()
        files.append({
            'path': relative, 'bytes': len(data),
            'sha256': sha256(data),
            'gitBlob': hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest(),
            'gitMode': '100755' if path.stat().st_mode & 0o111 else '100644',
        })
    return {
        'scope': 'Every direct handover file except the two explicitly named self/publication receipts; original context file paths and byte blobs are separately pinned by the immutable materialized context manifest.',
        'sourceCommit': source['sourceCommit'],
        'publishedEquivalentSourceCommit': source['publishedSourceCommit'],
        'sourceTree': source['sourceTree'],
        'unchangedSourceFilesVerified': len(source['files']),
        'contextManifestSha256': 'c23fb2a329d4a6c314ef41bec572603049e2601168579b86d2dd94bba4aa2575',
        'contextDeliverySha256': sha256((handover / 'context-delivery.json').read_bytes()),
        'exclusions': excluded,
        'exclusionReason': 'An inventory cannot include its own final hash; the later publication receipt records this inventory hash and the exact containing Git tree.',
        'fileCount': len(files),
        'totalBytes': sum(item['bytes'] for item in files),
        'files': files,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--handover', type=Path, required=True)
    args = parser.parse_args()
    repo, handover = args.repo.resolve(), args.handover.resolve()
    handover.relative_to(repo)
    result = inventory(repo, handover)
    output = handover / 'DELIVERY-INVENTORY.json'
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({key: result[key] for key in ['unchangedSourceFilesVerified', 'fileCount', 'totalBytes', 'contextManifestSha256', 'contextDeliverySha256']} | {'inventorySha256': sha256(output.read_bytes())}, indent=2))


if __name__ == '__main__':
    main()
