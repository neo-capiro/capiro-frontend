from pathlib import Path
import json,hashlib,subprocess
root=Path('/workspace/capiro-next-modules');out=Path('/tmp/capiro-next-modules-evidence')
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
changed=subprocess.check_output(['git','diff-tree','--no-commit-id','--name-only','-r',commit],cwd=root,text=True).splitlines()
arch=json.loads((out/'architecture.log').read_text())
rationales={
'CalendarEvents':'One Calendar event viewport owns the agenda/grid presentation choice and their local search/loading/error/empty states. Meeting status is now a sibling of the agenda table so independent successful sources remain usable. Grid keeps its existing meeting gate. Source loading, normalization, authorization, and meeting dialogs retain their existing owners; extracting arbitrary JSX would obscure this single rendering decision.',
'useCalendar':'One Calendar screen-state hook composes its date/view/filter state with fixed-operation reads. Shared SelectedClient remains the only verification owner; router navigation merely changes the selection hint, and shared request lifetimes discard former scope reads. Calendar range and per-source loading remain separate modules. The added lines remove duplicated client state, not add a second authority.',
'PlannerScreen':'One public Planner entry composes section navigation and current bootstrap state. LinkedTaskDetail is a separate narrow owner for URL task resolution, ID/client binding, retry, and dismissal. All sections remain behind the current bootstrap gate, and client identity is consumed from the shared verification boundary. No transport or generic cache abstraction was added.',
'useTaskWorkspace':'Existing local task-list state, filtering and batch actions remain together. The only behavioral refactor replaces the inline client/project membership predicate with the same narrow taskMatchesClient helper used by the linked task, preventing divergent scope presentations. Query/mutation authority stays at the fixed operation boundary.',
'TaskFilters':'TaskFilters is unchanged in responsibility and logic; its file fingerprint changed because useTaskWorkspace now reuses taskMatchesClient. The contiguous display and filtering controls remain one task-workspace presentation component, with no network or authorization policy.'}
reviews=[]
for finding in arch['sizeFindings']:
 if finding['blocking']:
  reviews.append({**finding,'reviewDisposition':'cohesive ownership accepted by implementing lane; independent/root registry review pending','rationale':rationales[finding['symbol']]})
(out/'structure-review.json').write_text(json.dumps({'commit':commit,'boundaryErrors':arch['errors'],'blockingFindings':reviews,'noChangedSourceFileOver400NonblankLines':True,'registryEdited':False},indent=2)+'\n')
(out/'source-hashes.json').write_text(json.dumps({p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in changed},indent=2)+'\n')
(out/'report.json').write_text(json.dumps({
'branch':'repair/capiro-next-modules-20261012','worktree':str(root),'base':'fd1176790a6fb31b7ae68587f965a22d4145d8a2','commit':commit,'tree':'7b10b3aec4ccd45e1292a91f2b8865248cbe08c6',
'findings':['MS02','MS03','MS04','MS05'],
'checks':{'red':{'failed':4,'source':'fd1176790a6fb31b7ae68587f965a22d4145d8a2','results':'red/results.json'},'green':{'passed':19,'results':'green/results.json'},'regression':{'passed':7,'results':'regression/results.json'},'calendarUnits':{'passed':12,'log':'unit.log'},'typecheck':'passed','focusedLint':'passed','focusedFormat':'passed','diffCheck':'passed','architecture':{'boundaryErrors':0,'rootOwnedPendingStructureReviews':5}},
'rowFacets':[
{'finding':'MS02','rows':['MCAL-002','MCAL-003'],'frames':['795:148369'],'behavior':'Modules Calendar verified client entry, picker, and back-forward requests share the current verified URL scope; denied or mismatched client verification cannot fall back to Master.'},
{'finding':'MS03','rows':['MCAL-009'],'frames':['460:90798'],'behavior':'Modules Master Agenda preserves independently scheduled task starts and deadlines; same date+time combines with both semantics; repeated source pages deduplicate by task and occurrence kind.'},
{'finding':'MS04','rows':['MCAL-013'],'frames':['460:90798'],'behavior':'Meeting denial/service failure retains independently successful agenda rows, visibly marks meeting source unavailable, supports meeting retry, and avoids complete empty-state claims for partial feeds.'},
{'finding':'MS05','rows':['MCAL-009'],'frames':['460:90798','411:100367'],'behavior':'Agenda task link resolves through current planner.task, independent of list paging/status/mine filters; ID/client matching and current bootstrap/query gates protect detail, edit state, retry and route/session replacement.'}],
'nativeLimits':['Browser evidence is synthetic local transport only; no native/backend/provider calls or real authorization/RLS proof.','Canonical Portfolio /calendar row acceptance is unchanged; this closes only the identified /modules/calendar and /modules/planner frontend facets.','Client Agenda and Month/Week remain meetings-only under existing scope contracts.','Generic task drilldown does not claim Objective-specific bindings, commitment/strategy linkage, forecasts or unavailable source completeness.','MS06 and later remain separate.'],
'dependencies':{'borrowedSymlink':'/workspace/capiro-next-modules/node_modules -> /workspace/capiro-p1-successor/node_modules','sharedInstallModified':False},
'cleanup':{'ownedServerStopped':True,'pid':619063,'port5197NoListener':True,'sourceAndEvidencePreserved':True},
'remainingGates':['Root-owned architecture records and independent review','Root combined qualification; no merge/deploy performed'],
'changedFiles':changed},indent=2)+'\n')
text='''# Modules successor repair MS02–MS05

Commit: `{commit}`; tree `7b10b3aec4ccd45e1292a91f2b8865248cbe08c6`.
Branch: `repair/capiro-next-modules-20261012`; worktree `/workspace/capiro-next-modules`.
Base: `fd1176790a6fb31b7ae68587f965a22d4145d8a2` (shipping source untouched).

- **MS02 / MCAL-002, MCAL-003 Modules facets:** Calendar takes its client from shared current verification; picker navigation updates the URL and follows the same verification gate. Current client labels remain visible even if the optional picker list fails. Denied/mismatched selected-client reads never dispatch a Master fallback.
- **MS03 / MCAL-009 Modules facet:** Agenda keeps separate start and due occurrences, source time/zone metadata, stable keys, and duplicate-page collapse. Identical date/time occurrences use one “Start and due date” row. A start inside the current range remains even when its due date is outside.
- **MS04 / MCAL-013 Modules facet:** Meeting failure no longer hides successful agenda feeds. The meeting source says Unavailable and offers retry; partial-source empty states do not claim a complete empty calendar.
- **MS05 / MCAL-009 Modules facet:** `?task=` resolves with existing `planner.task`, independently of current list filters and pagination. Current receipts must match the requested ID and verified client presentation scope (direct client or current project membership). The reused TaskDetail is hidden on failed/replaced reads; history and client/session changes discard prior detail and editor drafts.

Validation: 4/4 intended red failures on exact base; 19/19 new targeted browser controls green; 7/7 existing Calendar/compact visual/Planner-Engagement controls green; 12/12 Calendar unit tests green. Typecheck, focused lint, formatting and diff checks passed. All browser runs used one worker, zero retries, `/usr/bin/chromium`, local synthetic fixtures. Existing `calendar.spec.ts` assertions were preserved; its setup now supplies the client verification receipt required by the corrected picker.

Evidence: `red/results.json`, `red/output` screenshots/traces; `green/results.json`, `green/output` screenshots; `regression/results.json`, `regression/output`, `regression/legacy-screenshots`; `unit.log`, `typecheck.log`, `lint.log`, `format-check.log`. Source SHA-256 values are in `source-hashes.json`.

The architecture scan has zero boundary errors and five changed-file function review signals. Exact fingerprints and cohesive ownership rationale are in `structure-review.json`; root owns registry changes. No changed source file exceeds 400 nonblank lines. Shared adapters, session/Header/config, manifests, registry, and Portfolio private implementations were not edited or imported.

Native limits: these are Modules frontend facets, not whole MCAL-row acceptance or native ACL/RLS/provider proof. Client Agenda/Month/Week remain meetings-only. Generic task drilldown does not add Objective binding, commitment/strategy linkage, forecast availability, or source completeness. MS06+ remain out of scope. No native/provider/AWS/model/payment calls, merge, deploy, or frozen archive edits occurred.

Borrowed dependency symlink: `/workspace/capiro-next-modules/node_modules -> /workspace/capiro-p1-successor/node_modules`; shared install untouched. Owned server PID 619063 was stopped and port 5197 verified free. Source and evidence remain for independent review; the borrowed symlink is deliberately retained for that review.

Remaining gates: independent/root structural review and root combined qualification.
'''.format(commit=commit)
(out/'report.md').write_text(text)
print('Wrote source-bound report, hashes and five structure-review records')
