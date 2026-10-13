"""Read-only installed and emitted-artifact scan; does not import/execute application modules."""
from pathlib import Path
import datetime,hashlib,json,re,subprocess,tarfile,os
R=Path('/workspace/capiro-onboard-port-20261013');O=Path(__file__).parent;G=Path('/tmp/capiro-unified-final-83f54f5a-20261013');readpins=[]
def read(p):
 b=p.read_bytes();readpins.append({'path':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()});return b
def js(p):return json.loads(read(p))
def meta(p,b):return {'path':str(p.relative_to(R)),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def save(n,v):(O/n).write_text(json.dumps(v,indent=2)+'\n')
source={'head':'83f54f5ac0107822833adbbfef2b453e0240bc56','tree':'760b05a7a7feacee16815da2767cb83dbb600d95','applicationTree':'67f821a13c8470ceeb5222eb89d43cea58b1a8c8','sourceDiff':''}
receipts={k:js(G/f'{k}-exit.json') for k in ['check','build']}
for d in receipts.values():assert d['exitCode']==0 and d['sourceBefore']==d['sourceAfter']==source and d['sourceChanged'] is False
sentinels=['MERI_TOOL_MANIFEST','MERI_CAPABILITY_REGISTRY','DEFENSE_BUDGET_DOMAIN_PRIMER','MERI_GROUNDING_OUTREACH_KERNEL','fundingCurrentCoalesceSql','GRANTS_GOV_ORGANIZATION_TYPE_GROUPS']
package=R/'node_modules/@capiro/shared';index=read(package/'dist/index.js').decode();pkg=js(package/'package.json')
counts={name:index.count(name) for name in sentinels};assert all(counts.values())
price=re.search(r"exports\.PRICE_LOCK_COPY = '([^']+)';",index).group(1)
# Check installed public package file bytes against immutable consumed artifact, without extraction.
artifact=R/'vendor/capiro-shared-0.0.0-38fec5c8.tgz';art=read(artifact);assert hashlib.sha256(art).hexdigest()=='3e435f280fac8fd301eb753e9fc7ead93691cf979fc1641792fedd88e1bfd6d5'
installed=[]
with tarfile.open(artifact,'r:gz') as tf:
 for member in tf.getmembers():
  if not member.isfile():continue
  assert member.name.startswith('package/') and '..' not in Path(member.name).parts
  relative=member.name[len('package/'):];expected=tf.extractfile(member).read();actual=(package/relative).read_bytes();assert expected==actual
  installed.append({'path':relative,'bytes':len(actual),'sha256':hashlib.sha256(actual).hexdigest()})
static=[];sentinel_hits=[];price_client=[];manifest=[];broad=[]
for p in sorted((R/'apps/web/.next/static').rglob('*')):
 if p.is_file() and p.suffix in ['.js','.mjs','.cjs']:
  b=p.read_bytes();static.append(meta(p,b));s=b.decode()
  for n in sentinels:
   if n in s:sentinel_hits.append({'path':str(p.relative_to(R)),'sentinel':n})
  if price in s:price_client.append(str(p.relative_to(R)))
# Detect broad root/entry module references; public subpath references are separately identifiable.
patterns=[r'@capiro/shared(?:/dist)?/index(?:\.[cm]?js)?',r'@capiro/shared(?=[\"\x27\s)\]])']
shared_refs=[]
for p in sorted((R/'apps/web/.next/server').rglob('*client-reference-manifest.js')):
 b=p.read_bytes();manifest.append(meta(p,b));s=b.decode()
 if '@capiro/shared' in s:shared_refs.append(str(p.relative_to(R)))
 for pattern in patterns:
  if re.search(pattern,s):broad.append({'path':str(p.relative_to(R)),'pattern':pattern})
server_price=[]
for p in sorted((R/'apps/web/.next/server').rglob('*.js')):
 b=p.read_bytes()
 if price.encode() in b:server_price.append(meta(p,b))
assert static and len(manifest)==44 and not sentinel_hits and not broad and server_price and not price_client
src=[]
rootimport=re.compile(r'''(?:from\s*|require\(\s*|import\(\s*)["']@capiro/shared["']''')
for p in (R/'apps/web/src').rglob('*'):
 if p.is_file() and p.suffix in ['.ts','.tsx','.js','.mjs'] and rootimport.search(p.read_text()):src.append(str(p.relative_to(R)))
assert src==['apps/web/src/shared/capiro/onboard-pricing.server.ts']
owner=read(R/src[0]).decode();assert 'import "server-only";' in owner and 'import { PRICE_LOCK_COPY, PRICE_CHANGE_COPY } from "@capiro/shared";' in owner and 'use client' not in owner
for p in ['scripts/architecture/dependencies.mjs','scripts/architecture/parser.mjs','apps/web/src/app/_onboard/OnboardEntry.tsx']:
 if (R/p).exists():read(R/p)
log=read(G/'check.log').decode();arch=json.JSONDecoder().raw_decode(log.split('> node scripts/architecture.mjs',1)[1].lstrip())[0];assert arch['errors']==[] and arch['sizeSummary']['blocking']==0
# npm ls is explicitly authorized read-only package graph inspection, not install/test/build.
command=['npm','ls','--all','--json','--offline','@capiro/shared','@capiro/meri-contracts','@capiro/meri-ui-stream','@stripe/react-stripe-js','@stripe/stripe-js','axe-core']
env=os.environ|{'npm_config_update_notifier':'false','npm_config_cache':str(O/'npm-cache')}
with (O/'npm-ls-public-final.json').open('wb') as out,(O/'npm-ls-public-final.stderr').open('wb') as err:run=subprocess.run(command,cwd=R,env=env,stdout=out,stderr=err)
assert run.returncode==0
npm=js(O/'npm-ls-public-final.json');assert not npm.get('problems') and not npm.get('error')
result={'observedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS_SUPPLEMENTAL_EMITTED_BOUNDARY','source':source,'completedBuildAndCheckReceipts':receipts,'staticJavaScriptCount':len(static),'staticJavaScriptBytes':sum(x['bytes'] for x in static),'clientJavaScriptInventory':static,'installedRootSentinels':counts,'clientSentinelHits':sentinel_hits,'clientReferenceManifestCount':len(manifest),'clientReferenceManifestInventory':manifest,'sharedReferenceManifestHits':shared_refs,'broadRootClientReferenceHits':broad,'broadRootReferencePatterns':patterns,'priceLockLiteral':price,'clientPricingLiteralHits':price_client,'serverPricingLiteralHits':server_price,'installedSharedArtifact':{'sha256':hashlib.sha256(art).hexdigest(),'bytes':len(art),'allPackedFilesMatchInstalled':True,'filesVerified':len(installed),'rootMain':pkg['main']},'sourceBroadRootImports':src,'canonicalAstGuard':{'source':'scripts/architecture/dependencies.mjs','enforces':'Only server-only Onboard pricing owner, exactly named PRICE_LOCK_COPY and PRICE_CHANGE_COPY exports, no client directive; only Onboard server entry may import projection. Browser public exports remain newsletter and newsletter-render.','observedCheckArchitectureSummary':arch['sizeSummary'],'errors':arch['errors'],'executedByReviewer':False},'npmLs':{'command':command,'exitCode':run.returncode,'problems':npm.get('problems',[]),'applicationExecution':False},'scope':'Supplemental emitted-artifact exclusion plus canonical source AST guard. Negative string/reference scans do not prove complete whole-program provenance, all dynamic behaviors or native/browser authority. No install/app/test/browser/build/server was executed by reviewer.'}
save('CLIENT-BOUNDARY.json',result);save('INSTALLED-SHARED-BYTE-BINDINGS.json',installed);save('EMITTED-READ-BINDINGS.json',readpins)
print(json.dumps({k:v for k,v in result.items() if k not in ['completedBuildAndCheckReceipts','clientJavaScriptInventory','clientReferenceManifestInventory']},indent=2))
