import json,zipfile,pathlib,hashlib,shutil
out=pathlib.Path('/tmp/capiro-remaining-capabilities-evidence/modules-keyboard-adapter-review')
src=pathlib.Path('/tmp/capiro-remaining-modules-evidence/keyboard-d68-correction')
def sha(b):return hashlib.sha256(b).hexdigest()
def extract_nodes(tree,pred):
 found=[]
 if isinstance(tree,list):
  if len(tree)>1 and isinstance(tree[1],dict) and pred(tree):found.append(tree)
  for x in tree:found.extend(extract_nodes(x,pred))
 return found
summary={}
for folder,label in [('browser-green','owner-first-focus-red'),('browser-focus-corrected','owner-final-green')]:
 p=next((src/folder).glob('*/trace.zip')); dest=out/(label+'-trace.zip');shutil.copyfile(p,dest)
 z=zipfile.ZipFile(p); rows=[json.loads(x) for x in z.read('0-trace.trace').splitlines()]
 before=[r for r in rows if r.get('type')=='before' and r.get('method') in ['expect','keyboardPress']]
 after={r['callId']:r for r in rows if r.get('type')=='after'}
 assertions=[{'before':r,'after':after.get(r['callId'])} for r in before]
 hidden=[]
 for r in rows:
  if r.get('type')!='frame-snapshot':continue
  s=r['snapshot'];nodes=extract_nodes(s['html'],lambda n:n[1].get('id')=='root' and n[1].get('aria-hidden')=='true')
  if nodes:hidden.append({'name':s.get('snapshotName'),'timestamp':s.get('timestamp'),'rootAttributes':nodes[0][1]})
 source_entries=[]
 for n in z.namelist():
  if n.startswith('resources/src@'):
   b=z.read(n)
   if b'MS08 scope and grouping controls remain keyboard operable' in b:source_entries.append({'entry':n,'sha256':sha(b),'matchesFinalSource':sha(b)==sha((out/'remaining-modules.spec.ts').read_bytes())})
 report=json.loads((src/(folder+'.json')).read_text())
 (out/(label+'-selected-trace.json')).write_text(json.dumps({'assertions':assertions,'hiddenRootSnapshots':hidden,'sourceEntries':source_entries},indent=2)+'\n')
 shutil.copyfile(src/(folder+'.json'),out/(label+'-report.json'))
 shutil.copyfile(src/(folder+'.log'),out/(label+'.log'))
 summary[label]={'originalTracePath':str(p),'traceSHA256':sha(p.read_bytes()),'traceBytes':p.stat().st_size,'stats':report['stats'],'config':{'workers':report['config']['workers'],'retries':[p['retries'] for p in report['config']['projects']]},'hiddenRootProof':hidden[:3],'sourceEntries':source_entries,'checkedAssertionOutcomes':[{'selector':r['before'].get('params',{}).get('selector'),'expression':r['before'].get('params',{}).get('expression'),'error':r['after'].get('error') if r['after'] else 'missing-after','result':r['after'].get('result') if r['after'] else None} for r in assertions if r['before'].get('method')=='expect']}
for name in ['MANIFEST.json','REPORT.md','STRUCTURE-REVIEW.json','UNCHANGED-ASSERTIONS.json','RUN-SOURCE.json','FOCUS-LOCATOR-CORRECTION.json','SERVER-CLOSURE.json','playwright.config.mjs']:
 p=src/name
 if p.exists():shutil.copyfile(p,out/('owner-'+name))
(out/'independent-trace-audit.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
