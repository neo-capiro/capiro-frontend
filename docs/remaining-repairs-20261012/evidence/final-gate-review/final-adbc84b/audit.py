import pathlib,json,hashlib,re,datetime,subprocess,collections
R=pathlib.Path('/workspace/capiro-remaining');E=pathlib.Path('/tmp/capiro-remaining-qualification/final-adbc84b');O=pathlib.Path('/tmp/capiro-remaining-final-gate-review/final-adbc84b');C='adbc84b2251fe6b06cb7f75030026fba5b4ff498';now=datetime.datetime.now(datetime.timezone.utc).isoformat()
def j(p):return json.loads(p.read_text())
def h(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rec(p):return {'path':str(p),'bytes':p.stat().st_size,'sha256':h(p)}
def flatten(d,prefix):
 rows=[]
 def visit(ss,parents=[]):
  for s in ss:
   for spec in s.get('specs',[]):
    for t in spec.get('tests',[]):rows.append({'source':prefix+'/'+spec['file'],'line':spec['line'],'title':spec['title'],'suite':parents+[s['title']],'status':t['status'],'attempts':[{'status':r['status'],'retry':r['retry'],'durationMs':r['duration'],'error':r.get('error')} for r in t['results']]})
   visit(s.get('suites',[]),parents+[s['title']])
 visit(d['suites']);return rows
def outcomes(rows):return {'passed':sum(t['status']=='expected' for t in rows),'failed':sum(t['status']=='unexpected' for t in rows),'interrupted':sum(any(a['status']=='interrupted' for a in t['attempts']) for t in rows),'unrun':sum(not t['attempts'] for t in rows),'retries':sum(a['retry']>0 for t in rows for a in t['attempts'])}
source=j(E/'SOURCE.json');assert source['head']==C
receipts=[]
for p in sorted(E.glob('*-exit.json')):
 d=j(p);assert d['sourceBefore']==d['sourceAfter'] and d['sourceBefore']['head']==C and not d['sourceChanged'] and not d['sourceBefore']['sourceDiff'];receipts.append({'evidence':rec(p),**d})
byname={x['name']:x for x in receipts}
log=(E/'combined-check.log').read_text();parts=list(map(int,re.findall(r'ℹ tests (\d+)',log)))+list(map(int,re.findall(r'Tests\s+(\d+) passed',log)));assert parts==[59,21,1275,117] and sum(parts)==1472
arch,_=json.JSONDecoder().raw_decode(log[log.index('{\n  "errors"'):])
moduleFile=E/'modules-browser-results.json';portfolioFile=E/'portfolio-browser-results.json'
if not portfolioFile.exists():portfolioFile=E/'portfolio-meri-browser-results.json'
browsers={};allrows=[]
for name,prefix,p in [('modules','apps/web/test/browser',moduleFile),('portfolio','apps/web/tests/browser',portfolioFile)]:
 if p.exists():
  b=j(p);rows=flatten(b,prefix);allrows+=rows;browsers[name]={'status':'result_available','resultEvidence':rec(p),'stats':b['stats'],'records':len(rows),'outcomes':outcomes(rows),'workers':b['config']['workers'],'projectRetries':[x['retries'] for x in b['config']['projects']],'tests':rows}
 else:browsers[name]={'status':'pending','noPassClaim':True}
base=j(O.parent/'checkpoint-104495d/report.json');coverage=[]
for old in base['coverage']:
 row={k:v for k,v in old.items() if k not in ['mappedResultRecords','mappedOutcomeCounts','matchedCompletedResults','pendingResultFiles','status']};row['mappedResultRecords']=[t for t in allrows if t['source'] in row['testFiles']];row['mappedOutcomeCounts']=outcomes(row['mappedResultRecords']);row['pendingSuiteFiles']=[f for f in row['testFiles'] if browsers['modules' if f.startswith('apps/web/test/browser') else 'portfolio']['status']=='pending'];row['status']='pending_fresh_browser_results' if row['pendingSuiteFiles'] else 'source_and_completed_bounded_evidence';coverage.append(row)
archive=j(O/'archive-verification.json');rootReceipt=j(pathlib.Path('/tmp/capiro-source-adbc84b/SOURCE-ARCHIVE-RECEIPT.json'));assert rootReceipt['archiveSHA256']==archive['sha256'] and rootReceipt['trackedBlobs']==archive['gitFileCount']==9191
archiveSummary={k:v for k,v in archive.items() if k!='files'};archiveSummary['modeVerification']={'gitMode100644':9191,'zipDOSDefaultRegular':9191,'executables':0,'symlinks':0,'acceptedSemantics':'DOS create_system0/external_attr0 regular entries preserve this all100644 source; Unix permissions are not claimed.'};archiveSummary['rootReceiptMatches']=True
ssr=j(E/'elements-ssr/receipt.json');ssrChecks=[]
for key,basepath in [('sources',R),('outputs',E/'elements-ssr')]:
 bad=[]
 for f in ssr[key]:
  p=basepath/f['path']
  if h(p)!=f['sha256'] or p.stat().st_size!=f['bytes']:bad.append(str(p))
 assert not bad;ssrChecks.append({'kind':key,'count':len(ssr[key]),'mismatches':bad})
transportTests=[(i+1,line.strip()) for i,line in enumerate((R/'packages/qualification-transport/qualification.test.mjs').read_text().splitlines()) if line.startswith('test(')]
# Sources reviewed in prior exact-runtime audit are byte-pinned afresh; no previous run result is promoted.
sourcepins=[]
for x in base['sourceFiles']:
 p=pathlib.Path(x['path']);sourcepins.append(rec(p))
for f in ['.dockerignore','scripts/docker-context-regression.mjs','scripts/deployment-cli.test.mjs','package.json']:
 sourcepins.append(rec(R/f))
production={}
if (E/'BUILD-IDENTITY.json').exists():production['buildIdentity']=j(E/'BUILD-IDENTITY.json')
if (E/'BUILD_ID').exists():production['buildId']=(E/'BUILD_ID').read_text().strip()
for name in ['production-smoke.json','preview-root-smoke.json','manual-visual-review.json']:
 p=E/'production-artifacts'/name
 if p.exists():production[name]={'evidence':rec(p),'data':j(p)}
docker={}
p=pathlib.Path('/tmp/capiro-remaining-docker-evidence/context-frozen-adbc84b/report.json')
if p.exists():
 dc=j(p);assert dc['sourceCommit']==C and dc['buildExitCode']==0 and all(x['passed'] for x in dc['checks']);docker['context']={'evidence':rec(p),'checks':len(dc['checks']),'requiredApplicationFiles':dc['requiredApplicationFiles'],'scope':dc['scope'],'passed':True}
planned=['clean-install','combined-check','elements-prepare','elements-check-new-capture','production-build','actual-production-server','modules-browser','portfolio-browser','docker-context','docker-build','docker-smoke']
# Aliases preserve root naming; missing result/receipt is pending, never inferred from plans.
alias={'portfolio-browser':['portfolio-browser','portfolio-meri-browser'],'actual-production-server':['production-server','actual-production-server'],'docker-build':['docker-build-existing-host-network','docker-build']}
status=[]
for name in planned:
 match=next((byname[k] for k in alias.get(name,[name]) if k in byname),None);status.append({'gate':name,'status':'passed' if match and match['exitCode']==0 else 'failed' if match else 'pending','receipt':match['evidence'] if match else None})
d={'schema':'capiro-independent-successor-gate-review/1','reviewedAtUTC':now,'status':'partial_qualification_in_progress' if any(x['status']=='pending' for x in status) else 'gate_results_available','source':source,'method':'Read-only raw evidence/source/archive audit; no heavy gates or runtime commands executed by reviewer.','gateStatus':status,'gateReceipts':receipts,'combined':{'parts':parts,'total':sum(parts),'rootNodeIncludesNineMeriWorkspaceCases':True,'rootNodeNewCase':'Docker context regression is import-safe and refuses invalid or reused outputs before allocation','lint':{'errors':0,'warnings':76},'architecture':{'errors':arch['errors'],'sizeSummary':arch['sizeSummary']}},'elements':{'initialExit':byname.get('elements-check',{}).get('exitCode'),'initialObserved':'13passed/2failed due EEXIST reused capture directory; preserved','retryExit':byname.get('elements-check-new-capture',{}).get('exitCode'),'retryObserved':'15passed/0failed with new elements-captures directory; no source change','receipt':rec(E/'elements-ssr/receipt.json'),'hashChecks':ssrChecks,'scope':ssr['scope']},'browserSuites':browsers,'production':production,'docker':docker,'archive':archiveSummary,'coverage':coverage,'publicTransportSourceCases':transportTests,'sourceFiles':sourcepins,'evidenceFiles':[rec(p) for p in sorted(E.iterdir()) if p.is_file() and p.suffix in ['.json','.log']],'previousCheckpoint':'../checkpoint-104495d/report.json','sourceDelta':{'attendance':'Added explicit Information navigation and empty current Preparation attachment GET fixture; existing assertions retained.','docker':'Removed recursive **/work ignore while keeping root work excluded, added actual context regression and import/input controls.','runtimeSourceTree':'57fad76b58a59f8d3c2f35155201e7524d713539','runtimeSourceMatches104495d':True},'limits':['Fresh pending browser/build/container gates are not inherited from104495d.','1118-case suite is Portfolio; no full Meri browser product acceptance claimed.','Synthetic identities, writes and provider-shaped endpoints are not native authorization/persistence/provider acceptance.','No immutable full-file Figma baseline; full CR10 composer rendering still clipped.','Keyboard and geometry tests are bounded; no full accessibility/device certification.','Native337-row acceptance, deployment, live environment and shipping remain separate.']}
(O/'report.json').write_text(json.dumps(d,indent=2)+'\n')
if not (O/'initial-partial-snapshot.json').exists():(O/'initial-partial-snapshot.json').write_text(json.dumps({'time':now,'gateStatus':status,'browserSuites':{k:{kk:vv for kk,vv in v.items() if kk!='tests'} for k,v in browsers.items()}},indent=2)+'\n')
lines=['# Independent successor audit: adbc84b','',f'As of {now}, this is **partial qualification evidence**. Pending gates are not passes. The failed104495d checkpoint remains preserved separately.','',f'Source `{C}`; root tree `{source["rootTree"]}`; application tree `{source["applicationTree"]}`; runtime source `{source["runtimeSourceTree"]}`. Every completed receipt reviewed so far pins unchanged source before/after.','', '| Gate | Current observed status |','| --- | --- |']
for x in status:lines.append('| '+x['gate']+' | '+x['status']+' |')
lines+=['','Raw combined counts independently verify **1,472 = 59 + 21 + 1,275 + 117**. Elements15 is separate. Architecture:0 boundary errors;427 signals,403 reviewed,24 inherited unreviewed,0 blocking. Lint:0 errors,76 warnings.','', 'The first Elements attempt retains13 passed/2 failed because its capture root already existed. The unchanged-source fresh-directory retry passes15/15. Both receipts/logs are retained; this is a configuration correction, not an erased failure.','', '## Archive verification','',f'ZIP **9,191 files**,841,124,429 bytes, SHA256 `{archive["sha256"]}`. Independently compared every path and decompressed Git blob, with no missing/extra/duplicate files or content mismatches; every CRC read succeeded. ZIP commit comment matchesadbc84b and the archive stayed unchanged during inspection. Full per-file results: `archive-verification.json`.','', 'All9,191 Git modes are100644; all ZIP file entries use DOS regular defaults (`create_system=0`, `external_attr=0`). There are no executable or symlink files whose modes would be lost. This is valid regular-file equivalence, not a claim that Unix permission attributes exist. The root receipt matches the independently calculated hash/count; its initial strict-mode validator failure remains preserved.','', '## Coverage and scope','', 'The prior read-only source coverage map remains applicable to the unchanged runtime source tree, but **fresh test results are required**. `report.json` binds selected source/test paths, exact results when available and pending suite files. No104495d passing browser result is reused as adbc84b qualification.','', '- Cross-mode/back-forward: actual Next shell controls and synthetic shared-boundary integration are distinct.','- Sign-out/expiry and tenant/client replacement: fixture identity/service transitions test frontend lifetime; live Clerk/server authorization remains separate.','- Interrupted writes: mocked holds/loss/recovery and current-read controls do not establish native durability, CAS, storage or provider effects.','- Desktop/mobile/accessibility: geometry/keyboard/focus assertions and screenshots are bounded; comprehensive WCAG, screen-reader, touch/zoom or cross-browser acceptance is not claimed.','- Figma: original captured evidence remains authoritative; full composer435:82802/435:82147 rendering and immutable full-file baseline remain unresolved.','- Public packages/transport: real factory/public writer/external Chat compose offline with injected fetch; Elements qualifies restricted SSR, not live Meri/runtime/model behavior.','', 'The1118 browser suite is Portfolio. Meri has9 Node workspace cases within59,21 transport controls, asset checks and shared-mode/Next shell coverage; this is not full Meri browser interaction qualification.','', 'The Docker context regression is scratch COPY/BuildKit admission only. Both current application image build attempts failed at Alpine APKINDEX DNS/package selection; the host-network/proxy retry is retained separately. Image smoke has no successful image and remains unrun. No deployed environment or shipping claim follows from the passing context regression.']
(O/'report.md').write_text('\n'.join(lines)+'\n');print(json.dumps({'time':now,'gateStatus':status,'archivePassed':archive['passed']},indent=2))
