"""Read one preserved original; never execute or automatically follow its content."""
from pathlib import Path
import argparse,json,hashlib,zipfile,os
p=argparse.ArgumentParser(description=__doc__);p.add_argument('original_path');p.add_argument('--output',type=Path,required=True);a=p.parse_args();root=Path(__file__).parent
rows=[r for mp in sorted(root.glob('*PATH-MAP.json')) for r in json.loads(mp.read_text())['records'] if r['originalPath']==a.original_path]
if len(rows)>1 and len({(r['sha256'],r['bytes'],r['kind']) for r in rows})==1: rows=rows[:1]
if len(rows)!=1:raise SystemExit('Expected exactly one preserved original path')
r=rows[0]
with zipfile.ZipFile(root/r['storage']['archive']) as z:b=z.read(r['storage']['member'])
if len(b)!=r['bytes'] or hashlib.sha256(b).hexdigest()!=r['sha256']:raise SystemExit('Preserved bytes differ from original receipt')
if a.output.exists() or a.output.is_symlink():raise SystemExit('Refusing to replace an existing destination')
with a.output.open('xb') as f:f.write(b)
if r['kind']=='file':os.chmod(a.output,r['mode'])
print(f'Verified {len(b)} bytes; kind={r["kind"]}; output={a.output}')
