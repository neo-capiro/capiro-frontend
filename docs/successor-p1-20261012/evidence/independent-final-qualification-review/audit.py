#!/usr/bin/env python3
"""Read-only final publication audit; writes evidence only beside this script."""
from pathlib import Path
import collections
import hashlib
import json
import re

R=Path('/workspace/capiro-p1-successor/docs/successor-p1-20261012')
O=Path(__file__).resolve().parent
PIN='d5dd0be9bf5ad7800e648ff1421ce047523288b3'
ROOT_TREE='7448658084841f7773144ce5d8714a19103e4ddd'
WEB='79deadc9fd0c74c3634d3acc3b026a6ac9087ffe'
SRC='32c0d89bf53037dbab4b611d7e25957b8b0caf9e'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda name:json.loads((R/name).read_text())
Q=read('QUALIFICATION.json');H=read('HANDOFF-STATUS.json');B=read('packaging/d5dd0be/BINDING.json')
assert Q['sourceCommit']==H['source']['commit']==B['sourceCommit']==PIN
assert Q['rootTree']==H['source']['rootTree']==B['rootTree']==ROOT_TREE
assert Q['gitSubtrees']==B['gitSubtrees']=={'apps/web':WEB,'apps/web/src':SRC}
assert Q['status']==H['qualification']==B['qualification']=='PASSED_BOUNDED_OFFLINE_GATES'
assert Q['offlineQualificationComplete'] is True
checks=[];evidence={}
def remember(name):
 evidence[name]={'sha256':sha(R/name),'bytes':(R/name).stat().st_size}
def gate_receipt(name):
 d=read(name);remember(name)
 assert d['exitCode']==0 and d['sourceChanged'] is False
 for state in ('sourceBefore','sourceAfter'):
  assert d[state]['head']==PIN and d[state]['tree']==ROOT_TREE and d[state]['applicationTree']==WEB and d[state]['sourceDiff']==''
 return d
for name in ('check','elements','modules','build','production'):
 gate_receipt('evidence/qualification-d5dd0be/'+name+'-exit.json')
final=gate_receipt('evidence/portfolio-d5dd-60s/portfolio-exit.json')
assert final['endedUTC']==Q['completedUTC']==H['completedUTC']
for arg in ('--workers=3','--timeout=60000','--retries=0'):assert arg in final['command']
def browser(name,count,gate):
 d=read(name);remember(name);tests=[]
 def walk(value):
  if isinstance(value,dict):
   if 'expectedStatus' in value and 'results' in value:tests.append(value)
   for child in value.values():walk(child)
  elif isinstance(value,list):
   for child in value:walk(child)
 walk(d)
 results=[r for t in tests for r in t['results']]
 assert len(tests)==len(results)==count
 assert all(r['status']=='passed' and r['retry']==0 and not r.get('errors') for r in results)
 assert d['stats']['expected']==count and d['stats']['skipped']==d['stats']['unexpected']==d['stats']['flaky']==0
 assert not d.get('errors') and d['stats']==Q['gates'][gate]['stats']
 assert sha(R/name)==Q['gates'][gate]['resultsSHA256']
 return {'tests':len(tests),'resultCounts':dict(collections.Counter(r['status'] for r in results)),'retries':dict(collections.Counter(r['retry'] for r in results)),'effectiveTimeouts':dict(collections.Counter(str(t['timeout']) for t in tests)),'workers':d['config']['workers']}
p=browser('evidence/portfolio-d5dd-60s/portfolio-results.json',996,'portfolioMeriBrowser')
m=browser('evidence/qualification-d5dd0be/modules-results.json',157,'modulesBrowser')
assert p['effectiveTimeouts']==Q['gates']['portfolioMeriBrowser']['effectiveCaseBudgetCounts']=={'60000':992,'180000':4}
assert p['workers']==3 and m['workers']==1
for gate,key,path in [('combinedCheck','logSHA256','evidence/qualification-d5dd0be/check.log'),('portfolioMeriBrowser','logSHA256','evidence/portfolio-d5dd-60s/portfolio.log'),('productionBuild','logSHA256','evidence/qualification-d5dd0be/build.log')]:
 remember(path);assert sha(R/path)==Q['gates'][gate][key]
log=(R/'evidence/qualification-d5dd0be/check.log').read_text()
for marker in ('ℹ tests 58','ℹ tests 21','Tests  1213 passed (1213)','Tests  94 passed (94)','76 problems (0 errors, 76 warnings)'):assert marker in log
assert sum(Q['gates']['combinedCheck'][k] for k in ('rootTests','transportTests','portfolioTests','gatewayTests'))==1386
for key,value in [('total',413),('reviewed',389),('inheritedUnreviewed',24),('blocking',0)]:assert re.search(r'"'+key+r'":\s*'+str(value),log)
assert 'added 847 packages' in (R/'evidence/qualification-d5dd0be/clean-install.log').read_text()
assert 'ℹ pass 15' in (R/'evidence/qualification-d5dd0be/elements.log').read_text()
smoke=read('evidence/qualification-d5dd0be/production/production-smoke.json');remember('evidence/qualification-d5dd0be/production/production-smoke.json')
assert len([x for x in smoke['results'] if 'path' in x])==11
assert len([x for x in smoke['results'] if 'viewport' in x])==4
assert len([x for x in smoke['results'] if 'crossMode' in x])==2
assert smoke['pageErrors']==[]
visual=read('evidence/independent-visual-d5dd0be/FINAL-SOURCE.json');remember('evidence/independent-visual-d5dd0be/FINAL-SOURCE.json')
assert visual['commit']==PIN and visual['all126ReviewedFilesUnchanged']
assert sum(x['expected'] for x in visual['runStats'].values())==15
assert all(x['unexpected']==x['skipped']==x['flaky']==0 for x in visual['runStats'].values())
archive=read('evidence/independent-source-d5dd0be/comparison.json');remember('evidence/independent-source-d5dd0be/comparison.json')
for key in ('archiveBytes','archiveSHA256','trackedBlobs','zipMembers','perMemberInventorySHA256'):assert Q['archive'][key]==B[key]==archive[key]
assert H['archive']['bytes']==B['archiveBytes'] and H['archive']['sha256']==B['archiveSHA256']
assert Q['acceptance']=={'nativePortfolioRowsAccepted':0,'nativePortfolioRowsHeld':337,'originalExclusions':8,'originalFindings':37,'sourceRepairs':10,'unchangedOpenFindings':27,'remainingHolds':'REMAINING-HOLDS.md'}
dispositions=read('FINDING-DISPOSITIONS.json')
assert len(dispositions['findings'])==37
assert sum(x['disposition']=='open_prior_acceptance_hold_unchanged' for x in dispositions['findings'])==27
assert H['nativeAcceptedRows']==B['nativePortfolioRowsAccepted']==0
assert H['nativeRowsHeld']==B['nativePortfolioRowsHeld']==337
assert B['shippingAuthorized'] is False and B['transfer']['libraryID'] is None
assert Q['library']['id'] is None and Q['library']['uploadCompleted'] is False
idx=read('evidence/qualification-d5dd0be/RUN-INDEX.json');remember('evidence/qualification-d5dd0be/RUN-INDEX.json')
assert 'NOT the final gate' in idx['portfolio'] and (R/'evidence/qualification-d5dd0be'/idx['finalPortfolioEvidence']).exists()
old=read('evidence/portfolio-d5dd-30s-history/STOP-DISPOSITION.json');remember('evidence/portfolio-d5dd-30s-history/STOP-DISPOSITION.json')
assert old['resultStatuses']=={'passed':144,'timedOut':1,'interrupted':4} and old['exit']==130
assert Q['historicalAttempts'][2]['portfolio']=={'passed':144,'timedOut':1,'interrupted':4,'unrun':847}
assert Q['historicalAttempts'][0]['passed']==671 and Q['historicalAttempts'][0]['failed']==4
pending=[x['id'] for x in dispositions['findings'] if 'qualification_pending' in x['disposition']]
findings=[]
if pending:findings.append({'id':'FINAL-DISPOSITION-01','path':'FINDING-DISPOSITIONS.json','finding':'Ten repaired findings still state combined_qualification_pending after final bounded offline qualification passed. Preserve native-unaccepted and27 open findings while updating these source-repair dispositions.','affectedIDs':pending})
summary={'status':'PASS_REQUESTED_FINAL_GATE_SUMMARIES' if not findings else 'REQUESTED_GATE_SUMMARIES_PASS_ONE_ADJACENT_DISPOSITION_CORRECTION','sourceCommit':PIN,'portfolio':p,'modules':m,'combinedTests':1386,'elements':15,'visual':15,'archive':Q['archive'],'historical30sFailurePreserved':True,'sourceUnchangedReceiptsVerified':True,'nativeRowsAccepted':0,'nativeRowsHeld':337,'remainingSourceDesignFindings':27,'shippingAuthorized':False,'libraryID':None,'findings':findings,'evidence':evidence,'packetManifest':'Intentionally excluded; parent regenerates after audit.','actions':{'tests':0,'browsers':0,'repositoryEdits':0,'processChanges':0}}
(O/'audit-result.json').write_text(json.dumps(summary,indent=2)+'\n')
for name in ['QUALIFICATION.json','README.md','HANDOFF-STATUS.json','packaging/STATUS.md','packaging/d5dd0be/BINDING.json','FINDING-DISPOSITIONS.json','evidence/qualification-d5dd0be/RUN-INDEX.json']:
 target=O/'reviewed-summaries'/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((R/name).read_bytes())
(O/'report.md').write_text('''The five requested final qualification/source summaries agree with the copied raw receipts. Portfolio996/996 and Modules157/157 have zero failures, skips, flakes and retries; every gate receipt binds unchangedd5dd source. The effective Portfolio budgets are992 cases at60seconds and four existing slow cases at180seconds. Logs/results hashes, combined1386 tests, Elements15, visual15, production11 HTTP+4 viewport+2 history checks, and archive identity agree. RUN-INDEX explicitly separates the preserved failed30-second attempt from the final996 result. Native337 rows,27 source/design findings and shipping/Library holds remain distinct.

'''+('One adjacent correction remains: FINDING-DISPOSITIONS.json still labels ten repaired findings combined_qualification_pending. Update those source-repair statuses to bounded offline qualification passed while retaining native-unaccepted/27 open holds.\n' if pending else 'No concrete inconsistency remains in this review scope.\n')+'\nNo tests, browsers, repository edits or process changes were performed. PACKET-MANIFEST is intentionally excluded pending parent regeneration.\n')
print(json.dumps({'status':summary['status'],'findings':len(findings),'portfolio':p,'modules':m},indent=2))
