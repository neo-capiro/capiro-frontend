from pathlib import Path
import json,hashlib,subprocess
from datetime import datetime,timezone
p=Path('/tmp/capiro-calendar-correction-independent');repo=Path('/workspace/capiro-calendar-native-status');now=datetime.now(timezone.utc).isoformat()
def save(name,obj):(p/name).write_text(json.dumps(obj,indent=2)+'\n')
def load(name):return json.loads((p/name).read_text())
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip();assert head=='dee19b106d87859b812bfccc10ef9387f90ad4be'
base='c305af13dd93cad2af18352b8a8b449e133a0fc2';tree=subprocess.check_output(['git','rev-parse','HEAD^{tree}'],cwd=repo,text=True).strip()
changed=subprocess.check_output(['git','diff','--name-only',base,'HEAD'],cwd=repo,text=True).splitlines()
rows=[]
for name in changed:
 b=(repo/name).read_bytes(); rows.append({'path':name,'sha256':hashlib.sha256(b).hexdigest()}); dest=p/'final-source'/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(b)
source={'baseCommit':base,'commitChain':['01cba25e85f1e82c731e65191c98b1de4e9d48de',head],'finalCommit':head,'tree':tree,'changedFiles':rows}
save('final-source-pin.json',source)
subprocess.run(['git','diff',base,'HEAD','--',*changed],cwd=repo,stdout=(p/'reviewed-final.patch').open('w'),check=True)
old=load('reviewed-production-hashes.json');current={r['path']:r['sha256']for r in rows}
assert old[0]['sha256']==current[old[0]['path']] and old[2]['sha256']==current[old[2]['path']]
assert load('parser-native-before-results.json')['numFailedTests']==6
assert load('parser-after-results.json')['numPassedTests']==39
assert load('caption-before-results.json')['stats']['unexpected']==2
assert load('final-browser-results.json')['stats']['expected']==8 and load('final-browser-results.json')['stats']['unexpected']==0
summary={
 'reviewedAt':now,'reviewer':'Independent Codex /root/objectives_work_intel_review','decision':'Accept exact final bounded frontend correction for root integration and combined qualification','source':source,
 'results':{'independentParserBefore':{'passed':33,'failed':6,'total':39,'file':'parser-native-before-results.json'},'independentParserAfter':{'passed':39,'failed':0,'total':39,'file':'parser-after-results.json','sourceBinding':'Contracts and meeting-save bytes unchanged between 01cba25 and final dee19b1; recorded hashes bind final source.'},'captionBefore':{'passed':0,'failed':2,'file':'caption-before-results.json','commit':'01cba25e85f1e82c731e65191c98b1de4e9d48de'},'finalBrowser':{'passed':8,'failed':0,'skipped':0,'flaky':0,'file':'final-browser-results.json','commit':head},'totalFinalIndependentPassingControls':47},
 'correctionsReviewed':[
  {'file':'apps/web/src/features/portfolio/calendar/artifacts/contracts.ts','reason':'Creation requires native notes draft/debriefs generated; both updates require edited. Note save requires null approval stamps. Current creation author is checked, while nullable/different update author remains valid. Note approval requires current approver/time; debrief approval uses status only. Share permits nullable preserved original attribution while retaining selected artifact/meeting/client binding, approved status, confidentiality, sharedAt and shared visibility; unshare requires both selected share stamps cleared without requiring globally private meeting.'},
  {'file':'apps/web/src/features/portfolio/calendar/MeetingArtifacts.tsx','reason':'Generation retains role/runtime-owned visible-disabled entries while pending/uncertain artifact writes suppress new drafts. Saved nonconfidential card caption distinguishes undefined sharing metadata from explicit null: unavailable versus private; timestamp is shared. Missing debrief GET stamps are not fabricated, normalized to null, or used to enable Unshare.'},
  {'file':'apps/web/src/features/portfolio/calendar/MeetingForm.tsx','reason':'Existing No client edit sends clientId:null, causing native clear semantics; old-association receipt fails existing parser. New unscoped create omits clientId and accepts backend inference. No native association algorithm is reproduced in browser.'}
 ],
 'browserControls':['Native notes and generated debrief creation each dispatch one intercepted POST and close successfully on metadata-only receipt.','Portal role keeps all four generation entries visible disabled and dispatches no action.','No client existing edit sends explicit null; cleared native response succeeds, old association retains locked draft and reports uncertain completion.','New unscoped meeting omits clientId and accepts native-inferred client.','Notes/debrief idempotent share accepts nullable original sharer with actual operation metadata; native debrief GET continues to omit stamps, shows unavailable caption, and cannot fabricate Unshare.'],
 'nativeContractEvidence':'backend-contract-review.json','architectureReview':'architecture-review.json','testStructureReview':'test-structure-review.json',
 'remainingLimitations':[
  'Pinned native listMeetingDebriefs omits sharing stamps. Full native shared/unshare list presentation remains unavailable; corrected UI explicitly reports Sharing status unavailable. No backend fix, endpoint or metadata invention was performed.',
  'All requests in browser controls are synthetic intercepted localhost fixtures structurally derived from pinned native source. This is not live/native authorization, encrypted-content, provider, durability or deployment acceptance. No backend/provider/paid-model/AWS operations were performed.',
  'Root owns final exact architecture registry recording, integrated gates and successor pin. Earlier 49f/c305 incompatible source and draft-only debrief greens are not accepted retroactively.'
 ],
 'provenance':{'preliminaryParser':'parser-before-results.json / preliminary-parser.spec.ts preserve the first exploratory 33-pass/6-fail run; parser-native-before uses fully stamped positive approved-note fixtures and reproduces the same failures. No corrected setup failure is counted as product red evidence.','firstBrowser':'native-browser-results.json / action-plumbing-browser.spec.ts preserve 8 passes on 01cba25 before the missing-caption assertion was introduced. They qualify action plumbing only, superseded by final-browser for final UI acceptance.','ownerReportedNotIndependentlyReplayed':'Owner reports 59 unit controls, 62 affected browser cases and 17 final receipt/caption cases; these are not added to the 47 independent count. Owner clear-client red2/green3 and original generated/portal reds remain in owner evidence; root retains canonical parent reproduction825c56e51ffd385ea9be30255a0f1784505740d6713b8925477f8883d2a4e5df.'}}
save('review-summary.json',summary)
(p/'report.md').write_text('''# Independent Calendar native-contract correction review

Accepted for bounded frontend repair: final commit `dee19b106d87859b812bfccc10ef9387f90ad4be`, following `01cba25e85f1e82c731e65191c98b1de4e9d48de` from `c305af13dd93cad2af18352b8a8b449e133a0fc2`. The final source tree is `bc279628fc582a0b730a6375b5c31e607be4e729`.

47 independent controls pass: 39 native-derived parser cases and 8 browser cases on final source. Parser controls first reproduced six real failures (33/39): generated debrief rejection, impossible draft debrief acceptance, stale note creation/edit approval stamps, and rejected nullable original-share attribution for both kinds. The same native-compatible controls pass 39/39 after correction. Two further native debrief GET controls reproduced false “Private” captions on 01cba25; final browser replay passes 8/8 with no skips or flakes and verifies “Sharing status unavailable” instead.

Read-only pinned backend `243248e726243c44bd4b9d24fd1ed220da18c56a` establishes these distinctions:

| Operation | Notes | Debriefs |
| --- | --- | --- |
| Create | draft; current author; null approval/share stamps | generated; current author; null share stamps; no approval columns |
| Edit | edited; approval/share stamps cleared; author preserved | edited; share stamps cleared; author preserved |
| Approve | approved with current actor/time, including reapproval | approved status only |
| Share | Decorated meeting; approved selected artifact; original attribution preserved and nullable after user deletion | Same action-specific metadata semantics |
| Unshare | Selected share stamps null; meeting may stay shared for other artifacts | Same semantics |

The parser keeps exact meeting/client/artifact binding. It does not demand metadata fields the backend does not return, raw plaintext equality, or a current author on admin edits. The form now sends explicit `clientId:null` for an existing No client edit. Independent browser controls verify both successful clearing and refusal of an old-association receipt. New unscoped creation still omits clientId and accepts backend inference. Portal generation entries remain visible disabled without action dispatch.

Native GET /debriefs omits sharing stamps. That unfinished read contract remains explicit: missing metadata renders “Sharing status unavailable,” and no Unshare action is fabricated. The native share endpoint remains available as an explicit action. Earlier receipt scenario fixtures that bridge debrief shared-list state are labeled synthetic and do not qualify this native read gap.

`final-source-pin.json` and `reviewed-final.patch` bind all final changed files. `backend-contract-review.json` gives exact pinned source references; raw source is under `backend/`. `review-summary.json` maps every raw result and explains the preserved exploratory/parser and initial action-plumbing runs. Owner results are reported separately and are not added to the 47 independent count.

Exact size reviews are accepted in `architecture-review.json`: ArtifactEditor 248 lines, fingerprint `135be5833c25496b9f9202ff0d8743f7121644a1c559fbfa43f1b1a4ad8c99c8`; its saved-card renderer 85 lines, `484085a8fe816be1488594d9b8f225fe3eccb69ccc11867afda41001d28333b5`; MeetingForm 181 lines, `c15bf22c62730c9bfb3f3332b50b858f2d3b9a2b52c47c074f7153965a466543`. The 407-line cohesive artifact regression module is reviewed in `test-structure-review.json`. Independent architecture scan finds no boundary errors. Root owns registry recording and integrated qualification.

All browser requests are synthetic intercepted fixtures. No native/backend writes, provider calls, paid-model calls, AWS actions, deployment, application edits or shared registry edits were performed by this reviewer. These results do not establish live authority, durability or native execution, and do not retroactively accept the failed 49f source.
''')
files=[]
for f in sorted(p.rglob('*')):
 if not f.is_file() or f.name=='SHA256-MANIFEST.json' or any(x in {'node_modules','.cache','.vite'} for x in f.parts):continue
 b=f.read_bytes();files.append({'path':str(f.relative_to(p)),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
save('SHA256-MANIFEST.json',{'createdAt':now,'fileCount':len(files),'files':files})
print(json.dumps({'commit':head,'tree':tree,'finalIndependentPasses':47,'manifestFiles':len(files),'manifestSha256':hashlib.sha256((p/'SHA256-MANIFEST.json').read_bytes()).hexdigest()},indent=2))
