# PROS-F02 pending-save repair

Committed candidate: `bd7f77f8601da883c54ae700ce32e2748cadd24d` on `repair/capiro-p1-workspace-20261012`, based on `3562618f73d7a1f9d620d7b7b28c9e8c2c1ac83d` in `/workspace/capiro-p1-workspace`.

The prospect manual editor now disables its title and every section input while the existing prospect save workflow is pending. A user cannot enter text that the successful save/recovery remount would silently discard. Fields become editable when the operation ends; failed or uncertain saves retain their existing recovery behavior. This also freezes fields during the hook's explicit current-document read, which shares the pending state.

## Bounded source

- `apps/web/src/features/modules/workspace/WorkspaceDraft.tsx:155,165`: two `disabled={prospectSave?.pending}` attributes.
- `apps/web/test/browser/prospect-draft-pending-edit.spec.ts`: 12 browser controls using the canonical local fixture harness.
- No changes to `useProspectDraftSave.ts`, backend operations, DTOs, dependencies, shared scripts, manifests or architecture records. The existing journal, preflight version comparison, immutable prospect origin, content/snapshot receipt validation, recovery acknowledgement and authority replacement remain their existing owners.

## Reproduction and tests

Original acceptance evidence: `/tmp/capiro-remaining-assessment-20261012/prospects/workspace-review.spec.ts`, `workspace-results.json` and associated screenshots. During a held valid PATCH, the baseline title/body accept later typing, then the successful snapshot clears the retained intent and remounts from submitted content, losing the later input. This maps to PROS-024 and actual Figma frames `411:65258` / `411:65367`; this repair concerns the implemented manual editor, independent of unavailable rich formatting.

- Red before production changes: all 6 held PATCH/snapshot x success/500/lost-receipt cases failed specifically because the title remained enabled. `red-results.json`, `red.log` and `red-artifacts/` preserve the failures.
- Green candidate: 12 new controls pass. They verify title plus two section controls freeze, submitted text survives successful save/reload, failures retain uncertain edits across reload, current-document read causes zero replay, deliberate save completes, and navigation/user/tenant/prospect/selected-client replacement cannot continue the former save or restore its editor.
- Focused regression: 29/29 browser tests pass: the 12 new cases, 16 existing `prospect-workspace.spec.ts` cases and 1 restart acceptance case. Existing coverage includes immutable origins, changed-version block, preflight navigation, replaced Core actor, unavailable IndexedDB, export/history and mobile keyboard/viewport behavior. `focused-results.json` / `focused.log`.
- Model/contract tests: 9/9 in `apps/web/tests/prospect-workspace.test.ts` pass. `unit.log`.
- Final web TypeScript (`--noEmit --incremental false`), focused ESLint, Prettier and `git diff --check`: pass. `typecheck-final.log`, `lint-final.log`, `format-final.log`.
- Local Vite fixture bundle built successfully from candidate. `candidate-server.log`. A first restart attempt rebuilt the candidate but could not bind because the original owned preview child survived its shell interruption; the old child was then terminated and the candidate server restarted cleanly before the final 29-case run. The final suite uses the clean candidate server.

## Exact commands

From the repair worktree:

```sh
node node_modules/@playwright/test/cli.js test --config /tmp/capiro-p1-workspace-20261012/playwright.config.mts --grep 'fields freeze'
node node_modules/@playwright/test/cli.js test --config /tmp/capiro-p1-workspace-20261012/focused.config.mts
node node_modules/prettier/bin/prettier.cjs --check apps/web/src/features/modules/workspace/WorkspaceDraft.tsx apps/web/test/browser/prospect-draft-pending-edit.spec.ts
node scripts/architecture.mjs
```

From `apps/web`:

```sh
node ../../node_modules/vitest/vitest.mjs run tests/prospect-workspace.test.ts
node ../../node_modules/typescript/bin/tsc --noEmit --incremental false
node ../../node_modules/eslint/bin/eslint.js src/features/modules/workspace/WorkspaceDraft.tsx test/browser/prospect-draft-pending-edit.spec.ts
```

The red command used the recorded baseline bundle/config before the production edit; `playwright.config.mts` subsequently points output to the first green run. Final 29-case evidence comes from `focused.config.mts`. Both configs keep `webServer` undefined and one worker; local Chromium is `/usr/bin/chromium`. The server source is an external copy of the existing harness pointing to this worktree and port5298. Dependencies are borrowed from the frozen checkout via an untracked symlink, never installed or modified here.

## Architecture and remaining integration work

Architecture guard: zero dependency/boundary/cycle errors; one blocking changed-source size review for `DraftEditor` (178 nonblank lines; module318). `source-review.json` records the exact file SHA256, function fingerprint and responsibility review. The new replacement test callback is82 nonblank lines and has an explicit cohesive acceptance-scenario review in that artifact. Root owns registering the production review and rerunning the architecture guard. No review thresholds or registry were weakened.

Full clean install, production Next build and final integrated qualification remain root-owned. No native writes, external services, AWS, provider or paid-model calls were performed. Local successful receipts verify frontend behavior, not backend atomicity or live deployment.

Independent review accepted this bounded repair with no new findings. Three external probes passed (preflight authority denial freezes before any write; foreign snapshot receipt retains recovery through reload/read-current with zero replay; changed baseline prevents dispatch and retains input), and the reviewer independently replayed all12 new controls successfully. Evidence: `/tmp/capiro-p1-independent-review/workspace-review.json`, `workspace-independent-results.json`, `workspace-author-controls-results.json`. The reviewer independently accepted the exact178-line DraftEditor responsibility review. Combined integrated qualification remains root-owned.
