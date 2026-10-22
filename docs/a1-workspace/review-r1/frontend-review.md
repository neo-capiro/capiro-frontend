# A1 frontend review follow-up

Scope: #117 review items 9–10 and Neo-approved WS-04 owner recovery. No new dependencies, package/lock changes, SQL execution, shared-shell/Meri edits, merges or deployments.

Current receipts on the corrected source: **232 files / 3,064 canonical tests passed; typecheck exit0 with zero diagnostics using a 5-GB runtime heap; full lint exit0 with zero errors, plus a zero-error check of the final JSX correction; 15/15 mutations killed.** The final default root production build passed in 309 seconds with identical source/configuration and dependencies physically inside an isolated project root. The earlier dependency-symlink failure is historical, as detailed below. Earlier failed/interrupted attempts are retained as history and are superseded where a final receipt is provided.

## Changes

- Replaced the newsletter test’s undeclared RTL/jsdom setup with the repository’s node/SSR hook-probe pattern. The original four authority cases remain. Production callbacks run against typed resource mocks; state cells/effects are mocked for explicit rerenders. This is not browser lifecycle qualification.
- Settings action tests capture hook output through a typed spy instead of assigning an outer variable during render. The Settings dialog test uses JSX children in `security-form.test.tsx`, avoiding the required-children `createElement` typing mismatch. Assertions and production Settings code are unchanged.
- Held drafts remain owner-editable, display “Choose a client to continue”, and bind with `workspace.draft.update { clientId }`. The UI accepts only the selected UUID in a confirmed non-held response, displays server refusal, and preserves unsaved edits. Generic editor binding adopts the receipt locally rather than reloading/unmounting the editor. Library client filters exclude held rows; newsletter staging stays unavailable until binding succeeds.
- Response schemas preserve `clientAssociation: 'held'`; update requests accept an explicit UUID. Server admission remains authoritative.

## Workspace approval removal disposition

Source scan of Workspace screens, newsletter tests and Workspace operation schemas found no live Workspace draft approval controls, status filters, hooks, endpoints, `permittedApproverRoles` or `clientFacingApprovalRequired` fields to remove in this frontend snapshot.

The remaining raw approval references are canonical Outreach sender/template guardrails, with no Workspace draft-approval endpoint consumer:

- `apps/web/src/features/modules/workspace/templates/TemplateGuardrails.tsx`: `OutreachTemplateSpec.guardrails.approvalMode` and copy that the Outreach backend enforces send authority and recipient access.
- `apps/web/src/features/modules/workspace/templates/template-model.ts`: Outreach template default `approvalMode: 'individual'`.
- `apps/web/src/features/modules/workspace/templates/TemplateWizard.tsx`: copy describing approvals resolved when using a campaign template.

These explicitly retained Outreach controls were preserved. No Portfolio PF-12 or Meri approval behavior was changed.

## Validation environment

The filesystem was full; no installation ran. Used an own `/dev/shm` node_modules symlink overlay over an existing declared installation, with `@capiro/*` workspace links pointed at this worktree. The source installation was not changed. React/ReactDOM 19.3.0, Vitest 4.1.11, Vite 8.3.4, TypeScript 5.9.3, ESLint 9.39.2 and Next 16.4.0 match this checkout’s declared versions. This is not a clean-install receipt. Exact tracked sparse config/fixture files were restored from HEAD; configuration semantics are unchanged.

## Receipts and limits

- Canonical focused command `npm test --workspace @capiro/web -- --maxWorkers=1 tests/newsletter-client-authority.test.ts`: 11/11 passed.
- Canonical companion copy/newsletter run: 12/12 passed before adding the final staging case (10 authority/recovery + 2 copy tests then).
- Isolated mutations: 15/15 killed by assertion failures, not startup/transform failures. `frontend-mutations.json` records the failing test for each guard: UUID create, unavailable client, saved binding, reassignment, stale create, held response schema, held-only recovery, binding request, displayed refusal, selected-client receipt, newsletter binding adoption, held client filter, stage-view refusal, disabled stage control and retaining ordinary editor edits during binding.
- Scoped ESLint: 0 errors, three existing warnings (two image elements and one unused mock prop).
- `git diff --check`: passed.
- Initial canonical full typecheck exited 137 / Killed under the shared 8-GiB memory limit. No compiler diagnostic was produced; this is not a pass.
- Settings source tests require jsdom, which is absent from the declared installation, and are outside canonical `tests/**/*.test.ts`. Their DOM behavior/mutations were not rerun; only the lint corrections were verified. No undeclared dependency was added.

Final generic-editor regression, broader gates and any additional limits are recorded below. Focused receipts do not imply a full unit/build/typecheck pass.

- Final focused command: `npm test --workspace @capiro/web -- --maxWorkers=1 tests/workspace-held-recovery.test.ts tests/newsletter-client-authority.test.ts`: **12/12 passed**. The added ordinary-editor reload mutation fails its no-reload assertion.

- Canonical full lint (`npm run lint --workspace @capiro/web`) was interrupted with exit130 before diagnostics after shared memory reached the 8-GiB cap; it is unqualified. Full unit continued separately. No pass is claimed for the broader lint gate.

## Nested installation correction and interrupted broad run

The first broad unit attempt used only the root installation overlay. The locked installation also requires the nested `apps/web/node_modules/@capiro/meri-contracts` 0.1.10 (the hoisted package is 0.1.0). Added an own nested overlay reusing the existing exact installed packages, with own `.vite`/`.vite-temp` directories in `/dev/shm`; moved only this worktree’s generated caches. No package or tracked configuration changed. The initial broad run is not an acceptable canonical receipt. Its process handle became unknown after a tool reset, its log ended without a final JSON/exit receipt, and no matching process was visible in the subsequent `/proc` scan. No full-suite pass is claimed.

Final scoped lint after the generic-editor regression: all 11 changed source/test files, exit0, 0 errors and the same three existing warnings. A second read-only source review found no additional blockers; actual React lifecycle cleanup remains outside this mocked hook harness.

## Proportional responsibility review

`DraftClientAssociation` crosses the 80-line function review threshold but owns one bounded client-binding workflow: local selection/error/pending scope, the existing update operation, and validation of the server-authoritative binding receipt. It composes existing UI primitives and does not own access policy, query caching, navigation, or editor content. Splitting its tightly related input, receipt and error handling would add coordination without separating a distinct responsibility. A read-only second review found no additional blockers.

`DraftEditor` retains its existing editing responsibility and composes the new binding workflow. Only association presentation is adopted locally; its title/section state survives binding. `useNewsletter` gains a narrow receipt-adoption helper that updates client association and scope generation without replacing unsaved content. Neither change alters the shared query/session system.

No shared architecture registry file was edited. If the architecture scanner requires exact-hash registration for this new composition, that formal shared-manifest registration remains a coordinating-owner gate.

## Final canonical unit receipt

After restoring both locked nested dependency locations (`apps/web` and `packages/meri-client`), the canonical full command `npm test --workspace @capiro/web -- --maxWorkers=2 --reporter=json --outputFile=/dev/shm/a1-fe-locked-unit.json` completed with explicit shell exit **0**. **232 test files, 3,064/3,064 tests passed; zero failed or pending.** The machine-readable compact receipt is `frontend-gates.json`. Both nested locations reuse the exact installed Meri contracts 0.1.10; the root hoisted 0.1.0 remains unchanged. No tracked config or dependency files were changed.

## Final typecheck and default build limits

The one serialized typecheck retry (`npm run typecheck --workspace @capiro/web -- --incremental false`) ran after both frontend unit suites finished and exited **134**. Node/V8 exhausted its approximately 2,049-MB heap after about 199 seconds. It produced no TypeScript diagnostic; typecheck remains **unqualified**, not a pass. The shared cgroup recorded no additional OOM kill during this retry.

The default build was attempted once with `NEXT_TELEMETRY_DISABLED=1 npm run build --workspace @capiro/web` and exited **1** before compilation. Turbopack refused the temporary `apps/web/node_modules` symlink because its target leaves the filesystem root. The build remains **environment-blocked**; no alternate bundler, root setting or configuration workaround was applied. Explicit shell exit receipts were written for both commands.

## Final canonical lint receipt

`npm run lint --workspace @capiro/web` completed with explicit shell exit **0**, **0 errors and 87 warnings** before the final dialog JSX correction. This supersedes the earlier interrupted full-lint attempt. Settings source test files were included in lint, while their separate jsdom execution remains outside the canonical unit glob and unqualified as described above.

## Runtime-budget typecheck correction

The authorized runtime-only retry with `NODE_OPTIONS=--max-old-space-size=5120` completed (exit2) and reported exactly one diagnostic: TS2352 for the dialog test’s required-children props cast. Replaced that cast with ordinary JSX children and renamed the test to `security-form.test.tsx`. Assertions and production code are unchanged. This source test remains outside the canonical `tests/**/*.test.ts` unit glob; the passing full-unit result is unaffected. Final typecheck after this concrete correction is pending; no source typecheck pass is yet claimed.

The earlier Settings verification document is retained as a historical receipt for its original snapshot. To qualify the renamed source test in a suitable declared DOM environment, the historical ephemeral include must be broadened from `apps/web/src/features/settings/*.test.ts` to `apps/web/src/features/settings/*.test.{ts,tsx}`. This guidance does not claim that DOM run occurred here.

The final `security-form.test.tsx` JSX correction was checked separately with the same ESLint installation/configuration: explicit exit **0**, **0 errors and one existing unused-mock-prop warning**. It is the only source change after the full-lint receipt; no broader lint repeat was needed for this isolated syntax/typing correction.

## Final typecheck receipt

After committing the corrected source (`bf932dd71cda22cbf437afff7304643b4cac4cad`) and confirming the obsolete `.ts` file was absent, `NODE_OPTIONS=--max-old-space-size=5120 npm run typecheck --workspace @capiro/web -- --incremental false` completed with explicit shell exit **0**, **zero diagnostics**, in **208 seconds**. The runtime-only heap budget changes no project/check configuration. This supersedes the earlier memory-limited and TS2352 attempts. No additional source changes or optional tests followed.

## Final default production build

The root `npm run build` passed with exit **0** in **309 seconds**: Meri client TypeScript build, default Next/Turbopack compilation, Next TypeScript check and route collection completed. Runtime heap was `NODE_OPTIONS=--max-old-space-size=5120`; telemetry was disabled. No webpack switch, gate suppression or tracked configuration change was used.

To resolve the earlier external-symlink layout failure, copied the exact runtime/configuration tree `29a2d4f8d6e45f3ceaf08f031090362ef1750211` into an isolated directory and copied the existing matching-lock installed dependencies physically inside its root, including both nested dependency locations. All copied symlinks resolved within that root. Only historical `docs/` evidence was omitted from the build copy; no runtime source or configuration was changed. This is still a reused-install receipt, not a fresh install or browser/live qualification.
