#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

OUT=Path(__file__).resolve().parent
REPO=Path('/workspace/capiro-p1-successor')
PIN='d5dd0be9bf5ad7800e648ff1421ce047523288b3'
rows=[json.loads(line) for line in (OUT/'test.trace').read_text().splitlines()]
before={row['callId']:row for row in rows if row['type']=='before'}
after={row['callId']:row for row in rows if row['type']=='after'}
ids=[('pw:api@43','Navigate to activity fixture'),('pw:api@52','Save initial uncertain command'),('expect@55','Poll confirms exactly one saved pair'),('expect@62','Recovery read enabled'),('pw:api@63','Navigate to client profile'),('expect@65','Initial retained title'),('expect@74','Initial retained details'),('expect@75','Initial retained request ID'),('expect@76','Initial recovery read enabled'),('pw:api@77','Close dialog'),('expect@78','Dialog absent'),('pw:api@80','Reopen via Quick log link'),('expect@81','Fresh authority read starts'),('expect@83','Exactly one POST before authority release'),('pw:api@84','Capture held-authority screenshot'),('expect@85','Title absent while authority held'),('expect@86','Request ID absent while authority held'),('expect@87','Released authority restores title'),('expect@91','Released authority restores details'),('expect@92','Released authority restores request ID visibility'),('expect@94','Recovery read enabled after release'),('expect@95','Exactly one POST after reopen')]
chronology=[]
error_index=next(i for i,row in enumerate(rows) if row['type']=='error')
for call,label in ids:
 b,a=before[call],after[call]
 chronology.append({'callId':call,'step':label,'startTraceMs':b['startTime'],'endTraceMs':a['endTime'],'durationMs':round(a['endTime']-b['startTime'],3),'recordedError':a.get('error'),'endedAfterGlobalTimeoutEvent':rows.index(a)>error_index,'stack':b.get('stack')})
(OUT/'chronology.json').write_text(json.dumps(chronology,indent=2)+'\n')
prior=[]
for short in ('943d90c','49f6609'):
 p=Path('/tmp/capiro-successor-qualification')/('final-'+short)/'portfolio-results.json'
 d=json.loads(p.read_text())
 def walk(value):
  if isinstance(value,dict):
   if value.get('file')=='activity-command-reopen.spec.ts' and 'specs' in value:
    prior.append({'source':short,'reportPath':str(p),'suite':value})
   for child in value.values():walk(child)
  elif isinstance(value,list):
   for child in value:walk(child)
 walk(d)
(OUT/'prior-control-results.json').write_text(json.dumps(prior,indent=2)+'\n')
paths=['apps/web/tests/browser/activity-command-reopen.spec.ts','apps/web/tests/browser/activity-command-recovery-fixtures.ts','apps/web/tests/browser/activity-command-fixtures.ts','apps/web/src/features/portfolio/client-profile/QuickLog.tsx','apps/web/src/features/portfolio/client-profile/quick-log/useCommandRecovery.ts','apps/web/src/features/portfolio/client-profile/quick-log/useFollowUpCommand.ts','apps/web/src/features/portfolio/client-profile/quick-log/command-recovery.ts','apps/web/playwright.config.ts']
source=[]
for name in paths:
 raw=subprocess.check_output(['git','--no-replace-objects','-C',str(REPO),'show',PIN+':'+name]);p=OUT/'source'/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
 assert raw==(REPO/name).read_bytes()
 source.append({'path':name,'sha256':hashlib.sha256(raw).hexdigest(),'gitBlob':subprocess.check_output(['git','--no-replace-objects','-C',str(REPO),'rev-parse',PIN+':'+name]).decode().strip()})
assert subprocess.check_output(['git','--no-replace-objects','-C',str(REPO),'diff','--name-only','943d90c459998dac4ac90a462bf5a9c880d6a736',PIN,'--','apps/web'])==b''
(OUT/'source-bindings.json').write_text(json.dumps({'sourceCommit':PIN,'sourceFiles':source,'appsWebIdenticalTo943d90c':True},indent=2)+'\n')
run=Path('/tmp/capiro-successor-qualification/final-d5dd0be')
for name in ('portfolio-running.json','modules-running.json','check-running.json'):
 if (run/name).exists():shutil.copy2(run/name,OUT/name)
# Preserve only the already-emitted lines for this case; the parent owns the live report.
lines=(run/'portfolio.log').read_text().splitlines()
(OUT/'portfolio-failure-log-excerpt.txt').write_text('\n'.join(line for line in lines if 'activity-command-reopen' in line or '996 tests' in line or '--workers=4' in line)+'\n')
review={'status':'GLOBAL_TEST_BUDGET_EXHAUSTION_CONFIRMED','sourceCommit':PIN,'fullRunResult':'Preserved failed/timed-out execution; this review does not qualify it','observedSemanticAssertionFailure':False,'observations':['Held-authority screenshot shows only recovery-checking text, no retained Title/body/request ID.','Fresh authority read and exactly-one-POST assertions pass before screenshot.','Title and request-ID absence checks pass after screenshot, before release.','After release, retained title/details pass before timeout; request-ID visibility, Read saved command enabled and final exactly-one-POST check finish without recorded error just after the global timeout event.','The only final reported error is Test timeout of 30000ms exceeded; earlier poll subattempt mismatches are expected and their parent poll succeeds.'], 'expensiveSpansMs':{row['step']:row['durationMs'] for row in chronology if row['callId'] in ['pw:api@43','pw:api@63','pw:api@77','pw:api@80','pw:api@84']},'resourcePressure':'Consistent with slow actionability/rasterization and concurrent4-worker Portfolio plus Modules/static jobs. Causal CPU saturation is inferred, not measured by this trace.','sourceAssessment':'Reopen token changes during render; retained state remains gated by current authority readiness. Source and observed protected/restored states agree. No source fix supported by this failure.','priorEvidence':{'943d90c':{'durationMs':26394,'status':'passed','sameAppsWebTree':True},'49f6609':{'durationMs':22148,'status':'passed','sameControl':True,'sameEntireAppClaimed':False}},'recommendedDisposition':{'agreesWithParentPlan':True,'preserveFailedRun':True,'rerunScope':'All996 Portfolio cases on unchanged d5dd0be','workers':3,'testTimeoutMs':60000,'expectTimeoutMs':5000,'retries':0,'explicitActionTimeoutConfigChanged':False,'effectiveActionBudgetNote':'Actions use timeout0 and inherit the remaining global test budget; increasing test timeout increases their possible effective duration.','qualificationCondition':'New complete full-suite report must pass. A targeted replay alone is not full qualification.','sourceOrAssertionEdits':False},'reviewActions':{'additionalBrowserRuns':0,'stoppedOrRestartedRuns':0,'sourceEdits':0,'timeoutEdits':0,'cloudActions':[]}}
(OUT/'review.json').write_text(json.dumps(review,indent=2)+'\n')
(OUT/'report.md').write_text('''The failure is exhaustion of the global30-second test budget; the trace records no failed product assertion. Preserve this execution as timed out, not passed.

The protected-state screenshot shows only “Checking saved follow-up recovery…” while the fresh identity request is held. The Title/request-ID absence checks then pass. After release, the retained title and details pass before the timeout event; request-ID visibility, the enabled recovery-read button and exactly one POST finish without an assertion error immediately afterward. The error-context snapshot shows the correctly restored retained command. Initial polling subattempt mismatches are transient; their parent assertion passes.

Key elapsed spans from test.trace:

| Step | Duration |
| --- | ---: |
| Fixture navigation | 4.526s |
| Client-profile navigation | 4.647s |
| Close click | 4.988s |
| Reopen click | 2.490s |
| Held-authority screenshot | 5.703s |

Close waits4.367s for visible/enabled/stable; reopen waits1.978s. The screenshot reports fonts loaded within20ms, then takes roughly5.6s more. These are consistent with scheduling/rendering pressure. CPU saturation was not measured by the trace, so resource contention remains an inference. The observed4-worker Portfolio run and reported concurrent Modules/static work support that inference.

Matching source: activity-command-reopen.spec.ts:24 deliberately holds /core/me; lines33–39 capture/check the hidden state before finally releasing. useCommandRecovery.ts:36–56 invalidates activation on reopen during render; lines59–87 verify authority before installing retained state; lines109–117 gate readiness by current token. useFollowUpCommand.ts:96 exposes pending data only after readiness. QuickLog.ts:53–66 renders the checking message instead of the form. The source and trace agree.

The identical control passed in26.394s on943d90c; its entire apps/web tree is identical to d5dd0be. It also passed in22.148s on49f6609; that is corroborating control history, not a claim that the entire earlier application is identical.

Agree with the parent's explicit execution-only recovery plan: retain the failed run, rerun all996 Portfolio tests on unchanged d5dd0be with3workers, a60-second total test budget and retries0, and require a complete green report. The5-second expect deadline stays unchanged. Action-specific settings stay unchanged, but actions use timeout0 and inherit the total test budget, so their effective available time increases. Do not call a targeted replay a replacement for full qualification. No source/test assertion change is supported by this failure.

This reviewer inspected raw trace/network/screenshots and source only. No browser was launched, run interrupted, timeout changed, source edited or cloud action performed. Exact chronology, historical controls, source snapshots and original failure evidence are included.
''')
print(json.dumps({'status':review['status'],'chronologySteps':len(chronology),'sourceFiles':len(source)},indent=2))
