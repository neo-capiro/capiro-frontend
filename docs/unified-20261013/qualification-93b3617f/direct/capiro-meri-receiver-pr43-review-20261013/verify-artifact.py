from pathlib import Path
import json,hashlib,base64,tarfile,datetime,posixpath,re
p=Path('/tmp/capiro-meri-receiver-pr43-review-20261013')
sha=lambda b:hashlib.sha256(b).hexdigest()
blob=lambda b:hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
pr=json.loads((p/'raw/initial-0.json').read_text())['value']['structuredContent']
assert pr['head_sha']=='83d1d8b2ae4604ca259be17461ae71ca60f5fb6e' and pr['draft'] and not pr['merged']
body=(p/'capiro-meri-contracts-0.1.1.tgz').read_bytes();assert len(body)==175627 and sha(body)=='0ca8d0552a2960157ebdf7b8cecf6cacdcda48ef91c475060a54f15192535651'
for n,wrapped in [('raw/file-4.json',True),('raw/artifact-publication.json',False)]:
 j=json.loads((p/n).read_text());j=j['value'] if wrapped else j;j=j['structuredContent'];assert base64.b64decode(j['content'])==body and blob(body)==j['sha']
with tarfile.open(p/'capiro-meri-contracts-0.1.1.tgz') as t:
 members=t.getmembers();assert len(members)==15
 for m in members:assert m.isfile() and '..' not in Path(m.name).parts and not m.name.startswith('/')
 packed={m.name:t.extractfile(m).read() for m in members}
checks=[]
for raw,member,wrap in [('raw/initial-2.json','package/package.json',True),('raw/initial-3.json','package/README.md',True),('raw/file-1.json','package/dist/action-application.mjs',True),('raw/file-2.json','package/dist/action-application.d.ts',True),('raw/file-3.json','package/dist/action-application.metadata.json',True)]:
 j=json.loads((p/raw).read_text())['value']['structuredContent'];assert blob(packed[member])==j['sha']
 if j['content']:assert j['content'].encode()==packed[member]
 checks.append({'member':member,'GitHubBlob':j['sha'],'bytes':len(packed[member]),'sha256':sha(packed[member]),'inlineContentAvailable':bool(j['content'])})
meta=json.loads(packed['package/dist/action-application.metadata.json']);assert sha(packed['package/dist/action-application.schema.json'])==meta['schemaSha256']
sources=[]
for i,expected in enumerate(meta['sources']):
 data=json.loads((p/f'raw/provenance-{i}.json').read_text())['value']['structuredContent'];b=data['content'].encode();assert sha(b)==expected['sha256'] and len(b)==expected['bytes'] and blob(b)==data['sha']
 sources.append({**expected,'repositoryPath':posixpath.normpath('packages/contracts/'+expected['path']),'GitHubBlob':data['sha']})
old=Path('/workspace/capiro-meri-workflow-20261013/vendor/capiro-meri-contracts-0.1.0.tgz')
with tarfile.open(old) as t:oldFiles={m.name:t.extractfile(m).read() for m in t.getmembers() if m.isfile()}
legacy=[{'path':k,'oldSha256':sha(v),'newSha256':sha(packed[k]),'unchanged':v==packed[k]} for k,v in oldFiles.items()]
assert [x['path'] for x in legacy if not x['unchanged']]==['package/package.json','package/README.md']
mod=packed['package/dist/action-application.mjs'].decode();assert not re.search(r'^import\s|\bfetch\(|node:',mod,re.M)
code=mod[mod.index('// action-application-receiver.mjs'):]
(p/'producer/receiver-bundle-excerpt.mjs').write_text(code)
status=mod[mod.index('// action-generated:./generated-status.mjs'):mod.index('// action-application-receiver.mjs')]
(p/'producer/error-status-bundle-excerpt.mjs').write_text(status)
ui=Path('/workspace/capiro-meri-workflow-20261013/apps/web/src/features/meri/actions')
uiRecords=[]
for n in ['action-workflow-port.ts','action-workflow-state.ts','TaskDraftPanel.tsx','ProposalPanel.tsx']:
 b=(ui/n).read_bytes();q=p/'consumer-context'/n;q.parent.mkdir(exist_ok=True);q.write_bytes(b);uiRecords.append({'path':str(ui/n),'bytes':len(b),'sha256':sha(b)})
receipt={'reviewedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'producerRepository':'neo-capiro/meri-greenfield','PR43':{'url':pr['url'],'state':pr['state'],'draft':pr['draft'],'merged':pr['merged'],'head':pr['head_sha']},'artifactPublicationCommit':'08ba900965f54d4f0cd3776a9bb2158877e76dfd','handoffComment':'https://github.com/neo-capiro/capiro-frontend/pull/16#issuecomment-6137056397','artifact':{'path':'capiro-meri-contracts-0.1.1.tgz','bytes':len(body),'sha256':sha(body),'GitHubBlob':blob(body),'sameBytesAtPublicationAndHead':True,'fileCount':len(members),'totalUncompressedBytes':sum(len(v) for v in packed.values()),'allEntriesRegularAndSafe':True},'publicExports':json.loads(packed['package/package.json'])['exports'],'exportGitBlobChecks':checks,'schemaSha256Verified':meta['schemaSha256'],'allEightProvenanceSourcesVerified':sources,'oldTarball':{'path':str(old),'sha256':sha(old.read_bytes()),'comparison':legacy},'browserStaticInspection':{'noExternalImportFetchOrNodeReference':True,'exports':['ActionResponseError','receiveActionResponse'],'requiredGlobals':['TextEncoder','globalThis.crypto.subtle'],'browserExecuted':False,'metadataBrowserInputs':meta['browserInputs']},'currentPortCompatibilitySource':uiRecords,'producerCheckClaims':'Published report records80/80 plus generators/types/offline pack; this reviewer did not rerun or independently verify raw80 test receipts.','retrievalLimits':['GitHub inline content for >1MB browser module was empty; tar member verified against returned Git blob instead.','Attempted standalone receiver-source path returned404; exact public bundled receiver implementation inspected instead. Both raw attempts preserved.'],'scope':'Read-only GitHub/file/hash/static verification; no install, build, browser, backend route, approval, provider, AWS, PR17 or shared-source modification.','conclusion':'Canonical receiving package available; adapter correlation/current host lifetime and consumer qualification remain required.'}
(p/'VERIFICATION.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'artifact':receipt['artifact'],'unchangedLegacyFiles':sum(x['unchanged'] for x in legacy),'metadataSources':len(sources),'staticOnly':True},indent=2))
