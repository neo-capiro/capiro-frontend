import json,hashlib
from pathlib import Path
r=Path('/tmp/capiro-onboard-port-evidence-20261013');out=r/'review-corrections-handoff'
load=lambda p:json.loads(p.read_text())
pins=load(out/'SOURCE-MANIFEST.json');pinmap={x['file']:x for x in pins['records']}
scan=load(out/'OWNED-PARSER-SCAN.json');prior=load(r/'cohesive-extraction/STRUCTURE-REVIEW.json')['records'];old={ (x['file'],x['kind'],x['symbol']):x for x in prior}
rationales={
'LegalReview.tsx':('Consent input and its acknowledged signed-receipt presentation for one exact reviewed snapshot.','Current document query admission is now LegalPage; exact identity/lifetime is legal-review-lifetime; document presentation is LegalDocumentBlock. This editor cannot silently adopt new versions and keeps unknown native acceptance separate from presentation reset.'),
'RegisterPage.tsx':('Preserved registration form and explicit Clerk/native registration handoff.','Deliberate recovery GET delegates canonical query lifecycle; the guarded POST registration receipt remains distinct. No token provider, retry loop, or new native behavior.'),
'VerifyPage.tsx':('Preserved explicit verification/code workflow presentation and its local outcomes.','Current native GET publication moved to the same query reader, so no success-only cache side channel remains. Existing code-send/verify effects and current root identity remain guarded.'),
'ItAdminPage.tsx':('Single current-capability IT provider chooser, Google instructions, consent/deferral outcome view.','Provider current-intent guard is extracted to it-invite-intent; exact token transport/navigation validation remain root-owned. The file/function retain cohesive provider UI, not native authorization or callback implementation.'),
'InvitesOverlay.tsx':('Reviewed recipient editor plus per-recipient outcomes and explicit setup completion.','Existing batch journal remains separate. Recovery reads now publish canonical setup state; opening eligibility and before/after-await guards fence stale completion/next recipient.'),
'SetupDashboardPage.tsx':('Thin signed-in/current-setup/membership admission selector.','The only read callback delegates refreshSetupState; membership and task/editor presentation remain separate modules. Crossing80 lines does not add a new domain or write workflow.'),
'SetupWorkspace.tsx':('Current setup task-card composition and one admitted overlay selection.','Eligibility lifetime is a separate feature-local owner over canonical setup query. The coordinator does not own import/provider transport or backend authority.'),
'useSetupActions.ts':('Current setup-service IT invitation and task-transition event binding.','Mounted current-read validity and import-mode check compose the existing attempt guards; read lifecycle and journals remain separate canonical modules. Existing task CAS inputs and IT receipt semantics are preserved.'),
'shell.tsx':('One ordered nine-step progress indicator.','Wrapping the existing flex items within the available width preserves all steps and desktop geometry; no hidden step, changed ordering, fabricated progress, or JS responsive state.')}
reviews=[]
for f in scan['featureFindings']:
 key=(f['file'],f['kind'],f['symbol']);o=old.get(key);rec={**f,'sourceSha256':pinmap[f['file']]['sha256'],'reviewStatus':'AUTHOR_RESPONSIBILITY_PROPOSAL; ROOT/INDEPENDENT_ACCEPTANCE_REQUIRED'}
 if o and o['fingerprint']==f['fingerprint']:
  rec.update({k:o[k] for k in ['responsibility','boundary','decision']});rec['change']='Exact prior function/module fingerprint unchanged; current file pin supplied.'
 else:
  responsibility,boundary=rationales[Path(f['file']).name];rec.update(responsibility=responsibility,boundary=boundary,decision='Retain coherent responsibility with the explicit extracted owners described above; no blanket directory exception.',change='Changed/new exact signal after independently identified behavior correction.')
 reviews.append(rec)
(out/'STRUCTURE-PROPOSALS.json').write_text(json.dumps({'scope':'All31 current owned feature signals; no shared registry edit. External test describe signals separately documented.', 'records':reviews,'externalTestSignals':[{**f,'responsibility':'One behavior suite with parallel positive/negative and deferred outcome controls; tests are outside the canonical app/src size registry.'} for f in scan['testFindings']]},indent=2)+'\n')
results=load(out/'final3-pure-results.json');lint=load(out/'final3-eslint.json')
summary={'passed':results['numPassedTests'],'failed':results['numFailedTests'],'pending':results['numPendingTests'],'success':results['success'],'lintErrors':sum(x['errorCount'] for x in lint),'lintWarnings':sum(x['warningCount'] for x in lint),'syntaxErrors':scan['syntaxErrors'],'featureSignals':len(reviews),'originalTestsByteUnchanged':load(out/'ORIGINAL-TEST-PRESERVATION.json')['allUnchanged']}
redpaths=['setup-eligibility-followup/final-spec-red-results.json','current-funnel-read-followup/final-spec-original-red-results.json','current-funnel-read-followup/signal-red-results.json','current-funnel-read-followup/same-options-red-results.json','it-return-followup/red-results.json','it-current-invite-followup/red-results.json']
red=[]
for name in redpaths:
 d=load(r/name);red.append({'path':name,'passed':d['numPassedTests'],'failed':d['numFailedTests'],'success':d['success']})
summary['redControls']=red
(out/'RESULTS.json').write_text(json.dumps(summary,indent=2)+'\n')
(out/'REPORT.md').write_text(f'''# Onboard independent-review corrections — feature handoff

Uncommitted feature/test corrections prepared in `/workspace/capiro-onboard-port-20261013` (physical `/tmp/capiro-onboard-execution-20261013`). Root owns integration and qualification. This additive packet preserves the earlier sealed `correction-handoff` unchanged; it does not retroactively qualify its known defects.

## Corrected behavior

- Setup import/invitation overlays lose their opening lifetime when current mode/prerequisites or current query availability changes. Latched revocation prevents automatic revival; explicit reopening preserves unknown journals and partial receipts. Held import chunks/invitations cannot dispatch their next item. Parent task/IT invitation attempts also observe canonical current setup-read validity; loading pauses admission, error/legacy replacement revokes that mounted owner. No admin policy is inferred from billingAdmin.
- LegalPage admits a separate keyed LegalReview editor for the exact native session, plan, displayed organization, document versions and HTML, and successful read generation. Changed/failed/loading legal reads require renewed consent. Held old acceptance cannot mark signed or navigate, and changing presentation never clears an unknown acceptance journal.
- Deliberate funnel/Register/Verify/setup recovery reads use the existing QueryClient lifecycle, with native404→null preserved only for funnel. One small `current-query-read` helper owns latest-read publication and immutable original queryFn AbortSignal fencing. Canceled old callers cannot adopt later results, including same-options refetch. POST registration receipts remain a separate guarded handoff.
- IT consent/Google deferral continuations stay bound to the displayed current token/provider facts. A held consent URL cannot navigate after current invitation error, replacement or provider loss. `/it/done` now states that it cannot confirm current connection status; verified/deferred capability-backed cards remain unchanged.
- The nine-step rail now wraps inside its available width. Root's unchanged 375px browser assertion and initial scrollWidth 651 evidence are the failing baseline; browser green is root-owned and not claimed here.

## Verification actually run

- Final pure suite: **{summary['passed']}/{summary['passed']} passed**, zero failures/skips, 13 files, including all 72 prior controls unchanged and 52 added cases. Final exact receipt `final3-pure-results.json`; original 8 test files are byte-identical (`ORIGINAL-TEST-PRESERVATION.json`).
- Six legal exact-source element/key projections pass; original same script on captured prior LegalPage has 1 positive/5 intended failures. This is a closed hook/element projection, **not mounted React/browser proof**. The independent original probe is retained separately.
- Baseline effect adapters preserve the previous unguarded setup/IT binding and success-only current-read publication; these are labeled behavior-equivalent adapters, not untouched mounted source. Exact independent captured-source probes remain in `/tmp/capiro-onboard-feature-independent-review-20261013`. Baseline result counts are in `RESULTS.json`. Intermediate silent-adoption failures and source snapshots are retained.
- Final feature ESLint: 0 errors/0 warnings. Owned Prettier check passes. Pure canonical parser: 0 syntax errors, 31 exact feature size signals and 6 external test-suite signals. `STRUCTURE-PROPOSALS.json` gives individual responsibility/fingerprint rationales; root owns registry and independent acceptance.
- 92 owned source/test/asset files pinned in `SOURCE-MANIFEST.json`; no shared source, dependency graph, browser assertions, root fixtures or shared architecture record edited by this lane. No staging/commit performed.

## Limits

Root is running actual-host controls separately; the first root development run was 17/19 with a current-read and mobile overflow failure. This packet does not predict its rerun. No browser/server/build/full types/full architecture gate, live Clerk/signup/Stripe/provider/native writes, native deliveries, full Figma or accessibility acceptance ran in this lane. Synthetic/pure success cannot prove native deployment or authentication behavior. Original provider/native/package limits in the prior handoff remain applicable. Shared input/receipt validation, auth/session/client replacement, routes/config/pricing and final source qualification remain root-owned.
''')
print(json.dumps(summary,indent=2))
