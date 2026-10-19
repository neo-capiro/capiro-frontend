#!/usr/bin/env python3
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import sys
import zipfile
import zlib
ROOT=Path(__file__).resolve().parent
CODE=Path('/workspace/capiro-p1-successor/docs/successor-p1-20261012/packaging')
sys.path.insert(0,str(CODE)); spec=importlib.util.spec_from_file_location('candidate',CODE/'source_archive.py');candidate=importlib.util.module_from_spec(spec);spec.loader.exec_module(candidate)
COMMIT='d46507df37c8cf2cbdd2b973f39b751a369a0746'
with zipfile.ZipFile(ROOT/'synthetic-zips/valid.zip') as z:rows=[(copy.copy(i),z.read(i)) for i in z.infolist()]
def field(kind,data):return struct.pack('<HH',kind,len(data))+data
unicode=field(0x7075,b'\x01'+struct.pack('<I',zlib.crc32(b'README.md'))+b'../unindexed-unicode.txt')
cases=[('no-extra',b'',True),('extended-mtime',field(0x5455,b'\x01'+struct.pack('<I',1720000000)),True),
 ('extended-three-times',field(0x5455,b'\x07'+struct.pack('<III',1720000000,1720000001,1720000002)),True),
 ('unicode-path-override',unicode,False),('unknown-extra',field(0x9999,b'abc'),False),
 ('unix-extra',field(0x000d,b'abc'),False),('ntfs-extra',field(0x000a,b'abc'),False),
 ('duplicate-extra',field(0x5455,b'\0')*2,False),('truncated-header',b'x',False),
 ('truncated-body',struct.pack('<HH',0x5455,99)+b'\0',False),
 ('invalid-timestamp-mask',field(0x5455,b'\x08'),False),
 ('invalid-timestamp-length',field(0x5455,b'\x01'),False),('empty-timestamp',field(0x5455,b''),False)]
results=[]
for name,extra,expected in cases:
 for placement in ('local','central','both'):
  path=ROOT/'synthetic-zips'/('extra-'+name+'-'+placement+'.zip')
  with zipfile.ZipFile(path,'w') as z:
   for original,data in rows:
    info=copy.copy(original)
    if info.filename=='README.md':info.extra=extra if placement in ('local','both') else b''
    z.writestr(info,data)
    if info.filename=='README.md':info.extra=extra if placement in ('central','both') else b''
  try:candidate.verify(ROOT/'synthetic-git',COMMIT,path);accepted=True;error=None
  except Exception as e:accepted=False;error=type(e).__name__+': '+str(e)
  results.append({'case':name+'-'+placement,'expectedAccept':expected,'accepted':accepted,'passed':expected==accepted,'error':error})
summary={'canonicalSHA256':hashlib.sha256((CODE/'source_archive.py').read_bytes()).hexdigest(),'layoutSHA256':hashlib.sha256((CODE/'zip_layout.py').read_bytes()).hexdigest(),'passed':sum(r['passed'] for r in results),'total':len(results),'results':results,'successorArchiveCreated':False,'cloudActions':[]}
(ROOT/'extra-profile-controls.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps({k:v for k,v in summary.items() if k!='results'},indent=2))
if any(not r['passed'] for r in results):raise SystemExit(1)
