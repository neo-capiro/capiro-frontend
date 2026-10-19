# Meri Home Figma refresh — 11 October 2026

## Implementation outline

Bounded Home presentation amendment from frontend main `02c02d95bdf3949662b9123f425271c6491ffdab`, on `task/meri-ui-figma-20261011`. Canonical owners remain the Meri Home/suggestion presentation, native CSS module, shared Sidebar and existing public `@capiro/ui/button` primitive. No new UI framework, route, package, contract or backend owner is introduced.

Fresh Figma context and screenshot at Home `442:81437`, suggestion group `442:81627` and wordmark instance `777:149110` establish three differences: the 62×20 Meri wordmark in the upper-right scope row; Routines as the sidebar label; and the Start action beside the sparkle at the top of each suggestion card. These components already exist in Figma, so no duplicate design creation is required. The wordmark uses the exact downloaded image as a foreground-colored mask, matching the high-fidelity design response.

The original nineteen local asset records and historical visual references remain intact. New reference provenance is appended separately. Draft selection remains local and editable; Send, workflow execution, disconnected source controls and Portfolio/Modules modes remain unavailable. No recovery-complete UI or private qualification data is introduced.

Verification planned: locked dependency install without lifecycle scripts, existing type/test/architecture/build gates, actual owned-app browser checks of geometry, six literal draft suggestions/reset, disabled controls, local asset loading, keyboard behavior and narrow-screen bounds. Screenshots are compared with the fresh Figma reference; historical snapshots are not regenerated.

## Frozen implementation and intentional visual changes

Implementation commit `0ba1feb68d847be9b140463badca214b4e52e8bb`, tree `777e9ac7b5b9656f34191ca73187e70dc18e37d5`, changes nine source paths. The parent reviewed and allocated the related icon, lower-row and plus-color corrections after the initial three differences were verified. Final scope contains six concrete corrections:

1. Place the exact Meri wordmark in the upper-right scope row, rendered as a 62×20 foreground mask.
2. Use the Figma sidebar label Routines.
3. Place each suggestion Start control beside the sparkle in a 28px-high top row.
4. Use the exact circular-arrow Routines SVG rather than the former calendar icon.
5. Center the lower suggestion links in the current 625px Figma wrapper, preserving existing defensive narrow-screen wrapping.
6. Recolor only the New conversation plus to white through CSS, retaining the exact original `plus.svg` bytes and intrinsic dimensions.

No new component was needed in Figma: every adopted component and final correction already existed in the inspected design. Figma calls were read-only. No new page, speculative subsystem or replacement UI primitive was introduced. Existing sample identity, scope hints, disabled destinations and local draft semantics remain unchanged. Portfolio and Modules content, trusted session navigation, recovery success and connected workflows are outside this amendment.

## Exact assets and reference

The Meri wordmark is the original Figma image at `I777:149110;773:149100`, imageHash `a2c4b2bbfff406a5145b9e7a8e2ed2ac13dcace9`. Its local file is 23,234 bytes, 1024×340 RGBA, SHA256 `1b9fc833853d4d9169e14d0a1746f491b1d9a574816ddef3156c83a24809fe49`. The design response specifies its 62×20 alpha-mask slot; the browser verifies the final slot at x1350/y101 on the 1440px desktop target.

The Routines SVG is the exact native SVG export of `I442:81539;12:383`, 525 bytes, with unchanged 16×16 root dimensions and viewBox. SHA256 `96f455607f2078282d76db28fa17dabc3c7028bf2efb159f26b18760791914e1`. No vector paths were reconstructed or inspected as implementation input. The generated SVG is used through the existing `DesignIcon` owner.

Both instructed direct URL downloads returned a 195-byte HTML “Site Unavailable” response. Those failed bodies remain outside source in `.task-inputs/figma-refresh-20261011/failed-context-url.html` and `raw-wordmark.png`. The parent explicitly admitted the supported read-only native Figma fallback: `image.getBytesAsync()` for the original wordmark and `exportAsync({format:'SVG'})` for the exact existing icon. The first SVG `figma.io.write` did not return an artifact, so the exact exported byte array was acquired in a second read; no canvas mutation occurred.

`apps/web/design/home-assets.json` appends `homeReference20261011` while preserving every prior manifest property and all nineteen original asset records. There are twenty-one local asset files. Historical calendar slots remain recorded as two; the new current disposition records one header calendar slot and one replacement sidebar Routines slot. The original nineteen file, hash, MIME and intrinsic-dimension assertions remain; the directory assertion now includes the two new provenanced files, with separate wordmark and Routines assertions. Current browser checks verify the active slot counts explicitly.

Reference evidence is `.task-inputs/figma-refresh-20261011/figma-home-442-81437.png`, a native 1440×1040 Figma render whose size/hash are recorded in the new manifest section, plus `suggestions-context.txt`. Figma contexts and screenshots are separate live reads without an immutable revision identifier. Screenshots are verification evidence, never implementation assets.

## Checks actually completed

All final source checks preceded the frozen implementation commit. No source changed afterward.

- `npm ci --ignore-scripts`: passed, 793 locked packages installed; root/package lock files remain unchanged.
- `npm run check`: passed the public-package checks, workspace TypeScript, seventeen root tests, architecture guards and twenty-one qualification-transport tests. Raw output: `check-final.log`.
- Clean `npm run build`: passed with complete prerender output for `/`, `/_not-found` and `/meri`. Raw output: `build-clean.log`.
- Actual owned-app Playwright run against that clean production build: six groups passed. It verifies twenty-one local exact assets and current SVG slots, wordmark geometry/mask, top-row/Routines/lower-row/white-plus presentation, all six literal local draft selections, reset/focus/keyboard behavior, disabled product/send/workflow controls, synthetic disclosure, 320/375/768px document/control bounds, and no observed external requests or page errors. Raw output: `browser-check-clean.log`; structured results: `browser-results.json`.
- `git diff --check`: passed. A separate semantic comparison confirmed every historical manifest property and nineteen original asset records unchanged.

The final browser run used Playwright 1.61.1 from the locked frontend installation and local preview Chromium 153.0.8010.0, acquired as temporary `@sparticuz/chromium@153.0.0`. The normal Playwright Chromium 149 download returned invalid/truncated ZIP responses; that failure is retained in `browser-install.log`. The temporary preview package is not a repository dependency or production browser choice. Tarball SHA256 `20e5656fcdcf4118ede85edfb9d6bb9cc1bbb7ffb8b75622fffbcf36a835c3c0`; unpacked Chromium SHA256 `53a15d6c3a3d27dfb54c4ba60278b1683136f70cf1e67e989da7dfbd3d451ef0`. This synthetic local UI preview uses `--no-sandbox` and establishes no browser sandbox qualification. It does not replace or qualify the separate G1 SDK/browser versions.

The author viewed the final desktop capture and narrow capture beside the fresh Figma reference. Desktop wordmark, Routines label/icon, top Start row, centered lower links and white plus match the allocated reference. Responsive layouts remain defensive adaptations; no mobile Figma parity or pixel-equality claim is made. Final screenshots are `home-desktop.png`, `home-320.png`, `home-375.png` and `home-768.png` in the same evidence directory.

## Preserved failures and cleanup

An early test run before the blocked asset was acquired failed two asset cases because the new provenance section was not yet present; `tests-first.log` retains 14/16 results. No assertions were weakened. Harness-only attempts also retain their failures: a relative Playwright import error, a separate-session listener connection refusal, and an incorrect Next executable path. Those were corrected in the temporary verification adapter, not production code.

An incremental build exited zero but its retained log stopped at page collection. The subsequent browser assertions caught stale/mixed generated output: the old calendar sidebar and 469px lower wrapper remained. That failed acceptance is preserved in `browser-results-stale-build.json`, `browser-check-stale-build.log` and `home-desktop-stale-build.png`, alongside `build-final.log` and the prior generated tree in `build-prior-artifacts`. The owner moved only its generated `.next` tree aside and performed a clean production build; final acceptance uses the complete clean output and fresh screenshots. Historical visual baselines were not regenerated.

The final same-process owner adapter spawned the exact Next and Chromium processes, then closed its context, connection and browser server. Its recorded app PID18 exited143 after SIGTERM; port53391 successfully rebound after shutdown. Browser PID38 exited0; the context and client connection are closed. The stale-build attempt likewise recorded app PID19 exit143 with successful port rebind and browser PID39 exit0. The earlier separate preview session was stopped with Ctrl-C and exited130. Routing interception and these owned-process observations do not establish an OS network sandbox, complete process-tree containment or host cleanup.

No model/provider call, AWS operation, deployment, remote branch/merge, Figma write or current Capiro implementation change occurred. Full Meri UI screens and authenticated transport/runtime integration remain later work. This report advances only the bounded Home source candidate; independent acceptance belongs to the parent reviewer and G1 remains open.
