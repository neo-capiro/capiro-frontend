# Modules and Settings · Figma 3.4 desktop audit

Source: PR #92 at `271a267da93aa952a89b208d1f42eed0ffb080c2`; dedicated branch `codex/modules-settings-figma34-20261018`. The reviewed Figma frames are 1440 × 1040, light theme, on the [Modules / Settings design page](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-%E2%80%94-Modules---Settings). The Playwright captures below use that viewport and the ordinary `/modules` and `/settings/[section]` feature components. The browser harness supplies synthetic HTTP responses only inside tests, blocks external requests, and labels its screenshots as test fixtures. They do not represent live customer data or deployed parity.

## Frame to route map

| Figma 3.4 frame | Application route / owner | Evidence or disposition |
| --- | --- | --- |
| [Modules hub · `1064:191436`](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-%E2%80%94-Modules---Settings?node-id=1064-191436) | `/modules` · `features/modules/hub/ModuleHub.tsx` | [1440px capture](./evidence/figma34-20261018/modules.png) |
| [Engagement · `1064:191641`](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-%E2%80%94-Modules---Settings?node-id=1064-191641) | `/modules/engagement` · `features/modules/engagement` | [Outreach-only live behavior](./evidence/figma34-20261018/engagement.png); design Reports/Meetings/Library tabs are superseded by Neo's direction |
| [Personal · `1064:243056`](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-%E2%80%94-Modules---Settings?node-id=1064-243056) | `/settings/personal` · `features/settings/PersonalSettings.tsx` | [1440px capture](./evidence/figma34-20261018/personal.png) |
| [Team members · `1064:244607`](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-%E2%80%94-Modules---Settings?node-id=1064-244607) | `/settings/team` · `features/settings/TeamSettings.tsx` | [1440px capture](./evidence/figma34-20261018/team.png) |
| [Team pending · `1064:244732`](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-%E2%80%94-Modules---Settings?node-id=1064-244732) | `/settings/team`, Pending invitations tab | Inspected; inviter name in design is not in the invitation response |
| [Integrations · `1064:244275`](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-%E2%80%94-Modules---Settings?node-id=1064-244275) | `/settings/integrations` · `features/settings/IntegrationSettings.tsx` | [empty-state capture](./evidence/figma34-20261018/integrations.png); target has a connected Microsoft account |
| [Profiles active · `1064:244975`](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-%E2%80%94-Modules---Settings?node-id=1064-244975) | `/settings/profiles` · `features/settings/ProfileSettings.tsx` | [populated synthetic capture](./evidence/figma34-20261018/profiles.png) |
| [Billing · `1064:246942`](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-%E2%80%94-Modules---Settings?node-id=1064-246942) | `/settings/billing` · `features/settings/BillingSettings.tsx` | [current-contract capture](./evidence/figma34-20261018/billing.png); Figma uses a different term/payment scenario |

Additional source mapping: [Engagement Outreach `1064:191976`](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-%E2%80%94-Modules---Settings?node-id=1064-191976) remains inside `/modules/engagement`; Figma [Engagement Library `1064:191818`](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-%E2%80%94-Modules---Settings?node-id=1064-191818) and meeting links go to the selected client's Portfolio Calendar/library, as the Outreach-only integration requires. [Settings Memory `1064:243310`](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-%E2%80%94-Modules---Settings?node-id=1064-243310) is assigned to the separate memory lane; this branch does not edit it.

## Changes made in the ordinary feature routes

- Hub heading and relationship layout labels now match the new frame. The scope option reflects the count of **available** profiles returned to the account. The help and explanatory copy keeps the access boundary explicit; Figma's unqualified statement that anyone can browse every activity would promise records the authorized operations may not return.
- The four Work and three Landscape card geometry, Geist styling, warm tokens, and native Figma SVG dimensions were already close. The existing `ModuleAsset` names correspond to seven present, nonempty card assets; browser geometry checks passed. Hub counts in the Figma examples are not hard-coded into the live page. The Engagement card remains Outreach-only; no Reports or Meetings tabs or fake metrics were added.
- Team rows now show data-derived 32px initials, use the existing `SelectInput` wrapper around `@capiro/ui/select` for role changes, use the design's compact columns and badge widths, and display joined dates as `MMM D, YYYY`. The table and mutation workflow remain the existing shared components. A focused browser case changed a non-self member's role, checked the exact `settings.team.setRole` request, and observed the reloaded role.
- Profiles search now occupies the design's 240px toolbar slot rather than covering its tabs. Populated rows show initials or the provided logo, status dots, and `MMM YYYY` added dates. The review screenshot uses nine synthetic records **only in a test** to expose table density; the application still reads `clients.list` and does not inject sample records.
- Settings presentation rules specific to Team and Profiles are isolated in `settings-record-tables.module.css`; existing shared controls remain in `settings-controls.module.css` (354 nonblank lines after the split). No shared shell, token, lockfile, Memory, Meri, or Portfolio source was changed.

## Shared shell and library proposals for the visual owner

1. The Figma header is a 64px content band and a 1px divider, totaling 65px. `shared/shell/module-shell.module.css` currently has a 65px border-box header with a 2px bottom border. Make its content band 64px and divider 1px while preserving the 65px overall height. The Settings body offset should stay `calc(100dvh - 65px)`. The Figma header also has a sidebar toggle at x184 absent from the current Modules/Settings capture. Make the control functional if added.
2. The 232px Modules rail matches width, but its bottom Settings link falls below the 1440 × 1040 capture when hub content makes the document taller. The Figma rail keeps Settings at the viewport bottom (about y1004). Give the rail viewport-bounded scrolling/positioning so the link stays reachable without hiding module links.
3. Standard Settings Figma frames show Account, Workspace, and Intelligence in the rail; the current Capiro-admin fixture also shows the Capiro HQ group on those pages. Resolve where authorized HQ navigation should live before suppressing it, so the visual change does not strand HQ routes.
4. `DataTable` accepts only a string column label. The Figma Team/Profiles action column has a blank visible header; an optional visually hidden accessible label in the adopted table wrapper would permit that without losing column accessibility. The local pages keep the visible “Actions” label for now.

## States and contracts Neo needs to resolve

- Hub card metrics and Figma's “14 client profiles” are sample numbers. The hub has a `clients.list` response but no reliable aggregated counts for the seven cards. Add a scoped metrics contract and an empty/loading/error design state before showing numbers. The user-directed Outreach-only Engagement scope overrides the extra design tabs and Reports.
- Figma Team Pending shows “Invited by Jordan Clayton”; `invitationSchema` has no inviter field. Current data can show email, role, sent, expiration, and resend without inventing an inviter. The frame also depicts one pending record while the current test fixture has none.
- Figma Integrations shows a connected Microsoft account and a “Realtime” action. The current empty-provider screenshot is valid for the configured test responses; the existing contract has sync and connection details but no Realtime action contract. Neo should provide the expected action and empty/disconnected states.
- Figma Profiles displays an owner avatar for each client. `clients.list` exposes no owner value; the live page retains “—” until an authorized owner field exists. The screenshot's nine rows are test-only examples, not inserted application data.
- Figma Billing is a specific 20-slot, 12-month plan with bank-account and invoice detail. The pinned billing summary/state responses supply capacity, prices, usage, status, and period end, but not those term, payment-account, and invoice lines. The live route retains its current billing-provider flow. Neo should provide matching current-state, trial, past-due, canceled, and unavailable designs before the Billing surface can be called exact.
- Mobile and dark-theme alignment are deferred by task scope. The attached light desktop captures are not a claim of full pixel parity while these source contracts and shared-shell items remain open.

## Verification

[Commands and result receipt](./evidence/figma34-20261018/verification.txt).

- `npm run typecheck --workspace @capiro/web` — pass.
- `npm run build --workspace @capiro/web` — pass; generated `/modules`, `/modules/[module]`, and `/settings/[section]` routes.
- Focused Chromium browser run — 13/13 pass: hub, card SVG geometry and keyboard help; Outreach-only page and Portfolio meeting/library redirects; Personal, Team, Integrations, Billing, Profiles; populated Profiles; Team role mutation.
- `git diff --check` — pass. `node scripts/architecture.mjs` emitted `errors: []` and 520 repository-wide review signals, exiting 1 by design. Changed functions flagged over 80 nonblank lines are `ModuleHub` (82), `ProfileSettings` (240), `CreateProfile` (86), and `TeamSettings` (321). These preexisting feature workflow boundaries were reviewed for this focused presentation change; the new table CSS was separated by responsibility, and no new dependency cycle or architecture error was reported.
- Production auth/service integration, live customer data, and deployment were not exercised or changed.
