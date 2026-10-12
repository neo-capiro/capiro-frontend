"""Copy final preservation artifacts exactly and retain preparation history."""
from pathlib import Path
import gzip
import hashlib
import json
import shutil

PREP = Path('/workspace/scratch/158b6018a5d3/handover-preparation')
DEST = Path('/workspace/scratch/158b6018a5d3/capiro-frontend-portfolio/docs/portfolio-31/handover-2026-10-12')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

copied = []

def copy_exact(source, target):
    assert source.is_file() and not source.is_symlink()
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        assert sha(target) == sha(source), f'Conflicting existing file: {target}'
    else:
        shutil.copy2(source, target)
    assert sha(target) == sha(source)
    assert (source.stat().st_mode & 0o777) == (target.stat().st_mode & 0o777)
    copied.append({'source':str(source),'destination':str(target.relative_to(DEST)),'size':source.stat().st_size,'sha256':sha(source)})

for name in ['context_delivery.py', 'split_context.py', 'prepare_context.py', 'assemble-delivery.py']:
    copy_exact(PREP/name, DEST/'tools'/name)
for name in ['context-delivery.json','CONTEXT-DELIVERY.md']:
    copy_exact(PREP/name, DEST/name)
for name in ['context-delivery-qualification.json','context-delivery-ENOSPC-attempt.json','part-upload-receipts.json']:
    copy_exact(PREP/name, DEST/'receipts'/name)
copy_exact(PREP/'context-delivery-independent-review.json', DEST/'reviews/context-delivery-independent-review.json')
for source in sorted((PREP/'context-parts').iterdir()):
    copy_exact(source, DEST/'context-parts'/source.name)
for source in sorted((PREP/'context-delivery-packs-only').iterdir()):
    copy_exact(source, DEST/'history/context-delivery-packs-only'/source.name)
for source_name, target_name in [
    ('HANDOVER-draft.md','HANDOVER-prepublication-draft.md'),
    ('REFERENCE-INDEX.md','REFERENCE-INDEX-initial.md'),
    ('context-pack-upload-plan.json','context-pack-upload-plan-initial.json'),
]:
    copy_exact(PREP/source_name, DEST/'history'/target_name)

source_payload = PREP/'source-tree-payload.json'
packed_payload = DEST/'history/source-tree-payload.json.gz'
payload_bytes = source_payload.read_bytes()
compressed = gzip.compress(payload_bytes, compresslevel=9, mtime=0)
if packed_payload.exists():
    assert packed_payload.read_bytes() == compressed
else:
    packed_payload.write_bytes(compressed)
assert gzip.decompress(packed_payload.read_bytes()) == payload_bytes
receipt = {'description':'Exact source Git Data API tree payload retained as deterministic gzip; source bytes remain represented by the source publication tree and inventory as well.','originalName':source_payload.name,'originalSize':len(payload_bytes),'originalSha256':hashlib.sha256(payload_bytes).hexdigest(),'compressedPath':'history/source-tree-payload.json.gz','compressedSize':packed_payload.stat().st_size,'compressedSha256':sha(packed_payload),'losslessRoundTrip':True}
(DEST/'receipts/source-payload-preservation.json').write_text(json.dumps(receipt,indent=2)+'\n')
(DEST/'receipts/final-delivery-copy.json').write_text(json.dumps({'copies':copied,'allSourceAndDestinationHashesAndModesEqual':True},indent=2)+'\n')
print(json.dumps({'copied':len(copied),'gzipPayloadBytes':len(compressed),'deliverySha256':sha(DEST/'context-delivery.json'),'qualificationSha256':sha(DEST/'receipts/context-delivery-qualification.json')},indent=2))
