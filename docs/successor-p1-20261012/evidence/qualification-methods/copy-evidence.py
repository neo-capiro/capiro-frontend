import json,pathlib,hashlib,shutil,sys
root=pathlib.Path('/workspace/capiro-p1-successor/docs/successor-p1-20261012');record=root/'EVIDENCE-COPY-RECORD.json';data=json.loads(record.read_text());by={r['path']:r for r in data['files']}
source=pathlib.Path(sys.argv[1]);target=root/sys.argv[2];added=0
for src in sorted(source.rglob('*')):
 if not src.is_file() or src.is_symlink() or any(p in {'node_modules','__pycache__','.cache','.vite'} for p in src.relative_to(source).parts):continue
 dest=target/src.relative_to(source);blob=src.read_bytes();h=hashlib.sha256(blob).hexdigest();rel=dest.relative_to(root).as_posix()
 if dest.exists():assert dest.read_bytes()==blob, f'Preserving existing different evidence: {rel}'
 else:dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dest);added+=1
 assert hashlib.sha256(dest.read_bytes()).hexdigest()==h
 by[rel]={'source':str(src),'path':rel,'bytes':len(blob),'sha256':h}
data['files']=sorted(by.values(),key=lambda x:x['path']);data['copiedFiles']=len(by);data['copiedBytes']=sum(r['bytes'] for r in by.values());record.write_text(json.dumps(data,indent=2)+'\n');print(json.dumps({'added':added,'files':len(by),'bytes':data['copiedBytes']}))
