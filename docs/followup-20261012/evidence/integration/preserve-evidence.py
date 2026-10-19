from pathlib import Path
import hashlib,json,shutil,subprocess,datetime
root=Path('/workspace/capiro-followup'); packet=root/'docs/followup-20261012'; source='ee01be3b2c5c64a53744994ae4ad0d992a111054'
qual=Path('/tmp/capiro-followup-qualification'); final=qual/'final-ee01be3'
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()==source
for name in ['clean-install','check','elements-prepared','build','production','modules','portfolio']:
 d=json.loads((final/(name+'-exit.json')).read_text());assert d['exitCode']==0 and not d['sourceChanged'] and d['sourceBefore']['head']==source, name
for name,n in [('modules',182),('portfolio',1051)]:
 d=json.loads((final/(name+'-browser-results.json')).read_text());s=d['stats'];assert s['expected']==n and all(s[x]==0 for x in ['skipped','unexpected','flaky']), (name,s)
records=[]
def one(origin,destination):
 data=origin.read_bytes();dest=packet/destination
 if dest.exists():assert dest.read_bytes()==data, str(dest)
 else:dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
 records.append({'origin':str(origin),'destination':destination,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
def tree(origin,destination):
 for f in sorted(origin.rglob('*')):
  if f.is_file() and not f.is_symlink():one(f,str(Path(destination)/f.relative_to(origin)))
for origin,dest in [(qual,'evidence/integration'),(Path('/tmp/capiro-followup-elements-ee01be3'),'evidence/elements/ssr'),(Path('/tmp/capiro-followup-elements-runtime-ee01be3'),'evidence/elements/runtime'),(root/'apps/web/test-results','evidence/combined-extra-captures/test-results'),(root/'apps/web/work','evidence/combined-extra-captures/work')]:tree(origin,dest)
for name in ['SOURCE-ARCHIVE-RECEIPT.json','INDEPENDENT-VERIFICATION.json','create.log','independent-verification.stderr']:
 one(Path('/tmp/capiro-source-ee01be3')/name,'evidence/source-archive/'+name)
for name in ['source_archive.py','zip_layout.py','verify-source-zip.py']:
 one(Path('/tmp/capiro-source-d5dd0be-independent')/name,'evidence/source-archive/tools/'+name)
d={'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'qualifiedSource':source,'files':records,'fileCount':len(records),'totalBytes':sum(r['bytes'] for r in records),'sourceArchiveNote':'Archive remains at /tmp/capiro-source-ee01be3/source-ee01be3.zip; its complete per-file receipt and independent verification are copied. No duplicate ZIP or cloud upload.'}
(packet/'EVIDENCE-COPY-PART-4.json').write_text(json.dumps(d,indent=2)+'\n')
print(json.dumps({k:v for k,v in d.items() if k!='files'}))
