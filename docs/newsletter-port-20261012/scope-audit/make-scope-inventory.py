import collections, datetime, hashlib, json, pathlib, re, subprocess

OUT = pathlib.Path(__file__).parent
REPO = pathlib.Path('/workspace/capiro-remaining')
HEAD = 'adbc84b2251fe6b06cb7f75030026fba5b4ff498'
C = '1e99f0921b207318c6d2abf03927b5c4daa5768b'
W = '193703e34f2bedbb69d87d6a8ee303f65ab8dbda'
BACKEND = '5470c6df029c9553dd49e531229c3c91b26275ef'
def write(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2) + '\n')
def read(name):
    return json.loads((OUT / name).read_text())
def gitblob(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()

extras = read('evidence/final-source-read-addendum.json')
for key, path, name, ref in [
    ('controller', 'apps/workspace/src/newsletters/newsletter.controller.ts', 'newsletter.controller.ts', BACKEND),
    ('WOutreach', 'apps/web/src/pages/engagement/outreach/NewsletterOutreach.tsx', 'W-NewsletterOutreach.tsx', W),
]:
    item = extras[key]
    raw = item['content'].encode()
    assert gitblob(raw) == item['sha']
    (OUT / 'backend-source' / name).write_bytes(raw)
    pins = read('source-pins.json')
    if not any(p['filename'] == name for p in pins):
        pins.append(dict(path=path, ref=ref, filename=name, gitBlob=item['sha'], computedGitBlob=gitblob(raw), gitBlobMatches=True,
                         displayUrl=item['display_url'], bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                         lines=len(raw.splitlines()), nonblankLines=sum(bool(x.strip()) for x in raw.splitlines())))
        write('source-pins.json', pins)

author = read('evidence/schema-assets-lock-receipt.json')
family = author['frontendPreservation']['rows']
comparison = read('evidence/adbc-inventory-comparison.json')
by_path = {x['path']: x for x in comparison['rows']}
c_assets = {x['path']: x for x in read('evidence/newsletterAssetDirectoryC.json')['entries']}
w_assets = {x['path']: x for x in read('evidence/newsletterAssetDirectoryW.json')['entries']}
w_runtime = {x['path']: x for x in read('evidence/newsletterRuntimeDirectoryW.json')['entries']}
w_runtime['apps/web/src/pages/engagement/outreach/NewsletterOutreach.tsx'] = {'sha': extras['WOutreach']['sha']}
pins = read('source-pins.json')
pinmap = {x['path']: x for x in pins if x['ref'] == C}

groups = [
    ('authoring', ['NewsletterCreation.tsx','NewsletterEditor.tsx','NewsletterTemplateChooser.tsx','api.ts','controls.tsx','model.ts','newsletter-links.ts'],
     'Modules Workspace rich authoring and fixed-operation transport',
     'Port revisioned rich campaign list/create/load/save/preview/stage, template/section library, nested design editing and sanitization. Existing generic WorkspaceDraft flow remains separate.'),
    ('brand', ['NewsletterBrandKit.tsx','NewsletterFontPicker.tsx','brand-context.tsx'],
     'Modules Workspace newsletter brand and public shared model/font exports',
     'Port persisted brand logos/colors/buttons/fonts and deliberate application to rich designs. Generic firm-name/address fields are only a partial presentation overlap.'),
    ('asset-library', ['NewsletterAssetDetails.tsx','NewsletterAssetFolders.tsx','NewsletterAssetRevisions.tsx','NewsletterContentStudio.tsx'],
     'Modules Workspace newsletter asset library and fixed-operation transport',
     'Port tenant-owned uploads, folders, search/pagination, details and immutable image revisions; retain owned asset-token URLs. Portfolio Files is a different contract.'),
    ('image-editing', ['NewsletterAdvancedImageEditor.tsx','NewsletterImageControls.tsx','NewsletterImageCropOverlay.tsx','NewsletterImageEditor.tsx','NewsletterImageFocusOverlay.tsx','NewsletterImageReplaceMenu.tsx','NewsletterImageRotationRuler.tsx','NewsletterImageTextOverlay.tsx','NewsletterQuickCrop.tsx','image-editor-crop.ts','image-editor.ts'],
     'Modules Workspace newsletter image editing',
     'Port captured-target crop/scale/focus/rotation/text/replacement, deliberate revision save and cancellation lifetime. Advanced external editor must keep its explicit origin/message contract and remain unexercised in this audit.'),
    ('review', ['NewsletterComments.tsx','NewsletterReview.tsx','NewsletterThreadNotifications.tsx'],
     'Modules Workspace newsletter review/collaboration and fixed-operation transport',
     'Port sandboxed rich review, block/thread comments, reviewer permissions/invitations and notification controls. Review GET and account-status GET can have effects; never classify them as inert probes.'),
    ('social', ['NewsletterSocialControls.tsx','NewsletterSocialShareContent.tsx'],
     'Modules Workspace newsletter social controls and public renderer',
     'Port follow/share, icon style, layout/mobile rules and safe custom share targets without leaking recipient capability tokens.'),
    ('content-tools', ['NewsletterApps.tsx','NewsletterImageAi.tsx','NewsletterImageAltText.tsx','NewsletterLinkChecker.tsx','NewsletterStockImages.tsx','NewsletterVideoDesign.tsx','NewsletterVideoUrlControl.tsx'],
     'Modules Workspace newsletter content helpers; backend remains provider owner',
     'Port manual alt/link/video editing and explicit provider-backed preview/import/check/refine controls only where capability allows. Preserve late-result/source-target controls and disabled explanations.'),
    ('survey-preservation', ['NewsletterSurveyBuilder.tsx','NewsletterSurveyDesign.tsx','NewsletterSurveyMedia.tsx','NewsletterSurveyPreview.tsx','useNewsletterSurveySave.ts'],
     'Modules Workspace newsletter historical survey representation',
     'Preserve source/history and existing representation/removal behavior. Original editor omits new hosted surveys and backend rejects staging them; these five files do not authorize enabling hosted surveys.'),
    ('outreach', ['NewsletterOutreach.tsx'],
     'Modules Engagement rich-newsletter destination; current generic Outreach/V3 owners retained',
     'Port rich stage-open and legacy newsletter record handling, recipient preparation, immutable OutreachDraftVersion review, explicit send/test intents and status/replay controls. Do not funnel stage IDs into V3 saved-version staging.'),
]
name_groups = {name: (gid, owner, disposition) for gid,names,owner,disposition in groups for name in names}
runtime = []
assets = []
allpaths = []
for row in family:
    item = dict(row, sourceCommit=C, comparisonCommit=W, frontendHead=HEAD,
                samePathAtAdbc=by_path[row['path']]['samePath'], sameBlobPathsAtAdbc=by_path[row['path']]['sameBlobPaths'])
    if row['kind'] == 'runtime-ts':
        name = pathlib.PurePosixPath(row['path']).name
        gid,owner,disposition = name_groups[name]
        assert pinmap[row['path']]['gitBlob'] == row['C'] == w_runtime[row['path']]['sha'] == row['W']
        item.update(group=gid, canonicalOwner=owner, disposition=disposition,
                    exactCSourceBytesVerified=True, independentWGitBlobMatch=True,
                    savedSource=pinmap[row['path']]['filename'], sourceNonblankLines=pinmap[row['path']]['nonblankLines'])
        runtime.append(item)
    elif row['kind'] == 'static-asset':
        assert c_assets[row['path']]['sha'] == row['C'] == w_assets[row['path']]['sha'] == row['W']
        assert c_assets[row['path']]['size'] == row['bytes'] == w_assets[row['path']]['size']
        item.update(targetPath=row['path'], publicPath=row['path'].removeprefix('apps/web/public'),
                    independentCAndWDirectoryGitBlobMatch=True,
                    sha256Provenance='Published exact schema-assets-lock-receipt at backend5470; content independently downloaded only for the two license/attribution text files in this audit',
                    fetchBlobUrl='https://api.github.com/repos/neo-capiro/capirov2/git/blobs/'+row['C'],
                    contentUrl=c_assets[row['path']]['url'])
        assets.append(item)
    allpaths.append(item)
assert len(runtime)==43 and len(assets)==179 and len(allpaths)==262
write('path-map.json', {'frontendHead':HEAD, 'sourceCommit':C, 'comparisonCommit':W, 'counts':dict(collections.Counter(x['kind'] for x in family)), 'runtimeGroups':[dict(id=g,names=n,owner=o,disposition=d,count=len(n)) for g,n,o,d in groups], 'paths':allpaths})
write('asset-extraction-manifest.json', {'frontendBase':HEAD, 'repository':'neo-capiro/capirov2', 'sourceCommit':C, 'comparisonCommit':W, 'assetCount':len(assets), 'bytes':sum(x['bytes'] for x in assets), 'extensions':dict(collections.Counter(pathlib.PurePosixPath(x['path']).suffix for x in assets)), 'entries':assets})
(OUT/'asset-paths.txt').write_text('\n'.join(x['path'] for x in assets)+'\n')

text=(OUT/'backend-source/newsletter.ts').read_text()
def literals(constant):
    segment=text.split('export const '+constant+' = [',1)[1].split('] as const;',1)[0]
    return re.findall(r"\['([^']+)'",segment)
platforms=sorted(set(literals('NEWSLETTER_SOCIAL_PLATFORMS')+literals('NEWSLETTER_SOCIAL_SHARE_PLATFORMS')))
styles=literals('NEWSLETTER_SOCIAL_ICON_STYLES')
expected={f'/newsletter/social-{platform}-{style}.png' for platform in platforms for style in styles}
asseturls={x['publicPath'] for x in assets}
assert len(expected)==168 and expected <= asseturls
write('asset-url-coverage.json', {'source':BACKEND, 'platforms':platforms, 'styles':styles, 'dynamicSocialUrlCount':len(expected), 'missingSourceAssets':sorted(expected-asseturls), 'fixedPngUrls':['/newsletter/'+x+'.png' for x in ['capitol','policy-desk','newsroom','social-update']], 'rendererUrlSites':author['rendererUrlSites'], 'additionalTemplateChooserSite':{'path':'apps/web/src/vnext/pages/workspace/newsletters/NewsletterTemplateChooser.tsx','line':97,'url':'/newsletter/template-preview.svg'}, 'deployedOriginOrBytesVerified':False})

current_dir=REPO/'apps/web/src/features/modules/workspace/newsletter'
semantics={
 'NewsletterWorkflow.tsx':'Generic WorkspaceDraft workflow; nine simple blocks, local builder/review and explicit saved-version V3 staging; template publication currently unavailable.',
 'NewsletterPaper.tsx':'Plain text/heading/link/image URL display and simple block editor/order/removal; does not implement rich NewsletterDesign renderer.',
 'NewsletterTemplates.tsx':'Three local presets with local search/category/preview; no persisted rich section/template library.',
 'NewsletterComments.tsx':'Generic Workspace document comments; no rich campaign/block reviewer or invitation contract.',
 'newsletter-model.ts':'Local generic NewsletterBody presets, safe href and generic document conversion; not canonical rich campaign design model.',
 'use-newsletter.ts':'Generic draft/document update/snapshot ownership; local Undo/Redo; not WsNewsletterDocument revision CAS.',
 'NewsletterStaging.tsx':'Exact WsDocVersion/hash review into caller-selected existing V3 session with explicit acknowledgement.',
 'staging-model.ts':'Strict saved-version receipt and sponsor validation; not stage UUID conversion.',
 'useNewsletterStaging.ts':'Saved-version retained request/recovery/current-authority owner; preserve unchanged.',
}
write('current-owner-map.json',[{'path':str(p.relative_to(REPO)), 'gitBlob':subprocess.check_output(['git','-C',str(REPO),'rev-parse',HEAD+':'+str(p.relative_to(REPO))],text=True).strip(), 'semantics':semantics[p.name]} for p in sorted(current_dir.glob('*')) if p.is_file()])
assert len(semantics)==len(list(current_dir.glob('*')))==9

tests=[]
for pin in pins:
    if pin['ref']!=C or '.test.' not in pin['filename']:continue
    raw=(OUT/'backend-source'/pin['filename']).read_text()
    cases=[]
    for m in re.finditer(r"\b(?:it|test)\(\s*(['\"])(.*?)\1",raw):
        cases.append({'line':raw[:m.start()].count('\n')+1,'name':m.group(2)})
    tests.append({'path':pin['path'],'gitBlob':pin['gitBlob'],'literalCases':cases,'parameterizedCasesNeedExpansion':'.each(' in raw,'status':'source read; not executed in this audit'})
write('meaningful-test-map.json', {'originalTestFamilyCount':37, 'originalReadCases':tests, 'differentEditorTestHistories':{'C':'902bbe86edd13a659b8cb231fd27425e1b36b33d','W':'a315b682643e13eb12fd9a384f87c8d16b3f0cc4','difference':'Survey button query regex versus exact name; both source snapshots retained'}, 'protectedExisting':[
 {'path':'apps/web/tests/newsletter-staging.test.ts','cases':16,'caseCounting':'4 literal cases + 6 caller field cases + 6 sponsor cases','coverage':'strict routes/body, plaintext limits, sponsor binding, exact/replayed receipts'},
 {'path':'apps/web/test/browser/newsletter-staging.spec.ts','cases':9,'coverage':'saved revision/session binding, lost response, storage and actor replacement, current source/state refusal, malformed receipt, mobile keyboard','observedEvidence':'/tmp/capiro-remaining-qualification/final-adbc84b/modules-browser.log; existing completed parent run, no audit rerun'},
 {'path':'apps/web/test/browser/prospect-workspace.spec.ts','line':168,'coverage':'prospect-origin newsletter cannot open sending; preserve original origin constraints'}],
 'newPortControlsRequired':['rich revision conflict and pending-save source lifetime','stage UUID rejected by saved-version boundary and exact revision stage receipt','failed current reads conceal rich editor/review/actions until success','actor/session/tenant/client/route replacement and delayed results','public render sanitization, safe links and capability isolation','asset bytes/MIME/relative origin and allowed social matrix','image captured-target/source revision/late result controls','rich prepare/send/test immutable IDs and unknown-no-repost recovery','review/invitation role/expiry/status and no implicit retry of effects','cross-mode/back-forward and mobile keyboard/accessibility'], 'nativeExecuted':False})

write('scope-summary.json', {'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'frontend':{'head':HEAD,'tree':comparison['frontendRootTree'],'files':comparison['gitFileEntries'],'clean':comparison['workingTreeStatus']==''},'backend':{'reviewedHead':BACKEND,'frozenApplicationSource':'a247f7a02a9b94d95e9ee5a516b396202aea994b','originalC':C,'originalW':W},'inventory':{'family':262,'runtime':43,'assets':179,'assetBytes':sum(x['bytes'] for x in assets),'tests':37,'styles':2,'generator':1,'samePathAtAdbc':0,'sameBlobAtAdbc':0,'runtimeCBytesAndWBlobVerified':43,'assetCAndWDirectoryIdentityVerified':179},'method':'Git/source/connector read-only comparison; no browser, build, typecheck, native route, provider, package, source edit or subagent execution', 'conclusion':'Real rich document/editor/review/assets/destination support is absent beyond generic overlaps; existing saved-version V3 flow remains independent and protected.', 'firstSlice':'179 byte-exact public assets with existing paths and provenance, on a new branch/worktree stacked on frozen adbc; package artifact is not required for this static slice.', 'richUiPrerequisite':'Owner-coordinated immutable consumable artifact for existing @capiro/shared 0.0.0 newsletter and newsletter-render exports, preserving five-module closure and source provenance. No second DTO/render owner.', 'qualificationLimit':'Source audit only. No rich UI or native/backend/deployment acceptance. Prior final-gate packets preserved.'})
print(json.dumps({'paths':len(allpaths),'groups':len(groups),'runtime':len(runtime),'assets':len(assets),'assetBytes':sum(x['bytes'] for x in assets),'socialUrls':len(expected),'currentOwners':len(semantics)},indent=2))
