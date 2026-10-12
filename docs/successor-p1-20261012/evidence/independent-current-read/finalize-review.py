from pathlib import Path
import json, hashlib
from datetime import datetime, timezone
p=Path('/tmp/capiro-p1-independent-review/current-read')
now=datetime.now(timezone.utc).isoformat()
def save(name,data): (p/name).write_text(json.dumps(data,indent=2)+'\n')
def load(name): return json.loads((p/name).read_text())
limits=[
 'Synthetic localhost fixtures exercise production frontend presentation/query contracts. No native/backend authorization, provider operation, paid model, AWS, deployment, real data write or live session acceptance is claimed.',
 'The Portfolio fixture uses canonical DataProvider but not the complete ApplicationBoundary. Client navigation and explicit provider replacement controls prove bounded UI/cache disposal; shared production user/session/organization/client authority replacement remains root combined qualification.',
 'Root must record the exact accepted size fingerprints and qualify the combined integrated successor. Inherited unrelated size findings remain unreviewed.',
 'No application, shared registry, frozen source, approved archive, prior 42-case evidence, or prior manifest was edited.'
]
corrections=[
 {'run':'objectives-independent-results.json','failedCases':1,'reason':'Overview contains Objectives and District Nexus error alerts; the first summary probe used an ambiguous page-wide alert locator. The revised probe scopes the ObjectiveSummary section.','sourceChanged':False},
 {'run':'objectives-summary-corrected-results.json','failedCases':1,'reason':'Overview retains a separate New objective navigation link outside ObjectiveSummary. The second probe incorrectly required every page-wide New objective link to disappear. Scope was narrowed to the gated summary entry. The separate navigation is not a cached-record display; the destination creation branch is guarded by records.','sourceChanged':False},
 {'run':'prospects-independent-results.json','failedCases':2,'reason':'After successful detail retry the existing editing boolean reopens an editor initialized from the newly read record. This makes the background heading aria-hidden. The first completion assertion incorrectly searched the accessibility tree for that heading. Corrected probes assert the fresh editor value, close the dialog, then assert the current heading. No stale input was visible during failure or held retry.','sourceChanged':False}
]
architecture=[]
for stem,symbol in [('objectives','ObjectivesPage'),('prospects','ProspectsIndex')]:
 d=load(stem+'-architecture.json'); fs=[v for v in d['sizeFindings'] if v['symbol']==symbol] if stem=='objectives' else [v for v in d['sizeFindings'] if v.get('symbol')==symbol]
 assert not d['errors'] and len(fs)==1
 f=fs[0]
 rationale=(
 'ObjectivesPage owns objective-list rendering, local status selection, URL-selected editor/create state and delete confirmation. The change derives every objective branch from one successful non-error list and clears local editor/delete intent after current read failure or client change. Query transport, schema/client receipt binding, mutations and form internals remain their existing owners. The added effect and render-time read-scope reset maintain the page interaction invariant and add no backend authority, persistence or unrelated domain. Keeping this 208-line composition together is proportionate; arbitrary extraction would scatter the same read invariant.'
 if stem=='objectives' else
 'ProspectsIndex remains the list presentation and URL interaction owner for filters, counts, cards and creation/pipeline dialogs. Every data-backed branch now uses one successful fetched-after-mount gate; failed reads clear only existing new/pipeline URL intents. The canonical useProspects query hook owns the local staleTime:0 needed for filter-key/remount rereads. Same-key successful background refresh retains drafts. No global cache framework, new authority, persistence, backend semantics or mutation owner is introduced. The cohesive 189-line page keeps the read invariant auditable; splitting solely for line count would obscure it.'
 )
 architecture.append({**f,'reviewedBy':'Independent Codex reviewer /root/objectives_work_intel_review','reviewedOn':'2026-10-12','decision':'accepted exact responsibility and fingerprint within this repair scope','rationale':rationale,'rootAction':'Record this exact fingerprint in the root-owned architecture review registry; unchanged inherited findings are not approved by this review.'})
save('architecture-review.json',architecture)
objectives={
 'finding':'OWI-F01','decision':'accepted bounded frontend repair','source':load('objectives-source-pin.json'),'reviewedAt':now,
 'independentCasesPassed':5,'ownerCasesReplayedPassed':11,'totalDistinctCasesPassed':16,
 'evidence':['objectives-independent-results.json','objectives-summary-scoped-results.json','objectives-replay-results.json','objectives-reviewed.patch','objectives-architecture.json'],
 'sourceFindings':[
  {'path':'apps/web/src/features/portfolio/objectives/ObjectivesPage.tsx:30','reason':'A successful non-error records value governs selected record, filtered rows, empty state, creation branch and delete dialog; retained query.data is never used directly after failure.'},
  {'path':'apps/web/src/features/portfolio/objectives/ObjectivesPage.tsx:25','reason':'Client/error read-scope changes clear delete confirmation; the error effect removes objective/new intents while retaining status filter. Delete mutation availability requires records plus a pending selection.'},
  {'path':'apps/web/src/features/portfolio/objectives/ObjectiveSummary.tsx:9','reason':'Cards, empty state and summary creation entry use current successful records. Failure renders retry without falsely declaring an empty list.'}
 ],
 'controls':['403 and 503 on an open real-route editor remove old values and URL intent; held retry cannot resurrect draft; successful retry supplies new record values.','Real Overview summary hides cached links and its creation entry after 403, restoring only a successful read.','Wrong-client receipt on actual client navigation is rejected and cannot retain former-client editor.','Ordinary successful same-key background refresh preserves typed editor draft.','Fresh replay covers stale remount, status filter preservation, summary errors, selected editor, new/delete state, late former-client response and DataProvider replacement.'],
 'architectureReview':architecture[0],'limitations':limits,'newProductFindings':[]
}
prospects={
 'finding':'PROS-F01','decision':'accepted bounded frontend repair','source':load('prospects-source-pin.json'),'reviewedAt':now,
 'independentCasesPassed':6,'ownerCasesReplayedPassed':12,'totalDistinctCasesPassed':18,
 'evidence':['prospects-independent-results.json','prospects-detail-corrected-results.json','prospects-replay-results.json','prospects-reviewed.patch','prospects-architecture.json'],
 'sourceFindings':[
  {'path':'apps/web/src/features/portfolio/prospects/ProspectsIndex.tsx:38','reason':'isSuccess + isFetchedAfterMount + no error govern counts, cards, totals, pipeline and create dialogs/actions. New/filter mount cannot present an earlier cached success before a current successful read.'},
  {'path':'apps/web/src/features/portfolio/prospects/queries.ts:39','reason':'Local staleTime:0 ensures returning to an earlier still-fresh filter actually reads. It combines with fetched-after-mount gating to close the cached-filter bypass without a shared cache framework.'},
  {'path':'apps/web/src/features/portfolio/prospects/ProspectsIndex.tsx:44','reason':'Failure clears new/pipeline URL intents; same-key successful background refresh does not unmount a draft.'},
  {'path':'apps/web/src/features/portfolio/prospects/ProspectDetail.tsx:49','reason':'Existing unchanged detail read gate also hides record/editor on 403/503. Retry mounts a new editor only from the newly successful record; independent controls verify the old input is absent.'}
 ],
 'controls':['403/503 detail failure with an open editor removes headings/actions/input; held retry remains hidden; successful retry editor contains new current values, and closing it reveals current heading.','Explicit pipeline URL after navigation to a client and back fails closed on 503, removes intent, hides totals/cards and disables pipeline.','Successful same-key background list refresh preserves a typed creation draft.','After filter B fails with 403/503, returning to a previously successful filter A without advancing the clock withholds cache, totals and actions through a held new read; only the new response restores cards.','Fresh 12-case replay covers remount/filter errors, held retry, current pipeline stage/create teardown, client navigation and draft preservation.'],
 'architectureReview':architecture[1],'limitations':limits,'newProductFindings':[]
}
save('objectives-review.json',objectives);save('prospects-review.json',prospects);save('test-assertion-corrections.json',corrections)
runs=[]
for f in sorted(p.glob('*results.json')):
 d=json.loads(f.read_text()); runs.append({'file':f.name,**d['stats']})
assert load('objectives-summary-scoped-results.json')['stats']['unexpected']==0
assert load('objectives-replay-results.json')['stats']['expected']==11
assert load('prospects-detail-corrected-results.json')['stats']['expected']==2
assert load('prospects-replay-results.json')['stats']['expected']==12
summary={'reviewedAt':now,'decision':'Both exact candidate repairs accepted for root combined qualification','candidates':[{'finding':x['finding'],'commit':x['source']['commit'],'tree':x['source']['tree'],'casesPassed':x['totalDistinctCasesPassed']}for x in [objectives,prospects]],'independentCasesPassed':11,'freshOwnerReplayCasesPassed':23,'totalDistinctCasesUltimatelyPassed':34,'rawInitialAssertionFailures':4,'assertionCorrections':'test-assertion-corrections.json','rawRuns':runs,'newProductFindings':[],'remainingRootGates':['Record exact size fingerprint reviews in root-owned registry.','Complete integrated source/build/browser qualification and successor pin review.'],'limitations':limits,'priorEvidenceImmutability':load('prior-evidence-immutability.json')}
save('review-summary.json',summary)
(p/'report.md').write_text('''# Independent current-read repair review — 12 October 2026

Both exact candidates are accepted for the bounded frontend defects: Objectives `24400fb5133d9b75bf78240774426aeb0a583941` (OWI-F01) and Prospects `e7e62353c62d91fd7f234016db4ce7283b38bfcd` (PROS-F01). No new product defect was found in this review.

34 distinct cases ultimately passed: 11 independently authored controls and 23 fresh owner-case replays. Objectives accounts for 5 independent + 11 replay; Prospects for 6 independent + 12 replay. Each external configuration uses one browser worker, no owned webServer, and a distinct evidence directory. Raw failures are retained: four initial assertion failures were corrected test selectors, detailed in `test-assertion-corrections.json`. No application source changed between those runs.

Objectives now derives records, selected editor, new form, delete confirmation and empty states from a successful non-error read. The summary uses the same condition. Independent real-route probes verified 403/503 editor teardown, held retry, new successful values, a wrong-client receipt, overview summary failure, and preservation of a draft during a successful background refresh. Replays additionally verified status filters, remount, creation/delete state, late former-client responses and provider replacement. The separate Overview navigation link remains available outside the summary; the guarded destination cannot mount its creation form from a failed query.

Prospects applies one successful fetched-after-mount gate to cards, counts, stage totals, actions and dialogs. Its query hook sets local staleTime zero so returning to an earlier filter requires a new request. Independent probes verified the fresh-cache return after both 403 and 503, held recovery, current detail/editor values, explicit pipeline intent after client navigation, and preservation of typed creation input on successful background reread. Existing detail behavior can reopen an editor after a successful retry, initialized from the new successful record; old draft values never return.

Exact function responsibility reviews are in `architecture-review.json`: ObjectivesPage is 208 nonblank lines with fingerprint `5f1c21710a260ec6edb31ab366fdb048eeff1d28e1f149b7c7e4a80367bb4163`; ProspectsIndex is 189 with `d0be79ab36b07635085df1e03a891890f55b36a345cb0ac4a199caf5e3552d84`. Independent scans report no boundary errors. Their sole blocking size changes need root-owned registry recording; this review accepts those exact functions, not inherited unrelated findings.

Full source hashes, commit/tree pins and reviewed patches are preserved here. Read `objectives-review.json`, `prospects-review.json` and `review-summary.json` for precise source references, controls and raw result mappings. `SHA256-MANIFEST.json` covers every file in this new directory except itself.

These are synthetic frontend checks, not live/native authorization, provider, durability or deployment acceptance. The Portfolio fixture uses DataProvider rather than the complete ApplicationBoundary; client navigation/provider replacement assertions have that limit. Root owns integrated qualification and final successor pin. There were no source/registry edits or native/provider writes. The preceding 42-case evidence is unchanged: all 28 files match its original manifest, whose SHA256 remains `8f83d86d85eef420d3140c9ffdd2c92ed44780bc8414376954ded1d40f68415e`.
''')
files=[]
for f in sorted(p.rglob('*')):
 if f.is_file() and f.name!='SHA256-MANIFEST.json':
  b=f.read_bytes();files.append({'path':str(f.relative_to(p)),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
save('SHA256-MANIFEST.json',{'createdAt':now,'fileCount':len(files),'files':files})
print(json.dumps({'accepted':summary['candidates'],'distinctCasesPassed':34,'manifestFiles':len(files),'manifestSha256':hashlib.sha256((p/'SHA256-MANIFEST.json').read_bytes()).hexdigest()},indent=2))
