from pathlib import Path
import subprocess,json,hashlib,base64,io,tarfile,datetime,collections
root=Path('/workspace/capiro-onboard-port-20261013');out=Path('/tmp/capiro-unified-integration-independent-review-20261013');final='6a2e4aceaaa354a8edd9bf54e4148380ccbb1e32';prior='e22cd4c29d3d112486622051a4c1ea2424527221'
def git(*a):return subprocess.check_output(['git',*a],cwd=root)
def blob(h,p):return git('show',h+':'+p)
def js(h,p):return json.loads(blob(h,p))
inputs=js(prior,'docs/unified-20261013/INPUTS-AND-PRESERVATION.json')['heads'];lock=js(final,'package-lock.json')['packages'];manifests=['meri-public-packages.json','newsletter-public-packages.json','onboard-public-packages.json'];packages=[]
for name in manifests:
 for r in js(final,'vendor/'+name)['artifacts']:
  data=blob(final,'vendor/'+r['file']);sha=hashlib.sha256(data).hexdigest();integrity='sha512-'+base64.b64encode(hashlib.sha512(data).digest()).decode()
  with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as tar:
   files=[m for m in tar.getmembers() if m.isfile()];pkg=json.load(tar.extractfile('package/package.json'))
  matches=[{'path':p,'version':v['version'],'integrityMatch':v.get('integrity')==integrity} for p,v in lock.items() if v.get('resolved')=='file:vendor/'+r['file']]
  packages.append({'manifest':name,'file':r['file'],'sourceCommit':r['sourceCommit'],'bytes':len(data),'sha256':sha,'matchesManifest':sha==r['sha256'] and len(data)==r['bytes'],'entryCount':len(files),'matchesDeclaredEntryCount':len(files)==r.get('regularEntryCount',len(files)),'packageName':pkg['name'],'packageVersion':pkg['version'],'exports':pkg.get('exports'),'dependencies':pkg.get('dependencies',{}),'peerDependencies':pkg.get('peerDependencies',{}),'lockBindings':matches})
proof=json.loads((out/'INPUTS-VERIFICATION.json').read_text());drift=[];flagOnly=[]
for lane,r in proof['lock'].items():
 for changed in r['changed']:
  if changed['path']=='apps/web':continue
  a,b=changed['before'].copy(),changed['after'].copy();a.pop('dev',None);b.pop('dev',None)
  if a!=b:drift.append({'lane':lane,**changed})
  else:flagOnly.append({'lane':lane,'path':changed['path'],'beforeDev':changed['before'].get('dev'),'afterDev':changed['after'].get('dev')})
web=js(final,'apps/web/package.json');depUnion={};depConflicts=[];scriptPreservation=[]
for lane in ['newsletter','shipping','onboard','meri_actions']:
 for section in ['dependencies','devDependencies']:
  p=js(inputs[lane],'apps/web/package.json')[section]
  for name,v in p.items():
   if name in depUnion and depUnion[name]!=v:depConflicts.append([name,depUnion[name],v])
   depUnion[name]=v
  scriptPreservation.append({'lane':lane,'section':section,'allExact':all(web[section].get(k)==v for k,v in p.items())})
reviewsBefore=js(prior,'scripts/architecture/reviewed-size-findings.json');reviewsAfter=js(final,'scripts/architecture/reviewed-size-findings.json');history=js(final,'docs/unified-20261013/SUPERSEDED-REVIEW.json')['historicalRecords'];removed=[r for r in reviewsBefore if r not in reviewsAfter];added=[r for r in reviewsAfter if r not in reviewsBefore];key=lambda r:(r['file'],r['kind'],r['symbol']);counts=collections.Counter(key(r) for r in reviewsAfter)
inputReviewPreservation={}
for lane in ['newsletter','shipping','onboard','meri_actions']:
 previous=js(inputs[lane],'scripts/architecture/reviewed-size-findings.json');missing=[r for r in previous if r not in reviewsAfter and r not in history];inputReviewPreservation[lane]={'records':len(previous),'missingOrChangedOutsideExactHistoricalRetirement':missing}
trees=[]
for lane,p in [('newsletter','packages/qualification-newsletter'),('newsletter','apps/web/public/newsletter-assets'),('onboard','apps/web/public/onboard'),('meri_actions','packages/meri-client'),('meri_actions','packages/qualification-transport'),('meri_actions','packages/qualification-elements')]:
 try:a=git('rev-parse',inputs[lane]+':'+p).decode().strip();b=git('rev-parse',final+':'+p).decode().strip();trees.append({'lane':lane,'path':p,'sourceTree':a,'finalTree':b,'identical':a==b})
 except subprocess.CalledProcessError:trees.append({'lane':lane,'path':p,'status':'PATH_ABSENT_DO_NOT_INFER_PRESERVATION'})
changedPaths=git('diff','--name-only',prior,final).decode().splitlines();result={'atUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'initial':prior,'final':final,'changedPaths':changedPaths,'rootTree':git('rev-parse',final+'^{tree}').decode().strip(),'appTree':git('rev-parse',final+':apps/web').decode().strip(),'srcTree':git('rev-parse',final+':apps/web/src').decode().strip(),'applicationUnchanged':git('rev-parse',prior+':apps/web')==git('rev-parse',final+':apps/web'),'packages':packages,'allArtifactBindingsMatch':all(r['matchesManifest'] and r['matchesDeclaredEntryCount'] and all(x['integrityMatch'] for x in r['lockBindings']) for r in packages),'lockNonDevFlagDrift':drift,'intentionalDevFlagPromotions':flagOnly,'webDependencyUnionConflicts':depConflicts,'webDependencyInputPreservation':scriptPreservation,'extraWebDependencies':sorted(set(web['dependencies'])|set(web['devDependencies'])-set(depUnion)),'reviews':{'beforeCount':len(reviewsBefore),'afterCount':len(reviewsAfter),'removed':removed,'added':added,'removedExactlyArchived':removed==history,'remainingDuplicateKeys':[k for k,n in counts.items() if n>1],'inputPreservation':inputReviewPreservation},'additionalTrees':trees,'workingHead':git('rev-parse','HEAD').decode().strip(),'workingStatus':git('status','--porcelain').decode()}
# Parentheses matter: no unrequested web dependency may sneak into a union.
result['extraWebDependencies']=sorted((set(web['dependencies'])|set(web['devDependencies']))-set(depUnion))
(out/'UNION-VERIFICATION.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['final','rootTree','appTree','srcTree','applicationUnchanged','allArtifactBindingsMatch','lockNonDevFlagDrift','webDependencyUnionConflicts','webDependencyInputPreservation','extraWebDependencies','additionalTrees','workingHead','workingStatus']},indent=2));print(json.dumps({'activeReviews':len(reviewsAfter),'removedExactlyArchived':result['reviews']['removedExactlyArchived'],'remainingDuplicateKeys':result['reviews']['remainingDuplicateKeys'],'inputMissing':{k:len(v['missingOrChangedOutsideExactHistoricalRetirement']) for k,v in inputReviewPreservation.items()}},indent=2))
