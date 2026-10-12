# CP-03 uncertain file deletion — CORE-060

Final candidate: `274a7d876d36a964aedf8081dc83225078fe092c`, apps/web tree `d67f99d2fadb4cb1735dea9910c0c096b5eb0395`, branch `repair/capiro-next-delete-20261012`, worktree `/workspace/capiro-next-delete`. Apply commits in order: `7ad059006c3f8286e7e578ead10eade14ff31da9`, `313f9fcf6cc80cbe43bf5aa79f2f31604e70207a`, `274a7d876d36a964aedf8081dc83225078fe092c`. Root has already integrated the first two separately. Exact per-file SHA256 values are in `FINAL-SOURCE.json`; original intermediate source receipts remain available.

## Scope and behavior

CORE-060 / original CP-03 remains P3: repeat DELETE dispatch was proved; duplicate destructive impact was not. Native same-ID deletion is recoverable. The change retains a cache-local pending/unknown attempt after a dispatched ambiguous response, survives dialog close/reopen, and requires a deliberate existing native current-files GET followed by a separate new confirmation. A definite refusal permits correction. A current `delete_pending` row stays fenced; a visible recoverable row can permit new intent after review. Absence is described as unavailable in the current visible collection and never called a confirmed deletion.

The key contains tenant, actor, client and file ID; its value contains only a token and status, never private file content. Actor/client/view replacement aborts the execution and removes old private display/editor state. Late responses cannot publish completion or clear the old fence. The retained attempt is cache-local protection, not cross-tab or reload idempotency. No endpoint, backend idempotency key, bulk deletion, Prospect workflow or capability was added.

- `apps/web/src/features/portfolio/files/deletion.ts:23`: attempt identity and cache-local lifecycle; `:53`: current-list admission, strict `{ok:true}` receipt and uncertainty classification; `:109`: explicit recovery.
- `reviewFileDeletion` reuses the adopted Files navigation lifecycle: exact cancellation, canonical `fetchQuery` with `staleTime:0`, execution abort cancellation, current reader/update-count/attempt guards, cleanup. Canonical query loading/error authority governs every cached file action.
- Failed deliberate GET 403/503 makes the collection unavailable; cached file B cannot dispatch while file A's unknown attempt remains. Canonical retry restores current collection authority, while A still needs deliberate recovery.
- Installed TanStack 5.104.1 `query.ts:778` can adopt a replacement fetch's promise after silent cancellation. The final guard captures the original queryFn signal once and rejects missing/aborted dispatch, so a replacement background read cannot satisfy deliberate recovery. Newer successful collection data remains current.
- `useFileDeletion.ts`: view/execution lifetime, reactive attempt state and guarded UI effects. `DeleteFile.tsx`: canonical dialog plus truthful unknown/current-state presentation. `FilesPage.tsx`: scoped ID-only selection and deletion dialog composition. `mutations.ts`: removes only the superseded raw client DELETE branch. Existing CP01/02 metadata behavior is preserved.

## Native contract and limits

Read-only contract inspection is bound to `/workspace/capirov2` commit `243248e726243c44bd4b9d24fd1ed220da18c56a`; exact excerpts/hashes are `native-delete.txt`, `native-list.txt`, `native-routes.txt`.

`apps/api/src/engagement/engagement.service.ts:7756` lists attachments using native parent/tenant/ACL filtering, excluding superseded records. `:8349` deletion checks access, marks delete_pending/unshares, deletes the stored object, retains delete_failed on storage error (503), removes the row on success, and returns `{ok:true}`. GET proves current visible state, not causal attribution; absence does not establish deletion or lost ACL separately. No native authenticated writes, storage/provider calls, AWS, billing/model calls, deployment or merge occurred.

## Verification history

Artifacts are preserved, including failures; no screenshot baseline was rewritten.

1. `unit-red.log`, `red-extraction.patch`, `red-deletion.ts`, `red-regression.test.ts`: behavior-preserving request extraction baseline. Second ambiguous DELETE returns another503 when the regression expects local409; this is an actual repeat-dispatch assertion, not an import failure. This is explicitly an extracted baseline, not untouched fd117.
2. `browser-red/`, `browser-red-final/`, `browser-red-dispatch/` and corresponding JSON/logs: untouched fd117 browser baselines. Final eventual spec SHA256 `31bd8876d7edb4ed73a4412a629b2b6a63197a54fae43552f17865e5aec3f7a4` fails the original close/reopen test because Confirm delete remains enabled after settled native503. Final red trace: `browser-red-dispatch/guarded-unknown-deletion-s-bd608-view-and-a-new-confirmation/trace.zip`. Frozen baseline HEAD/source status and exact PID closure are in `baseline-dispatch-release.json`.
3. Initial candidate `browser-green.json`: 9/10 passed. Sole failure expected raw403 text although canonical QueryState deliberately maps403 to its permission message. Corrected copy assertion; no behavior assertion removed.
4. Independent reviewer found failed GET leaving canonical cache authoritative at7ad. `authority-red.log` shows both403/503 authority controls failing. Canonical correction replaces direct queryFn invocation; `canonical-unit-green.log`:39/39.
5. `browser-final.json`:8 passed/4 failed on313f. Two substantive supersession failures accepted a replacement read; two test assumptions attempted to locate background accessible Actions while Radix correctly hides the background behind the recovered dialog. The latter now close/reopen the dialog before checking B, retaining all unknown-fence assertions. This full failed run and traces remain unchanged.
6. `silent-supersession-red.log`:2/2 meaningful failures on313f, where the review resolved replacement data rather than rejecting. Controls use real QueryClient refetchQueries silent cancellation. The final guard passes unchanged stale200/403 semantic expectations; `dispatch-unit-green.log`:39/39 (26 deletion +13 existing Files metadata controls).
7. Final typecheck and focused lint pass (`dispatch-typecheck.log`, `dispatch-lint.log`). `dispatch-architecture.json`: errors[]; one changed-size review signal remains until root updates its owned registry (see below).
8. Final browser replay/preservation results are recorded separately below after completion.

## Reproduction

From `/workspace/capiro-next-delete/apps/web`:

```sh
node ../../node_modules/vitest/vitest.mjs run tests/files-delete-recovery.test.ts tests/files-metadata-actions.test.ts tests/files-metadata-receipts.test.ts
node ../../node_modules/typescript/bin/tsc --noEmit
node ../../node_modules/eslint/bin/eslint.js src/features/portfolio/files/FilesPage.tsx src/features/portfolio/files/mutations.ts src/features/portfolio/files/deletion.ts src/features/portfolio/files/useFileDeletion.ts src/features/portfolio/files/DeleteFile.tsx tests/files-delete-recovery.test.ts tests/browser/files-delete-recovery.spec.ts
```

Root-granted browser port5299 only; `playwright.config.ts` has no webServer, one worker, retries0 and Chromium `/usr/bin/chromium`. `guarded.spec.ts` and `preservation.spec.ts` abort cross-loopback-port traffic and assert none occurred. Reuse existing app browser fixtures; all API requests are synthetic intercepts. `server-relocation.diff` records the external server's mechanical app-root/cacheDir/port relocation. Borrowed dependency symlinks are documented in `DEPENDENCIES.json`; no install or dependency edit occurred.

```sh
DELETE_REVIEW_ROOT=/workspace/capiro-next-delete DELETE_VARIANT=candidate-dispatch DELETE_PORT=5299 node /tmp/capiro-next-delete-evidence/server.mjs
DELETE_OUTPUT=/tmp/capiro-next-delete-evidence/browser-dispatch-green DELETE_REPORT=/tmp/capiro-next-delete-evidence/browser-dispatch-green.json node /workspace/capiro-next-delete/node_modules/@playwright/test/cli.js test -c /tmp/capiro-next-delete-evidence/playwright.config.ts
DELETE_SUITE=preservation.spec.ts DELETE_OUTPUT=/tmp/capiro-next-delete-evidence/browser-preserved DELETE_REPORT=/tmp/capiro-next-delete-evidence/browser-preserved.json node /workspace/capiro-next-delete/node_modules/@playwright/test/cli.js test -c /tmp/capiro-next-delete-evidence/playwright.config.ts
```

For untouched red, set DELETE_REVIEW_ROOT to frozen `/workspace/capiro-p1-successor` atfd117, use a unique cache variant/output/report, then run the same eventual spec with `--grep 'unknown deletion survives'`. Do not start a server without an assigned resource lease; stop only its exact owned PID and verify port closed.

## Design/architecture review

`FilesPage` is the sole changed size signal:245 nonblank lines, fingerprint `6b1e2d5c668d17e152ce5d4dedb60bb2ed7827e2fbd68033559a0dff55bf8726`. Cohesive client collection/modal composition remains there; new transaction/recovery logic is in the dedicated deletion owner/hook/dialog. No new helper exceeds review thresholds. Independent Modules reviewer accepted the exact FilesPage structure and reviewed successive query corrections in `/tmp/capiro-next-modules-evidence/independent-delete-review.md`; root owns registry changes. No shared registry/architecture source was edited. Architecture command exit1 means that outstanding registry review signal, not dependency/cycle errors.

Existing actual Figma file `Zc2dEN5aLU47dVdsewDmiJ` frame `411:53857` raw context/screenshot are preserved as `figma-411-53857.json/png`. It depicts the existing delete-failure modal, not an exact unknown/current-state recovery design. Prior modal/footer parity gaps are outside this bounded CP-03 behavior fix. No new Figma request or claim of exact parity. Final desktop/mobile screenshots are visually inspected separately; fixture/accessibility checks are not live backend qualification or a full assistive-technology audit.

## Final visual/keyboard inspection

Actual screenshots from `browser-dispatch-green` were opened and inspected, alongside the saved exact Figma frame:

- `guarded-unknown-deletion-s-bd608-view-and-a-new-confirmation/delete-unknown-desktop.png`:1440×1040 unknown-state dialog; original error, unknown outcome explanation, enabled review and disabled confirmation are all readable and contained.
- `guarded-an-absent-current--5503e-not-a-deletion-confirmation/delete-absent-mobile.png`:360×800 absent-state dialog; wrapped description/current-state explanation, causal limitation, review, disabled confirmation and close control all fit within the viewport. Test asserts modal left/right bounds and no internal horizontal overflow. Settled Tab/Tab/Shift+Tab remain inside the dialog; Escape closes after review. The desktop recovery control is activated by keyboard Enter.

Figma411:53857 has a compact modal with a tinted error row and separate Cancel/Delete footer. This candidate continues using the canonical shared dialog and stacked controls; exact modal size/error/footer parity is an existing gap, retained here. Figma has no matching uncertain/readback state or mobile recovery frame. The current screenshots show no new blocking clipping or keyboard issue in the bounded states exercised. Accessibility observations are limited to semantic locators, focus/keyboard behavior and rendered geometry, not a complete screen-reader audit.

## Final result and handoff

Final source remained unchanged throughout the final qualification: **12/12 new deletion browser controls +15/15 preserved Files metadata/shared-dialog controls**, one worker, retries0; **39/39 focused unit controls**, typecheck and focused lint pass. `browser-dispatch-green.json` and `browser-preserved.json` contain timestamps and per-test results. No unexpected fixture requests or cross-loopback traffic occurred. Frozen fd117 still fails the unchanged eventual-spec primary regression as expected.

Owned serverPID648661 was stopped and5299 verified closed (`connect_ex:111`) at2026-10-12T18:22:34Z; see `FINAL-LEASE-RELEASE.json`. No browser/server process is left owned by this lane. Tracked candidate source is clean; the only untracked paths are documented borrowed node_modules symlinks.

Independent exact-pin source review accepts the final current-read-authority and silent-refetch corrections at274a7d; see `/tmp/capiro-next-modules-evidence/independent-delete-review.md`. The reviewer inspected source/evidence and did not claim an independent browser replay. Root owns clean combined checks, the remaining exact FilesPage registry entry, and final integration. No remaining bounded source/browser blocker is known.
