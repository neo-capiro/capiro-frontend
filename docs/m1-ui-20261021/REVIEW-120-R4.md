# PR120 production navigation correction

Review source: [Fable6340184132](https://github.com/neo-capiro/capiro-frontend/pull/120#issuecomment-6340184132). Parent: `67abeef08ec22964daab07a6dce84e6293d4d7b0`, tree `836e68e197672c80fd0abf471de037a9fab2d22b`. Stack base PR119 remains `5c86f9b3e6b138fe1b572b071d66766591f6dd7e`. Current M1 correction only; no feature activation, environment changes or release authority.

## Cause and correction

The capability snapshot conflated service activation with access to existing pages. Prior PR119 tree `0cf0f3e3da7310854a3166d8341defec48070054` always exposed Conversations, Files and Preferences through `SidebarDestinations.tsx`, and Files, Actions and Task updates through `MeriHome.tsx`. These destinations already explain a missing connection; their operation controls separately require configuration and current authority.

The production smoke is deliberately unconfigured: `apps/web/tests/production/run-standalone.mjs:59–80` clears auth, service URLs and workflow flags. `verify-documents.mjs:4–24` requires all document operations to return 503 FRONTEND_DOCUMENT_UNAVAILABLE. Its navigation check at lines36–97 expects Files and Conversations to remain reachable, displaying “Connection setup required”, with no Connect document service control. The failed click is therefore evidence of removed navigation, not proof that native document operations were enabled on the serving preview.

`capabilities.ts` now records `navigation` separately from the existing native `status`. Exactly the five previously exposed destinations keep navigation on without configuration. The canonical href helper and `CapabilityRouteGuard` consume navigation; all operation controls, canonical config readers, server activation logic, preview containment and API authorization keep their existing gates. New-conversation, intent and memory opt-ins remain required. Unimplemented workspace resources remain unavailable. No new environment variable is needed.

## Complete source-derived preview matrix

`C` is the unchanged qualified conversation-serving result; `B` is the unchanged qualified bootstrap result. Both default off and require existing qualified bindings. No deployed environment was read. In the exact production smoke profile, C and B are both off. The checked-in preview configuration explicitly labels itself a configuration proposal, so it is not a live environment receipt.

| Capability            | Native activation before → after | Navigation before → after |
| --------------------- | -------------------------------- | ------------------------- |
| conversations         | C → C                            | C → on                    |
| newConversation       | B → B                            | B → B                     |
| files                 | off → off                        | off → on                  |
| actions               | off → off                        | off → on                  |
| taskUpdates           | off → off                        | off → on                  |
| conversationApprovals | off → off                        | off → off                 |
| memory                | off → off                        | off → off                 |
| preferences           | off → off                        | off → on                  |
| runs                  | unavailable → unavailable        | off → off                 |
| approvals             | unavailable → unavailable        | off → off                 |
| routines              | unavailable → unavailable        | off → off                 |
| dataAccess            | unavailable → unavailable        | off → off                 |

Configuration evidence at the parent: `apps/web/deployment/portfolio/preview-config.mjs:60–110,125–130,175–211` and `service.yml:518–523`. Document/action flags remain false; document operation remains empty; task, intent and preference flags are absent. Memory requires the existing qualified source. For a fully configured non-preview environment, all eight existing native capability results are unchanged across all 256 workflow-flag combinations. This source matrix does not claim current live flag readback or enable a native feature.

## Evidence and limits

- Capability resolver, actual native API handlers and actual Meri layout/shell/Files page composition: **12/12 PASS**. All 256 operation flag combinations retain their prerequisites. Existing auth, HTTP refusal and no-fetch assertions remain; only the explicitly restored navigation expectations change.
- Related unavailable-resource and preview containment/activation suites: **97/97 PASS** across six files. Combined focused result: **109 tests / 9 files**, zero failures or skips.
- New unconfigured Files regression case fails against the exact parent product files, then passes with the correction. It asserts enabled Files/Conversations buttons, Preferences navigation, the canonical setup surface and absence of native connection controls. This is a source composition check, not an executed browser click or mobile-layout receipt.
- Changed-path ESLint, Prettier and whitespace PASS. Architecture command exits0 with no errors; existing review signals remain. Independent read-only review found no blocking scope or behavioral issue.
- Full TypeScript receipt is recorded in the PR body after completion.
- Fable reports pinned browser modules **11/11 PASS** at the parent67abeef08 (CodeBuild b82f59b5), plus groups3 and38. Those receipts establish the preceding retry correction, not this new tree's qualification. The exact-target explicit retry and no-auto-resend files are unchanged.

Only two product files change: `shared/meri-resources/capabilities.ts` and `CapabilityRouteGuard.tsx`. Three existing unit files and this receipt also change. No shared-shell file, ApplicationBoundary, API, server config, feature default, dependency, production smoke, browser specification, timeout, skip or retry changes.

Production smoke, pinned browser modules and image/build requalification on the new exact head remain **Fable-run**. The prior Chromium singleton-socket EPERM and failed scoped escalation remain restrictions; no browser-launch retry or bypass was attempted. Historical full-suite/type/native receipts are not promoted to current-head qualification. Existing design/alignment, native/live, Core and release holds remain. No ship request, merge, deployment, SQL or AWS action.
