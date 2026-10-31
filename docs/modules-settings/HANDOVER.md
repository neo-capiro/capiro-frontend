# Capiro Modules and Settings — complete session handover

Cached Research follow-up, 31 October 2026: independent review of correction `1bdeaa01` found that the pre-rollout `ResearchReportReview` still requires `legiwatch.report.history` and sends `{ selectionId, runId }`. The temporary gateway now carries that metadata-only history request and optional selected base through research preview/approve. Test-only copies of the exact `bc6000fc` Zod wire shapes verify that old clients can parse history and approve the selected base. The companion backend authorizes that frozen base, includes its original content in the review, binds its ID/hash, and preserves approval replay. New research screens continue to send only `selectionId`. Remove these additional cached-client shapes with the existing transition/rollback adapters below; no general Reports UI, definition writes, generation or sends are restored.

Follow-up validation: 43 tests across cached gateway, retirement, retained review and operation contracts passed; full frontend TypeScript, focused ESLint and diff checks passed. These are synthetic contract tests, not an authenticated cached-browser or deployed rollout rehearsal.

Rollout correction, 31 October 2026 (from PR #384 head `89a35dd157d11677365ed982e84f555ba2807a8c`): old `lw=committees` room and list bookmarks now replace the route with the corresponding Directory destination, preserving the client hint and deriving Federal/Florida selection from the committee ID. Directory's old `state-committees` selector opens the truthful Florida catalog. Research and briefing authorization remains backend-owned.

During the bounded frontend transition and rollback window, `legiwatch-rollout.ts` retains only old delivery operation names and a read-only briefing definition picker. Optional legacy briefing `reportId` and its preview definition version pass through the gateway to backend ownership/folder/version checks. Old schedule metadata is accepted only alongside explicit research-only sources and an empty monitor selection; the backend validates and normalizes it. New screens still use standalone selections. No report definition writes, generation, subscriptions, news/budget preparation, or retired screens are restored. Record-rule operation names already remain stable and now dispatch to `/legiwatch/monitoring/rules`.

Release must promote the corrected compatible backend first, then the cumulative frontend containing these gateway adapters. Keep the compatible backend for a frontend rollback. Remove the frontend adapters, optional legacy briefing/configuration shapes, and companion backend old prefixes/list/report selection together only after the sole Release owner confirms frontend promotion, cached-client transition, and expiry of the rollback window. Reconcile existing worker command overrides before retiring the backend `run-report-updates` alias. This change adds no flag, schedule, deployment framework, schema migration, or historical data rewrite.

Correction validation uses Windows Node 24.22.1 and read-only reuse of the existing declared dependency trees: 23 committee route/filter/reload tests, 41 retained-contract/Directory tests, 5 cached-client gateway tests, and full frontend TypeScript passed. Tests use synthetic hooks and HTTP fixtures; authenticated browser/deployed acceptance and exact-head independent review remain separate gates. No build, push, cloud write, or outbound delivery was performed for this correction.

Current scope update, 31 October 2026: LegiWatch no longer includes Import review, Research import review, Reports, News evidence (including monitors, coverage, imports and personnel), Florida Budget, Legacy digest or Daily subscriptions. Committee pages now belong to Directory. The remaining Monitoring, Research, hearing publications, Client briefings, Trends and settings remain active. `legiwatch/sources` owns the shared research source scope, exact-source viewer and local briefing basket; `legiwatch/delivery` owns recipient selection and reviewed draft delivery. Research and briefing reviews use their saved selections directly, without a Reports definition or run picker. Shared folder and delivery contracts now live in `legiwatch-folders.ts`, `legiwatch-folder-schemas.ts`, `legiwatch-delivery.ts` and `legiwatch-delivery-schemas.ts`. New deliveries use `/legiwatch/deliveries`, and retained bill rules use `/legiwatch/monitoring/rules`. Historical exact-source citations remain readable. The dated implementation inventories, integration map and verification below describe the October 12 source and are preserved as historical evidence; the current canonical registry governs available operations. These source changes are not deployment or live acceptance evidence.

Prepared 12 October 2026 UTC for continuation in a new session. Read this document from the latest head of **draft PR [#5](https://github.com/neo-capiro/capiro-frontend/pull/5)**. This handover is a documentation-only follow-up to the tested implementation commit below. The commit containing this document is the handover publication receipt; its parent is the implementation commit. No application source changed while preparing this handover.

## 1. Start here: actual completion state

The Modules and Settings implementation is committed and published for review. It adds eight module areas, nineteen Settings destinations, and a fixed registry of 528 reviewed service operations. The final local verification passed **199 tests**, workspace type checks, dependency/artifact checks, architecture checks and the shared web production build. The implementation has **not been merged or deployed**. Live service compatibility and several missing backend contracts remain open; do not interpret the UI, mocks, source mapping or this handover as live acceptance.

| Item | Exact value at handover preparation |
| --- | --- |
| Frontend repository | [neo-capiro/capiro-frontend](https://github.com/neo-capiro/capiro-frontend) |
| Branch | `task/modules-settings-20261011` |
| Draft PR | [#5 — Build Modules and Settings UI with reviewed Capiro service integrations](https://github.com/neo-capiro/capiro-frontend/pull/5) |
| Tested implementation commit | [`e717867300e8568d467ac1cc9a54cab6540f4312`](https://github.com/neo-capiro/capiro-frontend/commit/e717867300e8568d467ac1cc9a54cab6540f4312) |
| Tested implementation tree | `b77e8c0980fcf9e202c960d766b242835ffcbc02` |
| Base / frontend main observed | `02c02d95bdf3949662b9123f425271c6491ffdab` |
| Base tree | `776883e3f3b529650f9e9f01595bff34607d551a` |
| Implementation diff against base | 567 files; 88,977 additions; 154 deletions |
| Backend source reference | [`neo-capiro/capirov2@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`](https://github.com/neo-capiro/capirov2/tree/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace) |
| Meri backend owner | [neo-capiro/meri-greenfield](https://github.com/neo-capiro/meri-greenfield); no runtime code changed here |
| Working directory used | `/workspace/scratch/95a8ff51eaeb/capiro-modules` |
| Separate original checkout | `/workspace/scratch/95a8ff51eaeb/capiro-frontend`; left untouched |
| PR status before handover commit | Open, draft, GitHub reported mergeable / clean; zero hosted check runs |

GitHub mergeability is only a point-in-time conflict result. It does not qualify shared-shell integration, runtime correctness, deployment or human acceptance. Refresh the branch, main and other PR heads before continuing. The test results apply to the implementation tree, not arbitrary subsequent edits.

## 2. User intent and boundaries

The user is rebuilding Capiro around three top-level views: **Meri, Portfolio and Modules**. Meri's backend is being rebuilt in `meri-greenfield`. All UI work belongs in `capiro-frontend`. Modules and Settings use the relevant existing `capirov2` backends, guided by the supplied Figma and spreadsheet. The user explicitly requested clean, organized code, reuse of shared components and no files that accumulate unrelated responsibilities. They repeatedly asked the session to continue through completion, then asked for all work to be committed and every context file included in a handover.

Meri and Portfolio development are concurrent and independently owned. This branch implements Modules/Settings and the shared pieces required to host them; it does not consolidate the separate Portfolio app or replace Meri's runtime. It does not import old Capiro UI or backend implementation into this frontend. It does not authorize production cutover, infrastructure changes, real outbound messages, paid model execution, source/provider connections or deployment.

Read these repository instructions in order before editing:

1. [AGENTS.md](../../AGENTS.md).
2. [IMPLEMENTATION-STANDARDS.md](../IMPLEMENTATION-STANDARDS.md).
3. [ARCHITECTURE.md](../ARCHITECTURE.md), including its final Modules/Settings allocation that supersedes the initial disconnected-foundation description for this scope.
4. [Bounded task outline](../coordination/MODULES-SETTINGS-20261011.md).
5. This handover, [implementation report](IMPLEMENTATION.md), [structure review](STRUCTURE-REVIEW.md), [verification](VERIFICATION.md) and the feature README for the surface being changed.

The standards require canonical ownership, thin routes, deliberate public interfaces, no private cross-feature/application imports, no cycles, backend-owned authorization and useful verification. Files over 400 nonblank lines, functions over 80, and semantic responsibility problems trigger design review rather than automatic splitting. G0/G1 work remains Codex-only; earlier file-owner/agent assignments in the task outline are historical. No background agent needs to remain alive to use this branch. Do not resume old agents or assume their filesystem persists.

## 3. Every context source: inventory and recovery

The detailed inventory is [CONTEXT-INDEX.md](CONTEXT-INDEX.md). This is intentionally a **superset**: it preserves all tracked frontend files and all retained analysis/reference files, including some baseline material discovered but not read line by line. It does not falsely label every indexed file as independently reviewed. Each inventory records exact paths and hashes; Git-backed files have a pinned recovery location.

| Inventory | Scope and use |
| --- | --- |
| [FRONTEND-FILES.json](context/FRONTEND-FILES.json) | All **1,464** tracked files at the implementation commit, Git blob IDs, SHA-256, sizes and changed/baseline classifications. The URL prefix plus each path recovers the exact committed file. |
| [IMPLEMENTATION-CHANGES.json](context/IMPLEMENTATION-CHANGES.json) | All **567** implementation diff paths and status against the exact base. Includes source, assets, tests, configuration, docs and evidence. |
| [BACKEND-FILES.json](context/BACKEND-FILES.json) | **532** distinct retained backend reference files with pinned GitHub URLs and local hashes. Original snapshot: 525 files. Nine tool references were re-fetched and Git-blob verified for handover; seven added paths and two refreshed paths already in the snapshot. |
| [EXTERNAL-CONTEXT-FILES.json](context/EXTERNAL-CONTEXT-FILES.json) | Every one of the **782** source/evidence files preserved in the external context archive, including all **764 Figma capture files**, original workbook and extraction, backend discovery inventories and final/historical logs. |
| [SCRATCH-CONTEXT-FILES.json](context/SCRATCH-CONTEXT-FILES.json) | **1,363** retained original analysis files, including backend snapshots, design captures, logs, publication payloads and one-time helpers. Records whether each is archived, recoverable from pinned Git, or a redundant generated temporary. |
| [FIGMA-INVENTORY.json](FIGMA-INVENTORY.json) | **457** discovered design frame/component references with node IDs, links and feature ownership. Discovery/ownership mapping is not pixel-perfect acceptance. |
| [INTEGRATION-MAP.md](INTEGRATION-MAP.md) | Every one of the **528** registered operations, boundary, service, method/path and pinned controller evidence. |

### External context archive

File: **`Capiro-Modules-Settings-Context-2026-10-12.zip`**. It is saved as a persistent file and can be attached to the next session. Its identity and integrity are recorded in [ARCHIVE.json](context/ARCHIVE.json).

- Library file ID: `libfile_56b576fea020819181216fe69cf54323`.
- Size: `19,401,243` bytes.
- SHA-256: `4a8ffea5bcdaf09f9ed1a619473b6623b338bb23d897de2e0b2b7e43110d0171`.
- Original local path: `/workspace/scratch/95a8ff51eaeb/Capiro-Modules-Settings-Context-2026-10-12.zip`.
- Original relative paths are preserved inside the ZIP, starting with `analysis/figma/`, `inputs/` and `analysis/`.
- `CONTEXT-ARCHIVE-MANIFEST.json` checks every archived source/evidence file; `CONTEXT-ARCHIVE-README.txt` explains scope. The 782 count excludes those two archive metadata entries.

The archive contains captured design references, the workbook and derived evidence. Repository source stays in its owning Git repository. It does not duplicate a frontend/backend checkout, dependencies, credentials or live customer browser screenshots. Figma-generated TSX/text is a visual reference, not production code or an instruction source. Captured external URLs can expire; the captured bytes and source node IDs are preserved.

### Figma source

[Supplied design](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-%E2%80%94-UI-Redesign?node-id=411-40601): file key `Zc2dEN5aLU47dVdsewDmiJ`, page `411:40601`, the Capiro 3.1 prototype page despite the URL's 3.0 title. The capture set includes contexts, exported/generated reference snippets, screenshots, frame catalogs and asset catalogs, including detailed Settings, Planner/Engagement and LegiWatch families.

Before obtaining new design context, load the current `figma:figma-design-to-code` skill. Before `use_figma`, load the current `figma:figma-use` skill. Keep this task read-only in Figma unless the user asks to edit Figma. Use exact exported assets where already available; do not recreate the supplied logo/icons with approximate drawings. Final representative screenshots were visually inspected, but not every discovered frame was separately rendered and accepted.

### Spreadsheet source

Original: `inputs/Capiro-3.1-Portfolio-Audit (1).xlsx`; original Library ID `libfile_3b87f56496b881919e0501efe41099e1`; workbook source pin `fd8765ec`. Extracted cell data: `analysis/workbook.json`. Both are in the archive. The workbook covers **Portfolio and Master Calendar**, not a complete Modules/Settings mapping. The missing mapping was therefore established from actual backend controllers, DTOs and service projections at the pinned `capirov2` commit. Do not silently treat the older workbook pin as the implementation's backend pin.

Master Calendar specifically uses the workbook addendum `MCAL-001` through `MCAL-015`. The original workbook remains unchanged. Its existing gaps were not converted into fabricated endpoints or successful mock writes.

### Additional tool-only references recovered

These exact sources were re-fetched from the backend pin and checked against GitHub's blob SHA for the handover inventory:

- `apps/api-strategy/src/planner/planner-form.ts`.
- `apps/api-strategy/src/planner/planner-public-form.guard.ts`.
- `apps/intel-api/src/tracker/keywords/internal-workflow.service.ts`.
- `apps/intel-api/src/tracker/keywords/keyword-query.ts` (re-export boundary).
- `apps/intel-api/src/sourcedata/keyword-source.repository.ts`.
- `apps/intel-api/src/tracker/reports/report-schedule.ts`.
- `packages/shared/src/legiwatch-phase8.ts`.
- `packages/shared/src/legiwatch-query.ts` (canonical keyword parser).
- `packages/shared/src/legislative-research.ts`.

The backend inventory also includes the broader controller/service/schema sources retained during the audit. `analysis/backend-source-paths.json` contains the larger discovered path list, including paths that were only discovered rather than downloaded. `analysis/backend-endpoints.json` and `.md` are derived discovery indexes; the final operation registry and integration map govern what this frontend exposes. None of these backend snapshots is an allowed private cross-repository import.

## 4. Architecture and canonical owners

Paths in this section are relative to the frontend repository root.

| Responsibility | Canonical files/directories |
| --- | --- |
| Thin route composition | `apps/web/src/app/modules/`, `app/settings/`, `app/forms/[token]/`, `app/api/capiro/[operation]/route.ts`, app layout and sign-in route |
| Product shell/navigation | `apps/web/src/shared/shell/ModuleShell.tsx`, `ModuleHeader.tsx`, `ModuleNavigation.tsx`, `module-catalog.ts`, `ConnectedModule.tsx`, `public-routing.ts` |
| Module entry and screens | `apps/web/src/features/modules/`, with cohesive domain directories and `hub/ModuleHub.tsx` |
| Settings selection/access/presentation | `apps/web/src/features/settings/SettingsScreen.tsx`, `SettingsNavigation.tsx`, `access.ts`, feature page/components and `hq/`, `analyst/`, `mappings/`, `signature/` |
| Fixed API contracts | `apps/web/src/shared/capiro/contracts.ts`, `registry.ts`, `operations/` grouped by service domain |
| Server configuration and gateway | `shared/capiro/config.ts`, `gateway.ts`, `gateway-input.ts` |
| Browser requests and scope/lifetime | `shared/capiro/http.ts`, `queries.ts`, `CapiroBoundary.tsx` |
| Transfers | `shared/capiro/multipart.ts`, `binary.ts`, `uploads.ts`; reviewed hearing socket ticket protocol |
| Shared controls | `apps/web/src/shared/module-ui/` using adopted public `packages/ui` exports |
| Meeting workflows | `apps/web/src/shared/meetings/CreateMeeting.tsx`, `MeetingDetail.tsx`, `MeetingArtifacts.tsx`, `library-materials.ts` |
| Shared recipients | `apps/web/src/features/modules/intelligence/legiwatch/reports/RecipientPicker.tsx` and `ReportRecipients.tsx`; reused for reports, schedules and subscriptions |
| Architecture enforcement | `scripts/architecture.mjs`, `scripts/architecture-reviews.mjs`, `docs/architecture-size-reviews.json` |
| Unit/contract verification | `apps/web/src/shared/capiro/*.test.ts`, `operations/*test.ts`, feature tests and `vitest.config.mts` |
| Browser verification | `apps/web/test/browser/`, actual-source Vite bundle with explicit test adapters and synthetic responses |

Dependency direction is feature presentation → shared UI/transport → deliberate public packages and reviewed external contracts. Backend guards own tenant, actor, client, role, version, approval validity and execution authority. A browser client/scope selection is a hint, never an authorization grant. UI role visibility must not be mistaken for enforcement.

### Transport behavior that must survive integration

- Only registered operation keys, methods, paths, parameters and body shapes can dispatch. This is not a browser-specified URL proxy.
- Service origins are server configuration, validated as HTTPS, with HTTP allowed only on loopback. Credentials, query strings and fragments are rejected in base URLs.
- Protected operations get the backend token through the trusted server Clerk callback using `getToken({ template: "capiro" })`. Do not store backend tokens in browser state or forward arbitrary incoming authorization/tenant headers.
- Input validators are strict where scope/authority fields matter, and responses are projected through reviewed schemas. Unknown operations and malformed responses fail visibly.
- Same-origin writes, bounded JSON/multipart/binary responses, request deadlines, file policies and cancellation apply. Exact bounds are owned by each operation/protocol source, not duplicated in page components.
- Client requests are scoped to component lifetime and session generation. Unmount, sign-out, session or organization changes prevent old reads/mutations from updating a new view. Writes are never automatically retried or replayed.
- API calls expose `request`, `upload`, `download`; queries and mutations use the shared hooks. Failed writes retain unsaved input and display errors. Mutation callers catch recorded rejections rather than leaving unhandled promises.
- S3/presigned requests validate the reviewed ticket and omit Capiro credentials. Binary exports validate MIME/size/name. A single reviewed hearing ticket handoff derives its `wss:` URL from the configured Intelligence service and validated hearing ID; it does not accept arbitrary socket origins.
- Optimistic versions, exact source identities, retained revisions, hashes and approval pins come from the displayed backend response. Do not recompute or loosen them in UI code to bypass a stale result.
- Decimal money comparisons preserve strings/BigInt. Unknown coverage and held scan counts remain unknown instead of being presented as zero.

### Public Planner form boundary

`/forms/[token]` deliberately works without Clerk for exactly `public-form.read`, `public-form.submit` and `public-form.upload`. The backend resolves the revocable capability and rechecks access; protected registry operations remain protected. Public responses expose the question/receipt projection without tenant/project/owner identities. Forms support conditional branches and bounded attachments. Share administration remains protected and versioned, with rotation/revocation. Public pages are noindex and no-referrer. Capability URLs are credentials; do not put them in analytics/referrer logs or fixtures containing real tokens. Public submissions report a received receipt, not invented downstream task completion.

## 5. Implemented module behavior

Use [INTEGRATION-MAP.md](INTEGRATION-MAP.md) for exact operation names and controller paths. The table describes shipped source behavior, subject to the live limits in section 9.

| Route/area | Implemented behavior and important semantics |
| --- | --- |
| `/modules` | Module hub and shared desktop/mobile navigation; three product modes. Calendar is a module destination; Settings remains accessible from the shared shell. |
| `/modules/engagement` | Meeting library, preparation, notes, debrief, artifacts and shared meeting dialogs; V3 campaign sessions with specification versions, proposals, targets, context, generation review and separately confirmed send. Editing a draft does not send mail. Aggregate plan/team/DC views retain explicit gaps where no reviewed aggregate endpoint exists. |
| `/modules/planner` | Task list/board/calendar/timeline/Gantt, drawer and comments; projects, goals, portfolios, rules, templates, dashboards/reporting, forms and resource editors; files, capacity, workload, budgets and timesheets. Failed writes retain drafts. Pagination/cursors are not silently represented as complete datasets. Public/member form question rendering and visibility share semantics. |
| `/modules/calendar` | Schedule-X Month/Week, client agenda, meetings and shared meeting drilldown; public hearings, relevant Planner task pages and Federal Register deadlines. Timestamp meetings use end-exclusive ranges in America/New_York; hearings use inclusive official calendar days; Planner date-only values keep their source semantics. Repeated cursor/page budgets report incomplete sources. Federal Register's existing contract is next 30 days / at most 50 entries, disclosed in UI. Government effective dates/forecasts lack a verified dated-item contract. |
| `/modules/workspace` | Document library, drafts, versions/comments; six-stage Hill Day packet workflow; Template Studio V3 using Core Outreach templates (distinct from document-agent blueprints); persisted multi-section newsletters with history. Newsletter persistence serializes actions and retains a created draft when a later step fails. Outreach staging needs a separate bridge. |
| `/modules/strategies` | Library, fiscal timeline, phases/calendar, metadata/step editors, linked work, context upload → resolve → analyze → selected save, evidence inventory, agent proposal/change-set review, hash-bound approvals, execution runs/resume/history and export. Context retries replace the same source/chunk result. Backend owns durable execution, risk rules and reauthorization. Closing a view does not cancel a durable run. |
| `/modules/directory` | Five directory views covering congressional/committee/state/department records, profiles, contact notes, favorites and related records. Existing public/backend naming is preserved rather than inventing new identities. |
| `/modules/intelligence` | Seventeen Data Explorer datasets, defense budget/PE detail (five tabs), funding opportunity detail and district nexus with GeoJSON. Also hosts the extensive LegiWatch sub-application described below. |
| `/modules/research-portfolios` | Nineteen service operations covering collection/membership management, snapshots, changes, subscriptions, reviews and settings. This is a module for research collections, distinct from the separately developed top-level Portfolio application. |

### LegiWatch detail

Canonical folder: `apps/web/src/features/modules/intelligence/legiwatch`. The More catalog in `more/more-catalog.ts` owns destination/title/component selection. Main capabilities include:

- Federal/Florida hearing discovery, committees, recording library, hearing detail and bounded browser microphone capture; transcript/readable evidence, capture readiness and retained recording epoch, acknowledged audio versus unconfirmed tail coverage. Stream/socket/recorder callbacks are generation-fenced; owned tracks, buffers, socket and timeouts are released on exit/failure.
- Publication claims and evidence, exact-hash approval, reports, frozen report runs, shared recipients, delivery review and update views. Approval, publication and delivery are separate actions.
- News, publishers/monitors, personnel and Florida budget views; monetary observations retain exact decimal values rather than floating-point reconstruction.
- Legislative research text, retained revisions, law/rules/dates, coverage, evidence basket and Workspace draft/report preparation. Cursor continuation keeps exact backend cursors; selected source identities/editions are not replaced with approximate matches.
- Keyword definitions, server compiler previews, scan review/results, mappings, staff mappings and from-now activation. Source coverage can hold automation; full document corpus coverage is not inferred from retained documents alone. Changing source/configuration invalidates the prior preview.
- Record/agenda rules and statute monitors with preview, qualification/review and activation separation.
- Subscriptions with timezone-aware schedules, activation/history and manual generation that stays draft until a separate authorized action.
- Internal workflows with explicit scope, preview, review, enqueue/execute and action review. Captured identities and browser scope cannot become actor authority.
- General imports with bounded capture JSON, selected application, pause/resume, compensation and promotion review. Research imports keep captured source identities, exact edition membership decisions and qualification evidence.
- Briefings with citations/editions, editorial schedules, standing approvals and occurrence review.
- Trends/analytics across six analytics surfaces; missing coverage is nullable/unavailable. Legacy digest manual/history views preserve all section text and downloads.

The Figma inventory includes detailed LegiWatch production and state references. Browser tests visit all implemented More destinations and exercise selected retained-source/review flows. This does not mean every mutation or frame has live/pixel acceptance.

## 6. Settings: all destinations and access

`SettingsScreen.tsx` is the destination renderer; `access.ts` owns presentation visibility. Core/Intel guards enforce actual permission. Headquarters destinations require `capiro_admin`; team/profiles/branding/intelligence mappings/usage admit the declared administrator roles; billing requires Capiro admin or the appropriate billing-admin workspace role. Direct navigation still passes the same visibility check and backend enforcement.

| `/settings/<section>` | Screen/behavior |
| --- | --- |
| `personal` | Personal profile and signature settings; Tiptap signature editor with DOMPurify sanitation; separate upload/save outcomes. |
| `contact-info` | Organization contact information. |
| `branding` | Organization branding and validated logo upload. |
| `team` | Team membership, invitations and role controls; failed invitations retain input. |
| `integrations` | Existing integration connections and OAuth navigation with reviewed allowed hosts. Live callbacks untested. |
| `memory` | Existing allowed context/profile reads; unavailable greenfield Meri memory governance actions disclosed. |
| `meri-preferences` | Designed preference surface; new Meri public runtime/preferences contract remains missing. |
| `billing` | Existing hosted Stripe portal path and available billing information. Custom cancellation/term-change flow not fabricated. |
| `ai-usage` | Usage/spend views using available contract projections. |
| `profiles` | Profile administration and supported lifecycle actions. |
| `intelligence-mappings` | Intelligence mappings and review UI. |
| `hq-tenants` | Headquarters tenant administration and related tabs. |
| `hq-customers` | Headquarters customer administration. |
| `hq-ai-keys` | Headquarters AI keys tab under Tenants. |
| `hq-broadcasts` | Headquarters broadcast administration. No live broadcast sent. |
| `hq-personnel` | Personnel merge/review destination under Tenants. |
| `hq-reconciliation` | PE reconciliation queue. |
| `hq-matches` | PE match queue. |
| `hq-analyst` | Analyst console: eight queues/surfaces for program/personnel review, merging, aliases, audit and quarantine. Exact decimal comparisons and required second-admin review preserved. |

The nineteen count is renderer destinations, not nineteen sidebar entries: some are nested tenant tabs or direct destinations. Preserve this distinction when testing navigation.

### Exact clarification about the removed “legacy CSS”

The removed file was **`apps/web/src/features/settings/settings.module.css`**. It was an **unused combined stylesheet created during this implementation**, not pre-existing legacy Capiro/Meri/Portfolio CSS. No imports remained. It was removed before the implementation commit, so it does not appear as a deleted baseline file in that commit's diff.

The active Settings styles remain `settings-layout.module.css`, `settings-controls.module.css` and `styles.ts`. A duplicate `.dialog .stack` class export in the controls sheet had overwritten the layout `stack` class when the maps were combined. Removing that unused selector restored the layout's flex column and 20px card gap. A browser regression checks Personal Settings layout and the absence of an empty signature iframe. Also corrected: empty signature preview suppression and Strategy filter/combobox sizing. Do not delete active shared or legacy application styles based on the earlier shorthand description.

## 7. Reuse, assets, packages and structure review

Exact shared Figma assets are tracked in `apps/web/design/modules-shared-assets.json` (25 assets with source nodes and SHA-256 checks). Calendar exports use `apps/web/public/design/modules/calendar/manifest.json`; district assets use `apps/web/public/figma/modules/district-assets-manifest.json`; other feature SVGs are under the public Figma directories. Geist and locally bundled Newsreader provide typography.

The root npm lock is the active install authority. [DEPENDENCIES.md](DEPENDENCIES.md) records the fifteen new pinned packages and licenses: Newsreader; Schedule-X calendar, controls, React and theme; Tiptap core/image/PM/React/starter kit; DOMPurify; Temporal polyfill; Playwright; Vite; Vitest. Existing Next `16.4.0`, React `19.3.0`, Clerk `7.9.14`, Zod `4.6.5`, Geist and adopted UI primitives remain in the manifest. Do not substitute a fresh latest version during restart. Existing Meri public artifact tarballs and package provenance remain governed by `vendor/README.md` and package qualification docs.

Structural work separated resource-type fields from Planner save lifecycle, timesheet state from composition, Strategies library/timeline/linked-work/proposal review, cancellable context import, Workspace library/newsletter/template/defaults/Hill Day editors and persistence hooks, gateway input from dispatch, and dedicated transfer protocols. Shared meetings/recipient/field/form controls remove real duplication without a generic universal service.

There are **232 retained size signals covered by 206 source-hash-specific review records** in `docs/architecture-size-reviews.json`. There are zero dependency-boundary/cycle errors. No UI TSX file remains over the 400-nonblank-line file threshold. Some cohesive rendering functions, declarative operation catalogs and authored CSS catalogs retain reviewed signals; their rationale is in [STRUCTURE-REVIEW.md](STRUCTURE-REVIEW.md). In particular Workspace (782 lines), Strategies (453) and LegiWatch (453) CSS modules retain coherent feature ownership and review records.

The architecture command fails again when reviewed bytes change, a new signal appears or evidence is missing. It has no automatic approval mode. Boundary/cycle errors cannot be waived by size records. The old scratch `analysis/record-structure-review.mjs` was a one-time authorship helper, not permission to rubber-stamp future changes. Read and reassess the affected responsibility before recording any new source hash.

## 8. Installation, configuration and commands

Use **Node 24** (verification used `24.19.0`) and **npm 11.9.0**. Work from the frontend repository root. Do not use the backend's pnpm conventions for this repository.

```bash
git clone https://github.com/neo-capiro/capiro-frontend.git
cd capiro-frontend
git fetch origin task/modules-settings-20261011
git switch --track origin/task/modules-settings-20261011
git status --short
git log -2 --oneline
npm ci --ignore-scripts --no-audit --fund=false --update-notifier=false
npm run dev
```

Use an existing authenticated checkout/worktree if already present; do not overwrite another session's changes. A new session's absolute paths will differ. The clone command requires normal Git credentials; this session used the connected GitHub service to publish because shell Git lacked credentials. No credentials are in this handover or archive.

Use the designated environment's actual values; there is no `apps/web/.env.example` in this branch and no guessed service host is supplied here. Store environment values through the normal local/preview configuration process, never in the repository.

| Variable | Required meaning |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Designated Capiro Clerk app public key; test/live mode must match secret key. |
| `CLERK_SECRET_KEY` | Corresponding server-only secret. |
| Clerk token template `capiro` | Existing backend claims template, selected on the server. |
| `CORE_API_BASE_URL` | Approved HTTPS base including `/api`. |
| `STRATEGY_API_BASE_URL` | Approved HTTPS base including `/strategy-api`; Planner is hosted here. |
| `WORKSPACE_API_BASE_URL` | Approved HTTPS base including `/workspace-api`. |
| `INTELLIGENCE_API_BASE_URL` | Approved HTTPS base including `/intel-api`. |
| `ONBOARD_API_BASE_URL` | Approved HTTPS base including `/onboard-api`; billing. |
| `NEXT_PUBLIC_PORTFOLIO_URL` | Approved HTTPS URL of the separate Portfolio frontend until shared-app consolidation. |

Configured service prefixes must not be omitted or doubled: operation descriptor paths omit those prefixes. Missing or invalid configuration produces an explicit unavailable state and does not dispatch protected requests. Public Planner forms require the Strategy origin but do not require Clerk. Do not substitute legacy Clio/Meri endpoints for missing greenfield contracts.

```bash
npm run check
npm run build
npx playwright install chromium
npm run test:browser --workspace @capiro/web
git diff --check
```

The standard browser install command is for a new host when its network permits the Playwright distribution. This session's browser CDN downloads were unusable, so it used an isolated official `@sparticuz/chromium@153.0.0` runtime outside Git and `/tmp/chromium`:

```bash
CAPIRO_QA_CHROMIUM_EXECUTABLE=/tmp/chromium npm run test:browser --workspace @capiro/web
```

Do not assume `/tmp/chromium` survives. `playwright.config.ts` also accepts `CAPIRO_TEST_CHROMIUM` as a fallback executable variable. The QA variable adds ordinary container sandbox/shared-memory launch flags; it does not disable web security. Chromium is not a production dependency.

### Commands and output ownership

- `npm run check`: public package pins/artifact byte checks → all declared workspace TypeScript checks → repository tests → architecture → composed Meri transport tests → Capiro feature/contract tests.
- `npm run build`: builds public Meri client, then `apps/web` Next production app. It does not build the separate Portfolio app.
- Browser harness: loopback `127.0.0.1:5197`, Vite **bundled build/preview** via `apps/web/test/browser/server.mjs`, one Playwright worker, actual production feature source with explicit Clerk/Next test adapters and synthetic HTTP route responses. Unhandled operations fail; outside network requests are rejected.
- Browser JSON reporter path resolves relative to its configuration directory: `apps/web/test/browser/test-results/modules-browser-results.json`. Screenshot artifacts are under `apps/web/test-results/`; ignored artifacts are not missing source.
- Final authoritative retained copies: `docs/modules-settings/evidence/browser-results.json`, `build.txt` and six PNGs linked from `VERIFICATION.md`.
- The separately gated Elements qualification was not rerun; it requires a fresh hash-bound SSR receipt per `packages/qualification-elements/README.md`. Never reuse a stale receipt to claim a pass.
- The separate Portfolio app has its own build/browser/format checks and retained original lock while consolidation is pending. Its source was not edited here; all-workspace TypeScript did include it.

An earlier browser dev-server approach exhausted resources by requesting hundreds of ESM modules and hit file watcher `ENOSPC`. The bundled harness resolved that failure; final full browser runs passed. The old container also became short of disk space. Only regenerable npm/Next caches were removed during implementation. A fresh host should install dependencies and browser normally; do not delete another session's data to recreate this environment.

## 9. Verification, evidence and remaining limits

All results below apply to implementation `e7178673` / tree `b77e8c09`. The handover adds documentation/manifests only; its own checks validate links, counts, hashes, archive integrity, Git tree equality and publication, without implying another full application test run.

| Check | Final actual result |
| --- | --- |
| Repository tests | 25 passed |
| Composed Meri transport | 21 passed |
| Modules/Settings contracts and behavior | 94 passed in 18 files |
| Chromium interaction suite | 59/59 passed |
| Total local tests above | **199 passed** |
| Declared workspace TypeScript | Passed, including Portfolio workspace type checks |
| Public package/dependency artifact checks | Passed |
| Architecture | Zero boundary/cycle errors; 232 retained signals with 206 exact-hash reviewed records |
| Shared web production build | Passed, Next 16.4 / Turbopack |
| Whitespace diff check | Passed |
| Hosted CI | Zero check runs observed; **not** claimed as a CI pass |

Build route output contains `/`, `/_not-found`, `/meri`, `/modules`, `/modules/[module]`, `/settings`, `/settings/[section]`, `/forms/[token]`, `/sign-in/[[...sign-in]]`, `/api/capiro/[operation]` and the proxy. See [build evidence](evidence/build.txt).

The browser suite covers the eight primary module routes, nineteen Settings destinations, Planner view changes and failed-write draft retention, versioned Engagement sessions and shared meeting workflows, calendar date/filter behavior, LegiWatch More destinations and retained-source pagination/stale-preview handling, public form submit/revocation, Settings access/invitation/signature cases, session/organization transitions, expiry, StrictMode, dialog focus/Escape and phone overflow. It does not enumerate a live test of every one of the 528 operations.

Representative synthetic screenshots: [Personal Settings](evidence/settings-personal.png), [Planner list](evidence/planner-list.png), [Strategies](evidence/strategies.png), [LegiWatch research](evidence/legiwatch-research.png), [LegiWatch phone](evidence/legiwatch-mobile.png), [Engagement meeting phone](evidence/engagement-meeting-phone.png). These include deliberate synthetic identities and empty states; they are not customer records. See the [individual browser case results](evidence/browser-results.json).

The context archive preserves `analysis/modules-check-final.log`, `modules-build-final.log`, `modules-browser-final.log`, `modules-unit-final.log` and final architecture output. Earlier `modules-browser-refactor.log`, formatting logs and earlier architecture snapshots are historical; use the final evidence and exact commit, not a first matching old log.

### Known missing contracts / unavailable actions

| Gap | Current treatment | What the next session needs |
| --- | --- | --- |
| Greenfield Meri preferences/runtime controls | Designed surface, explicit unavailable actions | Reviewed public `meri-greenfield` frontend contract and integration ownership |
| Meri governed memory actions | No legacy Clio substitution | Public governed-memory contract, scopes and review semantics |
| HQ impersonation | Handoff not invented | Reviewed tenant/session handoff adapter and permitted qualification |
| SAM / provisioning review | Unsupported contract remains visible as unavailable | Public UI/service contract |
| Billing cancellation window, survey, term changes | Existing hosted Stripe portal used | Reviewed equivalent API if bespoke Figma flow is required |
| Engagement aggregate plan/team/DC | No synthetic aggregate writes | Authoritative plan/team/DC aggregate endpoint and scope semantics |
| Newsletter → Outreach staging | Newsletter persistence works; bridge unavailable | Versioned reviewed staging bridge |
| Strategy and Hill Day assistant | Unavailable new-Meri connection | Greenfield assistant contract, not old runtime fallback |
| Calendar government effective dates / forecasts | No invented dated items | Verified dated-item source contract |

### Live gates not executed

1. Real Clerk login, key/template configuration, session expiry/revocation and tenant/role/client entitlement matrix.
2. Configured backend deployment/version and feature flags matching the pinned source contracts; successful authorized read/write persistence and stale-version responses.
3. OAuth provider connect/callback/disconnect, actual S3 permissions and upload/download behavior.
4. Microphone consent, real browser media codecs, hearing capture ticket/WebSocket backpressure, reconnect/epoch/ack behavior and retained transcript coverage.
5. Real message delivery, publication/recipient side effects, billing portal/actions and any paid generation.
6. Durable Strategy execution/resume/history under actual backend authorization and failure conditions.
7. Integrated Meri/Portfolio/Modules shared-shell behavior, all applicable keyboard/accessibility checks and broader visual acceptance in the designated configured preview.

No merge, deployment, source/provider connection, real message, billing change, backend/infrastructure change or paid model call was performed. Do not turn a live gate into a test by using production identities or actions without the applicable authorization.

## 10. Concurrent Meri/Portfolio work and integration risks

Read-only GitHub refresh on 12 October 2026 UTC observed:

| Work | Status / exact head |
| --- | --- |
| Frontend main | `02c02d95bdf3949662b9123f425271c6491ffdab` |
| Modules/Settings PR #5 before handover follow-up | `e717867300e8568d467ac1cc9a54cab6540f4312`, draft/open, mergeable clean |
| [Meri consolidation PR #4](https://github.com/neo-capiro/capiro-frontend/pull/4) | `e4133397e9d4a9ce835828b0c2db4e6eb5f11e01`, draft/open, mergeable clean |
| Older [Meri PR #1](https://github.com/neo-capiro/capiro-frontend/pull/1) | `b697cfcba6589ef193de4e3bcb25aad773871125`, draft/open |

The previous Meri checkpoint `e141d68f8954ba6c76327bcbed94739d28e0a902` is stale. PR #4 is the current consolidation work; do not independently integrate PR #1 again without inspecting PR #4's preserved history. This handover did not merge or behaviorally audit the updated PR #4.

Carry-forward coordination notes mention a proposed Portfolio common-shell integration owner and checkpoint `85aa5c0a`. That checkpoint/proposal was **not independently verified or accepted in this handover**. Refresh the relevant session/branch and existing Portfolio handover before relying on it. Do not treat the proposal as permission to rewrite shared files or lift an integration/deployment hold.

Shared integration review must cover route ownership, app-wide auth/session/client scope, shell navigation, styles and adopted primitives, configuration, the root package/lock, architecture records, tests and one final `apps/web` build/release pipeline. Portfolio currently remains in `apps/portfolio-web`, linked by a validated HTTPS configuration value. Importing its private source or duplicating its transport is not an accepted consolidation strategy.

Useful preserved baseline context includes [Portfolio handover](../portfolio-31/handover-2026-10-11/HANDOVER.md), [Portfolio move outline](../portfolio-31/REPOSITORY-MOVE-OUTLINE.md), the existing coordination acceptance documents, package READMEs and vendor provenance. All are enumerated in the frontend context inventory. Their historical claims do not automatically qualify this Modules branch or current shared integration.

## 11. Publication mechanics and all-work accounting

Implementation commit `e7178673` was published with the authenticated GitHub connection, then checked against the exact locally staged Git tree. Shell Git push could not authenticate (`could not read Username`), so no new shell credential store was created. The connected publication created blobs/trees/commit and updated the branch with an expected-head lease. PR #5 was created as a draft and read back. Local Git was synchronized to the exact GitHub commit object; the implementation worktree was clean.

This handover follows the same branch and expected-head discipline. If the branch has advanced in a new session, inspect and preserve the new work; do not force it back to the implementation commit. Use a normal authenticated Git push when available. The specialized connector path is only an environment fallback, not a required project workflow.

Temporary `analysis/publish/text-*.json`, binary payloads, registry bundles and commit-object reconstruction files are redundant publication intermediates. Their hashes/paths are in the scratch inventory; the canonical source and exact bytes are in GitHub. Dependencies, `.next`, browser output caches and temporary Chromium are regenerable and not source deliverables. The original workbook/design captures are preserved separately because a Git checkout cannot recover them.

The handover inventories intentionally pin the **implementation commit**, so they do not try to hash themselves recursively or mix later docs into the tested application tree. The later handover commit records `HANDOVER.md`, `CONTEXT-INDEX.md`, manifests, the archive receipt and the README entry link. Use `git show --stat` on that commit to see every handover-only addition.

## 12. Recommended next-session sequence

1. Open PR #5, fetch its current head and read this handover plus repository instructions. Confirm a clean isolated worktree and inspect the implementation/handover commits. Do not start the rebuild over.
2. Read the operation map and the relevant feature/transport source before changing behavior. Recover exact external context using the ZIP and its hashes; use pinned backend URLs to recover reference source. Refresh current design/backend contracts only deliberately, recording drift from the original pin.
3. Refresh main, Meri PR #4 and Portfolio integration ownership. Reconcile shared route/shell/auth/config/lock changes before consolidation. Preserve the old branch as a reviewable checkpoint.
4. Choose the next concrete authorized objective: review/merge preparation, configured preview qualification, a missing contract, or a specific visual/behavioral correction. Source mappings and local passing tests alone cannot close the live gates.
5. For code edits, preserve component lifecycle, permission boundaries, exact version/hash semantics and meaningful tests. Run targeted checks while working, then the appropriate full gates; review any new architecture signals rather than auto-updating them.
6. Record exact new commits, tests and unrun gates. Keep a single reviewable branch/PR history and do not claim deployment or live completion unless those steps actually occur with authorization.

### Paste into a new session

> Continue the Capiro Modules and Settings work from `neo-capiro/capiro-frontend`, draft PR #5, branch `task/modules-settings-20261011`. Read `AGENTS.md`, `docs/IMPLEMENTATION-STANDARDS.md`, `docs/ARCHITECTURE.md` and `docs/modules-settings/HANDOVER.md` first. The tested implementation is `e717867300e8568d467ac1cc9a54cab6540f4312`; follow-up commits contain the handover/context inventories. Do not rebuild or overwrite it. Recover the external source archive `Capiro-Modules-Settings-Context-2026-10-12.zip` (`libfile_56b576fea020819181216fe69cf54323`) if design/workbook context is needed. Read the full file manifests, integration map, verification and remaining gaps. Backend reference is `capirov2@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`; Meri runtime belongs to `meri-greenfield`. Refresh Meri PR #4 and Portfolio integration coordination before editing shared files. Eight module areas, nineteen Settings destinations and 528 reviewed operations are implemented; 199 local tests and the shared build passed. Live integration and missing contracts remain unqualified. Preserve clean modular ownership, existing authorization boundaries and deployment holds. First report the exact current branch/head and the next concrete outstanding step.
