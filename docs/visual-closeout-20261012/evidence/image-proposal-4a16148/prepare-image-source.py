#!/usr/bin/env python3
"""Create the reviewed source ZIP locally. No upload, image build or AWS call.
Usage: python3 prepare-image-source.py CHECKOUT NEW_OUTPUT_ZIP
Existing output is refused. This recipe reproduces the archive identified in ARCHIVE.json.
Exit 0: reproduced; 1: runtime/hash failure; 2: invalid arguments or existing output.
"""
from pathlib import Path
import hashlib,json,subprocess,sys,zipfile
head='4a1614886fd98bb42d529f1ef59b3d01d7ff9173'
expected='252ccdf0d91d94a6b53e4a9d905534f2b4e325ef231481774154daa96bfacbf5'
if len(sys.argv)==2 and sys.argv[1]=='--help':print(__doc__);raise SystemExit(0)
if len(sys.argv)!=3:print(__doc__,file=sys.stderr);raise SystemExit(2)
checkout=Path(sys.argv[1]).resolve();p=Path(sys.argv[2]).resolve()
if p.exists():print('Existing output is preserved. Choose a fresh path.',file=sys.stderr);raise SystemExit(2)
p.parent.mkdir(parents=True,exist_ok=True)
subprocess.run(['git','-C',str(checkout),'archive','--format=zip','--output='+str(p),head],check=True)
with zipfile.ZipFile(p,'a') as z:
 i=zipfile.ZipInfo('source-commit.txt',date_time=(2026,10,12,0,0,0));i.compress_type=zipfile.ZIP_DEFLATED;i.external_attr=0o100644<<16;z.writestr(i,head+'\n')
with zipfile.ZipFile(p) as z:
 assert z.testzip() is None
 assert z.read('source-commit.txt').decode().strip()==head
sha=hashlib.sha256(p.read_bytes()).hexdigest()
print(json.dumps({'head':head,'path':str(p),'sha256':sha,'bytes':p.stat().st_size,'matchesReviewedArchive':sha==expected},indent=2))
if sha!=expected:raise SystemExit('Archive bytes differ from the reviewed receipt. Investigate; do not upload as that receipt.')
