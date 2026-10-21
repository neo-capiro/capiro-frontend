# Browser-source donor review — 21 October 2026

Reviewed baseline `4f9a7e8dcaa9ba03494dc5a49559daf70cea5100` against donor `b6336be53c3515115122578ad22f659cc2fd6ab5` and its predecessor `dc9a18d28ea934f5e655d13ea1e8686225bb4d73`. This is a read-only source review; no functional or browser run is claimed here.

## Recommended receipt: two files only

1. `apps/web/test/browser/meri-conversation-host.spec.ts`: receive the history body `{ after: 0, limit: 100 }` from `8c5f53bcac05d2822a50154dec34b93eeaf01974`, plus session-hint assertion timing from `dc9a18d28ea934f5e655d13ea1e8686225bb4d73`. Main `useRunCommands.ts` line 31 already invokes `port.history({ after: 0, limit: 100 })`. The fixture `connect()` waits only for the Conversation heading, so asserting hints after the transcript and completed status retains the exact assertion while waiting for its actual dependency.
2. `apps/web/test/browser/meri-files-fixtures.ts`: receive `expectFilesIsolation` from `8c5f53bc`. Require the exact `x-meri-action-session` credential and no `Authorization`. Main `shared/meri-documents/workflow-transport.ts` already sends the canonical `actionSessionHeader`; `shared/meri-actions/session-header.ts` defines `X-Meri-Action-Session` and explains Clerk bearer precedence. This strengthens the correct browser/proxy boundary assertion.

`frontend-browser-spec-supplement.patch` is the exact main-to-donor diff restricted to those two files. It contains no application code, CSS, task-command fixture, or Modules-heading changes.

`git -C frontend-consolidation apply --check ../frontend-browser-spec-supplement.patch` passed (exit 0) against the receiving owner's then-current worktree. This was a read-only applicability check; the patch was not applied by this auditor.

Equivalent commit-oriented procedure: selectively receive only the two paths above from `8c5f53bc`, then receive `dc9a18d2`. Do not cherry-pick the complete donor branch or restore complete older test snapshots.

## Changes to exclude, with current source evidence

| Donor commit / paths | Disposition | Why |
|---|---|---|
| `aa0a9df1bd165a47f550e41fc1f5812a724e6784`: `acceptance-meri-theme.spec.ts`, `acceptance-shared-incompletes.spec.ts`, `meri-files-navigation.spec.ts` | Superseded; keep main expectations | These change `Everything in Capiro` to `Work in Capiro`. Commit `1fd6f72c` originally introduced scoped copy, but the newer Figma 3.4 commit `1d94c9224a8fc0d9af3c2ce315d4d5d3e4d47aba` explicitly restored `Everything in Capiro, across the whole firm` and changed the design target to `1064:191436`. Current main `ModuleHub.tsx` lines 104–115 still uses that ordinary heading; the opt-in read-only preview instead uses `Modules client scope`. Applying the donor heading assertions would make tests contradict current product source. |
| `b6336be5`: `meri-action-host-navigation.spec.ts` | Superseded; keep main expectations | Same heading mismatch as above. No product copy change should be smuggled into a browser-fixture reconciliation. |
| `4a381f8d683864812780d9d20a60d0f4f407bf22`: `meri-action-host-fixtures.ts` | Already consolidated | Main already registers GET `**/api/backend/core/clients` with `[actionClient, otherActionClient]` later in the same fixture. Donor head merely relocates the same route, and cherry-picking its add would duplicate the handler. Main received the roster fixture through `c0d8ab28` (patch-equivalent original `68051886`). |
| `8c5f53bc`: `meri-task-command-fixtures.ts`, `meri-task-command-workflow.spec.ts` | Superseded by stronger main coverage | Main captures real browser request headers independently, requires exactly four task-command requests, checks the exact action-session header on each, and forbids `Authorization`. The donor fixture-level `.every(...)` is weaker because it can pass on an empty array. A donor snapshot would also remove the main Home-to-Task-updates navigation case and its roster fixture. Keep both main files unchanged. |
| Donor snapshot of `acceptance-meri-theme.spec.ts` and `home.module.css` | Preserve main | Main verifies Send is disabled with white/gradient styling, opacity `0.4`, and the matching icon filter. Donor snapshot lacks these later assertions/styles. Even a future heading-only edit must retain these stronger checks. No CSS change is needed for this receipt. |

## Suggested verification by receiving owner

- Run the first `meri-conversation-host.spec.ts` case to verify exact history body, session hints, transcript, and cursor resume.
- Run `meri-files-workflow.spec.ts` and `meri-files-lifetime.spec.ts` because they call `expectFilesIsolation`; include navigation if testing the full Files boundary.
- Preserve and run `meri-task-command-workflow.spec.ts` as a regression check when receiving adjacent memory/proxy changes; no weakening is justified.
- Typecheck and relevant formatting checks. Browser fixtures verify application behavior only; they do not establish live Clerk/Core/Meri or visual acceptance.

## Corrected history classification

Memory five-commit chain, PR111/112, and the compatible browser subset are **integrate**: no identified current receiver or active owner was established. Their donor branches alone are insufficient exclusion evidence. Existing intentional archival exclusions remain supported by main `docs/integration/FRONTEND-INTEGRATION-LEDGER.md` section 8.
