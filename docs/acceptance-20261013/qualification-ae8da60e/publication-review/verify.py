from pathlib import Path,PurePosixPath
import json,tarfile,hashlib,datetime,subprocess,collections
OUT=Path(__file__).parent
REPO=Path('/workspace/capiro-acceptance-batch-20261013')
DOCS=REPO/'docs/acceptance-20261013'
PACK=DOCS/'qualification-ae8da60e'
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  while b:=f.read(1048576):h.update(b)
 return h.hexdigest()
def b(p):p=Path(p);return {'path':str(p),'bytes':p.stat().st_size,'sha256':sha(p)}
def save(n,x):(OUT/n).write_text(json.dumps(x,indent=2)+'\n')
m=json.loads((PACK/'MANIFEST.json').read_text());expected={r['path']:r for r in m['members']};actual={};mismatches=[];source_mismatches=[];source_missing=[];unsupported=[];source_archives={}
with tarfile.open(PACK/'evidence.tar.gz','r:gz') as t:
 members=t.getmembers();index={v.name:v for v in members}
 for v in members:
  if not v.isfile():unsupported.append({'path':v.name,'type':str(v.type)});continue
  data=t.extractfile(index[v.name]).read();actual[v.name]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'mode':oct(v.mode)}
  r=expected.get(v.name)
  if not r:continue
  if actual[v.name]!={k:r[k] for k in ['bytes','sha256','mode']}:mismatches.append(v.name)
  s=r['source']
  if '!' in s:
   archive,member=s.split('!',1)
   if archive not in source_archives:
    a=tarfile.open(Path('/workspace/capiro-generated-preserved-20261013')/archive,'r:gz');source_archives[archive]=(a,{z.name:z for z in a.getmembers()})
   a,idx=source_archives[archive];sd=a.extractfile(idx[member]).read();source_mode=oct(idx[member].mode)
  else:
   p=Path(s)
   if not p.exists():source_missing.append(s);continue
   sd=p.read_bytes();source_mode=oct(p.stat().st_mode&0o777)
  if len(sd)!=r['bytes'] or hashlib.sha256(sd).hexdigest()!=r['sha256'] or source_mode!=r['mode']:source_mismatches.append(v.name)
for a,idx in source_archives.values():a.close()
roots={'corrected-gates':Path('/workspace/capiro-unified-acceptance-corrected-20261013'),'original-attempts':Path('/workspace/capiro-unified-acceptance-final-20261013'),'shared-original-artifacts':Path('/tmp/capiro-acceptance-final-runtime-20261013/acceptance-final-modules-browser-artifacts'),'final-browser-artifacts':Path('/workspace/capiro-acceptance-browser-artifacts-20261013'),'source-review':Path('/tmp/capiro-acceptance-source-preservation-review-20261013'),'infrastructure-review':Path('/tmp/capiro-acceptance-ae8da-infra-review-20261013'),'dependency-preservation-review':Path('/tmp/capiro-acceptance-dependency-preservation-addendum-20261013'),'final-gate-review':Path('/tmp/capiro-acceptance-final-gate-review-20261013')}
completeness=[]
for label,root in roots.items():
 actual_files={f'{label}/{p.relative_to(root)}' for p in root.rglob('*') if p.is_file() or p.is_symlink()};declared={p for p in expected if p.startswith(label+'/')}
 completeness.append({'label':label,'root':str(root),'actualFiles':len(actual_files),'declaredFiles':len(declared),'missingFromManifest':sorted(actual_files-declared),'declaredSourceNowMissing':sorted(declared-actual_files)})
result={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'manifest':b(PACK/'MANIFEST.json'),'archive':b(PACK/'evidence.tar.gz'),'archiveMatchesExpectedSHA':sha(PACK/'evidence.tar.gz')=='2a08f8618ff3e0c87797427136b1d209da6a68872898fe7402a75b79f8cb890f','manifestMatchesExpectedSHA':sha(PACK/'MANIFEST.json')=='57a507398cadd5412815d647ed2f3a570a137ded291e4176c0021824ac344f34','declaredMembers':m['memberCount'],'actualMembers':len(actual),'duplicateDeclaredPaths':len(m['members'])-len(expected),'duplicateTarPaths':len(members)-len(index),'uncompressedBytes':sum(v['bytes'] for v in actual.values()),'declaredUncompressedBytes':m['uncompressedBytes'],'missing':sorted(expected.keys()-actual.keys()),'unexpected':sorted(actual.keys()-expected.keys()),'memberMismatch':mismatches,'sourceMismatch':source_mismatches,'sourceMissing':source_missing,'unsupportedTypes':unsupported,'unsafePaths':[p for p in actual if PurePosixPath(p).is_absolute() or '..' in PurePosixPath(p).parts],'sourceRootCompleteness':completeness,'categoryCounts':dict(collections.Counter(p.split('/')[0] for p in actual))}
save('PACKET-VERIFICATION.json',result)
def git(*args):return subprocess.check_output(['git','-C',str(REPO),*args],text=True).strip()
changed=git('diff','--name-only','HEAD').splitlines();untracked=git('ls-files','--others','--exclude-standard').splitlines();staged=git('diff','--cached','--name-only').splitlines();docs_only=all(p.startswith('docs/acceptance-20261013/') for p in set(changed+untracked+staged))
source={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':git('rev-parse','HEAD'),'branch':git('branch','--show-current'),'statusPorcelain':git('status','--porcelain'),'trackedChanges':changed,'stagedChanges':staged,'untrackedFiles':untracked,'allChangesUnderAcceptanceDocs':docs_only,'applicationDiffVsVerifier':git('diff','ae8da60e6d63d02b65a6ff9eb71c90554f213a10','--','apps','packages','scripts','vendor','package.json','package-lock.json'),'rootLock':b(REPO/'package-lock.json'),'applicationTree':git('rev-parse','HEAD:apps/web'),'sourceTree':git('rev-parse','HEAD:apps/web/src'),'publicationBaseIsAncestor':subprocess.run(['git','-C',str(REPO),'merge-base','--is-ancestor','5875e240c7b266a0e63903c4d0ed9b30c08d4d9a','HEAD'],capture_output=True).returncode==0,'independentAuditCopiedByteExact':(PACK/'INDEPENDENT-AUDIT.md').read_bytes()==Path('/tmp/capiro-acceptance-final-gate-review-20261013/REPORT.md').read_bytes()}
save('SOURCE-DOCUMENT-VERIFICATION.json',source)
print(json.dumps({'archive':result['archive'],'manifest':result['manifest'],'members':result['actualMembers'],'uncompressedBytes':result['uncompressedBytes'],'memberMismatch':mismatches,'sourceMismatch':source_mismatches,'sourceMissing':source_missing,'rootCompleteness':completeness,'docsOnly':docs_only,'applicationDiffEmpty':not source['applicationDiffVsVerifier'],'byteExactAudit':source['independentAuditCopiedByteExact']},indent=2))
