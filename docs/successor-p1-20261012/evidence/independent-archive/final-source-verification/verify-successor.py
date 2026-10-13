#!/usr/bin/env python3
"""Independent read-only full-source check of the completed parent-selected archive."""
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import sys

ROOT=Path(__file__).resolve().parent
TOOL=ROOT/'final-tool-review/verify-source-zip.py'
EXPECTED_TOOL='dc4b13aaa05856c86bf989c58c54316bf4a0a6ff8a4b50bb0953672ccd566ee2'
PIN='49f6609c7277ce8701b0d38c3ba163860633e668'
REPO=Path('/workspace/capiro-p1-successor')
ARCHIVE=Path('/tmp/capiro-source-49f6609/source-49f6609.zip')
CANONICAL_RECEIPT=Path('/tmp/capiro-source-49f6609/SOURCE-ARCHIVE-RECEIPT.json')
OUT=ROOT/'final-source-verification'
sha=lambda value:hashlib.sha256(value).hexdigest()
assert sha(TOOL.read_bytes())==EXPECTED_TOOL
OUT.mkdir(exist_ok=False)
spec=importlib.util.spec_from_file_location('independent',TOOL);review=importlib.util.module_from_spec(spec);spec.loader.exec_module(review)
result=review.verify_zip(REPO,PIN,ARCHIVE)
(OUT/'independent-source-receipt.json').write_text(json.dumps(result,indent=2)+'\n')
raw=CANONICAL_RECEIPT.read_bytes();canonical=json.loads(raw)
(OUT/'canonical-source-receipt.json').write_bytes(raw)
tree,files,_=review.committed_files(REPO,PIN)
app=review.git(REPO,'rev-parse',PIN+':apps/web/src').decode().strip()
assert canonical['commit']==result['commit']==PIN
assert canonical['rootTree']==result['tree']==tree=='fb895410ba3be77003977d9d5fdf33f2a525c7c8'
assert canonical['appSourceTree']==app=='964c8c51b1449d303a9286cf902133d02c2e4301'
assert canonical['archiveSHA256']==result['archiveSHA256']=='d99017b116c1797d55e7d7bc25b6b19a7c85852c41914dbcb01c0b9b58c32fec'
assert canonical['archiveBytes']==result['archiveBytes']==496928201
assert canonical['trackedBlobs']==result['trackedBlobs']==len(files)==4862
assert len(canonical['files'])==len({i['path'] for i in canonical['files']})==4862
assert result['trackedPayloadBytes']==sum(i['bytes'] for i in canonical['files'])==584402937
for item in canonical['files']:
 expected=files[item['path']]
 assert (item['mode'],item['bytes'],item['gitBlob'])==(expected['mode'],expected['size'],expected['object'])
normalized=[{k:item[k] for k in ('path','mode','bytes','sha256')} for item in sorted(canonical['files'],key=lambda item:item['path'])]
manifest_hash=sha(json.dumps(normalized,separators=(',',':'),ensure_ascii=True).encode())
assert manifest_hash==result['independentManifestSHA256']
comparison={'status':'PASS_FULL_SOURCE_IDENTITY','commit':PIN,'rootTree':tree,'appSourceTree':app,
'archivePath':str(ARCHIVE),'archiveBytes':result['archiveBytes'],'archiveSHA256':result['archiveSHA256'],
'canonicalReceiptPath':str(CANONICAL_RECEIPT),'canonicalReceiptSHA256':sha(raw),
'independentVerifierSHA256':EXPECTED_TOOL,'trackedBlobs':4862,'trackedPayloadBytes':584402937,
'zipMembers':result['zipMembers'],'perMemberManifestSHA256':manifest_hash,'perMemberGitBlobModeSizeAndSHA256Match':True,
'exactSourceMarkerVerified':True,'qualification':'PARENT_OWNED_NOT_ESTABLISHED_BY_ARCHIVE_CHECK',
'archiveCreatedByReviewer':False,'archiveModifiedByReviewer':False,'extractionPerformed':False,'cloudActions':[]}
(OUT/'comparison.json').write_text(json.dumps(comparison,indent=2)+'\n')
shutil.copy2(TOOL,OUT/'verify-source-zip.py');shutil.copy2(Path(__file__),OUT/'verify-successor.py')
(OUT/'report.md').write_text('''# Independent successor archive verification

PASS: the selected new ZIP matches every tracked regular file and the exact source marker for commit `49f6609c7277ce8701b0d38c3ba163860633e668`.

- Archive: `/tmp/capiro-source-49f6609/source-49f6609.zip`
- Bytes: 496928201
- SHA256: `d99017b116c1797d55e7d7bc25b6b19a7c85852c41914dbcb01c0b9b58c32fec`
- Root tree: `fb895410ba3be77003977d9d5fdf33f2a525c7c8`
- Application source tree: `964c8c51b1449d303a9286cf902133d02c2e4301`
- Tracked blobs: 4862; tracked payload bytes: 584402937

The frozen independent verifier recomputed all Git blob identities and SHA256 payloads and checked every ZIP path, mode, size, content and marker without extraction. All per-member path/mode/size/Git-blob/SHA256 fields in the canonical receipt match the independent result. It verified the archive digest before and after checking on a held unbuffered descriptor and checked pathname identity.

This is a new explicit archive binding; it does not replace or modify the original4a archive. Source/application qualification and build/deployment admission remain separate, parent-owned gates. No upload, AWS, provider, Docker, extraction or archive mutation occurred during this review.
''')
print(json.dumps(comparison,indent=2))
