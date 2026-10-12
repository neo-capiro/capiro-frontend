#!/usr/bin/env python3
"""Read-only candidate review with tiny isolated ZIP controls; no application archive."""
import ast
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import struct
import sys
import zipfile

ROOT = Path(__file__).resolve().parent
CODE = Path('/workspace/capiro-p1-successor/docs/successor-p1-20261012/packaging')
sys.path.insert(0, str(CODE))
spec = importlib.util.spec_from_file_location('candidate', CODE / 'source_archive.py')
candidate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(candidate)
valid = ['README.md', '.gitattributes', 'apps/web/src/Name with spaces.ts', 'docs/COM10.txt',
         'docs/console.md', 'docs/nulled.txt', 'docs/café.md', 'a/b.c']
invalid = ['', '.', '..', './a', '../a', '/a', 'a//b', 'a/', 'a/../b', 'a/./b',
           'a\\b', 'C:/a', 'a:b', '\\server\\a', '.git/config', 'a/.GIT/config',
           'a\x00b', 'a\nb', 'a\x1fb', 'a<b', 'a>b', 'a"b', 'a|b', 'a?b', 'a*b',
           'a.', 'a ', 'a/b.', 'a/b ', 'CON', 'con.txt', 'PRN', 'AUX', 'NUL',
           'COM1', 'COM9.txt', 'LPT1', 'lpt9.log', 'COM¹.txt', 'COM²', 'LPT³.foo']
results=[]
for name in valid + invalid:
    expected = name in valid
    try: candidate.safe_path(name); accepted=True; error=None
    except ValueError as e: accepted=False; error=str(e)
    results.append({'case':'path:'+repr(name),'expectedAccept':expected,'accepted':accepted,
                    'passed':accepted==expected,'error':error})
# Same length metadata mutation after member verification, with timestamp checks
# intentionally made uninformative, proves the digest comparison is independent.
original=ROOT/'synthetic-zips/valid.zip'
race=ROOT/'synthetic-zips/same-length-metadata-race.zip'
raw=bytearray(original.read_bytes()); central=raw.index(b'PK\x01\x02')
old=struct.unpack_from('<I',raw,central+38)[0]
struct.pack_into('<I',raw,central+38,(0o100755<<16)|(old&0xffff))
replacement=bytes(raw)
assert len(replacement)==original.stat().st_size
race.write_bytes(original.read_bytes()); prior=race.stat()
exit_method=zipfile.ZipFile.__exit__; original_snapshot=candidate.snapshot
fired=False
def on_exit(self,*args):
    global fired
    result=exit_method(self,*args)
    race.write_bytes(replacement)
    os.utime(race,ns=(prior.st_atime_ns,prior.st_mtime_ns))
    fired=True
    return result
try:
    zipfile.ZipFile.__exit__=on_exit
    candidate.snapshot=lambda value: (0,)
    try:
        candidate.verify(ROOT/'synthetic-git','d46507df37c8cf2cbdd2b973f39b751a369a0746',race)
        accepted=True;error=None
    except ValueError as e:accepted=False;error=str(e)
finally:
    zipfile.ZipFile.__exit__=exit_method
    candidate.snapshot=original_snapshot
results.append({'case':'same-length-metadata-change-coarse-stat','expectedAccept':False,
                'accepted':accepted,'passed':not accepted and fired,'error':error,
                'sourceGitUnchanged':True,'mtimeRestored':race.stat().st_mtime_ns==prior.st_mtime_ns,
                'statChecksMockedUninformative':True,'bytesBefore':prior.st_size,'bytesAfter':race.stat().st_size})
# Unmodified verification under the same stat abstraction remains valid.
try:
    candidate.snapshot=lambda value: (0,)
    candidate.verify(ROOT/'synthetic-git','d46507df37c8cf2cbdd2b973f39b751a369a0746',original)
    accepted=True;error=None
except Exception as e:accepted=False;error=str(e)
finally:candidate.snapshot=original_snapshot
results.append({'case':'unchanged-source-and-archive-coarse-stat','expectedAccept':True,
                'accepted':accepted,'passed':accepted,'error':error})
architecture=[]
for path in [CODE/'source_archive.py',CODE/'zip_layout.py',ROOT/'verify-source-zip.py']:
    lines=path.read_text().splitlines(); tree=ast.parse('\n'.join(lines))
    functions=[{'name':n.name,'line':n.lineno,'nonblankLines':sum(bool(x.strip()) for x in lines[n.lineno-1:n.end_lineno])}
               for n in ast.walk(tree) if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef))]
    architecture.append({'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                         'nonblankLines':sum(bool(x.strip()) for x in lines),'functions':functions,
                         'newSizeThresholdSignals':[f for f in functions if f['nonblankLines']>80]})
result={'results':results,'passed':sum(r['passed'] for r in results),'total':len(results),
        'architecture':architecture,'nativeWindowsRun':False,'successorArchiveCreated':False,'cloudActions':[]}
(ROOT/'portable-race-controls.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ('results','architecture')},indent=2))
if any(not r['passed'] for r in results):raise SystemExit(1)
