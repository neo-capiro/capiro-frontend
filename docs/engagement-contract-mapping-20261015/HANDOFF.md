# Engagement handoff for the frontend owner

Read [MAPPING.md](MAPPING.md) first for the exact pinned contracts, request/response identities, permissions, errors, source links and meaningful existing tests.

**Useful result:** the frozen backend does not define client Engagement plans/waves or scheduling recommendations. Keep PlanView's actions unavailable. Current report rows can identify Directory overlap only after the frontend response preserves existing client identity/activity fields and the backend owner qualifies permitted-client scope. Team remains open follow-up workload, not client-account assignment.

Frontend base: `e9df91d876eaad05d13fdd0707c1fe39d5affb62` (draft PR53). Isolated branch: `fix/engagement-workload-contract-closeout`.
Backend read-only pin: `cd3c51e940f14e1b2a1040b0ffa445e85d68b332`.
Receiving frontend thread: `01a13c71-7ff1-7660-a7c8-de25cc94401c`.

## Source patch

- TeamView filters done/canceled tasks before seeding owner groups, removing misleading zero-work rows for closed-only owners. Existing ownerUserId, Unassigned, client filter and strict overdue logic remain.
- Member-name loading/failure now has separate status and retry. Successfully read task counts remain visible; retry reloads only names.
- Five rendered tests cover done-only and canceled-only owners, open/unassigned/overdue boundary outcomes, name loading/failure, task failure withholding and all-closed empty workload.
- Two desktop browser tests additionally cover optional client query and actual member retry without a task reread. Both passed together with the existing independent report/task-denial regression.

No operation registry, wire schema, Meri, plan, permission, account-assignment, scope or office-grouping implementation changed.

## Verification receipt

- Locked physical local `npm ci --ignore-scripts --no-audit --no-fund`: passed, 845 packages; Node 24.19.0. No shared dependency store/config/lockfile edits.
- `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts tests/engagement-team-workload.test.ts --maxWorkers=1 --no-file-parallelism` from apps/web: **5/5 passed**, zero skips. TEMP/TMP pointed to resolved worktree-local `.qa/vitest-temp`; VITEST_MAX_THREADS=1 and RAYON_NUM_THREADS=1. Initial default temp-cache rename failed EPERM; the supported local temp alternative succeeded.
- Changed TeamView/render/browser test ESLint, Prettier and `git diff --check`: passed.
- Full-web TypeScript at 2 GiB failed V8 heap allocation. The complete semantic check passed at the base's accepted 4 GiB budget: `node --max-old-space-size=4096 node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false` (exit 0).
- Architecture passed: zero boundary errors and zero blockers; 19 unchanged inherited unreviewed findings remain visible. The exact TeamView review is recorded below and in architecture.json.
- Default build: **passed after host recovery** with client compilation, Next 16.4 Turbopack compilation, built-in TypeScript and 24 generated pages. Command: `npm run build`, NODE_OPTIONS=--max-old-space-size=4096, RAYON_NUM_THREADS=2, worktree-local dependency directories and task-local npm/temp evidence. No alternate bundler, source/config/lock change or root expansion. Earlier attempts remain historical: first junction creation was sandbox denied; an approved retry ended during the verified host-offline interval without a final diagnostic. After recovery, the source hash and clean frozen backend were rechecked and no owned Node process remained before the successful rerun.
- Focused desktop browser verification after host recovery: **3/3 passed**, one worker, zero retries/skips/flaky results or unhandled browser exceptions. Two new Team cases plus existing desktop-detail-content task-denial/independent-office-report regression; 26.6 seconds. Command from apps/web: `node ../../node_modules/@playwright/test/cli.js test --config test/browser/playwright.config.ts engagement-team-workload.spec.ts desktop-detail-content.spec.ts --grep 'Team |Desktop Engagement task denial' --workers=1 --retries=0`. Existing Chromium and fixture-only local requests; task-local TEMP/TMP and RAYON_NUM_THREADS=1. Earlier pre-test Vite/Rust allocation failures remain historical; no assertion was changed to obtain the successful result.
- Optional read of Win32_OperatingSystem through Get-CimInstance was denied access to the CIM resource; not retried. It is not required for the mapping or source patch.
- Backend offline tests: **25/25 passed** across runtime ownership and API preview UI contract suites. Other backend DTO/report suites were inspected only because Jest/tsx are absent in the frozen clone.
- Backend preview-route drift check failed on five existing Krisp paths outside its /api/engagement allowlist; no generated artifact was changed. Exact paths are in MAPPING.md.
- Live auth/PG concurrency/provider/standalone-runtime and full retained-frame visual qualification remain unrun. Focused desktop fixture results and the default build apply only to these checked source bytes; no frozen-base acceptance is inherited.

## Structure review

<a id="structure-review"></a>

Independent `patch_review` found no blocking implementation finding. TeamView's 83 nonblank function-body lines are one cohesive responsibility: one follow-up workload table and the read-status presentation for its task/name inputs. It uses canonical query/UI primitives; transport, authorization and persistence stay outside it. Splitting solely to reduce line count would not improve ownership. No new shared abstraction, domain rule or package boundary is introduced.

Reviewed TeamView full-file SHA-256: `6ed74f71b6495e95f762965ee58b0d749e08dcc3a203ed8b83f13375ff278390`.
Function fingerprint: `2d7f42cbbca10c24a3222ab963e7fb51f39b64a6b089dbdf8669d38d9b8d2762`.

Independent review also checked the mapping's backend predicates/identities. Its two nits were addressed: explicit year is scoped to create/annual overrides, and tests now include a done-only owner matching the actual HTTP default.

## Exact remaining owner decisions

Coordinator: allocate the plan/wave backend contract owner. Obtain plan/wave identity/read/write/version/visibility first, then stale-plan criteria and window eligibility/ranking/calendar provenance. Obtain permitted-client scope and office activity/kind guarantees before shared-office aggregation. No current inspected owner defines those policies; source search and explicit existing owner handoffs are linked in MAPPING.md.

No remote mutation was attempted. The reviewed patch is prepared on the isolated frontend branch; the final commit/export receipt is supplied separately. Backend status was confirmed clean at the frozen pin after executor recovery. This task's generated npm evidence is kept outside the source patch. No AWS, paid jobs, shared database, migration, credential/security change, merge, deployment or mobile action occurred. Meri remains Fable-owned.
