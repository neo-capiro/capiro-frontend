from pathlib import Path
import json,hashlib,zipfile,os,stat,datetime,subprocess
O=Path(__file__).parent;P=Path('/workspace/capiro-meri-files-20261013')
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(Path(p).read_text())
def save(n,x):(O/n).write_text(json.dumps(x,indent=2)+'\n')
m=load(O/'ORIGINAL-PATH-MAP.json');assert len(m['records'])==424
known={r['sha256']:r['storage'] for r in m['records']};readable=load(O/'READABLE-INDEX.json');owners=load(O/'OWNER-MANIFEST-VERIFICATION.json');added=[]
roots=[('browser-independent-addendum','/tmp/capiro-meri-files-browser-independent-addendum-20261013','53fab7117b9cbf765db5f02477a273c20fa918d39f6040242418e8d166cc84c0'),('source-preservation-review','/tmp/capiro-meri-files-preservation-review-20261013','c5d354d15113a360f227e258bad9c0050d1d06c4610f20aeb03c0e3924fde7e9')]
with zipfile.ZipFile(O/'late-objects.zip','a',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for lane,root,expected in roots:
  rp=Path(root);mp=rp/'MANIFEST.json';assert sha(mp.read_bytes())==expected
  raw=load(mp);entries=raw.get('records',raw.get('files'));assert isinstance(entries,list)
  for e in entries:assert (rp/e['path']).stat().st_size==e['bytes'] and sha((rp/e['path']).read_bytes())==e['sha256']
  owners.append({'lane':lane,'path':str(mp),'sha256':expected,'recordsVerified':len(entries),'mismatches':[]});start=len(m['records'])
  for p in sorted(rp.rglob('*')):
   if p.is_dir() and not p.is_symlink():continue
   s=p.lstat();kind='symlink' if p.is_symlink() else 'file';assert kind=='symlink' or stat.S_ISREG(s.st_mode)
   data=os.fsencode(os.readlink(p)) if kind=='symlink' else p.read_bytes();h=sha(data)
   r={'lane':lane,'path':str(p.relative_to(rp)),'originalPath':str(p),'kind':kind,'mode':stat.S_IMODE(s.st_mode),'mtimeNs':s.st_mtime_ns,'bytes':len(data),'sha256':h}
   if kind=='symlink':r['target']=os.readlink(p)
   if h not in known:
    zi=zipfile.ZipInfo('sha256/'+h,date_time=(1980,1,1,0,0,0));zi.compress_type=zipfile.ZIP_DEFLATED;zi.external_attr=(stat.S_IFREG|0o644)<<16;z.writestr(zi,data)
    known[h]={'kind':'archive','archive':'late-objects.zip','member':'sha256/'+h}
   r['storage']=known[h];m['records'].append(r);added.append(r)
   if kind=='file' and (p.suffix=='.md' or p.suffix=='.json' and len(data)<=160000):
    q=O/'readable'/lane/r['path'];q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(data);readable.append({'path':str(q.relative_to(O)),'originalPath':str(p),'bytes':len(data),'sha256':h})
  m['roots'].append({'lane':lane,'root':root,'records':len(m['records'])-start,'bytes':sum(r['bytes'] for r in m['records'][start:]),'symlinks':sum(r['kind']=='symlink' for r in m['records'][start:])})
vr=load(O/'VENDOR-REFERENCE.json');v=P/vr['path'];index=subprocess.check_output(['git','-C',str(P),'ls-files','--stage','--',vr['path']],text=True).strip();assert index.split()[:3]==['100644','3b1b1e6345539632b8a4be80de44b0ab548369af','0'];assert sha(v.read_bytes())==vr['sha256'];vr['trackedAtFinalSeal']=True;vr['indexEntryAtFinalSeal']=index;vr['finalSealObservedUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat();save('VENDOR-REFERENCE.json',vr)
verified=[];archives={};archproof=[]
try:
 for n in ['objects.zip','late-objects.zip']:
  z=zipfile.ZipFile(O/n);assert z.testzip() is None and len(z.namelist())==len(set(z.namelist()));archives[n]=z
  archproof.append({'path':n,'bytes':(O/n).stat().st_size,'sha256':sha((O/n).read_bytes()),'uniqueMembers':len(z.namelist()),'zipCRCVerified':True})
 assert archproof[0]['sha256']=='f00bdda0256d017ec59f70a9aa7e6e1597d8f017d9d6786cbffa03be8764a725'
 for r in m['records']:
  stored=v.read_bytes() if r['storage']['kind']=='vendor' else archives[r['storage']['archive']].read(r['storage']['member'])
  q=Path(r['originalPath']);original=os.fsencode(os.readlink(q)) if r['kind']=='symlink' else q.read_bytes()
  assert stored==original and len(stored)==r['bytes'] and sha(stored)==r['sha256'] and stat.S_IMODE(q.lstat().st_mode)==r['mode'],q
  verified.append({'originalPath':str(q),'sha256':r['sha256'],'bytesEqualAfterReopen':True,'storage':r['storage']})
 for e in owners:
  q=Path(e['path']);assert sha(q.read_bytes())==e['sha256'];raw=load(q);es=raw.get('records',raw.get('files')) if isinstance(raw,dict) else raw
  for item in es:
   if not isinstance(item,dict) or 'path' not in item:continue
   p=q.parent/item['path'];assert sha(p.read_bytes())==item['sha256']
   if 'bytes' in item:assert p.stat().st_size==item['bytes']
 for e in readable:assert sha((O/e['path']).read_bytes())==e['sha256']
finally:
 for z in archives.values():z.close()
save('ORIGINAL-PATH-MAP.json',m);save('READABLE-INDEX.json',readable);save('OWNER-MANIFEST-VERIFICATION.json',owners)
summary={'verifiedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archives':archproof,'originalRecords':len(m['records']),'originalBytes':sum(r['bytes'] for r in m['records']),'uniqueSha256Objects':len({r['sha256'] for r in m['records']}),'allOriginalBytesEqual':True,'symlinks':sum(r['kind']=='symlink' for r in m['records']),'directFiles':len(readable),'directFilesAllExact':True,'ownerManifestsRevalidated':len(owners),'records':verified}
save('ALL-REOPEN-VERIFICATION.json',summary)
text=(O/'README.md').read_text();text=text.replace('# Meri Files development evidence — prepared, not finally sealed','# Meri Files development evidence — sealed publication packet')
text=text.replace('The root development directory remains excluded until its owner seals it. The final independent browser review is also pending inclusion.','The sealed root development directory, final independent browser review/addendum, root render review, source-preservation audit and verified storage-recovery receipts are included.')
text=text.replace('`REOPEN-VERIFICATION.json` confirms every stored byte was reopened and compared with its original, including ZIP CRC and SHA256 checks.','`ALL-REOPEN-VERIFICATION.json` confirms every stored byte in both archives was reopened and compared with its original, including ZIP CRC and SHA256 checks. The earlier primary-only verification remains unchanged.')
text=text.replace('At preparation this vendor file is not yet tracked in Git; the final repository commit binding remains pending. The final publication must retain that exact vendor file.','At preparation the vendor was not tracked; at final seal its staged index entry is mode100644, Git blob `3b1b1e6345539632b8a4be80de44b0ab548369af`. Root will include that exact file in the same publication commit. A commit hash is intentionally not invented before that commit exists.')
text=text.replace('The corrected cases use', 'The corrected cases use')
text=text.replace('## Remaining publication inputs', '## Final included reviews and remaining qualification')
text=text[:text.index('1. Root\'s sealed')] + '''The root development seal includes191 original action cases, six route-allocation checks, public-package verification, development typechecking/formatting and zero-blocking architecture. Its typecheck receipt explicitly states that source hashes were captured while lanes were active; this is not an immutable tested-source qualification. Missing initial terminal output is not reconstructed. The original observations and subsequent corrections remain in `readable/root-development/ITERATIONS.md`.

The final independent browser review accepts27/27 bounded synthetic cases and the three exact responsibility proposals. It confirms the same-client host recovery through meaningful retained-draft, held-write and denied-read controls. Its addendum binds the owner wording correction: the invalid desktop anchor `href` expectation was removed because desktop Files is a button, while the phone href and both-width keyboard/URL/history/effect behavior remain asserted. The original owner report is preserved verbatim alongside its correction; there is no blanket unchanged-assertion claim.

The source-preservation review establishes306 original top-level test/spec files plus29 colocated originals byte-identical, additive dispatcher/smoke coverage, eight lifecycle-method AST comparisons and the exact two-entry lock change. These are source-preservation findings, not execution on a future frozen commit.

The storage packet is included as verified preservation receipts. Its reports document archived runtime and byte-verified relocation/duplicate retirement; those storage actions were not repeated by this publisher, and the large runtime archive is not duplicated here. The storage packet's own manifest and every archived receipt byte were independently checked.

All requested publication inputs are now included. `preparation/` preserves the original preparation-stage documents, which correctly showed pending inputs at that time. Final integrated clean-install, comprehensive browser/build/standalone and native qualification still require a separate frozen source and receipts. No old83 gate result is adopted as a Files successor pass. The same-publication vendor commit is root-owned; its content is already exactly bound above.
'''
(O/'README.md').write_text(text)
status={'sealedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'SEALED_VERIFIED_DEVELOPMENT_EVIDENCE_NOT_FROZEN_QUALIFICATION','baseSource':'83f54f5ac0107822833adbbfef2b453e0240bc56','allInputsReleased':True,'originalRootsAndSingleFileGroups':len(m['roots']),'originalRecords':summary['originalRecords'],'originalBytes':summary['originalBytes'],'archiveMembers':sum(a['uniqueMembers'] for a in archproof),'archives':archproof,'directFiles':len(readable),'vendorGitBlob':vr['gitBlob'],'vendorStaged':True,'sourceCommitBinding':'Same publication commit to be created by root; no claim of qualification on it','allOriginalBytesReopenedEqual':True,'ownerManifestsRevalidated':len(owners),'noSourceOrRuntimeMutation':True,'limits':['Development receipts are not clean/frozen integrated gates','17passed/10harnessfail browser attempt and corrected27passed retained','Owner assertion wording correction retained separately','18byte synthetic payloads are not Office documents','Native337/fullFigma/AT/Office rendering/recalculation/image/deploy remain unqualified']}
save('PUBLICATION-STATUS.json',status)
# Preserve all capture/verification scripts and historical receipts; seal every final regular packet file.
files=[{'path':str(p.relative_to(O)),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in sorted(O.rglob('*')) if p.is_file() and p.name!='MANIFEST.json']
# Nested owner MANIFEST.json copies must also be included; only the top-level seal excludes itself.
files=[{'path':str(p.relative_to(O)),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in sorted(O.rglob('*')) if p.is_file() and p!=O/'MANIFEST.json' and p!=O/'finalize.log']
seal={'sealedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':status['status'],'fileCount':len(files),'bytes':sum(x['bytes'] for x in files),'files':files,'excludedFromManifest':['finalize.log (not created; terminal summary is delivered separately)']}
save('MANIFEST.json',seal)
# Reopen the completed seal and every packet member one final time.
for e in load(O/'MANIFEST.json')['files']:
 p=O/e['path'];assert p.stat().st_size==e['bytes'] and sha(p.read_bytes())==e['sha256']
print(json.dumps({'directory':str(O),'fileCount':len(files),'bytes':seal['bytes'],'manifestSha256':sha((O/'MANIFEST.json').read_bytes()),'originalRecords':summary['originalRecords'],'originalBytes':summary['originalBytes'],'uniqueArchiveMembers':status['archiveMembers'],'directFiles':len(readable),'status':status['status']},indent=2))
