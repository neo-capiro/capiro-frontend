# Settings pending-form repair — 19 October 2026

Base: `816b0f1470efe978d22856beee9c8133055ab5bd` (current main, including PR105). Branch: `codex/modules-settings-state-fixes-20261019`.

Invitation and integration-registration dialogs could dismiss via Escape, X or the scrim while a write was pending. Their fields also remained editable, allowing a later success to clear edits or close a reopened dialog. The two form owners now guard dismissal and disable editable fields until the existing single-flight action settles. Success closes/resets the form; a refusal retains the submitted draft and restores editing. No transport, authority, contract, shared runtime, package, shell, Portfolio or Meri change is included. No dead code was removed.

## Fresh overlap audit

GitHub refresh at 2026-10-19 19:05 UTC: main remained `816b0f1470efe978d22856beee9c8133055ab5bd`; 105 PRs total, 89 updated and 82 created since October 14. All 91 open heads were compared: 90 were ancestors of main. Only PR102 (`3a23d8b1d0f155fb13768c2955e79d37d9cecda5`) diverged, with Meri-only source excluded here. Recent relevant PR94, PR99, PR100, PR103, PR104 and PR105 filenames were inspected. No outstanding non-Meri source was duplicated.

## Validation

Runtime: Node 24.10.0; locked dependencies installed with `npm ci --ignore-scripts --no-audit --no-fund` (install initially used host Node 22 and reported engine warnings; checks used Node 24). No package/lockfile changed. Browser: installed Chrome, one worker, 1440 × 1040, local synthetic fixtures with all non-local requests blocked.

- Before the fix, both dialogs failed the pending Escape assertion. The first invitation attempt hit a test selector mismatch; after correcting its native role selector, it reproduced the same dismissal defect.
- `node node_modules/@playwright/test/cli.js test --config apps/web/test/browser/playwright.config.ts settings-form-pending.spec.ts settings.spec.ts --grep 'pending|Team' --reporter=list`: **7 passed**. Four new cases cover success/refusal for both forms; three existing Team cases cover access, failure recovery, self-removal protection and role updates. Tests assert Escape/X/scrim retention, disabled fields/Cancel, repeat submission suppression, exact payload, draft retention, reset after success and ordinary dismissal after settlement.
- Web workspace `node --max-old-space-size=4096 ../../node_modules/typescript/bin/tsc --noEmit --incremental false`: **passed**.
- Scoped ESLint, Prettier and `git diff --check`: **passed**.
- `node scripts/architecture.mjs`: **passed (exit 0); 0 dependency errors; 533 size signals, 515 reviewed, 18 unchanged inherited, 0 blocking** after the approved two-record metadata update. The initial scan had two stale InviteMember/RegisterAccount fingerprints. Source hashes still match the independently reviewed bytes; no runtime source changed in the metadata successor, so the earlier browser/TypeScript results remain applicable.
- No production Next build, broad regression suite, live API/provider request, deployment or merge was run.

## Design inspection and limits

Read the required Figma design-to-code skill and inspected fresh high-fidelity context/screenshots for [Team](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/?node-id=1064-244607), [Add team member](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/?node-id=1064-244809) and [Register account](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/?node-id=1064-244371), including the two dialogs' motion metadata. This patch is a request-lifecycle repair, not exact raster/motion acceptance. Existing dialogs remain wider than the references and registration retains its existing generic heading/provider field. Existing local assets/layout are unchanged. The [invitation](invitation-pending.png) and [registration](registration-pending.png) captures are synthetic application evidence, not Figma or live screenshots.

The six missing desktop mockups in the receiving parity checklist remain missing. Team inviter identity, scoped aggregates, bespoke billing facts, Engagement serving/migration/feature qualification and authenticated live acceptance remain with their existing owners. This patch adds no API dependency or endpoint.

## Independent responsibility review

<span id="settings-dialogs"></span>

Codex independent review on 2026-10-19 found no correctness findings in the two runtime files or focused browser tests.

- `InviteMember` has 106 nonblank body lines. It owns one invitation dialog: four draft fields, one fixed-operation submission, response feedback and close/reset behavior. Pending guards enforce the same lifecycle. Transport, validation, authority and single-flight state remain delegated. Keeping this cohesive function avoids distributing coupled field/dismissal state.
- `RegisterAccount` has 86 nonblank body lines. It owns one provider-account registration dialog: provider display, two draft fields, one fixed-operation submission, feedback and close/reset behavior. Pending locks add no separate responsibility. Provider metadata, transport, authority and action lifecycle retain their canonical owners.

[Approved exact review records](proposed-size-reviews.json) now replace only the two existing rows in `docs/architecture-size-reviews.json`. Parent coordination explicitly approved these replacements after the initial messaging attempts returned `thread not found`. Independent verification confirmed all 235 entries retain their order, the other 233 entries are unchanged, both replacements exactly match the supplied records, and both runtime source hashes still match. The architecture gate now passes. Shared runtime, scan policy and thresholds remain unchanged.

## Separate concrete follow-ups

Read-only Modules audit identified these existing issues; none is included in this bounded Settings patch:

1. Planner's unkeyed `ResourceCatalog` preserves an opened Reporting dashboard when switching to Goals, then can pair its editor with the new kind (`PlannerScreen.tsx:336`, `ResourceCatalog.tsx:92`). Key the catalog by section and test the transition.
2. Data Explorer's Comment Deadlines shortcut changes dataset without clearing the previous selection (`DataExplorer.tsx:105`). Clear it as normal dataset tabs do and test bill-to-Federal-Register navigation.
3. Workspace Mine/Shared filters consume unavailable `me.data` without showing identity loading/error (`WorkspaceLibrary.tsx:88,176`). Gate ownership filters on identity state and provide retry.
