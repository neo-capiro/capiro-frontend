# A1 #118 frontend review verification

Verified the existing mechanical corrections in `email.ts` and `a1-portfolio.test.ts`; this verification made no source changes.

| Gate | Corrected head |
| --- | --- |
| Canonical web Vitest | Pass: 3,063/3,063 tests, 232 files, 477 suites; no skips |
| Canonical `test:capiro` | Pass: 549/549 tests, 52 files; no skips |
| Canonical lint | Pass: 0 errors, 85 warnings |
| Typecheck | Pass: 0 errors; serialized 5 GiB Node heap retry completed in 173 seconds |
| Default root `npm run build` | Pass: exit 0, 266 seconds; Meri client build, unchanged Next/Turbopack compilation, TypeScript and route collection |

The runtime was Node 24.19.0, npm 11.9.0, Next 16.4.0, TypeScript 5.9.3, Vitest 4.1.11 and ESLint 9.39.2. Dependencies reuse the existing installed tree whose lockfile SHA-256 matches this branch: `c42e790cc2eb7d2d62c0daac01bba9a3002f65a8b2a3ba97ad192ab164898234`. This was not a fresh install. No package, lockfile or gate configuration changed. The original installed `.bin` was added to the command PATH.

The first full-web attempt encountered 24 disk-full load failures and 26 missing-export load failures, plus one assertion failure. Restoring the locked nested `apps/web` dependency tree and placing its generated Vite cache in `/dev/shm` removed those failures except five imports from `packages/meri-client`. Restoring that package's existing locked nested dependency tree made its 39 tests pass. The final full canonical run then passed all 3,063 tests. Both nested Meri contract versions are 0.1.10, as the lockfile requires; the root hoisted version was unchanged.

The successful typecheck used `NODE_OPTIONS=--max-old-space-size=5120 node node_modules/typescript/bin/tsc --noEmit --incremental false --project apps/web/tsconfig.json`. This changes the process memory budget only; the TypeScript project settings stayed unchanged. The initial parent-observed attempt exited 137 with no diagnostics and was not treated as a typecheck result.

The base was not rerun here. Reviewer baseline results were zero type/lint errors, 3,052 web tests and 549 Capiro tests passing. The accompanying JSON records commands, corrected-head source hashes, observed results and environment limits. Raw transient logs/JSON use `/dev/shm/a1-pf-fe-*`.

No mail policy, send-attempt behavior, dependency additions, SQL, merges, deployments or real provider operations were performed. The original symlink-layout build failure was resolved by the isolated default build described below.

## Final default build

The default root `npm run build` passed with exit **0** in **266 seconds**, using a 5-GiB Node runtime heap and disabled telemetry. The exact runtime/configuration tree `8e166f214db29557cac4bd50fca05599565d535e` was copied to an isolated directory with the same matching-lock installed dependencies physically inside its root, including both nested dependency locations. All dependency symlinks resolved inside that project. Historical `docs/` evidence was omitted from this runtime copy; no runtime source, tracked config, build gate or compiler setting changed. No webpack switch or gate suppression was used. This remains a reused-install receipt, not a fresh install or browser/live qualification.

The later review withdrew auto-clear entirely. No send-reservation or recovery behavior changed. Deferred open item: **an uncertain or refused send blocks that thread in that browser until recovery resolves it**. The backend's separately Neo-approved bounded ML-09 skip-and-continue fix does not alter this frontend behavior.
