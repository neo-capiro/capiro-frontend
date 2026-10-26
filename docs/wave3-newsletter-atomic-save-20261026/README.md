# Existing basic-newsletter atomic save

This candidate replaces the reopened basic-newsletter editor's metadata/body/snapshot sequence with one existing `workspace.draft.save` request and immutable version. It uses the ordinary-save journal, command lock, receipt binding, current-access verification and recovery lifetime already shipped by PR171. A typed editor model supplies newsletter capture/hydration; it does not create another recovery or authorization owner.

## Pins and boundaries

- Author branch: `codex/wave3-newsletter-atomic-save-20261026`.
- Exact frontend base: `504add2eb594180c8c28d1ee9d025769af1a594a`; tree `a389274a0d8fbc326925937c2575aa81bb807d64`.
- Existing producer contract traced at Core141 `d68024dc62edddb0784f79b4e5ca50335dd1ca89`; tree `0051653db4eb1bbd4b8f8e742cc22b11d25126bf`. Its existing save endpoint accepts complete document replacement within the atomic transaction.
- The later Root coordination notice about Core144/FE176 does not change this assigned base. No rebase or projection/staging changes are included.
- No journal, package, lock, export, architecture registry, Core, rich-newsletter, deployment or send changes. PR171's frozen author checkout is preserved.
- Ordinary new-newsletter creation retains its existing semantics, including the metadata/body/snapshot path within that creation session. Request-bound ordinary-create recovery remains a separate producer prerequisite. Newsletter staging/projection is separately allocated. This candidate does not close WS13/WS14 acceptance.

## Behavior and retained owners

The request captures the canonical client UUID/null, exact baseline hash, request ID, primary document ID, distinct document name and newsletter subject, complete saved body, and edited NewsletterBody. Core replaces that body wholesale, so the model retains unrelated body fields and extra fields on surviving projected blocks. It refuses conflicting unprojected blocks, missing/malformed newsletter data, multiple eligible primary documents, changed primary identity and over-limit requests. Bound brief-copy tabs are excluded. Optional `undefined` editor links are normalized to their JSON representation before capture so the persisted request, request hash and exact replay remain identical.

The same generic save owner preserves UNKNOWN after a lost response. Current readback cannot release that fence; only the bound exact request receipt and current reconciliation can confirm the save. A stale baseline retains local title/subject/body until deliberate adoption or rebase. Cross-tab recovery keeps each mounted editor's unsent content separate. Scope replacement/access loss hides the old retained editor. Held-client association carries typing made while the binding request is pending and requires deliberate rebase. Undo/redo stays local; Save and exit closes only after confirmed saving.

Deletion evidence: reopened existing drafts now return through `saveOwner.save()` before the old creation sequence. The old direct-PATCH assertion in `workspace-brief-copy-newsletter.test.ts` was replaced by positive primary-selection and negative bound-only atomic-capture tests (two tests retained). The held-association static test now verifies that an absent atomic owner cannot dispatch; its real positive association behavior is covered by the new mounted test. No disabled feature path or temporary diagnostics remain. `rg` found no `TEMP newsletter`, `TEMP browser`, `TEMP pageerror` or mutant `false &&` in the affected implementation/tests.

## Focused evidence, 2026-10-26 UTC

Local author tools: Windows PowerShell; Node 24.22.1, npm 11.19.1, Vitest 4.1.11, Playwright 1.61.1, TypeScript 5.9.3, ESLint 9.39.2, Prettier 3.8.1. The allocated dependency cache was reused without install, with synthetic browser port 5323 and installed Chrome. This is not Root's Linux production gate environment.

| Command/check | Exit and observed result | Completed UTC |
| --- | --- | --- |
| Original-source mounted test, `npm run test:browser:modules --workspace @capiro/web -- workspace-newsletter-atomic-save.spec.ts --grep 'existing newsletter saves'` | 1; intended red: observed document PATCH, expected atomic save. The fixture stopped that old path at its first write; it did not observe three successful writes. | 02:19:39 |
| Preservation/refusal mutants, focused new unit test | 1; three selected assertions failed when the full-body spread and unsupported-block guard were removed. Five unselected tests skipped by filter. Restored immediately. | 02:40:18 |
| JSON-normalization mutant, focused round-trip test | 1; exact request comparison failed on an undefined optional link. Seven unselected tests skipped by filter. Restored immediately. | 02:40:20 |
| `npm run test --workspace @capiro/web -- tests/workspace-newsletter-atomic-save.test.ts tests/workspace-brief-copy-newsletter.test.ts tests/newsletter-client-authority.test.ts tests/workspace-ordinary-save.test.ts tests/workspace-ordinary-save-recovery.test.ts tests/workspace-ordinary-export.test.ts` | 1; 86 passed, 1 inherited failure, 0 skipped, six files. All eight new codec tests passed. | 02:41:02 |
| Untouched exact-base `newsletter-client-authority.test.ts`, same dependency cache | 1; 10 passed, same one `labels held library rows and excludes them from a client-filtered surface` failure. No assertion weakened or unrelated library code changed. | 02:40:42 |
| `npm run test:browser:modules --workspace @capiro/web -- workspace-newsletter-atomic-save.spec.ts workspace-ordinary-save.spec.ts workspace-ordinary-save-corrections.spec.ts` | 0; 30 passed, 0 failed/skipped: 10 newsletter and 20 manual/recovery compatibility cases. | 02:42:41 |
| Final readback check, newsletter spec `--grep 'stale baseline\|adoption after'` | 0; 2 selected cases passed after moving JSX outside the parser try/catch for lint. | 02:44:09 |
| `npm run typecheck --workspace @capiro/web`, exact base and final candidate in same cache | 2 on both; the same 35 diagnostic lines, zero additions/removals. Base completed 02:15:20. | 02:44:10 |
| Touched-file ESLint, from `apps/web` | 0; no warnings/errors after fixing JSX inside try/catch. An earlier root-cwd attempt failed to find config; the first correctly scoped run caught four related JSX diagnostics, all fixed. | 02:42:53 |
| Touched-file `prettier --check`; `git diff --check` | 0; clean. | 02:44:58 |
| `node scripts/architecture.mjs`, exact base/final | 1 on both; zero structural/graph errors. Base has 120 blocking size records, candidate 127. Seven affected records require independent review; no registry edits. | 02:44:57 |

During development the first five mounted tests failed, exposing optional-link JSON normalization before dispatch. After repair, all five passed at 02:38:36, followed by the complete 30-case run above. Initial typecheck widening errors in directly affected tests were repaired with discriminated/manual payload parsing; the final diagnostic set exactly matches the untouched base. These failures remain in local evidence rather than being reported as green runs.

Browser checks cover one POST/version, complete-body preservation, stale CAS/rebase, reload/exact replay, two independent editors, access revocation, actor replacement/delayed response, canonical client move, held-client binding with concurrent typing, local undo/redo, confirmed exit, and adoption of a newer body after bound replay. Existing manual tests retain the missing-journal fence, foreign receipt refusal, missing cross-tab disposition, failed reservation, explicit association and supported rich-section checks.

## Required independent size review

These are review requests, not author approval or registry records. Integration alone adopts reviewed exact fingerprints. NewsletterWorkflow remains the existing cohesive template/builder/review/stage presentation; its inner editor is renamed for the scope-owned wrapper. The save hook remains the single lifetime owner. The new model is a typed specialization, not a copied serializer or policy layer. The creation path remains explicitly outside this slice.

| File / symbol | Nonblank lines | Fingerprint |
| --- | ---: | --- |
| `newsletter/NewsletterWorkflow.tsx` module | 476 | `f23f461d90f898eb8522660d61c13b25a6454c78993146d97ea5a1331554f809` |
| `newsletter/NewsletterWorkflow.tsx` NewsletterEditor | 350 | `4ac93708fa8dec480e0bfcba274fe9a7911227e07d36f7918c74b9777b24c595` |
| `newsletter/use-newsletter.ts` useNewsletter | 234 | `2d4f82b6ba6d403020e31eaf34d6097ca5e8c5cc5761d09366125fb178cee581` |
| `newsletter/use-newsletter.ts` useNewsletter > save | 89 | `a4a0e41ddfcc32f06240a39bf5e04985a6a9812df8afd7bb0e4950cd897b9823` |
| `ordinary-save/useOrdinaryDraftSave.ts` module | 493 | `c33506c1f8d58dadd1f7c27793828ccb9fab95c64d93ba3f2c87ad87eb04afff` |
| `ordinary-save/useOrdinaryDraftSave.ts` useOrdinaryDraftSave | 428 | `5fac0d97957528d506d42e9eb1783e71999caacfdca5ca7ad85ee229e8cecc26` |
| `shared/capiro/operations/workspace-documents.ts` module | 429 | `fa0039c6058c81938e8ed3e22c95c71c46d0f99f7a5a560520df56ffa3f82ddb` |

The first six paths are under `apps/web/src/features/modules/workspace`; the last is under `apps/web/src`. Full baseline/final size findings are in the author's output handoff. Unrun gates: independent exact-head review/registry adoption, clean Linux full suite/typecheck/build/container checks, backend/live acceptance, production images/deploy/send. Prior unaffected PR171 evidence is reused, not rerun as a broad campaign.
