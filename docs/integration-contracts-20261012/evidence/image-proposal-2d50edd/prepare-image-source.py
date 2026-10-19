#!/usr/bin/env python3
"""Create the reviewed source ZIP locally. No upload, image build or AWS call.
Usage: python3 prepare-image-source.py CHECKOUT NEW_OUTPUT_ZIP
Existing output is refused. This recipe reproduces the archive identified in ARCHIVE.json.
"""
from pathlib import Path
import hashlib,json,subprocess,sys,zipfile
head='2d50edd8f3c5ea232db8e1338566f0667db4b4bd'
expected='260808301545f7b7abf6bbd648b70657226b6de49e8edfc8b688bfe329d94c59'
if len(sys.argv)!=3:raise SystemExit(__doc__)
checkout=Path(sys.argv[1]).resolve();p=Path(sys.argv[2]).resolve()
if p.exists():raise SystemExit('Existing output is preserved. Choose a fresh path.')
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
