# Meri Figma 3.4 combined visual integration

Date: 18 October 2026 UTC. This integration branch starts at the sealed chat source `67fdf56b` (`dot/meri-new-chat-selector-20261018`) and merges the PR #92 based visual branch `8894f279`, Modules/Settings [PR #94](https://github.com/neo-capiro/capiro-frontend/pull/94) at `e1de3f1d`, and the current Portfolio [PR #95](https://github.com/neo-capiro/capiro-frontend/pull/95) at `88088d9c`. The older PR #95 head `47f05589` was merged first; its newer supported Quick Log successor then merged without conflict. The branch also carries a test-only Core client-roster GET response for ordinary Meri Home browser navigation. There are no uncommitted source changes and no edits to the current chat selector, New conversation implementation, memory review components, auth/proxy code, asset manifests, or lockfile.

The three visual reports remain the reviewable source and Figma frame checklists: [Meri desktop audit](./CODEX-MERI-DESKTOP-FIGMA34-AUDIT-20261018.md), [Modules and Settings shared shell](./CODEX-SHARED-MODULES-SETTINGS-FIGMA34-20261018.md), and [Portfolio shared shell](./CODEX-SHARED-PORTFOLIO-FIGMA34-20261018.md). The combined tree retains functional desktop PanelLeft controls and a visible keyboard focus state in each shell. The normal Portfolio sidebar continues to open `/portfolio/prospects`, the only always-visible route to the Business Development list; it also marks `/portfolio?type=PROSPECT` current. The destination needs a design decision before it can be changed without losing list access.

## Focused merge checks

- The chat selector, first-chat Core, and first-chat route unit set passed **13/13**.
- Desktop Meri, ordinary-route sidebar, client-scoped Home links, command palette focus, Modules/Settings rails, and Portfolio shell Playwright checks passed **13/13** on the prior PR #95 head. On the latest PR #95 head, its supported Quick Log commitment checks passed **3/3**, and the Portfolio shell anchor/route check passed **1/1**.
- `@capiro/web` TypeScript and the root production build passed on the latest PR #95 head; Next.js generated 283 pages.
- The latest combined architecture scan reported `errors: []` and no changed shared-shell findings. The scanner still reports **34 blocking size-review findings** in PR #94/#95 feature/operation files; their owners retain the responsibility reviews.

The broader 17-test browser invocation had **16 passes and one inherited assertion failure**. The unchanged Task updates test expects `Authorization: Bearer action_session_…` on a browser request, while current production transport sends `X-Meri-Action-Session` to the same-origin proxy. That proxy expressly rejects browser `Authorization` and forwards a bearer server-side. The failed assertion predates this branch (`bd9e0d03`), so this integration does not weaken it or alter the sealed transport. The 13 integration-specific browser checks passed in a separate run.

## Owner coordination and visual limits

- [PR #94 comment](https://github.com/neo-capiro/capiro-frontend/pull/94#issuecomment-6251154725) gives the feature owner the three `visuallyHiddenHeader: true` action-column opt-ins and accessible table check. The shared `DataTable` option is already available; no Settings feature file was overwritten here.
- [PR #95 comment](https://github.com/neo-capiro/capiro-frontend/pull/95#issuecomment-6251156989) records the Prospects destination choice and the need for a durable, role-independent Business Development list link before retargeting the sidebar.
- PR #95's [design decision evidence](https://github.com/neo-capiro/capiro-frontend/blob/88088d9c/evidence/figma/decision-and-wiring.md) records unresolved Meetings Agenda/Prep/Debrief versus Month/Week masthead and action geometry, and Objective empty versus populated shell/action geometry. No exact-parity acceptance is inferred for those conflicting frames.
- Fresh Figma PanelLeft asset URLs returned HTTP 403, leaving byte identity unverified. The installed Lucide icon was checked for measured geometry; this does not establish exact asset parity. No preview rollout or deployment was touched.
