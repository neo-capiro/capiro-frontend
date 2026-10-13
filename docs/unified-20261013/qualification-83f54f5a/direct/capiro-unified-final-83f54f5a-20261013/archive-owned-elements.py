import pathlib,tarfile,hashlib,json,datetime,shutil,os
root=pathlib.Path('/workspace/capiro-newsletter-preserved-generated-20261013')
for name in ('baseline-elements-build','capiro-elements-4a16148','capiro-elements-f4e9e1f'):
 source=root/name;archive=root/(name+'.tar.gz');assert source.is_dir() and not archive.exists()
 files={str(p.relative_to(source)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in source.rglob('*') if p.is_file() and not p.is_symlink()}
 links={str(p.relative_to(source)):os.readlink(p) for p in source.rglob('*') if p.is_symlink()}
 with tarfile.open(archive,'w:gz',compresslevel=3) as t:t.add(source,arcname=name)
 seen={};sl={}
 with tarfile.open(archive,'r:gz') as t:
  for m in t:
   n=m.name.removeprefix(name+'/')
   if m.isfile():
    b=t.extractfile(m).read();seen[n]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
   elif m.issym():sl[n]=m.linkname
 assert seen==files and sl==links
 receipt={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':str(source),'archive':str(archive),'archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'archiveBytes':archive.stat().st_size,'files':files,'links':links,'verified':True,'scope':'Owned inactive historical Elements generated preservation copy only; all regular bytes and symlinks archived and reopened before retiring expanded duplicate.'}
 pathlib.Path('/tmp/capiro-unified-final-83f54f5a-20261013/'+name+'-archive.json').write_text(json.dumps(receipt,indent=2)+'\n')
 shutil.rmtree(source);print(name,'verified',len(files),'files; archive',archive.stat().st_size,'bytes',flush=True)
