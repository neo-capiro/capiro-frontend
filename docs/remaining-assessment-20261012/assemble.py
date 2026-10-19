import json,pathlib,collections,datetime,hashlib,shutil,csv,subprocess
root=pathlib.Path(__file__).resolve().parent/'evidence'
repo=pathlib.Path('/workspace/capiro-acceptance-assessment')
out=repo/'docs/remaining-assessment-20261012'
lanes=['core_intake','core_profile','calendar_relationships','objectives_work_intel','prospects','modules_settings']
ledger=json.load(open(repo/'docs/integration-contracts-20261012/PORTFOLIO-337-ACTIVE-LEDGER.json'))
original={r['audit_id']:r for r in ledger['rows']}
partitions=json.load(open(root/'PARTITIONS.json'))
rows=[]; findings=[]; laneCounts=[]
for lane in lanes:
 x=json.load(open(root/lane/'row-assessment.json'));rs=x.get('rows',x.get('rowAssessments'))
 assert len(rs)==len(partitions['groups'][lane])
 assert {r['audit_id'] for r in rs}==set(partitions['groups'][lane])
 for r in rs:
  old=original[r['audit_id']]
  rows.append({'audit_id':r['audit_id'],'area':old['area'],'criterion':old['criterion'],'scope':old['scope'],'ownerLane':lane,'classification':r.get('classification',r.get('assessment',r.get('localStatus'))),'currentObservation':r.get('reason',r.get('frontendAssessment',r.get('observed',r.get('observation')))),'findingIds':r.get('findingIds',[]),'relatedVariantFindingIds':r.get('relatedModulesVariantFindings',[]),'assessmentSourceCommit':'4a1614886fd98bb42d529f1ef59b3d01d7ff9173','sourceEvidencePrecision':'FILE_LEVEL_ROW_ANCHORS; precise defect locations are in linked findings' if lane=='objectives_work_intel' else 'AS_RECORDED_IN_DETAILED_EVIDENCE','fullRowAcceptance':'EXCLUDED_AS_PREVIOUSLY_RECORDED' if old['scope']!='IN_SCOPE' else 'OPEN_FINAL_ACCEPTANCE','nativeStatus':'EXCLUDED' if old['scope']!='IN_SCOPE' else 'NOT_RUN_BY_THIS_ASSESSMENT','detailedEvidence':f'evidence/{lane}/row-assessment.json','originalAssessment':r})
 x=json.load(open(root/lane/'findings.json'))
 fs=x.get('findings',x.get('confirmedFindings',[]))
 for f in fs:
  severity=f['severity'];disposition='Retain author severity and bounded impact; consult evidence for exact native and visual limits.'
  if f['id']=='PROS-F01':severity='P2';disposition='Secondary review aligns with OWI-F01: same previously delivered cached data remains after fresh403. Fix or gate this authenticated surface; no backend authorization bypass or cross-tenant access was shown.'
  if f['id']=='CP-03':severity='P3';disposition='Secondary backend source review shows same-ID deletion is recoverable. Repeat DELETE dispatch is proved; duplicate destructive impact is not. Keep as uncertain-outcome/readback UX concern, not a standalone release blocker.'
  if f['id']=='CR-04':severity='P2';disposition='Secondary review bounds this to false completion after a foreign meeting/client receipt. Edit is browser-proven; creation uses the shared source but lacks a separate mismatch probe. No native cross-client mutation or authorization bypass was demonstrated. See evidence/modules_settings/secondary-review.json.'
  if f['id']=='MS06':disposition='Separate the functional omission of a supplied safe join URL from remaining split-view visual parity. Do not infer missing backend join data or Meri generation authority.'
  findings.append({'id':f['id'],'lane':lane,'severity':severity,'authorSeverity':f['severity'],'title':f['title'],'disposition':disposition,'authorEvidence':f'evidence/{lane}/findings.json','originalFinding':f})
 laneCounts.append({'lane':lane,'assigned':len(rs),'inScope':sum(original[r['audit_id']]['scope']=='IN_SCOPE' for r in rs),'findings':len(fs)})
assert len(rows)==345 and len({r['audit_id'] for r in rows})==345
assert sum(r['scope']=='IN_SCOPE' for r in rows)==337
assert all(r['currentObservation'] and r['classification'] for r in rows)
assert len({f['id'] for f in findings})==len(findings)==37
meta={'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'applicationSource':'4a1614886fd98bb42d529f1ef59b3d01d7ff9173','applicationRootTree':'16c0b62901859aa4ff3f2ea01856aa13e13c65cd','applicationSourceTreePath':'apps/web/src','applicationSourceTree':'46cebca97ccfc1facc1c1a939beb6f4d7730685b','evidenceBase':'3562618f73d7a1f9d620d7b7b28c9e8c2c1ac83d','readOnlyApplicationAssessment':True,'originalLedgerUnmodified':True,'fullRowsNewlyAccepted':0,'scopeCounts':{'inScope':337,'excluded':8,'total':345},'laneCounts':laneCounts,'notes':['Each original row is assigned exactly once. Full native row acceptance remains open; current observations and missing criteria differ by row.','Original lane reports and severity labels are preserved; root secondary-review dispositions are explicit overlays.','The frozen image source and original578 qualification evidence files remain unchanged. This is not new build/image/native acceptance.']}
(out/'PORTFOLIO-337-REMAINING-ASSESSMENT.json').write_text(json.dumps({**meta,'rows':rows},indent=2)+'\n')
(out/'FINDINGS.json').write_text(json.dumps({**meta,'severityCounts':dict(collections.Counter(f['severity'] for f in findings)),'findings':findings},indent=2)+'\n')
with open(out/'ROW-INDEX.csv','w',newline='') as h:
 w=csv.writer(h);w.writerow(['audit_id','area','scope','lane','classification','finding_ids','current_observation','detailed_evidence'])
 for r in rows:w.writerow([r['audit_id'],r['area'],r['scope'],r['ownerLane'],r['classification'],';'.join(r['findingIds']),r['currentObservation'],r['detailedEvidence']])
print(json.dumps({'rows':len(rows),'findings':len(findings),'severityCounts':dict(collections.Counter(f['severity'] for f in findings)),'lanes':laneCounts},indent=2))
