# Frontend source receiving candidate for main

Date: 18 October 2026 UTC. This branch consolidates the Meri Figma 3.4 desktop source with the sealed first-chat source, Modules and Settings, Portfolio successors, and the held Settings memory review. It is a source review candidate; no preview rollout or deployment was changed.

## Source and ancestry

The receiving base is `main` at `02c02d95bdf3949662b9123f425271c6491ffdab`. The branch includes [PR #92](https://github.com/neo-capiro/capiro-frontend/pull/92) at `271a267d`, sealed chat source `67fdf56b`, Meri visual source `8894f279`, Settings memory [PR #93](https://github.com/neo-capiro/capiro-frontend/pull/93) at `b39ab841`, Modules and Settings [PR #94](https://github.com/neo-capiro/capiro-frontend/pull/94) at `e1de3f1d`, Portfolio [PR #95](https://github.com/neo-capiro/capiro-frontend/pull/95) successor `88088d9c`, Portfolio Core [PR #96](https://github.com/neo-capiro/capiro-frontend/pull/96) at `45528667`, and the combined visual source `58e3c035`. PR #93 merged into this receiving branch without a textual conflict. Its memory review flag is disabled by default. Its `/meri/memory` route and preceding memory source are absent, so activation remains blocked.

The [Meri frame-to-route and state checklist](./CODEX-MERI-DESKTOP-FIGMA34-AUDIT-20261018.md), [Modules and Settings checklist](./CODEX-SHARED-MODULES-SETTINGS-FIGMA34-20261018.md), [Portfolio checklist](./CODEX-SHARED-PORTFOLIO-FIGMA34-20261018.md), and [combined visual integration](./CODEX-MERI-FIGMA34-COMBINED-20261018.md) hold the desktop comparison evidence. They compare light 1440 × 1040 frames and interaction states; dark Home and responsive checks are separate. Fresh Figma PanelLeft asset downloads returned HTTP 403, so icon byte identity and complete pixel parity are not established. The selected-row intent and dedicated empty Runs state still need owner design decisions. The library audit identifies copied AI Elements/shadcn source, project-authored command palette and toast UI, and deferred Motion; it does not attribute those active widgets to upstream Command, Sonner, or Motion.

## Receiving fixes and architecture review

- The browser Task updates test now asserts the actual `X-Meri-Action-Session` header on all four same-origin proxy requests and the absence of a browser `Authorization` header. The production proxy still owns the server-side bearer and is unchanged.
- Closing global Quick Log resets the next URL invocation to the client/member destination chooser while retaining the mounted client log's verified Undo receipt. A focused browser assertion failed before this correction and passed afterward.
- A pure `catalog-projection.ts` now owns Core and Business Development linked-record deduplication, filtering, and capped-count decisions. `PortfolioIndex` retains the route's query, URL state, and rendering composition. Three focused tests cover mixed, linked, and capped catalogs.
- The architecture scanner's 37 changed size findings received individual source-specific reviews tied to exact fingerprints after the projection extraction. Calendar, client profile, Files, Settings, and Modules remained cohesive within their scoped owners; the Portfolio index projection warranted extraction. The final scan reports **zero dependency or boundary errors**, **zero blocking size findings**, and 529 size signals: 511 reviewed and 18 unchanged inherited findings still visible as unreviewed advisory signals. These are exact source reviews, not a blanket path waiver.

## Focused checks

- Settings memory review unit tests **3/3** and memory scene browser check **1/1** with the activation flag unset.
- Portfolio index/projection unit checks **11/11**; Quick Log chooser/reopen and Undo browser checks **2/2**; index filter/navigation browser check **1/1**.
- Task updates explicit-connection browser check **1/1** and proxy unit checks **24/24**.
- Architecture guard tests **28/28**; scanner exit 0 with the results above; web TypeScript, scoped ESLint, changed-file Prettier, and `git diff --check` passed.
- The receiving candidate's single root production build passed: Meri client TypeScript, optimized web compilation, web TypeScript, and **283/283** generated pages.

## Shipping boundary and remaining decisions

`main` has no checked-in GitHub Actions workflow; GitHub reported zero workflows and runs. The checked-in CodeBuild template consumes a versioned S3 archive and the shipping instructions require a separate archive upload, build, and reviewed ECS update. GitHub denied webhook-list access with HTTP 403, so an external webhook trigger is outside this audit's visibility. Pushing this branch and opening the review PR are source actions; no AWS, ECS, archive, or preview action was performed.

Core contract source candidates for Files usage, richer Quick Log fields, and Objective states still require backend receiving and authenticated runtime qualification as described in the [combined report](./CODEX-MERI-FIGMA34-COMBINED-20261018.md). Fixture-backed screenshots and this production build cannot establish those live service outcomes. The existing restricted chat preview rollout remains independent.
