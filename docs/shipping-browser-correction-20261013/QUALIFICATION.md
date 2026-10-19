# PR17 local qualification — 13 October 2026

The mail-caret and profile-readiness correction passed the complete local automated gate sequence on **`d4be41e60516e576c74afa304b50ed67da15cb93`**, root tree `401cadde371b91606e3346243aaca6b6225aafcb`, application tree `6ae2118b797f478f5a63788841a9777d67c8001e`. Every gate's before/after receipt records identical source and an empty product/configuration diff. This evidence-only publication does not create a new application candidate. Its parent correction starts at frozen source `1585438295776604f23a5cb5ab592729f7c468ca`; PR15 and the separate Newsletter/Meri/Onboard branches remain preserved.

| Gate | Final recorded result |
| --- | --- |
| Fresh `npm ci --ignore-scripts` | Pass;847 packages; ended01:45:49UTC |
| Combined `npm run check` | Pass;1479 tests:59 root,21 transport,1282 Portfolio,117 Capiro |
| Public packages / types / lint / format / architecture | Pass;lint0 errors/76 inherited warnings;427 size signals:403 reviewed,24 inherited unreviewed,0 blockers/0 boundary violations |
| Elements |15/15;receipt SHA256 `27ca20bcbbef65ae7b904eb5592327b0489ab012abb820c21e1b335e5c0b98bf` |
| Controlled original delayed-selection replay |3/3;frozen1585438 baseline3/3 failed with suffix-only text loss |
| Complete Portfolio rerun |1122/1122;0 skipped/unexpected/flaky;02:32:37–03:10:03UTC |
| Complete Modules browser suite |208/208;0 skipped/unexpected/flaky;03:10:29–03:14:54UTC |
| Production build |Pass;03:15:06–03:15:57UTC |
| Actual Next standalone server |Pass;11 HTTP/status/header checks,4 desktop/phone light/dark render/navigation checks,2 desktop cross-mode back/forward checks;0 page errors;03:16:40–03:16:46UTC |

Portfolio retains all1118 original semantic cases and adds four; the22 affected mail/profile cases include those additions. Three workers, zero retries and the default30-second budget were used; four existing slow cases retain90-second budgets. Modules uses one worker and30 seconds/zero retries. Existing cancellation, expiry, client replacement, interrupted-write, keyboard and viewport cases remain in the full inventories. The actual-server probe uses no credentials, fixture identity or service interception; it verifies truthful unconfigured behavior and same-document Meri/Portfolio/Modules/Settings navigation, not live authentication or backend effects.

## Preserved failed attempts

The first full Portfolio run is **failed**, with1121 passes and one failure at `portfolio-layout-integration.spec.ts:71`: ENOSPC writing the saved-order screenshot, followed by trace truncation. Assertions after that screenshot were unrun in that attempt. No source, assertion, timeout or retry changed before the complete rerun. The same case then passed in12,101ms, including its unchanged final one-write/no-unexpected-request assertions and a complete later mobile-dark screenshot. Both raw result sets and exit receipts are retained.

The first final controlled replay attempt is a separate **setup failure with zero tests executed**: the external harness could not resolve Playwright after the fresh install. Its successor changes only external dependency resolution/output destination and passes3/3. Earlier development failures and frozen-red evidence remain preserved in their original packets; they are not counted as final passes.

## Runtime, visuals and remaining gates

Local receipts observe Node24.19.0, npm11.9.0, Playwright1.61.1 and **launched Chromium154.0.8037.57**, with UTC browser/system time. The original AWS report observed Node24.19.0/npm11.7.0, locked Playwright1.61.1 and installed Chromium/headless-shell149.0.7827.55; it did not capture the actual launched browser version. Both official local149 download paths returned403. Local success is not AWS runtime equivalence. The accompanying separately reviewed qualification recipe explicitly sets `TZ=UTC`, normalizes browser overrides and records the actual launched browser version; that full recipe has been syntax/static reviewed, not executed as a separate gate here. Three synthetic controls of its extracted logging helper preserve success, command failure and log-write failure separately.

Bounded screenshots were reviewed for rich-mail desktop/mobile controls and profile focus/ownership order, plus the four actual-server setup renders. These support the observed layouts only. Live Figma context for file `Zc2dEN5aLU47dVdsewDmiJ`, node `411:40601`, returned “nothing selected” (debug UUID `144f79f2-d63a-4e1b-8b0a-bf8485248afc`); the subsequent screenshot request did not return and was terminated. Full Figma conformance and complete accessibility acceptance remain open.

All **337 native Portfolio rows remain unaccepted**. Native service/authentication/authorization, durable backend/provider effects, AWS image/test qualification and deployment acceptance are not established by these local fixtures. This session performed no AWS job, image build/push, deployment, main merge, resource/security/database change, real provider message or paid model workload. The designated shipping session owns separately authorized AWS execution.

## Delivery and reproduction

[Frozen source manifest](FROZEN-SOURCE-MANIFEST.json) and [Git tree inventory](FROZEN-GIT-TREE.txt) identify exact GitHub source for staging on NEOMART/the designated shipping runner. No new source or dependency archive was created for delivery. Existing generated archives were only relocated with exact hash verification and preserved aliases to make room for local gates.

Run the [reviewed UTC qualification recipe](qualify-frozen-source.sh) from a clean checkout of exact `d4be41e`, passing a new absolute `CAPIRO_QUALIFICATION_RESULTS` directory outside that checkout whose parent already exists. Copy the recipe from this evidence publication outside the frozen checkout before running it. It stops on failure and does not execute image publication or AWS commands. Keep default Playwright browser selection for a shipping comparison, or explicitly record a shared executable override.

[Published gate receipts](qualification/GATE-MANIFEST.json) bind the raw logs/results and source records. Independent review receipts distinguish source/static inspection from producer-executed gates. DOC-01's two exact evidence files now resolve beside the original profile review. Preserve this report's failed and unrun outcomes when creating the next shipping checkpoint.
