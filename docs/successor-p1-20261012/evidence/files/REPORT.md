# CP-01 / bounded CP-02 Files repair

Commit: `752e29f902339c990ee6fb27a2006f88af4de0f2` on `repair/capiro-p1-files-20261012`, base `3562618f73d7a1f9d620d7b7b28c9e8c2c1ac83d`. All 12 committed paths are Files source or uniquely named Files tests. Frozen assessment/shipping sources were untouched. No backend writes, provider calls, bulk-access/delete changes, shared registry changes, or deployment.

## Result and source

- `contracts.ts:48-75` validates requested single-file metadata effects as well as returned identity. Access requires equal mode and normalized set of trimmed nonempty viewer IDs, independent of order or duplicates; all mode treats viewer IDs as meaningless, matching native semantics. Moves require the trimmed requested folder or null.
- `metadata-actions.ts:38` dispatches exactly one PATCH behind the captured canonical Files reader/writer/lifetime guard. A conflicting/malformed receipt, transport uncertainty, or stale/aborted response retains a cache-local unknown attempt. Known native rejection remains correctable. Concurrent or repeated saves cannot dispatch while pending/unknown.
- `metadata-actions.ts:86` uses the existing single-file GET access endpoint for explicit current-state review. Wrong-ID, failed, or stale reads leave the fence intact. A valid current read allows a deliberate new save and does not claim the prior PATCH completed.
- `metadata-attempt.ts` scopes attempt/draft state by tenant, actor, client, and file in the session QueryClient. `useFileMetadataChange.ts` binds presentation and completion to the captured Files lifetime. `FileMetadataStatus.tsx`, `FileAccess.tsx`, and `MoveFile.tsx` retain the draft, show uncertainty/current state, and expose the explicit review action.
- `queries.ts:73` scopes the existing access GET cache by reader and revision, checking the captured reader before and after the response, preventing old-reader ACL reuse on reopen.

## Native compatibility evidence

Reviewed `/workspace/capirov2` via `git show 243248e726243c44bd4b9d24fd1ed220da18c56a:apps/api/src/clients/client-files.controller.ts`; retained as `native-client-files-243248e.ts`, SHA256 `9b983bc5ecbf7810ebf054c3e55c6d6343220eb7f3832057469e0c21da8dcfa2`. Relative to checkout `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`, only client-file `prospectId:null` predicates differ. Move lines75-102 normalize folder trim/null and return id/fileName/folder/viewerMode/viewerUserIds. GET lines106-132 returns current access plus folder/uploader. Access lines139-175 normalizes all to [] or restricted trimmed/deduplicated IDs and returns persisted fields. Native tenant/client/visibility/member authorization remains authoritative.

The native contract has no operation ID, version, CAS, or durable acknowledgement. GET review proves current state only. The browser fence is session-cache-local and cannot promise durable replay protection across full reload or prove cancellation of an accepted native write. Bulk folder access and deletion, including CP-03, are unchanged and remain separately assessed.

## Verification and reproduction

All fixtures are synthetic. Existing test-only Vite fixture is externally launched at `http://127.0.0.1:5205` by `/tmp/capiro-p1-files/server.mjs`, using `/tmp/capiro-p1-files/vite-cache`. External Playwright config has `webServer:undefined`, unique output, one worker, `/usr/bin/chromium`; no shared reports are overwritten. Dependencies are a symlink to the frozen installed node_modules; root owns clean final qualification.

From `/workspace/capiro-p1-files/apps/web`:

```
node ../../node_modules/vitest/vitest.mjs run tests/files.test.ts tests/files-boundary.test.ts tests/files-metadata-receipts.test.ts tests/files-metadata-actions.test.ts
node ../../node_modules/typescript/bin/tsc --noEmit --incremental false
node ../../node_modules/eslint/bin/eslint.js src/features/portfolio/files tests/files-metadata-actions.test.ts tests/files-metadata-receipts.test.ts tests/browser/files-metadata-receipts.spec.ts
```

From `/workspace/capiro-p1-files`:

```
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium FILES_REPORT=/tmp/capiro-p1-files/browser-verified.json node node_modules/@playwright/test/cli.js test -c /tmp/capiro-p1-files/playwright.config.ts files-metadata-receipts.spec.ts
node scripts/architecture.mjs
```

- Red before: `unit-red.log` records 4 assertion failures and 2 passing controls against original schemas; `browser-red.json/.log` records all 3 original behavior regressions failing. Red browser traces are archived in `browser-red-output/`.
- Unit final: 4 files / 21 tests pass (`unit-final.log`): semantic ACL mode/set mismatch, normalization/reordering/empty IDs, identity, folder mismatch/normalization/null, pending replay, explicit422 correction, stale actor/abort responses, stale readback, absent-file dispatch, and existing Files validation/boundary cases.
- Browser final: 11/11 pass (`browser-verified.json/.log`, 40.2s), including exact unchanged all-mode receipt after restricted[] PATCH; unchanged Reports receipt after Reviewed destination folder PATCH; 503 close/reopen fence; failed review; explicit valid review then new save; reordered restricted IDs; known422 rejection; held PATCH after actor/client/unmount changes; held GET after actor change; recovery after reopened GET503; and different-reader current ACL request.
- Expanded existing regression run: 27/28 passed. Only failure was a missing synthetic GET for replacement client in the new client-switch test; fixture corrected, control passes final run. Existing Files boundary/reader selection/folder-move and accidentally regex-selected Prospect Files controls passed. `browser-expanded.json/.log` and `browser-expanded-output/` preserve it.
- One intermediate recovery test incorrectly fast-forwarded all page clocks, which also triggered identity/list refresh and legitimately dismissed the old view. The test now explicitly switches and restores the synthetic actor to force a new scoped access read; final test passes. Its failed raw evidence is retained in `browser-final.json/.log` and `browser-pre-final-output/`.
- Full web typecheck exit0 (`typecheck-verified.log`, empty success); focused lint exit0 (`lint-verified.log`, empty success); focused Prettier exit0 (`format-verified.log`); `git diff --check` clean.
- Architecture exits1 only for root-owned review of changed `MoveFile` function at line7: 86 nonblank lines, fingerprint `17fffc40d9fe6d4fd5e096e44fdfb2137e6d1a18b5a23cbcf1b4cee578538b8c`; no import/cycle errors. `architecture-final.json` records the exact signal. This is not a passing architecture gate. The form remains a cohesive folder editor; all new mutation/recovery behavior delegates to the single-file metadata owner. Root must independently review and record it.
- Desktop error/recovery affordances visually inspected in `browser-output/files-metadata-receipts-co-f0a2e-ve-until-current-GET-review/conflicting-acl.png`; complete dialog, retained Specific people choice, disabled Save, uncertainty statement, and enabled Review action are visible without clipping.

Historical raw Playwright JSON/logs preserve the original output prefix `browser-output/`; archives were relocated without modification to `browser-red-output/`, `browser-expanded-output/`, and `browser-pre-final-output/` to keep final traces separate. The manifest uses actual current paths. Final `browser-verified.json` paths resolve directly to `browser-output/`.

Root independent review, shared architecture registry update, clean full install/build/qualification, and native live acceptance remain outside this bounded commit. No native/live success is claimed.
