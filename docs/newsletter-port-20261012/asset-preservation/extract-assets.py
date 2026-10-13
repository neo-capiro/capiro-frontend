"""Verify pinned connector bytes before copying the immutable newsletter assets."""
from pathlib import Path
import base64, hashlib, json, datetime, subprocess
raw_root=Path('/tmp/capiro-newsletter-assets-20261012')
root=Path('/workspace/capiro-newsletter-port')
manifest=json.loads(Path('/tmp/capiro-newsletter-port-scope-20261012/asset-extraction-manifest.json').read_text())
expected={x['path']:x for x in manifest['entries']}
seen={}
for batch in sorted(raw_root.glob('batch-*.json')):
    for row in json.loads(batch.read_text()):
        path=row['path']
        assert path in expected and path not in seen, path
        reference=expected[path]
        raw=base64.b64decode(''.join(row['base64'].split()),validate=True)
        sha=hashlib.sha256(raw).hexdigest()
        blob=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
        assert len(raw)==reference['bytes']==row['bytes']
        assert sha==reference['sha256']==row['sha256']
        assert blob==reference['C']==reference['W']==row['blob']
        target=root/path
        assert not target.exists(), target
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(raw)
        assert target.read_bytes()==raw
        seen[path]={'path':path,'publicPath':reference['publicPath'],'bytes':len(raw),'gitBlob':blob,'sha256':sha}
assert seen.keys()==expected.keys() and len(seen)==179
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip()==manifest['frontendBase']
receipt={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'frontendBase':manifest['frontendBase'],'repository':'neo-capiro/capirov2','sourceCommit':manifest['sourceCommit'],'comparisonCommit':manifest['comparisonCommit'],'method':'Authorized GitHub connector fetch_file at exact C source with base64; decoded every byte and compared size/SHA-256/Git blob with pinned manifest and independent C/W directory identities','count':len(seen),'bytes':sum(x['bytes'] for x in seen.values()),'entries':list(seen.values()),'scope':'Static assets only. No rich UI, package, native/backend or deployed-origin acceptance.'}
dest=raw_root/'ASSET-BYTE-VERIFICATION.json'
assert not dest.exists()
dest.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'count':receipt['count'],'bytes':receipt['bytes'],'receiptSha256':hashlib.sha256(dest.read_bytes()).hexdigest()}))

