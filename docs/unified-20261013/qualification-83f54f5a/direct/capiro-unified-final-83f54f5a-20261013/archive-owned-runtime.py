import pathlib,tarfile,hashlib,json,datetime,shutil,os
root=pathlib.Path('/workspace/capiro-generated-preserved-20261013')
source=root/'next-93b3617f';archive=root/'next-93b3617f.tar.gz'
assert source.is_dir() and not archive.exists()
files={str(p.relative_to(source)): {'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in source.rglob('*') if p.is_file() and not p.is_symlink()}
links={str(p.relative_to(source)):os.readlink(p) for p in source.rglob('*') if p.is_symlink()}
with tarfile.open(archive,'w:gz',compresslevel=3) as t:t.add(source,arcname='next-93b3617f')
seen={};seenlinks={}
with tarfile.open(archive,'r:gz') as t:
 for m in t:
  n=m.name.removeprefix('next-93b3617f/')
  if m.isfile():
   b=t.extractfile(m).read();seen[n]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
  elif m.issym():seenlinks[n]=m.linkname
assert files==seen and links==seenlinks
receipt={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':str(source),'archive':str(archive),'archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'archiveBytes':archive.stat().st_size,'files':files,'links':links,'verified':True,'scope':'Owned inactive93 generated runtime preservation copy only; original source and qualification reports untouched. Every regular byte and symlink target checked before retiring duplicate expanded copy.'}
pathlib.Path('/tmp/capiro-unified-final-83f54f5a-20261013/owned-runtime-archive.json').write_text(json.dumps(receipt,indent=2)+'\n')
shutil.rmtree(source)
print(json.dumps({k:v for k,v in receipt.items() if k not in ('files','links')}));print('verified files',len(files),'links',len(links))
