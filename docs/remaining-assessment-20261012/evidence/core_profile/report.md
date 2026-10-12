# Portfolio profile acceptance review

Read-only review of all **59 assigned criteria** on application source `4a1614886fd98bb42d529f1ef59b3d01d7ff9173`, application tree `46cebca97ccfc1facc1c1a939beb6f4d7730685b`, from assessment head `3562618f73d7a1f9d620d7b7b28c9e8c2c1ac83d`. No application files changed. All writes are in this assessment directory. Native services, providers, AWS and paid models were not invoked.

The result is **six confirmed bounded findings**, including a recommended P1 release blocker in file access confirmation. **No full row is accepted**: source/fixture verification cannot establish signed-in authorization, current native completeness, concurrency or durability.

| ID | Priority | Finding | Rows |
| --- | --- | --- | --- |
| CP-01 | P1 | Access editor closes after requesting `restricted` but receiving the same file with `viewerMode: all`. No warning or requested-ACL check. | CORE-058 |
| CP-02 | P2 | Move/new-folder closes after the response and refreshed list still name the old folder. | CORE-056,063 |
| CP-03 | P2 | A dispatched DELETE followed by 503 immediately permits another destructive confirmation/DELETE. | CORE-060 |
| CP-04 | P2 | Facilities plus opens a standalone generic editor, not the specified manager with saved-location cards and inline editing. | CORE-033–035,037–039 |
| CP-05 | P2 | Timeline retains a generic grey-dot feed with a 420px scroll cap; designed date groups, type icons, compact feed rows and expanded timeline entry are absent. | CORE-048,103–105,107,110 |
| CP-06 | P2 | Files toolbar/results composition differs; source/sort selects replace the chip row, folder-card alternative and containing results header are absent. | CORE-052,053,062 |

Full reproduction commands, exact fixture inputs/returned receipts, source file/line, expected/actual behavior, evidence and deployment impact are in [findings.json](findings.json). All 59 IDs have individual reasons, source evidence, Figma targets and unresolved acceptance in [row-assessment.json](row-assessment.json).

## Fresh verification

Six external Playwright controls ran against root-managed `http://127.0.0.1:5191`, using the repository fixtures and one Chromium worker. **6/6 passed**: three are capture controls and three deliberately assert the reproduced defects. This count is not six feature-acceptance passes. [browser-results.json](browser-results.json), [assessment.spec.ts](assessment.spec.ts), and per-test traces under [browser-output](browser-output) retain the evidence.

```sh
cd /workspace/capiro-acceptance-assessment
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node node_modules/@playwright/test/cli.js test --config=/tmp/capiro-remaining-assessment-20261012/core_profile/playwright.config.ts
```

The external config has `webServer: undefined`, unique outputs, and `workers: 1`. No shared server, build, full suite or report was started/overwritten. The already completed seven repairs were not repeated. Author qualification totals of 934 Portfolio and 121 Modules passes are inherited from the closeout record; this reviewer did not rerun or independently recount those full gates. Root later reported independent 3/3 reproduction of CP-01–03 on the frozen source; that relay is additional evidence, separate from this review's six controls.

The exact CP-01 fixture sends `PATCH /api/backend/core/clients/10000000-0000-4000-8000-000000000001/files/60000000-0000-4000-8000-000000000001/access` with `{viewerMode:"restricted",viewerUserIds:[]}`. The response is the original exported `file` from `tests/browser/fixtures.ts`, retaining `viewerMode:"all"`; subsequent reads retain it too. `fileChangeForIdSchema` checks only the ID, and `onSuccess` closes after invalidation without matching values. This demonstrates false confidentiality-change completion, **not** a backend authorization bypass or proved cross-tenant disclosure.

CP-02 uses the same fixture in `Reports`, submits `{folder:"Reviewed destination"}`, and returns/reads `Reports`; the edit still closes. CP-03 demonstrates two dispatched DELETEs after a 503. Backend delete idempotency and duplicate side effects were not tested; its impact is explicitly narrower than CP-01.

## Figma evidence and limits

All **26 distinct assigned frames** were retrieved from the actual `Zc2dEN5aLU47dVdsewDmiJ` file with raw context and screenshots; visible sublayers were fetched when the parent response was sparse. Additional child contexts include facilities manager `411:58269`, enrichment drawer `411:48691`, timeline `411:48826`, expanded timeline `411:60524`, and removal/log dialogs. Every row links its saved `figma-<node>.json` and PNG.

The Figma asset URL fetch from the shell returned proxy `403`; base64 screenshot responses were then used as supported fallback. Some offscreen child screenshots (notably `411:48826` and `411:49157`) are ancestor-clipped. Their full returned design context is retained, and the unobscured expanded-timeline screenshot `411:60524` supports the feed comparison. Exact comparison of all expanded email/error states remains unassessed. No design was modified.

Fresh captures are [overview](rendered-overview.png), [facilities add](rendered-facility-add.png), [timeline](rendered-timeline.png), [Files](rendered-files.png), [upload](rendered-upload.png), and [enrichment](rendered-enrichment.png). The geographic map behind the first overview/facilities captures is intentionally not supplied a boundary fixture, so its loading/error state is **not a product defect**. CP-04 concerns the manager form only. Fixture names, counts, synthesized examples and unavailable analytics are not judged as differences requiring invented production data.

The retained source/design review does not constitute complete desktop/mobile/dark/accessibility acceptance for all 59 rows. Rows without a fresh rendered state say so. Existing browser sources are linked for bounded intent and prior author evidence, not relabeled as newly executed tests.

## Owner and native dependencies

- CORE-065/069: new research/task retry correctly remain disabled pending preview-only backend lifecycle and worker/recovery qualification.
- CORE-108: timeline Reply/Reply all review recipients but intentionally block sending; native reply metadata and durable outcome integration remain open.
- CORE-112–115: source definitions for program finance, touches/health/reply state, deadline stress and request audience aggregation remain missing. Figma samples are not authoritative data. These are owner dependencies, not permission to invent metrics.
- CORE-116/119/120: authoritative quota, selected-file Meri handoff and atomic batch move remain unavailable. The current UI discloses or disables these states.
- CORE-052/053/063: attachments/folder labels exist, but complete smart-artifact union, nested/empty folders and multiple-file semantics are not accepted.
- CORE-106: the current feed requests 500, superseding historical 200 wording; it has no unbounded older-history paging contract.
- CORE-109: meeting/file links and synced-email expansion exist; outreach source navigation still needs an owner mapping.
- CORE-049: owner-excluded commitment/We-owe/They-owe creation is not reopened as a feature request. Generic follow-up and Calendar handoff remain bounded implemented paths.
- CORE-128: `CapabilitiesPage.tsx:100` now mounts PastPerformance, superseding the stale historical “test harness only” blocker. Native versionless DELETE causality/concurrency and durable removal are still open.

59 rows are individually classified: 26 implemented with bounded/native limits; 13 implemented with confirmed visual gaps and native limits; four partial with owner dependencies; two confirmed defect plus owner dependency; two confirmed source/browser defect; two partial with native dependency; ten legitimately unavailable owner dependencies. The 13 implemented rows linked to CP-04–06 explicitly retain their visual gaps in the classification, alongside finding IDs and the scoped-mismatch visual assessment. Every full row remains `OPEN_FINAL_ACCEPTANCE`.

## Preservation

Read repository and web AGENTS instructions, implementation standards, architecture and seven-repair closeout. Followed explicit user authorization for direct read-only acceptance review; spawned no children. Final `git status --porcelain` remained only the pre-existing untracked `node_modules` link. All changes are the standalone review artifacts here; no source edits, commits or pushes occurred.
