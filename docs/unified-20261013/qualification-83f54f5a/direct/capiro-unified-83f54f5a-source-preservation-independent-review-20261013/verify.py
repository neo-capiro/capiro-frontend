"""Read-only frozen-source preservation audit. No application or gate execution."""
from pathlib import Path
import collections,copy,datetime,hashlib,json,subprocess
ROOT=Path('/workspace/capiro-onboard-port-20261013');OUT=Path(__file__).parent
BASE='93b3617f5d0599f34da373525a96dfc70eaa85d6';FINAL='83f54f5ac0107822833adbbfef2b453e0240bc56';DOC='f8199dc24fb434d51f83353f584b66cbe6264824'
reads=[]
def b(p):
 v=p.read_bytes();reads.append({'path':str(p),'bytes':len(v),'sha256':hashlib.sha256(v).hexdigest()});return v
def j(p):return json.loads(b(p))
def git(*a):return subprocess.check_output(['git',*a],cwd=ROOT).decode().strip()
def blob(ref,p):return subprocess.check_output(['git','show',ref+':'+p],cwd=ROOT)
def listing(ref):return {x.split('\t',1)[1]:x.split('\t',1)[0].split()[2] for x in git('ls-tree','-r',ref).splitlines()}
def save(n,d):(OUT/n).write_text(json.dumps(d,indent=2)+'\n')
source={'head':git('rev-parse','HEAD'),'rootTree':git('rev-parse','HEAD^{tree}'),'applicationTree':git('rev-parse','HEAD:apps/web'),'srcTree':git('rev-parse','HEAD:apps/web/src'),'status':git('status','--porcelain=v1')}
assert source['head']==FINAL and source['rootTree']=='760b05a7a7feacee16815da2767cb83dbb600d95' and source['applicationTree']=='67f821a13c8470ceeb5222eb89d43cea58b1a8c8' and source['status']==''
base=listing(BASE);final=listing(FINAL);inputs=j(ROOT/'docs/unified-20261013/INPUTS-AND-PRESERVATION.json');heads=inputs['heads']|{'frozen93':BASE,'evidencePublication':DOC}
ancestry={n:subprocess.call(['git','merge-base','--is-ancestor',h,FINAL],cwd=ROOT)==0 for n,h in heads.items()};assert all(ancestry.values())
lanes={n:listing(h) for n,h in inputs['heads'].items()};bindings=[]
for r in inputs['originalTestBindings']:
 p=r['path'];v=r['blob'];bindings.append({**r,'originalMatches':lanes[r['lane']].get(p)==v,'finalMatches':final.get(p)==v})
assert len(bindings)==807 and len({x['path'] for x in bindings})==291 and all(x['originalMatches'] and x['finalMatches'] for x in bindings)
save('ALL-807-ORIGINAL-BINDINGS.json',bindings)
changes=[{'status':line.split('\t')[0],'path':line.split('\t')[1]} for line in git('diff','--name-status',BASE,FINAL,'--','apps','packages','scripts','vendor','package.json','package-lock.json').splitlines()]
production=[x['path'] for x in changes if x['path'].startswith('apps/web/src/')];added=[x['path'] for x in changes if x['status']=='A'];assert len(changes)==21 and len(production)==7 and len(added)==10 and all(p.startswith(('apps/web/test/','apps/web/tests/')) for p in added)
assert all(x['status']=='A' for x in changes if '.spec.' in x['path'] or '.test.' in x['path'])
(OUT/'EXACT-SOURCE-DELTA.patch').write_text(git('diff',BASE,FINAL,'--','apps/web/src','apps/web/test/browser/main.tsx','apps/web/package.json','package-lock.json','scripts/architecture/reviewed-size-findings.json')+'\n')
trees=[]
for r in inputs['featureTrees']:
 p=r['path'];original=git('rev-parse',inputs['heads'][r['lane']]+':'+p);current=git('rev-parse',FINAL+':'+p);delta=git('diff','--name-status',BASE,FINAL,'--',p).splitlines();trees.append({**r,'originalTree':original,'finalTree':current,'equalToOriginal':original==current,'explicitSuccessorDelta':delta})
assert sum(x['equalToOriginal'] for x in trees)==4 and sum(not x['equalToOriginal'] for x in trees)==3
assert git('diff','--name-only',BASE,DOC,'--','apps','packages','scripts','vendor','package.json','package-lock.json')==''
assert git('diff','--name-only',DOC,FINAL,'--','docs/unified-20261013/qualification-93b3617f')==''
oldlock=json.loads(blob(BASE,'package-lock.json'));newlock=j(ROOT/'package-lock.json');expectedlock=copy.deepcopy(oldlock);expectedlock['packages']['apps/web']['devDependencies']['axe-core']='4.14.0';assert newlock==expectedlock
oldapp=json.loads(blob(BASE,'apps/web/package.json'));newapp=j(ROOT/'apps/web/package.json');expectedapp=copy.deepcopy(oldapp);expectedapp['devDependencies']['axe-core']='4.14.0';assert newapp==expectedapp
assert oldlock['packages']['node_modules/axe-core']==newlock['packages']['node_modules/axe-core'];axe=newlock['packages']['node_modules/axe-core'];assert axe['version']=='4.14.0' and axe['dev'] is True
critical=[p for p in set(base)|set(final) if p.startswith(('vendor/','packages/','apps/web/src/shared/capiro/','apps/web/src/shared/meri-actions/')) or p in ['scripts/public-packages.mjs','scripts/architecture.mjs','scripts/architecture.test.mjs','package.json'] or p.startswith('scripts/architecture/') and p!='scripts/architecture/reviewed-size-findings.json']
public_changed=[p for p in critical if base.get(p)!=final.get(p)];assert not public_changed
axe_source_imports=[]
for p in final:
 if p.startswith('apps/web/src/') and p.endswith(('.ts','.tsx','.js','.mjs')):
  # Tracked application source only; no execution/import of these modules.
  if 'axe-core' in (ROOT/p).read_text():axe_source_imports.append(p)
assert not axe_source_imports
final_pins=j(ROOT/'docs/unified-20261013/corrections/evidence/FINAL-SOURCE.json');final_checks=[]
for x in final_pins['files']:
 digest=hashlib.sha256(b(ROOT/x['path'])).hexdigest();final_checks.append({'path':x['path'],'sha256':digest,'matchesFinalSourceReceipt':digest==x['sha256']})
assert len(final_checks)==21 and all(x['matchesFinalSourceReceipt'] for x in final_checks) and {x['path'] for x in final_checks}=={x['path'] for x in changes}
reviewdir=ROOT/'docs/unified-20261013/corrections/independent-review';review=j(reviewdir/'SOURCE-SNAPSHOT.json');review_checks=[]
for x in review['sourceFiles']:
 p=x['repositoryRelativePath'];v=b(ROOT/p);review_checks.append({'path':p,'matchesReviewed':len(v)==x['bytes'] and hashlib.sha256(v).hexdigest()==x['sha256']})
assert len(review_checks)==21 and all(x['matchesReviewed'] for x in review_checks)
m=j(reviewdir/'MANIFEST.json');mchecks=[]
for x in m['files']:
 v=b(reviewdir/x['file']);mchecks.append(len(v)==x['bytes'] and hashlib.sha256(v).hexdigest()==x['sha256'])
assert all(mchecks)
oldreg=json.loads(blob(BASE,'scripts/architecture/reviewed-size-findings.json'));newreg=j(ROOT/'scripts/architecture/reviewed-size-findings.json');removed=[x for x in oldreg if x not in newreg];new=[x for x in newreg if x not in oldreg];archive=j(ROOT/'docs/unified-20261013/corrections/SUPERSEDED-STRUCTURE-REVIEW.json');assert removed==archive and len(removed)==1 and len(new)==2
keys=[(x['file'],x['kind'],x['symbol']) for x in newreg];assert len(keys)==len(set(keys))
result={'observedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS_SOURCE_PRESERVATION_ONLY_FINAL_QUALIFICATION_NOT_AUDITED','source':source,'base':BASE,'evidencePublication':DOC,'ancestors':ancestry,'originalTestBindings':807,'uniqueOriginalPaths':291,'allOriginalBindingsExact':True,'featureTreeComparison':trees,'productionDeltaPaths':production,'newTestAndHelperPaths':added,'allSourceMetadataDelta':changes,'oldTestsModified':[],'lock':{'entriesBefore':len(oldlock['packages']),'entriesAfter':len(newlock['packages']),'deltaOnly':'packages[apps/web].devDependencies[axe-core]=4.14.0','allOtherLockEntriesUnchanged':True,'axeExistingRecord':axe,'finalSha256':hashlib.sha256((ROOT/'package-lock.json').read_bytes()).hexdigest(),'appManifestDeltaOnly':'devDependencies[axe-core]=4.14.0','appSourceAxeImports':axe_source_imports},'publicGraph':{'comparedTrackedPaths':len(critical),'changed':public_changed},'f819ProductionGraphEqualTo93':True,'f819Published93EvidenceUnchangedInSuccessor':True,'finalSourceReceiptBindings':final_checks,'independentSourceReviewBindings':review_checks,'reviewManifestFilesVerified':len(mchecks),'architectureRecordDelta':{'removedExactArchived':removed,'added':new,'duplicateOwnerKeys':0},'fullSuccessorQualification':'PENDING_NOT_AUDITED','reviewerRuntimeExecution':False}
save('SOURCE-VERIFICATION.json',result);save('READ-EVIDENCE-BINDINGS.json',reads)
print(json.dumps({'source':source,'status':result['status'],'originalRecords':807,'originalUniquePaths':291,'unchangedTrees':4,'explicitlyChangedTrees':3,'productionFiles':len(production),'newTestHelperFiles':len(added),'publicGraphPathsCompared':len(critical),'reviewManifestFiles':len(mchecks),'all21SourcePinsMatch':True,'lockDelta':result['lock']['deltaOnly']},indent=2))
