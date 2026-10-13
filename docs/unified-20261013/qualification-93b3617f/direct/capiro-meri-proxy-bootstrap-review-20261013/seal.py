import pathlib,json,hashlib,datetime,difflib,shutil
repo=pathlib.Path('/workspace/capiro-meri-workflow-20261013'); out=pathlib.Path('/tmp/capiro-meri-proxy-bootstrap-review-20261013'); sha=lambda b:hashlib.sha256(b).hexdigest()
first=json.loads((out/'before-results.json').read_text()); final=json.loads((out/'final-results.json').read_text()); receipt=json.loads((out/'final-receipt.json').read_text()); structure=json.loads((out/'final-test-structure.json').read_text())
assert receipt['sourceBefore']==receipt['sourceAfter']
relevant={'config.ts','proxy.ts','session-bootstrap.ts','session-receipt.ts','bounded-json.ts','meri-action-proxy.test.ts','meri-action-bootstrap.test.ts','route.ts'}
changed=[]
for x in receipt['sourceAfter']:
 actual=sha((repo/x['path']).read_bytes())
 if actual!=x['sha256']:
  assert pathlib.Path(x['path']).name not in relevant
  changed.append({'file':x['path'],'runSHA256':x['sha256'],'currentSHA256':actual})
(out/'concurrent-root-changes.json').write_text(json.dumps({'changesAfterRunOutsideTestImportClosure':changed,'relevantSourceAndTestsStillExact':True},indent=2)+'\n')
for name in ['proxy.ts','bounded-json.ts']:
 before=(out/'before-source'/name).read_text(); after=(out/'final-source'/name).read_text();(out/(name+'-root-correction.patch')).write_text(''.join(difflib.unified_diff(before.splitlines(keepends=True),after.splitlines(keepends=True),fromfile='before/'+name,tofile='final/'+name)))
records=[]
for module in structure:
 for f in module['sizeFindings']:
  if f['kind']=='file':reason='One cohesive five-route server proxy contract fixture: configuration/admission, native versus opaque credential forwarding, bounded response handling and request disposal. Tiny request/deferred helpers are shared by these cases. Splitting would duplicate one transport fixture; no unrelated feature/provider mock or production algorithm is reproduced.'
  elif 'proxy' in module['file']:
   reason={'<anonymous> #2':'Describe declaration group for off-default configuration and literal POST/path/origin/encoding admission. Independent examples require no-auth/no-fetch refusals.','<anonymous> #3':'Describe declaration group for bearer separation, header isolation, preserved outcomes, malformed/oversized bodies and response release, all on the same proxy boundary.','<anonymous> #4':'Describe declaration group for request lifetime: pre-abort, parked token, dispatched cancellation and stalled body deadline. Deterministic deferred barriers and fake time; no sleeps/retries.'}[f['symbol']]
  else:
   reason={'<anonymous> #2':'Describe declaration group for same-origin bootstrap intent, optional strict hints, immutable server receipt and captured client/conversation/run correlation. Fixtures describe the published minimal receipt, not a second validator.','<anonymous> #3':'Describe declaration group for receipt grammar/expiry, separate non200 session errors, UTF-8 streaming and body limits. Cases assert independent observable admission outcomes.','<anonymous> #4':'Describe declaration group for response cleanup, disposed lifetime, late receipt and fetch/body deadlines; directly observes stream cancellation and dispatch count.'}[f['symbol']]
  records.append(dict(f,review='bounded cohesion accepted; parent owns final recording',rationale=reason))
(out/'STRUCTURE-REVIEW.json').write_text(json.dumps({'reviewedAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'records':records,'individualTestOrHelperOver80':False,'signalsAreDescribeGroupsAndOneCohesiveTestFile':True},indent=2)+'\n')
(out/'findings.json').write_text(json.dumps([{'id':'MERI-PROXY-01','status':'corrected by root; regression retained','severity':'P2 protocol admission','file':'apps/web/src/shared/meri-actions/proxy.ts','beforeSHA256':sha((out/'before-source/proxy.ts').read_bytes()),'afterSHA256':sha((out/'final-source/proxy.ts').read_bytes()),'reproduction':'Request /api/action-followthrough/%71uery with decoded route argument query and otherwise valid origin/JSON/action bearer/native session. Old proxy forwards canonical query and returns200. Expected literal-path refusal400 before native-token/fetch calls.','evidence':['before-results.json','before-receipt.json','proxy.ts-root-correction.patch','final-results.json'],'correction':'Root added request URL pathname equality before credentials. This reviewer authored only tests.'}],indent=2)+'\n')
counts=[{'file':x['name'],'passed':sum(a['status']=='passed' for a in x['assertionResults']),'failed':sum(a['status']=='failed' for a in x['assertionResults'])} for x in final['testResults']]
(out/'coverage.json').write_text(json.dumps({'finalCounts':counts,'initialTotal':first['numTotalTests'],'initialPassed':first['numPassedTests'],'initialFailed':first['numFailedTests'],'finalTotal':final['numTotalTests'],'finalPassed':final['numPassedTests'],'staticRouteReview':'Thin POST adapter uses auth(), session.userId and exactly session.getToken({template:"capiro"}); no template change/browser native-token forwarding. Static only, no Clerk/native runtime qualification.','unrun':['full typecheck (root owns)','Next/browser/runtime/source-native/provider gates'],'testScope':'Injected fetch/token callbacks, native Request/Response/ReadableStream and fake timers; zero network calls'},indent=2)+'\n')
rootType=pathlib.Path('/tmp/capiro-meri-action-adapter-development-20261013/typecheck-host.log')
if rootType.exists(): shutil.copyfile(rootType,out/'root-typecheck-observation.log')
report=f'''# Meri bootstrap/proxy independent review and pure tests

**86/86 focused tests pass**, zero failures/skips, on exact unchanged source captured in [final-receipt.json](final-receipt.json). Run: {receipt['startedUTC']} to {receipt['endedUTC']}. Targeted ESLint has zero errors/warnings; Prettier passes. Only the two allocated test files were authored. No shared source, dependency, registry or commit was changed by this reviewer.

The first82-case run preserved a genuine literal-path defect:81pass/1fail. With decoded operation `query`, `/api/action-followthrough/%71uery` was accepted and forwarded. Root added exact pathname matching before credentials. The same regression remains and passes. [findings.json](findings.json), original raw failure/source and root's exact correction diff are retained.

Coverage includes off-default/no-auth/no-fetch configuration; all five literal POST routes; method/query/encoding/origin/path rejection; current native admission with native bearer forwarded only to session and opaque action bearer to actions; omitted cookies/authority headers; preserved upstream dispositions without invented NOT_DISPATCHED; strict hints and captured client/conversation/run matching; future bounded receipt expiry checked after receiving; split UTF-8 and body limits; immutable receipt/context; separate session errors; and deterministic cancellation/deadlines during token, fetch and body waits. Three stream-release controls also pass against root's already corrected bounded-body owner; no extra resource defect is claimed.

The capiro-template callback/POST route was reviewed statically. Tests inject a token callback; they do not qualify Clerk claims/sid, backend membership/current-run authority, native session issuance, source/provider effects or deployment. No browser/server/Next build/external endpoint ran. Full typecheck remains root-owned. Its reported HeadersInit case-union error was corrected with RequestInit[] annotation without changing assertions; unused mock parameters were replaced with explicit `vi.fn<typeof fetch>` types. Intermediate observations are retained.

[STRUCTURE-REVIEW.json](STRUCTURE-REVIEW.json) binds seven exact signals: proxy file403nonblank plus describe groups90/185/89; bootstrap file319 plus describe groups86/109/99. No individual test/helper exceeds80. These are cohesive protocol declaration groups; no splitting, weakening or copied implementation algorithm was used to suppress counts. Parent owns final review/registry acceptance.

Final test SHA256:

- proxy: `{structure[0]['sha256']}`
- bootstrap: `{structure[1]['sha256']}`

Relevant implementation/test bytes still match the final run. Root later changed unrelated host/controller/journal/adapter files while integrating; [concurrent-root-changes.json](concurrent-root-changes.json) distinguishes those from this bounded qualification. Source is an uncommitted integration candidate, not a frozen shipping pin. Earlier82-case red, expanded86-case checkpoint and final86-case green remain separate.
'''
(out/'REPORT.md').write_text(report)
entries=[{'path':str(p.relative_to(out)),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in sorted(out.rglob('*')) if p.is_file() and p.name!='MANIFEST.json']
(out/'MANIFEST.json').write_text(json.dumps({'sealedAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'entries':entries},indent=2)+'\n')
print(json.dumps({'packet':str(out),'manifestSHA256':sha((out/'MANIFEST.json').read_bytes()),'entries':len(entries),'finalCounts':counts},indent=2))
