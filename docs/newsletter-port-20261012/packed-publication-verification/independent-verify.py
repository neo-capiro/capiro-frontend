from pathlib import Path,PurePosixPath
import json,subprocess,hashlib,stat,os,datetime
root=Path('/workspace/capiro-newsletter-port');out=Path('/tmp/capiro-newsletter-committed-verification');source='4910400220140a0ff957b3336943a7438a52f7c0';commit='674de8518026e63f11e350a9784a77745d806efe';base='docs/newsletter-port-20261012';prefix=base+'/packed-consumer-evidence/'
def git(*a):return subprocess.check_output(['git',*a],cwd=root)
def blob(c,p):return git('show',c+':'+p)
def sha(b):return hashlib.sha256(b).hexdigest()
def tree(c):
 d={}
 for r in git('ls-tree','-r','-z',c).split(b'\0'):
  if not r:continue
  meta,p=r.split(b'\t',1);mode,kind,oid=meta.decode().split();d[p.decode()]={'mode':mode,'kind':kind,'oid':oid}
 return d
assert git('rev-parse','674de85').decode().strip()==commit;assert git('show','-s','--format=%P',commit).decode().strip()==source
mraw=blob(commit,base+'/PACKED-EVIDENCE-MANIFEST.json');m=json.loads(mraw);assert sha(mraw)=='f9503aca9e494f49f4d42440841d8492814a5606bb73209aca5cdc8d36cf309e'
assert m['source']==source and m['files']==len(m['records'])==417 and m['bytes']==sum(r['bytes'] for r in m['records'])==8324271
full,old=tree(commit),tree(source);proof={p:e for p,e in full.items() if p.startswith(prefix)};wanted={prefix+r['path'] for r in m['records']};assert len(wanted)==417 and set(proof)==wanted
changed={p for p in full.keys()|old.keys() if full.get(p)!=old.get(p)};assert len(changed)==421
controls={base+'/'+p for p in ['HANDOVER.md','PACKED-CONSUMER.md','PACKED-EVIDENCE-MANIFEST.json','PACKED-QUALIFICATION.md']};assert changed==wanted|controls
process=subprocess.Popen(['git','cat-file','--batch'],cwd=root,stdin=subprocess.PIPE,stdout=subprocess.PIPE);checks=[]
for row in m['records']:
 rel=PurePosixPath(row['path']);assert not rel.is_absolute() and '..' not in rel.parts and str(rel)==row['path'];p=prefix+row['path'];entry=proof[p];assert entry['kind']=='blob'
 process.stdin.write((entry['oid']+'\n').encode());process.stdin.flush();hdr=process.stdout.readline().decode().split();assert hdr[:2]==[entry['oid'],'blob'];raw=process.stdout.read(int(hdr[2]));assert process.stdout.read(1)==b'\n';assert len(raw)==row['bytes'] and sha(raw)==row['sha256']
 original=Path(row['source']);local=root/p;assert stat.S_ISREG(original.lstat().st_mode) and stat.S_ISREG(local.lstat().st_mode);assert original.read_bytes()==raw==local.read_bytes()
 mode='100755' if original.stat().st_mode&0o111 else '100644';assert entry['mode']==mode
 checks.append({**row,'committedPath':p,'gitBlob':entry['oid'],'gitMode':entry['mode'],'originalAndLocalAndCommittedBytesMatch':True,'originalExecutableModeMatches':True})
process.stdin.close();assert process.wait()==0
sources={r['source'] for r in m['records']};actual=set();links=[]
for label,s in m['roots'].items():
 folder=Path(s);assert folder.is_dir()
 for current,dirs,files in os.walk(folder,followlinks=False):
  for name in dirs+files:
   p=Path(current)/name;st=p.lstat()
   if stat.S_ISLNK(st.st_mode):links.append(str(p))
   elif stat.S_ISREG(st.st_mode):actual.add(str(p))
   else:assert stat.S_ISDIR(st.st_mode)
assert actual==sources and not links
borrowed='packages/qualification-newsletter/node_modules';assert not any(p==borrowed or p.startswith(borrowed+'/') for p in full);index={}
for row in git('ls-files','--stage','-z').split(b'\0'):
 if not row:continue
 meta,p=row.split(b'\t',1);mode,oid,stage=meta.decode().split();assert stage=='0';index[p.decode()]={'mode':mode,'kind':'blob','oid':oid}
assert not any(p==borrowed or p.startswith(borrowed+'/') for p in index)
for p in wanted:assert index[p]==proof[p]
identity={p:git('rev-parse',commit+':'+p).decode().strip() for p in ['apps','apps/web','apps/web/src','packages','scripts','vendor']}
for p,value in identity.items():assert value==git('rev-parse',source+':'+p).decode().strip()
ws=subprocess.run(['git','diff','--check',source,commit],cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(out/'evidence-whitespace.log').write_bytes(ws.stdout);assert ws.returncode==2
warnings=[x for x in ws.stdout.decode().splitlines() if x.startswith(base+'/')];assert len(warnings)==18 and all(x.split(':',1)[0] in wanted for x in warnings)
source_ws=subprocess.run(['git','diff','--check',source+'^',source],cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(out/'source-whitespace.log').write_bytes(source_ws.stdout);assert source_ws.returncode==0
index_changes=git('diff','--cached','--name-only').decode().splitlines();tracked_changes=git('diff','--name-only').decode().splitlines();head=git('rev-parse','HEAD').decode().strip()
assert all(p.startswith(base+'/') for p in index_changes+tracked_changes)
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'verdict':'PASS_COMMITTED_PACKED_EVIDENCE_WITH_PRESERVED_WHITESPACE_WARNINGS','qualifiedSource':source,'evidenceCommit':commit,'parentIsExactQualifiedSource':True,'sourceRootTree':git('rev-parse',source+'^{tree}').decode().strip(),'evidenceRootTree':git('rev-parse',commit+'^{tree}').decode().strip(),'unchangedTrees':identity,'allOtherTrackedPathsAndModesUnchanged':True,'manifestSHA256':sha(mraw),'manifestRecords':417,'manifestBytes':8324271,'exactCommittedProofSet':True,'exactThreeOriginalRootRegularFileSet':True,'allCommittedOriginalLocalBytesAndOriginalExecutableModesMatch':True,'changedPaths':421,'changedControls':sorted(controls),'borrowedDependencyLink':{'path':borrowed,'isLocalSymlink':(root/borrowed).is_symlink(),'target':os.readlink(root/borrowed),'committed':False,'staged':False},'whitespace':{'sourceCommitExit':source_ws.returncode,'evidenceCommitExit':ws.returncode,'warningCount':len(warnings),'allWarningsInsidePreservedManifestEvidence':True,'warningLocations':warnings,'rawProofRewritten':False},'indexEvidenceMatchesReviewedCommit':True,'observedHead':head,'observedTrackedChanges':tracked_changes,'observedStagedChanges':index_changes,'observedStatus':git('status','--porcelain=v1').decode(),'laterDocumentationFollowup':'Not covered unless separately bound; review pins exact 674de851 evidence commit','records':checks,'notRun':['install','browser','application runtime','native/provider/cloud calls'],'writes':'Only /tmp/capiro-newsletter-committed-verification; PR15 and frozen proof untouched'}
(out/'COMMITTED-VERIFICATION.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['records','whitespace']},indent=2));print(json.dumps({'whitespace':{k:v for k,v in result['whitespace'].items() if k!='warningLocations'}},indent=2))
