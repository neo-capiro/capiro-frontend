#!/usr/bin/env python3
"""Compare receipts and independently re-read the pinned Git inventory; no archive mutation."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parent
REPO=Path('/workspace/capiro-p1-successor')
PIN='943d90c459998dac4ac90a462bf5a9c880d6a736'
ARCHIVE=Path('/tmp/capiro-source-943d90c/source-943d90c.zip')
sha=lambda raw:hashlib.sha256(raw).hexdigest()
canonical=json.loads((ROOT/'canonical-review-receipt.json').read_text())
creator=json.loads((ROOT/'creator-receipt.json').read_text())
independent=json.loads((ROOT/'independent-review-receipt.json').read_text())
bindings=json.loads((ROOT/'tool-bindings.json').read_text())
for name,digest in bindings.items():assert sha((ROOT/name).read_bytes())==digest
assert canonical==creator
spec=importlib.util.spec_from_file_location('independent',ROOT/'verify-source-zip.py');review=importlib.util.module_from_spec(spec);spec.loader.exec_module(review)
tree,files,_=review.committed_files(REPO,PIN)
web=review.git(REPO,'rev-parse',PIN+':apps/web').decode().strip()
src=review.git(REPO,'rev-parse',PIN+':apps/web/src').decode().strip()
assert canonical['commit']==independent['commit']==PIN
assert canonical['rootTree']==independent['tree']==tree=='f6ba34d27536feef6931a22ddde87781a8a0e966'
assert web=='79deadc9fd0c74c3634d3acc3b026a6ac9087ffe'
assert canonical['appSourceTree']==src=='32c0d89bf53037dbab4b611d7e25957b8b0caf9e'
assert canonical['archiveBytes']==independent['archiveBytes']==498170759
assert canonical['archiveSHA256']==independent['archiveSHA256']=='0f63187e7f4899060accfeed623c636c21b90b3dd27c497cea0b3bb7207efe06'
assert canonical['trackedBlobs']==independent['trackedBlobs']==len(files)==5005
assert len(canonical['files'])==len({item['path'] for item in canonical['files']})==len(files)
for item in canonical['files']:
 expected=files[item['path']]
 assert (item['mode'],item['bytes'],item['gitBlob'])==(expected['mode'],expected['size'],expected['object'])
normalized=[{key:item[key] for key in ('path','mode','bytes','sha256')} for item in sorted(canonical['files'],key=lambda item:item['path'])]
inventory_sha=sha(json.dumps(normalized,separators=(',',':'),ensure_ascii=True).encode())
assert inventory_sha==independent['independentManifestSHA256']
tracked_bytes=sum(item['bytes'] for item in canonical['files'])
assert tracked_bytes==independent['trackedPayloadBytes']
assert independent['zipMembers']==5006 and independent['verified']
comparison={'status':'PASS_FULL_SOURCE_IDENTITY','sourceCommit':PIN,'rootTree':tree,
'gitSubtrees':{'apps/web':web,'apps/web/src':src},'archivePath':str(ARCHIVE),
'archiveBytes':independent['archiveBytes'],'archiveSHA256':independent['archiveSHA256'],
'archiveFormat':'single-volume ZIP32, canonical accepted profile','trackedBlobs':len(files),
'zipMembers':independent['zipMembers'],'trackedPayloadBytes':tracked_bytes,
'perMemberInventorySHA256':inventory_sha,'allMemberPathModeSizeGitBlobAndSHA256Match':True,
'exactSourceMarkerVerified':True,'creatorAndFreshCanonicalReceiptsEqual':True,
'receipts':{name:{'sha256':sha((ROOT/name).read_bytes()),'bytes':(ROOT/name).stat().st_size} for name in ('creator-receipt.json','canonical-review-receipt.json','independent-review-receipt.json')},
'verifierBindings':bindings,'qualificationStatus':'PENDING_PARENT_GATES_NOT_ESTABLISHED_BY_ARCHIVE_VERIFICATION',
'priorArchivePreserved':{'commit':'49f6609c7277ce8701b0d38c3ba163860633e668','archiveSHA256':'d99017b116c1797d55e7d7bc25b6b19a7c85852c41914dbcb01c0b9b58c32fec','archiveBytes':496928201,'action':'not modified; new943d90c binding is separate'},
'cloudActions':[],'archiveWrites':False,'extraction':False,'sourceEdits':False}
(ROOT/'comparison.json').write_text(json.dumps(comparison,indent=2)+'\n')
(ROOT/'report.md').write_text(f'''Independent full-source archive verification passed for `943d90c459998dac4ac90a462bf5a9c880d6a736` using both the accepted canonical verifier and the separate frozen independent verifier.

- Archive: `/tmp/capiro-source-943d90c/source-943d90c.zip`
- Size: **498170759 bytes**
- SHA256: `0f63187e7f4899060accfeed623c636c21b90b3dd27c497cea0b3bb7207efe06`
- Tracked blobs: **5005**; ZIP members: **5006** including the exact source marker
- Tracked payload bytes: **{tracked_bytes}**
- Root tree: `f6ba34d27536feef6931a22ddde87781a8a0e966`
- `apps/web` tree: `79deadc9fd0c74c3634d3acc3b026a6ac9087ffe`
- `apps/web/src` tree: `32c0d89bf53037dbab4b611d7e25957b8b0caf9e`

Every path, Git mode, size, Git blob identity and SHA256 in the canonical manifest matches the independent result. The fresh canonical receipt exactly equals the creator receipt. Full normalized inventory SHA256 is `{inventory_sha}`. Both verifiers recomputed archive hashes around member validation on a held unbuffered descriptor and checked archive/path identity. No extraction occurred.

Accepted tool hashes remain unchanged: source utility `578d072953f898142392fa92437ab0ac207dadf8d093d6b88bfdcf7a02915882`, layout helper `1666011cab053d93ddd7feb2d95cb8283c069444cc507cc0f62d79f57fef1179`, independent verifier `dc4b13aaa05856c86bf989c58c54316bf4a0a6ff8a4b50bb0953672ccd566ee2`. Exact copies, complete receipts, comparison, replay log and hash manifest are retained here.

This new `943d90c` archive identity is separate from the preserved `49f6609` archive, whose SHA256 remains recorded as `d99017b116c1797d55e7d7bc25b6b19a7c85852c41914dbcb01c0b9b58c32fec`. No archive, application source or prior review evidence was overwritten.

**Qualification remains pending the parent's full gates.** This review establishes source identity only; it does not approve deployment or establish upload/transfer custody. No AWS, provider, upload, installation, browser or production action was performed. Recheck the bound archive hash at the next transfer/build boundary.
''')
print(json.dumps(comparison,indent=2))
