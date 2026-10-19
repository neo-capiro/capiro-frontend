"""Static browser-source audit; no test runner/application imports or execution."""
import datetime, hashlib, json, pathlib, re, subprocess

OUT=pathlib.Path(__file__).parent
ROOT=pathlib.Path('/workspace/capiro-remaining')
OWNER=pathlib.Path('/workspace/capiro-remaining-mail')
FROZEN='adbc84b2251fe6b06cb7f75030026fba5b4ff498'
BASE='685e55039d5d3945c76085513cde8bc6c33cb55d'
SPEC='apps/web/tests/browser/relationships.spec.ts'
DIRS=['apps/web/tests/browser','apps/web/test/browser']
def git(repo,*args):
    return subprocess.check_output(['git','-C',str(repo),*args])
def sha(raw):
    return hashlib.sha256(raw).hexdigest()
def write(name,value):
    (OUT/name).write_text(json.dumps(value,indent=2)+'\n')

before=git(ROOT,'show',FROZEN+':'+SPEC)
after=(OWNER/SPEC).read_bytes()
old='await expect(mail.getByLabel("Message", { exact: true })).toHaveValue('
new='await expect(mail.getByLabel("Message", { exact: true })).toHaveText('
assert before.decode().count(old)==1 and after.decode()==before.decode().replace(old,new)
assert git(OWNER,'show',BASE+':'+SPEC)==before
body=after.decode().split('test("person-linked QuickLog retains',1)[1].split('\ntest(',1)[0]
for exact in ['"Synthetic message"','expect(notes).toBe(1);','expect(sends).toBe(1);','expect(unexpected).toEqual([]);','{ message: "Note unavailable" }, 409','{ message: "Mailbox not connected" }, 409']:
    assert exact in body
assert 'toContainText("Synthetic message")' not in body
assert before.decode().replace(old,new)==after.decode()

source_paths=git(ROOT,'ls-tree','-r','--name-only',FROZEN,'--',*DIRS).decode().splitlines()
files=[];message_calls=[];textarea_hits=[];value_hits=[];legacy=[]
locator=re.compile(r'getBy(?:Label|Role)\(\s*[\s\S]{0,160}?\bMessage\b[\s\S]{0,140}?\)',re.M)
legacy_pattern=re.compile(r'await\s+expect\((?:(?!;).)*?Message(?:(?!;).)*?\)\.toHaveValue\(',re.S)
scan_pattern=re.compile(r'textarea|HTMLTextAreaElement|inputValue\s*\(|toHaveValues\s*\(|toHaveJSProperty\s*\(\s*[\'\"]value|\.value\b',re.I)
for path in source_paths:
    if pathlib.PurePosixPath(path).suffix not in {'.ts','.tsx','.js','.jsx','.mjs','.cjs','.html'}:continue
    raw=git(ROOT,'show',FROZEN+':'+path);text=raw.decode()
    files.append({'path':path,'gitBlob':git(ROOT,'rev-parse',FROZEN+':'+path).decode().strip(),'sha256':sha(raw),'bytes':len(raw),'spec':path.endswith('.spec.ts')})
    for match in locator.finditer(text):
        start=match.start();line=text[:start].count('\n')+1
        message_calls.append({'path':path,'line':line,'context':text[max(0,text.rfind('\n',0,start)+1):min(len(text),match.end()+150)]})
    for match in legacy_pattern.finditer(text):
        legacy.append({'path':path,'line':text[:match.start()].count('\n')+1,'text':match.group(0)})
    for i,line in enumerate(text.splitlines(),1):
        if scan_pattern.search(line):
            hit={'path':path,'line':i,'text':line}
            if 'textarea' in line.lower():textarea_hits.append(hit)
            else:value_hits.append(hit)
assert len(legacy)==1 and legacy[0]['path']==SPEC
assert not legacy_pattern.search(after.decode())
assert not re.search(r'inputValue\s*\(', '\n'.join(git(ROOT,'show',FROZEN+':'+f['path']).decode() for f in files))
write('whole-browser-audit.json',{'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'frozenSource':FROZEN,'testRoots':DIRS,'trackedTextFiles':len(files),'specFiles':sum(f['spec'] for f in files),'files':files,'messageLocatorHits':message_calls,'legacyMessageValueAssertionsBefore':legacy,'legacyMessageValueAssertionsAfterSingleAdapter':0,'textareaHits':textarea_hits,'otherValueAccessHits':value_hits,'manualClassifications':[
 {'paths':['mail-local-draft.spec.ts','mail-rewrite.spec.ts','email-compose.spec.ts'],'disposition':'Existing expectMailMessage helper preserves exact plain-message text across textarea or paragraph editor. No direct Message value assertion remains.'},
 {'paths':['thread-mail.spec.ts','portfolio.spec.ts','government.spec.ts'],'disposition':'Message uses fill(), which supports contenteditable; Cc/Subject value assertions refer to actual input elements.'},
 {'paths':['mail-rich-compose.spec.ts'],'disposition':'message(page) alias resolves role=textbox name=Message; expectations use text/child markup/innerHTML, not input value.'},
 {'paths':['mail-message-assertions.ts'],'disposition':'HTMLTextAreaElement branch is guarded and has paragraph-text fallback; not a textarea-only assumption.'},
 {'paths':['manual-debrief.spec.ts'],'disposition':'Only direct textarea locator is the independent Meeting context textarea CSS-height check, not Mail.'},
 {'paths':['objective-work-navigation.spec.ts','objective-work-destinations.spec.ts','IntegrationProbe.tsx','watchlist.spec.ts','activity-command-fixtures.ts'],'disposition':'Remaining .value accesses are fixture records, integration probe input or watchlist terms; not Mail Message element value reads.'}],
 'scopeLimit':'Static tracked-source search plus manual call-site/alias review. Does not replace browser execution or prove every dynamic selector.'})
write('adapter-receipt.json',{'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'ownerBase':BASE,'rootFrozen':FROZEN,'path':SPEC,'line':511,'change':'toHaveValue -> toHaveText','expectedValue':'Synthetic message','locator':'mail.getByLabel("Message", { exact: true })','beforeSha256':sha(before),'afterSha256':sha(after),'onlyMatcherChanged':True,'allOtherBytesIdentical':True,'providerAndNoteHandlersCountsUnchanged':True,'noProductionChanges':True,'runtimeRerun':False,'greenBrowserStatus':'unrun: no lease; root owns exact-source rerun','preexistingUntrackedDependencyLinkPreserved':True})
print(json.dumps({'auditedTextFiles':len(files),'browserSpecFiles':sum(f['spec'] for f in files),'messageLocatorSites':len(message_calls),'directMessageValueBefore':len(legacy),'directMessageValueAfter':0,'textareaHits':len(textarea_hits),'singleMatcherDiffVerified':True},indent=2))
