from pathlib import Path
import json,hashlib,shutil,datetime,struct
out=Path('/tmp/capiro-visual-2d50edd');e=Path('/tmp/capiro-candidate-2d50edd');root=Path('/workspace/capiro-contracts')
pr=json.loads((e/'portfolio-browser-execution.json').read_text());mr=json.loads((e/'modules-browser-execution.json').read_text())
assert pr['state']=='finished' and pr['exitCode']==0 and mr['state']=='finished' and mr['exitCode']==0
head='2d50edd8f3c5ea232db8e1338566f0667db4b4bd'
for r in [pr,mr]:assert r['head']==r['headAtFinish']==head and r['statusAtStart']==r['statusAtFinish']==''
# Exact selectors distinguish identically named captures from different scenarios.
sel={
 'V01':[('Portfolio','visual-representative-inde*','index-desktop.png'),('Portfolio','visual-representative-inde*','index-mobile-dark.png')],
 'V02':[('Work','','objective-intake-desktop-filled.png'),('Work','','objective-intake-phone-dark.png')],
 'V03':[('Portfolio','alert-channel-visual-phone-92*','alert-channels-phone-light.png'),('Portfolio','alert-channel-visual-deskt-ae*','alert-channels-desktop-light.png')],
 'V04':[('Portfolio','work-presentation-desktop*','workspace-desktop-table.png'),('Portfolio','work-presentation-phone-Wo*','workspace-phone-cards.png')],
 'V05':[('Portfolio','capability-presentation-vi-418*','capability-create-desktop-light.png'),('Portfolio','capability-presentation-vi-418*','capability-create-details-desktop-light.png'),('Portfolio','capability-presentation-vi-ea*','capability-profile-phone-light.png')],
 'V06':[('Portfolio','saved-submissions-visual-t-92*','saved-submissions-desktop.png'),('Portfolio','saved-submissions-visual-t-4a*','saved-submissions-phone.png')],
 'V07':[('Portfolio','ordered-owners-*','ordered-owners-mobile.png')],
 'V08':[('Portfolio','prospect-overview-overview-*','prospect-overview-desktop.png'),('Portfolio','prospect-overview-overview-*','prospect-overview-mobile.png')],
 'V09':[('Portfolio','visual-representative-bill-*','bills-desktop.png'),('Portfolio','visual-representative-bill-*','bills-mobile-dark.png')],
 'V10':[('Modules','effective-dates-*','effective-date-mobile.png'),('Portfolio','effective-dates-*','effective-date-desktop.png')],
 'V11':[('Modules','objective-work-destination-0d8*','strategies-desktop.png'),('Modules','objective-work-destination-0d8*','strategies-mobile.png')],
 'V12':[('Modules','objective-work-destination-434*','planner-desktop.png'),('Modules','objective-work-destination-434*','planner-mobile.png')],
 'V13':[('Modules','objective-work-destination-829*','workspace-desktop.png'),('Modules','objective-work-destination-829*','workspace-mobile.png')],
}
for node,name in [('411:119740','figma-strategy-screenshot.png'),('411:95693','figma-planner.png'),('411:112533','figma-workspace.png')]:
 p=Path('/tmp/objective-next-contracts')/name;dest=out/('figma-'+node.replace(':','-')+'.png');assert not dest.exists();shutil.copy2(p,dest)
v=json.loads((out/'VISUAL-OBSERVATIONS.json').read_text());captures=out/'candidate-captures';captures.mkdir()
for item in v['observations']:
 item['candidateCaptures']=[]
 for mode,pattern,name in sel[item['id']]:
  srcroot=root/'apps/web/work' if mode=='Work' else root/('apps/web/test-results/'+('portfolio-browser' if mode=='Portfolio' else 'modules-browser'))
  paths=list(srcroot.glob((pattern+'/' if pattern else '')+name));assert len(paths)==1,(item['id'],paths)
  p=paths[0];receipt=mr if mode=='Modules' else pr
  ts=datetime.datetime.fromisoformat(receipt['startedAt']).timestamp();assert p.stat().st_mtime>=ts,(item['id'],'stale capture',p)
  dest=captures/(item['id']+'-'+mode+'-'+name);shutil.copy2(p,dest);raw=p.read_bytes();w,h=struct.unpack('>II',raw[16:24])
  ref=root/'docs/integration-contracts-20261012/evidence/candidate-f4e9e1f'/('modules-browser-artifacts' if mode=='Modules' else 'portfolio-browser-artifacts')/p.relative_to(srcroot)
  row={'path':str(dest.relative_to(out)),'executedSource':head,'sourcePath':str(p.relative_to(root)),'sha256':hashlib.sha256(raw).hexdigest(),'width':w,'height':h,'capturedMtimeUTC':datetime.datetime.fromtimestamp(p.stat().st_mtime,datetime.UTC).isoformat(),'byteIdenticalToReviewedF4Reference':ref.exists() and ref.read_bytes()==raw}
  item['candidateCaptures'].append(row)
 for target in item['targetFiles']:
  p=out/target;assert p.is_file();raw=p.read_bytes();w,h=struct.unpack('>II',raw[16:24]);item.setdefault('targetEvidence',[]).append({'path':target,'sha256':hashlib.sha256(raw).hexdigest(),'width':w,'height':h})
extraReceipt=json.loads((e/'modules-calendar-visual-execution.json').read_text());assert extraReceipt['state']=='finished' and extraReceipt['exitCode']==0 and extraReceipt['head']==head and extraReceipt['statusAtStart']==extraReceipt['statusAtFinish']==''
extra=list((e/'modules-calendar-visual/artifacts').rglob('modules-effective-date-desktop.png'));assert len(extra)==1
p=extra[0];raw=p.read_bytes();dest=captures/'V10-Modules-modules-effective-date-desktop.png';shutil.copy2(p,dest);w,h=struct.unpack('>II',raw[16:24]);next(x for x in v['observations'] if x['id']=='V10')['candidateCaptures'].append({'path':str(dest.relative_to(out)),'executedSource':head,'sourcePath':str(p),'sha256':hashlib.sha256(raw).hexdigest(),'width':w,'height':h,'captureGate':'modules-calendar-visual-execution.json','byteIdenticalToReviewedF4Reference':False})
v['state']='CANDIDATE_CAPTURES_BOUND_MANUAL_FINAL_REVIEW_PENDING'
v['candidateQualification']={'head':head,'portfolio':pr,'modules':mr}
(out/'VISUAL-OBSERVATIONS.json').write_text(json.dumps(v,indent=2)+'\n')
print(json.dumps([{'id':x['id'],'captures':len(x['candidateCaptures']),'sameAsReviewedReference':sum(y['byteIdenticalToReviewedF4Reference'] for y in x['candidateCaptures'])} for x in v['observations']],indent=2))
