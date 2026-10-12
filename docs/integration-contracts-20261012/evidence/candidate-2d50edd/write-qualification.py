from pathlib import Path
import json,hashlib,datetime
out=Path('/tmp/capiro-candidate-2d50edd');p=out/'portfolio-browser-execution.json';execution=json.loads(p.read_text());assert execution['state']=='finished' and execution['exitCode']==0
stats=json.loads((out/'portfolio-browser-results.json').read_text())['stats'];modules=json.loads((out/'modules-browser-results.json').read_text())['stats']
assert stats['expected']==929 and modules['expected']==120 and stats['unexpected']==modules['unexpected']==0
for name in ['clean-install','check','build','modules-browser','elements','production','meri-actual-server','preservation','reviewer-positive-chromium','reviewer-reopen','objective-baseline-green']:
 r=json.loads((out/(name+'-execution.json')).read_text());assert r['state']=='finished' and r['exitCode']==0;assert r['head']==r['headAtFinish']=='2d50edd8f3c5ea232db8e1338566f0667db4b4bd';assert r['statusAtStart']==r['statusAtFinish']==''
sha=lambda name:hashlib.sha256((out/name).read_bytes()).hexdigest()
s='''# Completed exact-source frontend qualification — 2d50edd

Source `2d50edd8f3c5ea232db8e1338566f0667db4b4bd`, tree `d7986d01b5f5aca3a8e4c824556315a82b692e92`, application tree `faf8af48ba71d9152cbd2e2010ddb950fd8e2bfb`. The checkout stayed clean throughout every qualifying gate. This distinct candidate preserves accepted f4e9e1f and adds existing Objective-bound Strategy, Planner task and explicitly selected saved Workspace revision views.

| Gate | Exact-source result |
| --- | --- |
| Clean install | 847 packages; root npm ci with lifecycle scripts disabled, no audit/funding requests |
| Combined source | Exit 0; 58 root, 1,141 application, 94 gateway and 21 transport tests; types, formatting and public packages pass |
| Lint / architecture | 0 errors / 76 existing warnings; 410 size signals, 385 reviewed, 25 inherited, 0 blocking and 0 boundary errors |
| Full Portfolio browser | 929 passed; 0 failed, skipped or flaky; two workers; terminal exit 0 |
| Full Modules browser | 120 passed; 0 failed, skipped or flaky; one worker; terminal exit 0 |
| One production build | Exit 0; BUILD_ID `rHXEQNLQ1xLwEnE7iR1vZ`; only global error is prerendered; no static Meri HTML |
| Actual standalone server | Route/security checks, Settings 307 query preservation, all-mode navigation/back/forward, desktop/mobile/light/dark and zero page errors |
| Meri actual server | 1440/390px; citations, eight run states, keyboard, fit and unavailable actions; zero page errors/service calls in disconnected synthetic fixtures |
| Fresh official Elements | 15/15; receipt SHA-256 `874ca4f108ca7bd42c978beb43b3d576f0570c6b735accbdb41a37c73259cbe4` |
| Unchanged controls | Restart 2/2 and mounted reopen 1/1 pass with canonical bytes preserved; three new destination feature controls also pass unchanged on this clean exact source |
| Preservation | No missing original feature/test/asset files; Portfolio archive, Meri public package ownership, existing Modules CommitmentView and root lockfile retained |

'''
s+='Portfolio started '+execution['startedAt']+' and finished '+execution['finishedAt']+'. Its execution receipt SHA-256 is `'+sha('portfolio-browser-execution.json')+'`; browser report `'+sha('portfolio-browser-results.json')+'`; raw log `'+sha('portfolio-browser.log')+'`.\n\n'
s+='''[Raw evidence and manifests](evidence/candidate-2d50edd/TERMINAL.json) preserve commands, clean-source receipts, reports, logs, screenshots and immutable controls. The original three failing destination feature controls on d825528 and unchanged green controls remain in [focused evidence](evidence/objective-work-focused/). Focused and combined counts overlap and are not added together.

## Retained failure and independent review scope

The first restart-control invocation failed before either test launched because the default Playwright browser binary was absent. Its two launch errors, trace files, exit 1 and raw logs remain under reviewer-positive / immutable-reviewer-positive. The correctly configured Chromium invocation then passed the same canonical test bytes on the same source. This was a launcher configuration correction, not a source or assertion change. No failed full browser run is hidden or combined into this result.

The coordinator previously relayed independent bounded acceptance of f4e9e1f's application tree (94 units and 33 focused browsers). That does not independently accept this new application tree. Independent delta review for 2d50edd remains a separate gate unless a later exact-source review receipt is explicitly attached.

## Visual, native and release boundaries

The [active 337-row ledger](PORTFOLIO-337-ACTIVE-LEDGER.json) preserves all 345 IDs, the 337 in-scope rows and eight prior exclusions. It records concrete bounded interaction evidence and actual Figma comparisons rather than promoting mock results to native acceptance. Phone acknowledgement, Workspace table/cards and Saved submissions have scoped visual evidence; ordered-owner dialog presentation and other full-frame differences remain explicitly open. No full Portfolio row is accepted without its native criteria. Full WCAG certification is not claimed.

Backend composition PR2406 is pinned at `243248e726243c44bd4b9d24fd1ed220da18c56a`, tree `d8f01afa7eca0e6571e7ed3669905fea3491bbdd`. The [compatibility review](evidence/backend-243248e/FRONTEND-COMPATIBILITY.md) verifies all 194 manifest source entries, nine migration entries and 19 candidate ancestors without changing frontend wire/configuration sources. The corrected Workspace migration allocations remain unapplied. No native PostgreSQL/RLS/roles/MVCC/client-grant lock-order, live Clerk/provider or new reporting acceptance is inferred. Full Cleanup and unpublished Engagement reporting remain separately owned gaps.

The [bounded image-build proposal](IMAGE-BUILD-PROPOSAL.md) provides exact source, archive/hash, recipe and one-build request. The last local official Alpine index probe was proxy 403. No image build/push, merge, deployment, AWS resource/credential/security/database change, provider message, billing or paid model workload occurred in this candidate qualification. Shipping is reserved for the designated session after the applicable reviews and gates.
'''
Path('/tmp/capiro-qualification-2d50edd.md').write_text(s)
print('Prepared exact qualification document')
