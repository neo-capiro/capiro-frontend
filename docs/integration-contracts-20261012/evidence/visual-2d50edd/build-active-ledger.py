from pathlib import Path
import json,hashlib,re,collections,datetime
ROOT=Path('/workspace/capiro-contracts'); OUT=Path('/tmp/capiro-visual-2d50edd')
HEAD='2d50edd8f3c5ea232db8e1338566f0667db4b4bd'
OLD='docs/portfolio-31/handover-2026-10-11/Portfolio-345-Row-Reconciliation-2026-10-11.json'
MATRIX='docs/portfolio-31/handover-2026-10-11/implementation-matrix.json'
old=json.loads((ROOT/OLD).read_text()); matrix={r['audit_id']:r for r in json.loads((ROOT/MATRIX).read_text())['rows']}
# Reports are read only after the exact candidate reaches terminal state. A development
# reference can be used to inspect mappings, but it cannot emit a candidate acceptance ledger.
E=Path('/tmp/capiro-candidate-2d50edd')
report=E/'portfolio-browser-results.json'
if not report.exists(): raise SystemExit('Pending terminal candidate report; no acceptance ledger emitted.')
receipt=json.loads((E/'portfolio-browser-execution.json').read_text())
assert receipt['state']=='finished' and receipt['exitCode']==0 and receipt['head']==HEAD and receipt['headAtFinish']==HEAD
assert receipt['statusAtStart']==receipt['statusAtFinish']==''
cases=[]
def walk(s,mode):
 for sp in s.get('specs',[]):
  cases.append({'mode':mode,'file':sp['file'],'line':sp['line'],'id':sp['id'],'title':sp['title'],'status':[t['status'] for t in sp['tests']],'results':[x['status'] for t in sp['tests'] for x in t['results']]})
 for s2 in s.get('suites',[]):walk(s2,mode)
for mode,path in [('Portfolio',report),('Modules',E/'modules-browser-results.json')]:
 d=json.loads(path.read_text());assert d['stats']['unexpected']==d['stats']['skipped']==d['stats']['flaky']==0
 for s in d['suites']:walk(s,mode)
assert len(cases)==1049 and len({c['id'] for c in cases})==1049 and all(c['results']==['passed'] for c in cases)
byfile=collections.defaultdict(list)
for c in cases:byfile[c['file']].append(c)

def core(*nums):return ['CORE-'+str(n).zfill(3) for n in nums]
def seq(prefix,a,b):return [prefix+'-'+str(n).zfill(2 if prefix in ['OBJ','WORK','CAP','BILL'] else 3) for n in range(a,b+1)]
# These are bounded, explicitly described assertions, never whole-row acceptance.
facets=[]
def facet(ids,files,claim,remaining,pattern=''):
 facets.append({'rows':ids,'files':files,'claim':claim,'remaining':remaining,'pattern':pattern})
facet(core(1,2,3,4,5,6,7,11,86),['portfolio-index.spec.ts','current-projection.spec.ts'],
 'Synthetic current-client reads, real-field search/filter/view/deep-link behavior, failure/retry and unavailable-owner states are exercised.',
 'Native result completeness, owner/source semantics, production identity and the row-specific requested sort/rollup criteria remain to be accepted.')
facet(core(98),['portfolio-layout.spec.ts','portfolio-layout-integration.spec.ts'],
 'Saved profile order is explicitly written and restored after reload, with keyboard/mobile and interrupted-source checks.',
 'Native user-profile persistence, cross-device behavior and final Customize/drag presentation remain open.')
facet(core(49,91,92,95,96,101,102,129),['activity-command.spec.ts','activity-command-recovery.spec.ts','activity-command-reopen.spec.ts','activity-command-restart.spec.ts','activity-command-storage.spec.ts','member-notes.spec.ts','quick-log-meeting.spec.ts'],
 'The implemented note and generic follow-up paths preserve original keys and bodies, reread current identity, retain uncertain outcomes, and expose deliberate recovery. Calendar handoff navigates without a write.',
 'Native command migrations, role grants, atomicity and real persistence remain open. Commitment/Weowe/Theyowe/counterparty UI is explicitly excluded by the current owner instruction; no note/follow-up pass accepts that historical subcriterion.')
facet(core(27,28,29,99),['ordered-owners.spec.ts'],
 'Complete ordered Primary through Quaternary choices, deliberate versioned save, no implicit promotion, unavailable historical members, conflict readback and interrupted-actor clearing pass.',
 'Core PR2399 rollout/migration/native privilege and concurrency gates remain open; the designed owner-card/reorder dialog is not visually matched by the current Team dialog selectors.')
facet(seq('OBJ',12,13)+['OBJ-17','OBJ-19','OBJ-28','OBJ-30'],['objective-intake.spec.ts','objective-readiness.spec.ts','objective-receipts.spec.ts','global-objective.spec.ts'],
 'Four-field readiness, authorized-client selection, full-page create versus drawer edit, explicit save/review controls, exact receipts, keyboard and mobile layout are exercised.',
 'Native readiness/persistence/approval and row-specific semantic rewording/autosave/clarification remain unaccepted. A tested explicit save is not an autosave or paid Meri quality test.')
facet(['OBJ-26'],['objective-destination.spec.ts','objective-navigation.spec.ts','objective-work-destinations.spec.ts','objective-work-navigation.spec.ts'],
 'Published owner observations open existing Outreach, Strategy, explicit-client Planner task and explicitly selected saved Workspace revision. Fresh GETs on open/reload/history/recheck, strict binding, unavailable states, cancellation and zero writes are exercised.',
 'PR2362 tables, PR2402/2404/2405 runtime rollout, Workspace immutable revision migration, RLS/MVCC and client/grant lock-order review remain open. Creation, durable association, generation/activation and arbitrary destination prefills are unavailable.')
facet(['BILL-11','BILL-12'],['integration-defect-baselines.spec.ts','watchlist-preference-entry.spec.ts','watchlist-current.spec.ts','watchlist-current-behavior.spec.ts','alert-channels.spec.ts','alert-channel-lifetime.spec.ts','alert-channel-visual.spec.ts'],
 'Core/Intel preference ownership remains distinct; Core404 keeps the entry visible/disabled with zero Intel calls. Accepted normalized projections and explicit partial rejections are honored. Requested-code copy matches Figma without a delivery claim; current-user/channel lifetimes are exercised.',
 'Native preference authorization/persistence, SMS verification and real provider acceptance/delivery remain unrun. No real test alert or verification message was sent.')
facet(['WORK-01','WORK-02','WORK-03','WORK-04','WORK-05','WORK-06','WORK-08','WORK-09'],['work-boundary.spec.ts','work-documents.spec.ts','work-presentation.spec.ts'],
 'Current Strategy and Workspace sources fail independently; typed authorized destinations, legacy-name ambiguity refusal, semantic table/mobile cards, explicit missing timestamps and retry states are exercised.',
 'Native data completeness, owner display, stable legacy Workspace identity and full rich Strategy creation/work criteria remain open. Read-only Objective destinations do not establish general Workspace authority.')
facet(['CAP-02','CAP-03'],['capability-presentation.spec.ts','capability-presentation-visual.spec.ts','capability-execution.spec.ts'],
 'Canonical create/edit controls retain fields across tabs, explicit save/cancel, readiness/token choices, required-field focus, authored Details sections and desktop/phone geometry.',
 'Native CRUD/version/ACL and full-screen visual acceptance remain open; the authored detail extension is assessed separately from the older base frame.')
facet(core(128),['saved-submissions-current.spec.ts','saved-submissions-lifetime.spec.ts','saved-submissions-visual.spec.ts'],
 'Current saved submissions, explicit removal review, interrupted-source fencing and exact authored desktop/phone component geometry pass.',
 'Native versionless DELETE causality/concurrency, actual removal and cross-device durability remain open. This local readback cannot prove which request caused a server change.')
facet(['PROS-017'],['prospect-contacts.spec.ts'],
 'Existing Contacts list/create/edit/remove controls retain their typed wire shape, readOnly lifecycle, request identity and conflict review. PR2406 now registers the owner and adds current canonical prospect authority before every read/replay/mutation.',
 'Core migration20281011030000 and native current membership/feature/client-wall/locking acceptance remain unrun. Registration is source preparation, not proof of a live endpoint, durable Contacts recovery or ClientPerson carryover.')
facet(['PROS-019','PROS-020','PROS-021','PROS-023'],['prospect-files.spec.ts','prospect-brief.spec.ts','prospect-upload-restart-acceptance.spec.ts','prospect-workspace.spec.ts','prospect-restart.spec.ts'],
 'Bounded prospect Files/manual Workspace reads and saved-version operations retain original upload/confirmation intent. Restart review does not re-upload dispatched bytes or replace the original command.',
 'Native PR2400 rollout/migration/ACL/scan and stored-byte behavior remain unrun. Workspace draft PATCH and snapshot are separate operations without invented CAS; generation, rich editing and paid provider quality are not established.')
facet(['PROS-004','PROS-005','PROS-010','PROS-011','PROS-012','PROS-013','PROS-014','PROS-015','PROS-037'],['prospect-overview.spec.ts','prospects.spec.ts'],
 'Current prospect identity, overview/stage/next-step/owner/archive receipts, activity filtering and responsive stage presentation are exercised.',
 'Native rich fields, new-stage mapping and private notes remain open; current shared firm notes do not fulfill the private-note criterion. Conversion/payment is a separate governed action.')
facet(['MCAL-008','MCAL-009','MCAL-010','MCAL-012','MCAL-013','MCAL-014','MCAL-015'],['calendar-boundary.spec.ts','calendar-planner.spec.ts','effective-dates.spec.ts','public-event.spec.ts'],
 'Mixed Master Agenda keeps independent source permissions and failures, explicit scheduled/due occurrences and source filters. Publisher effective civil dates retain provenance and incomplete-coverage warnings; no publication-date fallback is allowed.',
 'Native feed migrations/role privileges, complete source coverage and actual current evidence remain unrun. Estimated markup/floor-vote windows are unavailable; metadata is not complete legal-date coverage.')

visual=json.loads((OUT/'VISUAL-OBSERVATIONS.json').read_text())
assert visual['state']=='SCOPED_COMPARISONS_REVIEWED'
visual_byrow=collections.defaultdict(list)
for item in visual['observations']:
 for rid in item.get('rows',[]):visual_byrow[rid].append(item['id'])
rows=[]
for original in old['rows']:
 rid=original['audit_id']; m=matrix[rid]; excluded=original['reconciliation_state']!='OPEN_FINAL_ACCEPTANCE'
 historical=original['packet_implementation_row'].get('test_evidence','[]')
 mentioned=set(re.findall(r'[A-Za-z0-9_-]+\.spec\.ts',historical))
 rowfacets=[]; related=[]
 for f in facets:
  if rid not in f['rows']:continue
  selected=[c for c in cases if c['file'] in f['files'] and (not f['pattern'] or re.search(f['pattern'],c['title']))]
  assert selected,(rid,f['files'])
  rowfacets.append({'status':'PASS_BOUNDED_SYNTHETIC_ASSERTIONS','claim':f['claim'],'caseIds':[c['id'] for c in selected],'remaining':f['remaining']})
  related.extend(selected)
 related.extend(c for c in cases if c['file'] in mentioned)
 related={c['id']:c for c in related}
 endpoints=m.get('verified_endpoint_contracts',[])
 native={'status':'NOT_RUN_NATIVE','criteria': 'Establish native signed-in behavior for: '+m['functionality'], 'verifiedHistoricalInterfaces':endpoints,'requiredEvidence':['Current user, org and exact resource authorization on the native owner; denial/revocation and replacement scope.','Real owner response semantics and source completeness for this row; synthetic fixture values are not accepted records.'],'historicalBlockerReference':OLD+'#'+rid}
 if re.search(r'create|save|edit|delete|remove|assign|upload|confirm|apply|approve|send|purchase|convert|log |enable|disable|import',m['functionality'],re.I): native['requiredEvidence'].append('Authorized native persistence, concurrency/receipt behavior and interrupted-write recovery for this exact operation; provider/payment/generation effects require separate permitted acceptance.')
 if m.get('blocker'):native['historicalBlockerSnapshot']=m['blocker']
 rows.append({'audit_id':rid,'area':m['area'],'criterion':m['functionality'],'scope':'EXCLUDED_AS_PREVIOUSLY_RECORDED' if excluded else 'IN_SCOPE','historicalDisposition':original['reconciliation_state'],'fullRowAcceptance':'EXCLUDED' if excluded else 'OPEN_FINAL_ACCEPTANCE','currentSource':HEAD,'canonicalFrontendPaths':original.get('canonical_frontend_paths',[]),'figmaTargets':m.get('historical_evidence',{}).get('figma_urls',[]),'boundedInteractionFacets':[] if excluded else rowfacets,'relatedExecutedCaseIds':[] if excluded else list(related),'relatedEvidenceMeaning':'Case links preserve traceability, not proof of every phrase in this row. Only explicitly described bounded facets are assessed. Historical blocker text is retained as provenance and may be superseded by the bounded current facet.','visualObservationIds':[] if excluded else visual_byrow[rid],'visualStatus': 'EXCLUDED' if excluded else ('SCOPED_COMPARISON_RECORDED' if visual_byrow[rid] else 'NOT_ASSESSED_AGAINST_EVERY_TARGET_FRAME'),'native': {'status':'EXCLUDED'} if excluded else native,'nextAcceptanceStep': 'Preserve the owner exclusion; do not activate the feature.' if excluded else ('Review the linked bounded findings, complete each remaining native/visual criterion, and record row-specific acceptance for '+rid+'.')})
assert [r['audit_id'] for r in rows]==[r['audit_id'] for r in old['rows']]
assert sum(r['scope']=='IN_SCOPE' for r in rows)==337
counts={'total':345,'inScope':337,'excluded':8,'fullyAccepted':0,'rowsWithBoundedInteractionEvidence':sum(bool(r['boundedInteractionFacets']) for r in rows),'rowsWithRelatedExecutedCases':sum(bool(r['relatedExecutedCaseIds']) for r in rows),'rowsWithScopedVisualComparison':sum(bool(r['visualObservationIds']) for r in rows),'nativeAccepted':0}
ledger={'backendRelease':{'head':'243248e726243c44bd4b9d24fd1ed220da18c56a','tree':'d8f01afa7eca0e6571e7ed3669905fea3491bbdd','manifest':'evidence/backend-243248e/RELEASE-MANIFEST.json','compatibility':'evidence/backend-243248e/FRONTEND-COMPATIBILITY.md','nativeAcceptance':False},'title':'Active shared integration row evidence — native acceptance remains separate','source':HEAD,'createdAt':datetime.datetime.now(datetime.UTC).isoformat(),'historicalLedger':{'path':OLD,'sha256':hashlib.sha256((ROOT/OLD).read_bytes()).hexdigest(),'matrixPath':MATRIX,'matrixSha256':hashlib.sha256((ROOT/MATRIX).read_bytes()).hexdigest(),'originalFilesUnchanged':True},'counts':counts,'qualificationReports':{'Portfolio':{'path':'evidence/candidate-2d50edd/portfolio-browser-results.json','sha256':hashlib.sha256(report.read_bytes()).hexdigest()},'Modules':{'path':'evidence/candidate-2d50edd/modules-browser-results.json','sha256':hashlib.sha256((E/'modules-browser-results.json').read_bytes()).hexdigest()}},'caseIndex':cases,'visualEvidence':'evidence/visual-2d50edd/VISUAL-OBSERVATIONS.json','rows':rows}
(OUT/'PORTFOLIO-337-ACTIVE-LEDGER.json').write_text(json.dumps(ledger,indent=2)+'\n')
lines=['# Active Portfolio acceptance ledger','','Source `'+HEAD+'`. The historical owner packet is preserved byte for byte. This ledger retains all 345 IDs: 337 in scope and eight prior exclusions. Full-row/native acceptance is still zero.','','Bounded interactions and visual comparisons below have their own concrete evidence; none substitute for missing native criteria. Related test links alone are not acceptance.','','| Row | Criterion | Bounded interaction facets | Figma observations | Full/native status |','| --- | --- | --- | --- | --- |']
for r in rows:lines.append('| '+r['audit_id']+' | '+r['criterion'].replace('|','/')+' | '+str(len(r['boundedInteractionFacets']))+' | '+(', '.join(r['visualObservationIds']) or r['visualStatus'])+' | '+r['fullRowAcceptance']+' / '+r['native']['status']+' |')
(OUT/'PORTFOLIO-337-ACTIVE-LEDGER.md').write_text('\n'.join(lines)+'\n')
print(json.dumps(counts,indent=2))
