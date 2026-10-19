from pathlib import Path
import json,subprocess,hashlib,collections,datetime
p=Path('/workspace/capiro-portfolio-acceptance-map-20261013')
expected=json.loads((p/'inputs/open-337.json').read_text())
required=['audit_id','functionality','primary_category','current_behavior','current_source_evidence','original_criteria','criteria_evidence','remaining_native_criteria','blockers','selected_figma_nodes','confirmed_mismatch','recommended_acceptance_work','unblocked_now','no_native_actions_needed_for_next_step','acceptance_state','confidence','evidence_group']
categories=['actual_missing_implementation','existing_behavior_missing_evidence','authentic_backend_provider_dependency','selected_figma31_mismatch']
rows=[];lanes={};failures=[];checks={};pending=[]
for lane in ['core_intake','core_profile','calendar','relationships','objectives_work_intel','prospects']:
 f=p/'reviewers'/lane/'rows.json'
 if not f.exists():pending.append(lane);continue
 records=json.loads(f.read_text());lanes[lane]={'rows':len(records),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'categories':dict(collections.Counter(x['primary_category'] for x in records))}
 for r in records:
  for key in required:
   if key not in r:failures.append(f"{r['audit_id']} missing {key}")
  if r['primary_category'] not in categories:failures.append(f"{r['audit_id']} bad category")
  if r['acceptance_state']!='OPEN_FINAL_ACCEPTANCE':failures.append(f"{r['audit_id']} unexpected acceptance")
  if r['primary_category']=='selected_figma31_mismatch' and not r['confirmed_mismatch']:failures.append(f"{r['audit_id']} lacks mismatch")
  if not r['current_source_evidence']:failures.append(f"{r['audit_id']} empty current-source evidence")
  for ref in r['current_source_evidence']:
   if not isinstance(ref,dict) or not ref.get('path'):failures.append(f"{r['audit_id']} unstructured source binding");continue
   rel=ref['path'];commit=next((ref[k] for k in ['ref','source_commit','commit','source'] if isinstance(ref.get(k),str) and len(ref[k])==40),'90ccdd47de7a989e822590d616d69baa15a37d5d')
   repo='/workspace/capirov2' if rel.startswith(('apps/api/','apps/intel/','apps/engagement-api/','apps/planner/','apps/workspace/')) or 'capirov2' in ref.get('repository','') else '/workspace/capiro-onboard-port-20261013'
   key=repo+':'+commit+':'+rel
   if key not in checks:
    try:
     blob=subprocess.check_output(['git','rev-parse',commit+':'+rel],cwd=repo,stderr=subprocess.PIPE,text=True).strip()
     raw=subprocess.check_output(['git','cat-file','blob',blob],cwd=repo,stderr=subprocess.PIPE)
     checks[key]={'path':rel,'commit':commit,'repo':repo,'git_blob':blob,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
    except subprocess.CalledProcessError as e:failures.append(f"{r['audit_id']} source binding failed {key}: "+e.stderr.decode(errors='replace')[:100] if isinstance(e.stderr,bytes) else str(e));continue
   c=checks[key]
   for field in ['git_blob','sha256']:
    if ref.get(field) and ref[field]!=c[field]:failures.append(f"{r['audit_id']} {rel} {field} mismatch")
 rows+=records
ids=[r['audit_id'] for r in rows];wanted=[r['audit_id'] for r in expected]
dupes=[x for x,n in collections.Counter(ids).items() if n!=1]
missing=sorted(set(wanted)-set(ids));extra=sorted(set(ids)-set(wanted))
if dupes or extra:failures.append({'duplicates':dupes,'extra':extra})
if not pending and missing:failures.append({'missing':missing})
result={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':'90ccdd47de7a989e822590d616d69baa15a37d5d','published':'5875e240c7b266a0e63903c4d0ed9b30c08d4d9a','lanes':lanes,'total':len(rows),'counts':dict(collections.Counter(r['primary_category'] for r in rows)),'accepted':0,'unblocked_offline_next_steps':sum(r['unblocked_now'] for r in rows),'pending_lanes':pending,'missing_ids':missing,'failures':failures,'unique_source_bindings':len(checks),'scope':'Structural ledger/required-field/current-source byte binding verification only; no new native/browser/design acceptance and no replacement for semantic review.'}
(p/'ROOT-MAPPING-VALIDATION.json').write_text(json.dumps(result,indent=2)+'\n')
(p/'ROOT-SOURCE-BINDINGS.json').write_text(json.dumps(list(checks.values()),indent=2)+'\n')
if not pending and not failures:(p/'RECONCILED-337.json').write_text(json.dumps(rows,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='missing_ids'},indent=2))

