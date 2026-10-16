# Independent non-Meri frontend preview candidate

Draft PR55 publishes exact reviewed meeting source9b7e087ca1e7cc9c6dbbf60fe4e4c7eba4c1cb66 on exact PR53 basee9df91d876eaad05d13fdd0707c1fe39d5affb62: https://github.com/neo-capiro/capiro-frontend/pull/55. PR53/54/55 remain draft and unmerged; their source refs were not changed by composition.

## Exact composition

Branch `fix/non-meri-desktop-integration-20261015` starts at genuine frozen4e1421054df0d32c564f7c9bc75cbd5e5366b428, retains exact PR53e9df and PR54Team2758775ddf0e3b17898370be61540498344a9f57, then cherry-picks meeting9b7 with provenance. Application checkpoint631c5952bbeb5fa163231facca5adf39ed34d86d/tree8e195a75b0b608371df5b9882b4d706b0e95d7d1 is exactly their35-path union, including13 application files. The only shared changed path was `docs/architecture-size-reviews.json`; its two meeting replacements and one Team append composed automatically and were independently verified field-wise. No application conflict or extra feature was introduced.

A premature cherry-pick attempted while the new worktree was still checking out refused before mutation; after checkout completed cleanly the actual composition succeeded. That refusal is not a product or merge conflict. Originals, accepted reports and histories remain intact.

One additional test-only commitc90b9cd60ce140db2ffa4ec3f7fd4cdac30578d0 adds `await page.waitForURL("**/modules")` after Modules navigation in `tests/production/verify-standalone.mjs`. The old test accepted a generic setup heading still visible from Meri, so a subsequent Settings click could outrun Modules history. This adds readiness evidence without weakening any assertion/limit or changing application source. The final commit also includes this handoff, the portable selection/map and qualification documents. Root's external SOURCE-HANDOFF binds the final commit/tree and artifacts.

## New combined evidence

Fresh physical locked install:845packages/76.095s. Windows Node24.19.0/npm11.17.0/Playwright1.61.1/Chromium153.0.8010.12; exact root lock unchanged. Source custody and unique selection were checked before execution.

- Exactly50 fresh affected browser cases passed in128.561s, no fail/skip/retry/flaky/global errors, one worker,15s case/240s global bound. Inventory/run identities match SHA256 `5fc066d005427e5fb034584b01b2d051cae232d6cdd25684665cc813f04e9b97`. Selected application/test bytes plus selector stayed unchanged during the run.
- Team5/5 render cases passed in6.393s with bounded single-worker controls and task-local temp.
- Default `npm run build` passed in90.137s: canonical client declarations, Next16.4 compilation, full semantic typing and24pages. No config/lock/source workaround. The later one-line standalone test is not an application/compiler input; those application/build inputs stayed exact.
- Lint19affected TS/TSX files, formatting21affected source/test files plus selector, and architecture passed. Architecture reports zero boundary errors/blockers and19 inherited unreviewed findings, not waived.
- Corrected existing shared standalone probe passed in18.772s with no fetch observer, unchanged source/timeout/assertions, zero page errors and the default-Portfolio root check. The existing smoke includes disabled local Meri route refusal and baseline390 navigation; this is not new Meri/mobile feature acceptance.

The first standalone run retained an unattributed local fetch timeout. A method/path/status-only loopback diagnostic completed successfully but was not admitted as qualification. A separate original-probe control exposed the Modules/history test race; the one-line correction then passed. Original failure/diagnostic/control logs remain separate; the first timeout's precise cause is still unknown. No production fix or timeout increase was inferred from it.

[Independent review](INDEPENDENT-REVIEW.md) verifies the source union and separately reviews the QA correction, selection and fresh results. Original PR53/54/55 source/test/build receipts remain unchanged; they are not automatically carried or summed into fresh coverage. No source from Fable c7e060 or proposed Objective/Engagement implementations is included.

## Smallest next shipment

[Backend compatibility](BACKEND-COMPATIBILITY.md) proves unchanged service/registry/gateway/auth/config inputs. This release does not require a new backend image for the proposed Objective/Engagement features. Reuse the existing preview backend after its actual existing-contract/deployment identity is confirmed; fixture success and anonymous health are not that proof. Existing wrong-target receipt refusals must remain.

[Linux qualification](LINUX-QUALIFICATION.md) fixes50changed-surface browser cases,5render cases, default build/semantic checks and existing standalone/runtime/image/scan gates using the reviewed Shipping mechanisms. No full190/589/600/1304/frozen480 rerun is requested. No paid execution, image publication, live write, merge or deployment occurred in this integration lane. Target Linux149, current authenticated backend behavior and exact preview image admission remain unrun here.

All local source/test preparation is now complete subject to final seal. The next executable unit is one frontend-only Linux qualification/image attempt and normal preview release gates; no wait for unrelated backend features or future Fable integration is needed. Its budget, queue/time bounds and immutable execution packet stay with Shipping/parent. Local timings do not establish a guaranteed shipment deadline.
