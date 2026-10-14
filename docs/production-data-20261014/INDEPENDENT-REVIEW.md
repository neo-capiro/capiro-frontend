# Independent production data honesty review

Reviewed the pending successor at `/workspace/capiro-production-data`, based on frozen PR34 `a2d210a728a8ec6d2f1f2137b1c3b8ea8dbb2b82`. Read bounded handoff, complete affected runtime sources, canonical identity/selected-client/session consumers, fixture route composition and related qualification diff. No repository edits, live requests, deployment or frozen-source changes.

Production source accepted. Ordinary `/meri` uses canonical Core identity and verified SelectedClient presentation, with existing RequireSession/SelectedClientGate. Identity loading/refetch/errors withhold cached greeting; no synthetic identity or client fallback appears. Canonical ApplicationBoundary owns identity/session/client cache replacement. No browser label grants memory-wall access or authorizes conversation operations. Conversation/recent/approval data remain explicitly unavailable until the existing owner integration is supplied. Files and recommendation-action links preserve verified selected-client UUID and retain their existing workflow gates.

Synthetic Home is retained only behind explicit `/meri/fixture/home`; existing cited-answer/run-activity routes now explicitly opt into fixture composition. ProductShell defaults fixture=false and passes the explicit fixture state to Sidebar. Sample Recent titles and Approvals2 appear only in fixture composition; normal New conversation is disabled. Ordinary Files/Actions footer describes their real gated workflow limitations rather than labelling them synthetic. Mobile navigation has no sample count/record and remains canonical navigation.

Architecture scanner found no boundary errors. The exact changed Sidebar size finding requires its review record to be updated; this independent whole-function review accepts it:

- File: `apps/web/src/shared/shell/Sidebar.tsx`
- Function: `Sidebar`, 136 nonblank lines, line26.
- Final AST fingerprint: `fd79fdbd2c5dfac1dcd09e05e44fea67b151b0da9e544d3e0e3f9dd914e1321a`.
- Rationale: Sidebar remains one shared Meri navigation presentation owner. The explicit fixture input gates local fixture draft reset, sample recents and sample approval count. Ordinary navigation reuses canonical route/scope helpers; no service query, auth/session authority, persistence, count fabrication or new workflow dispatch is added. Keeping these availability and fixture decisions beside their controls makes the production/fixture boundary reviewable. Header/mobile navigation and feature workflows remain separate canonical owners.

Source byte SHA256:

- `apps/web/src/features/meri/MeriHome.tsx`: `591b0c9b9ce19373e6f7be7e203c7291b82427b45f4c3cb464539f5032a97799`
- `apps/web/src/shared/shell/Sidebar.tsx`: `f1180ff5836c6f33c0d3da041531987cecd65f4fea8e2caefaed0e47f7ff1754`
- `apps/web/src/shared/shell/ProductShell.tsx`: `1ab60debf6db4bc0b65dd43302d31e87c8bceb2e91abca679764dac0ab790105`.

Final source/test review accepted. `apps/web/test/browser/meri-production-data.spec.ts` supplies11 focused controls: API identity/client success, null-name neutral fallback, identity401/403/503, malformed identity plus explicit retry, selected-client403 refusal, held session replacement with awaited route settlement, sign-out plus navigation/no additional identity read, and sample absence on ordinary Files/Actions. Its common fixture asserts no page errors or non-GET API requests. The success case checks scoped Files link, disabled New conversation, mobile width and keyboard focus. Existing fixture accessibility/interaction tests are remapped to explicit `/meri/fixture/home`; Objective/integration ordinary Meri assertions target the generic Meri heading. Parent reports focused checks passing so far and production build passed; I inspected source declarations and did not independently execute these gates. Native identity/client service bindings and deployed data origin remain unverified.

The normal Conversations tooltip correction is present; no unresolved production-source or test-setup finding remains. The Sidebar size review record must use the final fingerprint above rather than the superseded first-review fingerprint.

## Exact PR34 independent Modules/Portfolio audit

Read-only production audit at `a2d210a728a8ec6d2f1f2137b1c3b8ea8dbb2b82`, excluding test files and explicit Meri fixture routes: no hardcoded demo clients, fabricated counts/customer cards, production mock adapters or error-to-sample substitution found in Modules/Portfolio source searches and inspected data owners.

| Routes / source | Classification |
|---|---|
| `/`, `/portfolio`, client pages: `apps/web/src/features/portfolio/index/queries.ts`; `apps/web/src/shared/portfolio/api/provider.tsx` | Canonical Core requests and default real fetch adapter; identity/scope-owned cache, no sample fallback |
| `/modules`: `apps/web/src/features/modules/hub/ModuleHub.tsx`; `apps/web/src/shared/shell/module-catalog.ts` | Client count/picker derived from `clients.list`; cards are static module navigation descriptions, not customer data |
| `/modules/[module]`: `apps/web/src/features/modules/ModuleScreen.tsx`; `apps/web/src/shared/capiro/CapiroBoundary.tsx` | Feature screens consume fixed-operation API client; missing configuration/session has explicit setup/admission state |
| Engagement/Planner summaries: `apps/web/src/features/modules/engagement/EngagementOverview.tsx`; `apps/web/src/features/modules/planner/TimesheetTables.tsx` | Counts/totals derive from returned meetings/tasks/report/timesheet data; no sample replacement found |
| `apps/web/src/shared/capiro/workspace-brief-copy.fixtures.ts` | Synthetic test support; zero non-test production importers found |

Input examples, blank user-draft defaults, empty arrays and unavailable labels are distinct from fabricated customer records. This static audit does not qualify deployed service responses, content origin or native functionality; the confirmed ordinary Meri/shared-shell sample issue is the source defect addressed by this successor.
