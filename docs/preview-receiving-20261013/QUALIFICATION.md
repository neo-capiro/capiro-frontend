# Receiving qualification and image-build inputs

Qualified source: **`5ca42049325881782bc9d2ac557450d642eccee8`**. Application tree: `dbd6aebbae52b5ded5611b21c3ff057b881cf92f`. Runtime source tree: `c48305d3d8fa8153fa1c1390950aa24e5281326b`. Later publication commits contain documentation/evidence only. The branch is stacked on frontend PR23 at `6780c114a1d216fa857182a62f9b3610b9d76121`; that branch and its evidence packet remain unchanged.

The exact backend source remains **`111f269d749cae0249c2141779bd6d7deb93f45c`**, tree `719c8292fc0c9cf4e8242b8d58efb2d004ad0a1f`, [backend draft PR2](https://github.com/neo-capiro/capiro-backend/pull/2). Its head and frontend PR23's head were refreshed during qualification. This receiver does not include backend PR1 or any copied backend implementation.

The source is prepared for review. **Native activation is held.** No service target has been configured, and ordinary production API routes remain denied in preview mode. Existing deployment templates, Clerk configuration, database state and all feature work are preserved. No main merge, deployment, resource/credential creation, provider message or paid model workload occurred.

## Checks on one clean source

Every final check recorded clean Git status and source `5ca42049325881782bc9d2ac557450d642eccee8` before and after execution. Raw commands, outputs and durations are in the evidence archive.

| Gate                            | Result                                                                      |
| ------------------------------- | --------------------------------------------------------------------------- |
| All workspace types             | Passed                                                                      |
| Full web unit suite             | 154 files, 2,243 tests passed                                               |
| Full Capiro/feature unit suite  | 35 files, 442 tests passed                                                  |
| Root structural/control tests   | 111 passed                                                                  |
| Public-package checks           | Passed; package/lock/vendor pins unchanged                                  |
| Transport suite                 | 84 passed                                                                   |
| Full web lint                   | Passed, 0 errors; 82 warnings in unchanged files                            |
| Full web formatting             | Passed                                                                      |
| Architecture                    | 0 blockers; 488 signals, 466 reviewed, 22 inherited findings remain visible |
| Production build                | Passed in 68.03 seconds                                                     |
| Isolated actual standalone HTTP | 90 observations; 0 upstream requests; 0 external-network attempts           |
| Actual standalone browser       | 30 observations; 0 page errors; Chromium 154.0.8037.57                      |

The web total includes all 78 new receiver regressions and the 36 original containment tests. Positive tests use synthetic responses and mocked native token acquisition for exactly me/list/detail, including existing Capiro aliases. Negative tests cover missing/wrong source and target, ordinary-production fallback, route/method/query/header forgery, UUID restrictions, every other registered operation, missing identity, redirects/errors, bounded JSON, deadline and interrupted token/fetch/body receipt. The final assertions and fixtures produce **23 failures / 55 passes** against preserved PR23; only source import paths are remapped to that worktree. The original 21-failure baseline and the later exact-assertion baseline are both retained.

The first implementation test attempt had 10 failures caused by a null token mock leaking into later tests. Resetting that mock fixed the test isolation; no production admission rule was weakened. Full formatting found one changed structural test file; its formatting was corrected in the final source. All failed and successful attempts are preserved.

The standalone build has no escaping dependency symlinks and no ancestor dependency fallback. Build-only resolution links were removed, and generated out-of-package dependencies were preserved outside the runtime lookup path. HTTP probes exercise the default hold, malformed mode, wrong/missing target/source, known production-host denial, admitted candidate without native identity, unallocated operations, methods, headers, encoded routes and interrupted writes. An external-network fence was installed in the HTTP server process; no attempt hit it. Native positive dispatch was not attempted. The credential-free browser checks cover Portfolio/Meri/Modules/Settings navigation, back/forward, desktop/mobile light/dark rendering, assets and style restoration. They do not establish signed-in or native acceptance.

## Evidence and exact build inputs

- [`evidence.tar.gz`](evidence.tar.gz): 109 files / 5,087,435 uncompressed bytes; 1,840,529 compressed bytes; SHA256 `d5520e46a7c4a22035198a51ef58e1653640a0817dd57934aaa9dfe139d9d80d`.
- [`MANIFEST.json`](MANIFEST.json): every archived file hash and complete archive/original readback. Manifest SHA256 `abdee11b611067db27578cc028386209eeb711e9d525bdc8b8a5e5e5ac15c289`.
- [`build-inputs/BUILD-INPUTS.json`](build-inputs/BUILD-INPUTS.json): exact immutable image context receipt; [`member manifest`](build-inputs/BUILD-INPUT-MANIFEST.json) binds every file to its Git blob, byte hash and executable mode.
- [`preview-receiving-build-inputs-5ca420493258.tar.gz`](build-inputs/preview-receiving-build-inputs-5ca420493258.tar.gz): 2,566 files / 16,453,776 uncompressed bytes; 6,011,816 compressed bytes; SHA256 `a94c27e22552602cb79743c1905c7bb21903c811217456165a19d7107a6a5dae`.
- Build-input manifest SHA256: `95939674380c457ce05e9e960ebfc7351f4fc3efc14db83c8379fb054f82078d`.

Build context is the archive root, Dockerfile `apps/web/Dockerfile`, platform `linux/amd64`. The unchanged Dockerfile pins `node:24.21.0-alpine3.23@sha256:9ec4a2e289874ed0d722e1772ec2de45d2801541db8612f3638b26f128c69ac2` and zlib `1.3.2-r1`. Dockerfile SHA256 is `03225dcc94257dfd919f3b889f0886d4981156890897fee579e50d644959cbe1`; lockfile SHA256 is `6dc039be028c302b58965532b05d3dd5aa0ca1ed8bb6a90be716eb6325d24d13`. Only root docs are omitted from the source archive, matching the pinned Docker ignore rule; Docker must still apply the complete `.dockerignore`. No application image has been built or pushed.

## Remaining gates

- Fresh install: unrun. The unchanged installed graph was hardlinked into this worktree. At setup it occupied about 987 MiB against only about 572 MiB free on `/workspace` and 104 MiB on `/tmp`; other owners' work and earlier artifacts were preserved. A fresh image/clean-install gate remains necessary.
- Native backend: PostgreSQL/RLS, role grants/read-only enforcement, actual isolated-service identity, existing production Clerk/tenant bindings, and real session revocation remain unqualified. Source pin configuration alone cannot establish them.
- Image build, scan, runtime permissions/nonroot startup and native service integration: unrun. The shipping session owns any later image activation after qualification.
- Signed-in cross-mode sign-out/expiry, tenant/client replacement and interrupted writes: existing meaningful tests survive and source tests pass; new native acceptance is unrun.
- New Figma comparison and complete WCAG/native browser acceptance: unrun. There are no visual/feature changes in this receiver. **All 337 Portfolio native rows remain unaccepted.**

The next step is review of this draft and qualification of the separate backend runtime and image inputs. The [native session claim note](AUTH-CONTRACT-NOTE.md) records the required `sid` check against the unchanged existing token request; those production claims remain unverified. Only the designated shipping session may bind a qualified dedicated service and consider preview activation. There is no staging environment assumed and no new Clerk application prerequisite.
