from pathlib import Path
import json,hashlib,datetime,subprocess,re,difflib
root=Path('/workspace/capiro-meri-workflow-20261013')
prior=Path('/tmp/capiro-meri-workflow-evidence/checkpoint-ui-only')
out=Path('/tmp/capiro-meri-workflow-independent-review-20261013')
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(n,d):(out/n).write_text(json.dumps(d,indent=2)+'\n')
def snap(p,n):
 q=out/n;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(p.read_bytes());return {'path':str(p),'snapshot':n,'bytes':q.stat().st_size,'sha256':sha(q.read_bytes())}
manifest=json.loads((prior/'MANIFEST.json').read_text());verified=[]
for record in manifest['entries']:
 f=prior/record['path'];b=f.read_bytes();assert len(b)==record['bytes'] and sha(b)==record['sha256'];verified.append(record['path'])
u=json.loads((prior/'unit-receipt.json').read_text());assert u['sourceBefore']==u['sourceAfter'] and not u['sourceChanged'] and u['exitCode']==0
source=[]
for record in u['sourceBefore']:
 f=root/record['path'];b=f.read_bytes();original=(prior/'source'/record['path']).read_bytes()
 if record['path']=='apps/web/src/features/meri/actions/workflow.module.css':
  removed=b'.button:focus-visible,\n.field input:focus-visible {\n  outline: 2px solid var(--ring);\n  outline-offset: 3px;\n}\n'
  assert original.count(removed)==1 and original.replace(removed,b'',1)==b
  assert sha(b)=='f4a68e2aebbcd541c83eea43cf2b6a8b8dd3c5b868afa1300f23213dbf229eee'
  snap(prior/'source'/record['path'],'original/workflow.module.css')
  (out/'FOCUS-CORRECTION.patch').write_text(''.join(difflib.unified_diff(original.decode().splitlines(True),b.decode().splitlines(True),fromfile='checkpoint/workflow.module.css',tofile='current/workflow.module.css')))
 else:
  assert len(b)==record['bytes'] and sha(b)==record['sha256'] and b==original
 source.append(snap(f,'source/'+record['path']))
additional=[]
for rel in ['apps/web/src/app/globals.css','apps/web/src/app/layout.tsx','packages/ui/src/shadcn/button.tsx']:
 additional.append(snap(root/rel,'context/'+rel))
for n in ['REPORT.md','MANIFEST.json','unit-receipt.json','controller-unit.log','STRUCTURE-REVIEW.json','handoff-bindings.json']:
 additional.append(snap(prior/n,'author/'+n))
for n in ['contracts-readme.json','handoff-0.json','handoff-3.json','handoff-4.json']:
 p=Path('/tmp/capiro-meri-workflow-evidence/handoff')/n;additional.append(snap(p,'handoff/'+n))
# Reading tracked and untracked source only; no test, application or server is executed.
head=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD']).decode().strip();assert head=='d4be41e60516e576c74afa304b50ed67da15cb93'
status=subprocess.check_output(['git','-C',str(root),'status','--short']).decode()
(out/'WORKTREE-STATUS.txt').write_text(status)
cssDefs=[]
for base in [root/'apps/web',root/'packages/ui',root/'packages/qualification-elements']:
 for f in base.rglob('*.css'):
  if any(x in f.parts for x in ['node_modules','.next','test-results']):continue
  text=f.read_text()
  for i,line in enumerate(text.splitlines(),1):
   if re.search(r'--ring\s*:',line):cssDefs.append({'path':str(f.relative_to(root)),'line':i,'text':line})
assert not cssDefs
refs=[]
for f in (root/'apps/web/src').rglob('*'):
 if f.suffix not in ['.ts','.tsx','.mjs']:continue
 for i,line in enumerate(f.read_text().splitlines(),1):
  if re.search(r'MeriActionWorkflow|ActionWorkflowController|ActionWorkflowPort',line):refs.append({'path':str(f.relative_to(root)),'line':i,'text':line})
assert all('/meri/actions/' in x['path'] for x in refs)
dump('SOURCE-BINDING.json',{'reviewedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'baseCommit':head,'candidateState':'Uncommitted inactive additions; exact file hashes, not a candidate commit pin','sourceFiles':source,'contextAndEvidence':additional,'authorManifestVerifiedEntries':len(verified),'authorUnitControllerAndTestSourceMatchesCurrent':True,'sourceDeltaSinceUnitRun':'Only approved five-line CSS focus override deletion; nine other files byte-identical' ,'authorObservedTests':21,'reviewerExecutedTests':0,'sourceRefSearch':refs,'cssRingDefinitions':cssDefs,'sourceWrites':False,'runtimeActions':0,'networkOrNativeActions':0})
findings=[{'id':'MWF-01','severity':'P2 before workflow activation','state':'CORRECTED_SOURCE_REVIEW_ACCEPTED; original defect retained; browser not run','title':'Undefined focus token overrides the canonical keyboard outline','path':'apps/web/src/features/meri/actions/workflow.module.css','lines':[98,99,100,101],'originalSourceSha256':'692cf3f5ec282a291ece77f57d85d1334e0f9b09e8781f508bd2ead125b500c2','correctedSourceSha256':sha((root/'apps/web/src/features/meri/actions/workflow.module.css').read_bytes()),'observedCorrection':'The five-line local focus override was removed; current controls inherit the existing canonical globals.css outline. No shared style or controller/test changed.','evidence':'The owned selectors .button:focus-visible and .field input:focus-visible set outline:2px solid var(--ring). No --ring definition exists in application/UI CSS. RootLayout imports globals.css, whose valid blue focus rules have lower specificity. An unresolved var invalidates the winning outline at computed-value time, resetting the noninherited outline to its initial value, not falling back to the earlier declaration.','impact':'Keyboard buttons and inputs lose the intended visible focus outline when composed under current app styles. Inactive today; does not affect PR17 shipping source.','minimumCorrection':'Remove the unnecessary owned outline override to inherit the canonical focus styles, or use an explicitly defined token/fallback. Do not edit shared UI or invent a global design token for this bounded correction.','futureVerification':'At a leased browser gate, Tab through workflow buttons/title/date in current host styles and require an actual visible outline. Preserve native disabled state and pending/unknown fences.'}]
dump('FINDINGS.json',findings)
addendum=Path('/tmp/capiro-meri-workflow-evidence/focus-style-addendum')
am=json.loads((addendum/'MANIFEST.json').read_text())
for e in am.get('entries',[]):
 b=(addendum/e['path']).read_bytes();assert len(b)==e['bytes'] and sha(b)==e['sha256']
for n in ['MANIFEST.json','review.json','REPORT.md','source-hashes.json','focus-style.patch','format-check.log']:
 snap(addendum/n,'author-focus/'+n)
dump('CAPTURE-TIMING.json',{'initialCapture':'Initial assertion that all ten current files matched the checkpoint stopped at CSS after the owner applied the root-requested correction. This was a read-only capture synchronization guard, not a test execution or product failure.','finalCapture':'Verified exactly the approved five-line CSS deletion and all nine other files unchanged; source binding identifies the final uncommitted candidate.'})
print(json.dumps({'base':head,'sourceFiles':len(source),'manifestEntriesVerified':len(verified),'findingIds':[f['id'] for f in findings],'packet':str(out)},indent=2))
