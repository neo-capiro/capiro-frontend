# Portfolio Core contract receiving

This branch is a stacked successor to Portfolio [PR #95](https://github.com/neo-capiro/capiro-frontend/pull/95) at `88088d9c`. It consumes pushed Core **source candidates**, pending receiving and runtime qualification:

- [Core PR #86 command base](https://github.com/neo-capiro/capiro-backend/pull/86) at `b40971b1` provides the generic activity-command create/read/resume routes. PR #95's earlier statement that the route was absent inspected a stale Core checkout.
- [Registered storage usage contract](https://github.com/neo-capiro/capiro-backend/blob/948d4a7c8d500864c27f1aeb233a80903637591c/docs/integration/CLIENT-REGISTERED-STORAGE-USAGE-20261018.md) at `948d4a7c` and [Quick Log field contract](https://github.com/neo-capiro/capiro-backend/blob/31313d4366bc5f7b1e65eac9b62ced352909a089/docs/integration/PORTFOLIO-QUICKLOG-CONTRACT-20261018.md) at `31313d43` are separate successors to that base. Neither candidate is assumed deployed.

## Ownership and boundaries

Portfolio Files reads `GET /api/clients/:clientId/files/storage-usage` separately from the viewer-filtered attachment list. The Core response reports registered client attachment bytes under the existing 10 GiB per-client allowance. It is **report only**; uploads remain available. An available snapshot may show an overage. Unknown size metadata or unsafe totals produce an unavailable snapshot, never a fabricated zero. A failed read or access denial also leaves usage unavailable without hiding otherwise authorized file-list results. The response excludes file identities and does not measure physical S3 billing.

Quick Log's direct activity and durable command accept an optional obligation direction, a user-entered counterparty label, and a paired Objective ID/version. Core checks the Objective's current same-client version at creation and stores a historical revision. The link does not grant navigation authority, trigger Meri, or prove readiness. Commitment, explicit occurrence time, and commitment/request due time are admitted by the Core command base. The command receipt remains version 1 without rich detail fields; canonical recorded activity reads carry them.

A follow-up command commits the Core activity and follow-up intent locally, then requests a generic Planner task as a recoverable saga. It does **not** provide one transaction across Core and Planner. Custom Planner task title and strategy-step links remain without a saving contract. Keep the existing scoped recovery and Undo checks; optional new fields must remain omitted from unchanged legacy command bodies.

Neo approved a stable client Meetings header and actions across Agenda, Month, Week, Prep, and Debrief, plus the populated Objective intake shell for both blank and filled forms. The separate Meeting Library archive retains its own heading. The approved Objective shell was already present, so the successor adds desktop anchor evidence without changing its production form. [The native Figma frame and route audit](figma/decision-and-wiring.md) records those decisions and the normal/over-allowance Files and two Quick Log frames. Figma still needs an explicit usage-unavailable/partial state and richer command failure/recovery states. Browser screenshots in this branch are fixture-backed and do not establish live Core, Planner, routing, or deployment behavior.

## Figma states still needed

- Files storage when the registered total is unavailable, partially known, denied, or the usage route fails while the file list remains available. The current UI shows an honest unavailable state; Neo has not supplied its exact visual frame.
- Quick Log when a saved command is pending, needs recovery, or has a canonical activity that cannot be verified, and when a linked Objective has changed or become unavailable. The current UI preserves the request for recovery and avoids claiming an unverified save.
- Objective intake Meri question, cycle preview, suggested program line, and attachment chooser when authorized sources are loading, unavailable, or under review. The approved shell alone does not authorize preview facts or actions.

## Integration order

The combined UI owner branch `codex/meri-figma34-combined-20261018` at `42dd6fb7` already contains PR #95. Its additional Portfolio feature edit is `index/queries.ts`; Files and Quick Log paths are separate. This successor targets the PR #95 branch, leaving its shared shell, roster, and held Prospects sidebar destination to the combined UI owner.

Core receiving must include **both** storage and Quick Log successor changes. The restricted first-chat preview listener does not expose the new storage GET. Frontend-to-Core routing, current authenticated authority, the downstream Planner command owner, production schema behavior, and deployment remain separate qualification steps. No live change is part of this branch.

## Verification

The 1440 × 1040 light desktop captures are [Files usage](playwright/files-usage/README.md) (available, over allowance, unavailable), [Quick Log](playwright/quick-log-contract/README.md) (direct, compound top/bottom, result), [Meetings header](playwright/calendar-header/README.md) (Agenda, Month, Week, Prep, Debrief, Library), and [Objective intake](playwright/objectives/README.md) (blank and filled). Synthetic responses live only in browser tests.

Focused Playwright checks passed: Files **4/4**, Quick Log **6/6**, Meetings **1/1**, and Objective intake **2/2**. Scoped Vitest passed **50/50** across activity commands, direct activity/Undo, and Files usage contracts. The web TypeScript check, scoped ESLint, changed-file Prettier, `git diff --check`, and the optimized `@capiro/web` build passed. The repository architecture scan has **zero boundary errors**; it reports **530 size review signals**. The expanded Quick Log detail hook is one client-scoped form/query responsibility, with no service or permission authority in the view.
