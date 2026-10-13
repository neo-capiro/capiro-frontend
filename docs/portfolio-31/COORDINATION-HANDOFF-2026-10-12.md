# Portfolio integration coordination snapshot — 12 October 2026 UTC

**Follow-up correction after this snapshot:** active Meri consolidation is
frontend draft PR #4, freshly checked at
`e141d68f8954ba6c76327bcbed94739d28e0a902`, preserving PR #1 as history. Do not
integrate PR #1 separately. The user's follow-up prohibits new credential/AWS
actions while preparing [the proposed common contract](../SHARED-INTEGRATION-CONTRACT-2026-10-12.md),
and preserves existing merge/deployment holds. Historical observations below
remain a record of what was supplied before that correction.

This records the status supplied in response to the user's coordination request
at approximately 00:35 UTC (20:35 on 11 October in America/New_York). That request
explicitly adds no merge, deployment, discard or overwrite authorization. The
existing Portfolio work and release holds continue. This is an immutable source
checkpoint description; later continuation commits must identify their own
qualification and publication state.

## Source and publication

| Item | Snapshot |
| --- | --- |
| Repository | `neo-capiro/capiro-frontend` |
| Integration worktree | `/workspace/scratch/158b6018a5d3/capiro-frontend-portfolio` |
| Branch | `codex/portfolio-continuation-20261011` |
| HEAD | `85aa5c0a816f52e23a0def34e91353ba41eda163` |
| Base | `02c02d95bdf3949662b9123f425271c6491ffdab` |
| Latest product commit | `75409a96d6c58a53c7d44eb6053cc291995caf80` |
| Publication | 29 commits after base, all local/unpublished; no continuation PR |
| Integration worktree | Clean at the snapshot; ignored raw evidence stored separately |

Three isolated unfinished Portfolio lanes are based on product75409a96:
`codex/portfolio-watchlist-current-state-20261011`,
`codex/portfolio-alert-channels-20261012` and
`codex/portfolio-file-arrival-20261012`. Their uncommitted work is excluded from
the snapshot bundle. Do not copy a moving worktree as a qualified slice; use each
final frozen manifest and root integration record.

The Git bundle `portfolio-continuation-85aa5c0.bundle` was verified locally. It
contains the continuation branch at the exact HEAD above, requires the recorded
base, and has SHA-256
`e20a45c16b40200c9d7178be3c4aff4d24c18d775cd3646e003f38ea6cb3e7f2`.
Its original local location is
`outputs/evidence/portfolio-shared-integration-20261011/coordination-85aa5c0-20261012/`.
It contains committed source/documentation only, not ignored evidence or the
three unfinished lanes. Import it into an isolated integration branch after
verifying its prerequisite and hash; do not reset another session's branch.

GitHub connector reads work, but its branch-creation operation returned
`Resource not accessible by integration`. The installed GitHub CLI has no active
authentication. The other author's Meri PR1 was preserved and last observed open
and draft; its shared-header changes must be reconciled, not overwritten.

## Requested common application and current mismatches

The desired integration is one Next.js `apps/web` build: Portfolio at `/`, Meri
at `/meri`, Modules at `/modules`, plus Settings, sharing the common shell,
authentication, selected-client interface and reusable presentation owners.

| Seam | Current committed behavior | Required coordination |
| --- | --- | --- |
| Root route | Existing synthetic Meri entry by default; `CAPIRO_DEFAULT_PRODUCT=portfolio` redirects to `/portfolio` | Explicitly decide and implement the requested Portfolio-at-root rendering/alias behavior once, without duplicate App Router pages |
| Meri | `/meri` exists as the disconnected foundation | Meri owner supplies its reviewed feature/runtime integration |
| Modules/Settings | No corresponding pages in this branch | Their session supplies owned routes and features |
| Authentication | Clerk is composed in the Portfolio route group | One integration owner reconciles a common provider with Meri, preserving session/tenant cache replacement and each backend's actual token contract |
| Client context | Portfolio current-client validation and public read interfaces exist | Agree one explicit selected-client interface; UI selection never establishes backend authorization |
| Shell | Shared `HeaderFrame` geometry, separate product navigation | Reconcile Meri PR1 header/asset changes and compose navigation through the common owner |
| Data/knowledge | Portfolio uses existing `capirov2` APIs; Meri runtime has its separate backend owner | Reuse authoritative records through approved APIs/connectors and public contracts; no database copy, browser SQL credentials or second institutional-knowledge store |

## Shared file footprint and proposed ownership

The continuation changes root `package.json` and the single `package-lock.json`,
`apps/web/package.json`, `apps/web/next.config.ts`, `packages/ui` public exports,
root App Router `layout.tsx`/`page.tsx`, shared `Header.tsx`/`HeaderFrame.tsx` and
shell styles, and `MeriFixtureEntry.tsx` at the shared navigation seam. It adds
the transferred Portfolio routes, scoped styles, auth/session, configuration,
narrow API proxy and public current-client interfaces under canonical
`apps/web` owners. It also owns architecture checks and the existing Portfolio
preview build/deployment definitions. See the full diff from the recorded base.

The recommendation is one common-shell/integration owner for root routing and
layout, common header/navigation, auth composition, shared selected-client
interface, configuration composition, lockfile reconciliation and the release
pipeline. This Portfolio integration session was proposed for that role; it is
not an assertion that the coordinator has assigned it. Meri and Modules/Settings
retain their feature modules and thin routes. No product session should publish
an independent image over the common preview.

The remaining Portfolio changes at the snapshot concern Tracker watchlists and
personal alert preferences, the Files arrival composition/route, their dedicated
tests, the narrowly exported profile read interface and evidence/architecture
records. They do not change the agreed root-route policy or implement Meri or
Modules features.

## Qualification and release holds

- Historical combined source0beb51c passed root check/build, including828
  Portfolio unit cases,32 foundation and21 transport cases. Its historical
  production smoke passed. Its full browser run was603/606 with3 failures.
- Correction3e88f1d passed the affected33-case browser cohort. It does not turn
  the earlier full run into a pass.
- Documents1c80792 matched the frozen source qualified by48 new and38 retained
  browser cases and60 unit cases.
- Advocacyf4731d2 has44 passing units, an intermediate43/45 browser cohort and
  a later5/5 affected correction cohort. Saved submissions75409a9 has34 passing
  units and a final5/5 affected correction cohort after documented failures.
- Root's additional dark Advocacy run at75409a9 passed2/2. Full-suite discovery
  at85aa5c0 found786 cases; discovery does not execute them.
- The new three lanes and final combined check/build/actual-Next/browser gate
  are not qualified by those older results. Signed-in/deployed acceptance is
  still absent. The ledger retains345 IDs,337 open rows,7 pending exclusions,
  CORE-018's owner exclusion and0 accepted rows.

Publishing needs authenticated GitHub write access. AWS CLI is installed but
unauthenticated, and this session has changed no AWS resources. Shipment needs
fresh account/stack/service/task/image/scan/DNS/ingress/Clerk inspection and the
reviewed exact-source release gate. Keep the separate preview and existing
production route boundaries. Status coordination does not lift these holds.

## Recommended integration sequence

1. Assign the common integration owner and collect each session's exact base,
   HEAD, publication state and shared-file diff.
2. Review the Portfolio consolidation as the canonical `apps/web` foundation.
3. Reconcile Meri's shared header/auth seams, then its `/meri` feature work.
4. Integrate Modules/Settings through their owned routes and public interfaces.
5. Resolve the root-route, common auth/client-context/navigation/configuration
   and lockfile seams once, with affected owners' exact contributions preserved.
6. Qualify one committed combined source and release one image through the
   existing preview pipeline, within the current authenticated scope/holds.

Use [the shared frontend guide](../SHARED-FRONTEND-PREVIEW-GUIDELINES-2026-10-11.md),
[the continuation](./CONTINUATION-2026-10-11.md), the final frozen slice manifests,
root integration receipts and [the restart handover](./handover-2026-10-11/HANDOVER.md)
to combine the work. This snapshot bundle is a reviewable checkpoint, not final
product or deployment acceptance.
