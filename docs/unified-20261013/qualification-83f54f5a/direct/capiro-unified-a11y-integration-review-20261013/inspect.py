from pathlib import Path
import hashlib,json,base64,subprocess,datetime,collections,shutil
p=Path('/workspace/capiro-onboard-port-20261013'); mirror=Path('/tmp/capiro-onboard-execution-20261013');out=Path('/tmp/capiro-unified-a11y-integration-review-20261013');run=Path('/tmp/capiro-unified-corrections-20261013');base='93b3617f5d0599f34da373525a96dfc70eaa85d6'
sha=lambda b:hashlib.sha256(b).hexdigest()
def record(path):
 b=path.read_bytes();return {'path':str(path),'bytes':len(b),'sha256':sha(b)}
tracked=subprocess.check_output(['git','diff','--name-only',base,'--','apps/web','package-lock.json','scripts/architecture/reviewed-size-findings.json'],cwd=p,text=True).splitlines()
untracked=subprocess.check_output(['git','ls-files','--others','--exclude-standard','apps/web/test','apps/web/tests'],cwd=p,text=True).splitlines()
files=sorted(set(tracked+untracked));records=[]
for f in files:
 r=record(p/f);r['repositoryRelativePath']=f;r['mirrorMatches']=(mirror/f).exists() and(p/f).read_bytes()==(mirror/f).read_bytes();records.append(r)
 dest=out/'reviewed-source'/f;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p/f,dest)
lockBefore=json.loads(subprocess.check_output(['git','show',base+':package-lock.json'],cwd=p));lockNow=json.loads((p/'package-lock.json').read_text());lockedAxe=lockNow['packages']['node_modules/axe-core'];lockNow['packages']['apps/web']['devDependencies'].pop('axe-core')
source={'capturedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'base':base,'headAtReview':subprocess.check_output(['git','rev-parse','HEAD'],cwd=p,text=True).strip(),'status':'Uncommitted exact bounded source snapshot; final comprehensive successor qualification pending','sourceFiles':records,'productionSrcFiles':[f for f in files if f.startswith('apps/web/src/')],'newTestFiles':untracked,'lockDiffOnlyWebDirectAxeMetadata':lockNow==lockBefore,'lockedAxePackageUnchanged':lockedAxe==lockBefore['packages']['node_modules/axe-core'],'lockedAxe':lockedAxe,'existingTestSpecFilesModified':[f for f in tracked if f.endswith(('.spec.ts','.test.ts','.test.mjs'))]}
(out/'SOURCE-SNAPSHOT.json').write_text(json.dumps(source,indent=2)+'\n')
(out/'tracked-source.patch').write_bytes(subprocess.check_output(['git','diff',base,'--',*tracked],cwd=p))
reviewedProposal=json.loads(Path('/tmp/capiro-unified-a11y-behavior-proposal-20261013/STATIC-INSPECTION.json').read_text());source['behaviorProposalMatches']=[{'file':r['file'],'matches':sha((p/r['file']).read_bytes())==r['sha256']}for r in reviewedProposal['rows']]
(out/'SOURCE-SNAPSHOT.json').write_text(json.dumps(source,indent=2)+'\n')
results=[]
for name in ['portfolio-behavior-results.json','shared-behavior-results.json','portfolio-axe-nav-results.json','portfolio-controls-results.json','meri-mobile-controls-results.json','active-count-red-results.json','active-count-red-v2-results.json','active-count-green-results.json']:
 path=run/name
 if not path.exists():continue
 d=json.loads(path.read_text());row={'file':record(path),'stats':d['stats'],'errors':d['errors'],'workers':d['config'].get('workers'),'cases':[]}
 def walk(s):
  for sp in s.get('specs',[]):
   for t in sp['tests']:
    for r in t['results']:
     case={'title':sp['title'],'status':r['status'],'retry':r.get('retry'),'errors':[e.get('message',str(e))for e in r.get('errors',[])],'attachments':[]}
     for a in r.get('attachments',[]):
      entry={'name':a['name'],'contentType':a['contentType']}
      if 'body'in a:
       b=base64.b64decode(a['body']);entry.update(bytes=len(b),sha256=sha(b))
       if a['contentType']=='application/json':
        parsed=json.loads(b)
        if a['name']=='axe-full-default-results':
         entry['axeVersion']=parsed['testEngine']['version'];entry['violations']=[{'id':r['id'],'nodeCount':len(r['nodes'])}for r in parsed['violations']];entry['incomplete']=[{'id':r['id'],'nodeCount':len(r['nodes'])}for r in parsed['incomplete']]
        else:entry['value']=parsed
      elif'path'in a:entry['path']=a['path']
      case['attachments'].append(entry)
     row['cases'].append(case)
  for child in s.get('suites',[]):walk(child)
 for s in d['suites']:walk(s)
 results.append(row)
(out/'RUNTIME-RECEIPT-REVIEW.json').write_text(json.dumps({'method':'Read existing root-produced JSON only; no browser or tests executed by reviewer','receipts':results},indent=2)+'\n')
print('Source files',len(files),'production src',len(source['productionSrcFiles']),'new tests/helpers',len(untracked),'mirror mismatches',[r['repositoryRelativePath']for r in records if not r['mirrorMatches']]);print('Lock metadata only',source['lockDiffOnlyWebDirectAxeMetadata']);print('Existing test files modified',source['existingTestSpecFilesModified']);print('Behavior hashes exact',all(r['matches']for r in source['behaviorProposalMatches']))
for r in results:print(Path(r['file']['path']).name,r['stats'],len(r['cases']))
