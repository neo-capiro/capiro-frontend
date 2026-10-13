"""Read one original record from the publication without executing archived content."""
from pathlib import Path
import argparse,hashlib,json,os,zipfile
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('original_path');p.add_argument('--output',type=Path,required=True)
p.add_argument('--repository',type=Path,help='Repository holding exact vendor package; required for vendor records')
a=p.parse_args();root=Path(__file__).parent
m=json.loads((root/'ORIGINAL-PATH-MAP.json').read_text())
rows=[r for r in m['records'] if r['originalPath']==a.original_path]
if len(rows)!=1:raise SystemExit('Expected exactly one original path')
r=rows[0]
if r['storage']['kind']=='vendor':
 if a.repository is None:raise SystemExit('--repository is required for the vendor reference')
 v=json.loads((root/r['storage']['reference']).read_text());data=(a.repository/v['path']).read_bytes()
else:
 with zipfile.ZipFile(root/r['storage']['archive']) as z:data=z.read(r['storage']['member'])
if len(data)!=r['bytes'] or hashlib.sha256(data).hexdigest()!=r['sha256']:raise SystemExit('Stored bytes do not match original record')
if a.output.exists() or a.output.is_symlink():raise SystemExit('Refusing to replace an existing destination')
if r['kind']=='symlink':
 # Preserve a target as text for deliberate review; never follow or create it automatically.
 with a.output.open('xb') as f:f.write(data)
else:
 with a.output.open('xb') as f:f.write(data)
 os.chmod(a.output,r['mode'])
print(f'Verified {len(data)} bytes; kind={r["kind"]}; output={a.output}')
