# Capiro 3.1 Portfolio — cross-session handover (2026-10-12 UTC)

> **CRITICAL: SOURCE NOT YET PUBLISHED.** This is a documentation-only handover. It is NOT the missing Portfolio source, a clean full test gate, an approval to merge, or an AWS release. The original local Git checkout, three feature worktrees, bundles, and ignored evidence were not mounted in the current session. On GitHub, codex/portfolio-continuation-20261011 still points to the transfer base. The next coding session must recover and publish the original source commits from the machine/session that holds them.

## 1. Current state and exact Git references

Repository: https://github.com/neo-capiro/capiro-frontend

- Canonical base and remote continuation branch HEAD: 02c02d95bdf3949662b9123f425271c6491ffdab; Portfolio transfer PR #2 merged.
- Unpublished source branch: codex/portfolio-continuation-20261011. Remote branch was successfully created, but has NOT advanced beyond base at the last direct GitHub read-back.
- Documentation-only branch: docs/portfolio-session-handover-20261012. THIS document is the only newly published handover artifact from this current environment.
- Prior reported local integration worktree: /workspace/scratch/158b6018a5d3/capiro-frontend-portfolio. In this current environment that directory is not a Git checkout, and the preceding session's ignored evidence/bundles are absent.
- Local source checkpoint 85aa5c0a816f52e23a0def34e91353ba41eda163 is NOT on GitHub (fetch returned 422 No commit found). Local contract checkpoint ff7eabf152bcc62d1e8a481d5165ae6d1ff9b7b2 and final Watchlist/alert checkpoints require original source recovery, not inference.
- Prior session reported 29 local commits after base at the 85aa5c0 snapshot and later additional local commits; they are not remotely published.
- No Portfolio source PR exists yet. No new AWS changes. No signed-in continuation acceptance.

**Smallest safe recovery:** return to the preceding coding session/machine. Preserve all worktree status and ignored evidence; verify local source commits and Git bundles; compare local ancestry with remote base; fast-forward push codex/portfolio-continuation-20261011 (NEVER force). Confirm GitHub exact HEAD/tree and open a draft source-preservation PR. If the original checkout is unavailable, recover verified prior Git bundles, not recreated code. This docs branch is separate specifically to avoid conflicting with that fast-forward push.

## 2. User directives (scope and architecture)

- Work on Portfolio **only**. Do not take over Meri or Modules/Settings.
- All frontend code belongs in neo-capiro/capiro-frontend, final single Next.js apps/web application. Portfolio and Modules backends belong in neo-capiro/capirov2; Meri backend belongs in neo-capiro/meri-greenfield.
- **Connect to existing capirov2 services**, existing authoritative DB and approved institutional knowledge. Do not create copies of the client DB, a second memory authority or browser DB access. Backend owns tenant RLS, permissions, source provenance and publication governance.
- Use Capiro Figma UI Redesign as source of truth: https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-%E2%80%94-UI-Redesign?node-id=411-40601 . If Portfolio components are missing, add them in Figma and implement matched desktop/phone screens.
- Avoid god files: thin route components, focused state/validation/contracts/API adapters, guarded lifetimes, shared primitives for actual reusable callers, architecture checks.
- Preserve all unrelated work, PRs, app routes and approvals. User waived private capiro-agent-ops access as a requirement to continue this Portfolio lane, but did not waive GitHub/AWS merge/deploy safety holds.
- Existing preview target: https://portfolio-preview.app.capiro.ai/ (historically provisioned; current live DNS/Clerk/ECS state NOT reverified in this environment). Owner requested notice before AWS deployment or resource creation.

## 3. Intended shared frontend and known mismatches

One Next.js apps/web, one root npm lockfile, one shell/HeaderFrame/navigation, one application-wide Clerk authorization boundary, one canonical selected-client scope, one shared tokens/components library, one single image built/released to the existing preview. Backend routing is separated from presentation; product-specific feature modules remain independently owned.

Intended routes: / Portfolio; /portfolio and existing Portfolio deep links; /meri Meri; /modules Modules; /settings Settings.

**Known route mismatch:** Last recorded Portfolio consolidation still renders a synthetic Meri fixture at / by default. CAPIRO_DEFAULT_PRODUCT=portfolio redirects / to /portfolio, not direct rendering at /. There is not yet one universal selected-client provider or application-wide auth across all products. Common-shell owner must resolve this deliberately, not silently overwrite Meri or Modules work.

Shared-file reconciliation seams:
- root package.json, package-lock.json, apps/web/package.json and next.config.ts
- apps/web/src/app/layout.tsx and page.tsx
- apps/web/src/shared/shell/Header.tsx, HeaderFrame.tsx, shell.module.css
- apps/web/src/features/meri/MeriFixtureEntry.tsx
- packages/ui exports, common tokens/global styles, shared auth/client context and API proxy
- apps/web/deployment/portfolio/README.md, deployment sources, architecture/transport tests.

**Ownership:** Portfolio integration session proposed taking common-shell ownership, but the coordinator has not assigned it. The proposal is not permission to overwrite concurrent branches. Product feature lanes should avoid editing root auth, root route, lockfile and shared header until the owner is assigned.

## 4. Concurrent branches — do not double-integrate

**Meri consolidated draft PR #4**: https://github.com/neo-capiro/capiro-frontend/pull/4
- Head at latest independent read-back: 3cc30ff3182e8050d563516607866cf07efe2aef; base 02c02d95bdf3949662b9123f425271c6491ffdab. Prior heads e141d68f8954ba6c76327bcbed94739d28e0a902 and e4133397e9d4a9ce835828b0c2db4e6eb5f11e01 are historical. REFRESH exact PR HEAD immediately before integration.
- PR #4 preserves original Meri cited-answer PR #1 ancestry. **Never also merge PR #1 separately.**
- Contains Figma-based Home/cited answer/run workspace and explicitly synthetic disconnected UI, not signed-in/live Meri agent/runtime acceptance.

**Modules and Settings draft PR #5**: https://github.com/neo-capiro/capiro-frontend/pull/5
- Head at last independent read-back: 50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a; base 02c02d95bdf3949662b9123f425271c6491ffdab; tested implementation was e717867300e8568d467ac1cc9a54cab6540f4312. Refresh exact HEAD before integration.
- Owns Modules/Settings, including Engagement/meetings, Planner/Calendar, Workspace/Hill Day/newsletters, Strategies, Directory, Intel, Research Portfolios and 19 settings destinations. Do not recreate that work here.
- Detailed published handover: https://github.com/neo-capiro/capiro-frontend/blob/50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a/docs/modules-settings/HANDOVER.md
- 1,464-file and backend/Figma context index: https://github.com/neo-capiro/capiro-frontend/blob/50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a/docs/modules-settings/CONTEXT-INDEX.md

Historical Meri PR #4 shared Header.tsx disabled Portfolio mode and used per-frame assetSet icons. Portfolio introduced HeaderFrame and a functional Portfolio link. Reconcile that seam preserving both UI designs; latest PR #4 may differ from earlier review. The original local seam review, docs/portfolio-31/MERI-PR4-SEAM-REVIEW-2026-10-12.md, was never remotely published and must be recovered from the old checkout.

Recommended merge order: recover/publish Portfolio draft branch; agree single common-shell owner; reconcile current Meri #4; integrate current Modules #5; settle shared root route/auth/client scope/CSS/dependencies/lockfile exactly once; run full combined gate; ship ONE exact reviewed image. Do not merge merely because GitHub says mergeable.

## 5. Portfolio work reported locally — product changes NOT published yet

The preceding long-running session reported migrating approximately 703 Portfolio files into apps/web, keeping a file-by-file transfer map and single build. It reported focused implementation/review of:

- Objectives: global New objective button with Figma desktop/phone variants; guarded client selector; full-page Objective form with four-field readiness display; validation, focus and save-receipt guards.
- Prospects: stage progress and mobile labels, current records, opportunity/capability lifecycle guards, registration permissions and save-receipt checking.
- Calendar/Relationships: searchable committee hierarchy, Planner date behavior, four separate calendar feed stale-refresh guards, meeting client preservation, current owner-safe CRUD.
- Quick log: meeting entry opens selected client's Calendar to set required dates/times; no invented atomic commitment/follow-up behavior.
- Files/Documents: account/tenant-scoped file lists/previews, correct selected file after account change, fresh download permission URL, upload/extraction lifetime and receipt guards, Activity attachment deep-link opens existing Files preview. No duplicate viewer.
- Capability editor: Profile/Documents tabs, inline tags, Details disclosure, explicit Save footer, keyboard focus/required error reveal, responsive documents and saved submissions with confirmed read-back after deletion.
- Profiles/facilities: notes, team/owner changes, returned-role verification, facilities/geocoding/district action lifecycle; reviewed candidate selection withheld if backend revision is missing.
- Work: client-scoped Strategies/Files, failure retry, mobile document actions and current-selection guards.
- Index/Activity: hide failed-refresh stale totals, filters, activity entries and selected-client names; preserve healthy independent feeds.
- Advocacy: history timeline, search/status filters, final outcome editor, auth epoch guards, authoritative update read-back, dark-mode icons.
- Bill Tracker: distinct Intel and Core watchlist and personal alert adapters; owner-scoped email/SMS preferences, phone verification, explicit test alerts, interrupted-write and cross-session guards.
- Design-created Portfolio variants: missing Objective/meeting/watchlist/alerts/Capability/submission UI components, with Figma comparison. Do not claim all audit rows accepted.

**OPEN code-review defect:** the final Intel watchlist save receipt/version check may accept a returned saved targeting different from the submitted targeting. The source was locally committed but independent review explicitly requested correction. Do not declare Tracker qualified before adding a mismatched-targeting regression test and fixing receipt validation.

Local reported source checkpoints, for provenance (expand/verify from original machine):
- 85aa5c0a816f52e23a0def34e91353ba41eda163 — 29-commit coordination/source checkpoint.
- ff7eabf152bcc62d1e8a481d5165ae6d1ff9b7b2 — common-shell contract local checkpoint.
- 75409a96d6c58a53c7d44eb6053cc291995caf80 — saved submissions product checkpoint.
- 1c80792 — Documents, f4731d2 — Advocacy, 3e88f1d — browser fixture/timing corrections, 0beb51c — early combined checkpoint.
- ac66c061… — local final Watchlist source; 760dcc6c… — local final alert channels source.
- The three separate lanes were capiro-portfolio-watchlist-current-state (codex/portfolio-watchlist-current-state-20261011), capiro-portfolio-alert-channels (codex/portfolio-alert-channels-20261012), capiro-portfolio-file-arrival (codex/portfolio-file-arrival-20261012). Preserve dirty changes and ignored outputs from all.

## 6. Verification — historical checkpoints are not latest full pass

| Checkpoint | Actual reported result |
| --- | --- |
| Transferred source at base | 728 units and 459 browser tests passed in isolated app. Does not qualify later shared app. |
| Combined 0beb51c | 828 Portfolio units, 32 foundation, 21 transport; architecture/type/lint/format/build/production smoke passed. Full browser was **603/606, 3 failures** (setup timeout, pending-state fixed delay, 12-screen visual timeout). |
| Affected corrections at 3e88f1d | 33/33 browser passed, separate run. |
| Documents at 1c80792 | 60 units, 48 new browser and 38 retained browser passed. |
| Advocacy f4731d2 | 44 units; initial 43/45 browser then affected fixes 5/5. Separate runs. |
| Saved submissions 75409a9 | 34 units, corrected affected 5/5 browser and 2/2 dark-theme check. |
| Calendar / Profile / Work / Facility | Calendar 8 browser, Profile 55 units and 33 browser, Work 26 browser, Facility 19 browser; all targeted results only. |
| Files arrival | 16 new + 11 retained focused browser passed. |
| 85aa5c0 session | Full suite discovery 786 cases; no full combined final browser gate after newer lanes. |

Chromium 149.0.7827.0 local fallback was used after standard Playwright download failure. Font path and dialog grid/CSS collisions corrected; tests changed pending-state fixed timer to held response and bounded visual/smoke timeouts. Preserve original failures, browser traces/captures, exact commit/commands and subsequent rerun. NEVER add targeted pass counts and call that one full passing gate.

Latest source must undergo fresh npm ci, root check/type/lint/format/architecture/transport, all unit tests, full browser, production build and actual-server smoke against a single combined commit and correct browser version. Then desktop/mobile Figma comparison and signed-in authorization/live-data acceptance separately.

## 7. Audit disposition and unresolved service contracts

Published baseline ledger: https://github.com/neo-capiro/capiro-frontend/blob/02c02d95bdf3949662b9123f425271c6491ffdab/docs/portfolio-31/handover-2026-10-11/Portfolio-345-Row-Reconciliation-2026-10-11.json

345 IDs: **337 open in scope; 7 packet exclusions pending; 1 user exclusion CORE-018 CSV import; ZERO accepted complete**. Previous packet classified 265 partial frontend, 72 missing frontend, 1 inactive billing candidate. The newer source reportedly linked 53 rows to work without changing acceptance. Recover exact updated local ledger, reconcile IDs with evidence and keep native/sign-in gates open.

Known backend/decision holds:
- ENG-prep_sender_select lacks senderConnectionId in current single-mail contract.
- CORE-049, CORE-096, ENG-tasks_create lack full durable atomic Quick log commitment/follow-up task.
- PROS-019/020/021 need canonical prospectId for Files and Workspace association.
- CORE-099 needs atomic versioned ordered Primary–Quaternary owners.
- OBJ-26 needs approved objective-bound cross-navigation destination IDs.
- Facility reviewed-candidate selection missing published service revision.
- Older opportunity-fit-score row differs from current Figma; don't invent a metric.
- Distinguish alert preference saved, phone verified, provider test request accepted, and actual message delivered.

## 8. Existing capirov2 service and institutional-memory boundary

Portfolio native server origins: CORE_API_BASE_URL, STRATEGY_API_BASE_URL, WORKSPACE_API_BASE_URL, INTELLIGENCE_API_BASE_URL and explicit TRACKER_BACKEND=core|intelligence. Existing /api/backend/<service>/... proxy validates Clerk/current session, derives the capiro JWT server-side, and does not trust browser tenant headers. Tracker's Clerk owner ID differs from Core database user ID. Maintain separate exact DTO/receipts; no silent Core/Intel fallback. Canonical Capiro database, tenant RLS, source evidence and institutional knowledge remain authoritative. Meri may retrieve approved institutional knowledge only via its governed backend source connectors and client/permission/provenance controls; its own operational conversations/checkpoints are distinct, not a replacement customer database.

Meri reference:
https://github.com/neo-capiro/meri-greenfield/blob/8b123bea4c90794dc2d766814b6ddbdbfe0928bc/docs/INTEGRATION-BOUNDARY.md
https://github.com/neo-capiro/meri-greenfield/blob/8b123bea4c90794dc2d766814b6ddbdbfe0928bc/docs/RETRIEVAL-CONTRACT.md

## 9. Figma components directly consulted

Original design file: https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-%E2%80%94-UI-Redesign?node-id=411-40601

- 1028:188273 My bill alerts Desktop Ready
- 1028:188442 My bill alerts Phone Code requested
- 1028:188160 Phone verification Ready
- 1028:188271 Phone verification component
- 1028:188272 Test saved alert component
- 12:388 v2 Button
- 975:186912 Field/Input, 975:187098 Choice/Control

Figma also contains new Objective, Quick log meeting, Watchlist, Capability tabs/Details, Advocacy, Work mobile and Saved submission designs from prior session; exact IDs beyond those listed must be re-read, not invented. Convert Figma snippet Tailwind-like output to existing codebase styles, avoiding unnecessary dependencies.

## 10. Context file inventory — bring ALL named resources

### Published baseline packet under immutable base 02c02d95

Directory: docs/portfolio-31/handover-2026-10-11/

HANDOVER.md
PHASED-PLAN.md
Portfolio-345-Row-Reconciliation-2026-10-11.json
Portfolio-345-Row-Reconciliation-Summary-2026-10-11.md
implementation-matrix.csv
implementation-matrix.json
phase-audit-map.csv
phase-audit-map.json
figma-screen-index.csv
master-calendar-screen-index.csv
Portfolio-AWS-CLI-Preview-Readiness-2026-10-11.md
Portfolio-Image-Scan-Assessment-2026-10-11.md
Portfolio-Single-Environment-Test-Plan-2026-10-11.md
Email-Prep-Sender-Contract-Review-2026-10-11.md
Objective-Cross-Navigation-Contract-Review-2026-10-11.md
Ordered-Client-Owners-Contract-Review-2026-10-11.md
Prospect-Files-Workspace-Contract-Review-2026-10-11.md
Quick-Log-Commitment-Contract-Review-2026-10-11.md

Full published references directory (13):
docs/portfolio-31/handover-2026-10-11/references/HANDOVER.md
docs/portfolio-31/handover-2026-10-11/references/backend-and-related-candidates.json
docs/portfolio-31/handover-2026-10-11/references/billing-fence-discovery.json
docs/portfolio-31/handover-2026-10-11/references/billing-flow-revalidation.md
docs/portfolio-31/handover-2026-10-11/references/billing-pending-updates.json
docs/portfolio-31/handover-2026-10-11/references/cleanup-coordination-20261011.json
docs/portfolio-31/handover-2026-10-11/references/current-source-state.json
docs/portfolio-31/handover-2026-10-11/references/frontend-checkpoint.md
docs/portfolio-31/handover-2026-10-11/references/meeting-review-checkpoint.md
docs/portfolio-31/handover-2026-10-11/references/meri-handoff.json
docs/portfolio-31/handover-2026-10-11/references/qualification-aa316e0.json
docs/portfolio-31/handover-2026-10-11/references/tasks-contract-checkpoint.md
docs/portfolio-31/handover-2026-10-11/references/workbook-preservation.json

All published checkpoint files under docs/portfolio-31/ (name verified from GitHub contents listing):
ACTIVITY-ACTIONS-CHECKPOINT.md; ADVOCACY-CORRECTIONS-CHECKPOINT.md; ATTENDANCE-CHECKPOINT.md; BILL-HEARINGS-CHECKPOINT.md; BILLING-FLOW-REVALIDATION.md; BILLING-SUMMARY-CHECKPOINT.md; CALENDAR-ACCESS-BOUNDARY.md; CALENDAR-SYNC-CHECKPOINT.md; EMAIL-COMPOSE-CHECKPOINT.md; ENRICHMENT-CHECKPOINT.md; FACILITIES-CHECKPOINT.md; GLOBAL-OBJECTIVE-CHECKPOINT.md; IMPLEMENTATION-CHECKPOINT.md; IMPLEMENTATION.md; INTAKE-CHECKPOINT.md; MANUAL-DEBRIEF-CHECKPOINT.md; MEETING-COMPOSITION-CHECKPOINT.md; MEETING-DOCUMENTS-CHECKPOINT.md; MEETING-LIBRARY-CHECKPOINT.md; MEETING-PREPARATION-CHECKPOINT.md; MEETING-REVIEW-CHECKPOINT.md; MEMBER-QUICK-LOG-CHECKPOINT.md; OBJECTIVE-RECEIPTS-CHECKPOINT.md; OVERVIEW-REMOVAL-CHECKPOINT.md; PORTFOLIO-INDEX-CHECKPOINT.md; PROFILE-CAPACITY-CHECKPOINT.md; PROFILE-INTEGRATION-OUTLINE.md; PROFILE-TOOLS-CHECKPOINT.md; PROGRAM-ELEMENTS-CHECKPOINT.md; PROPOSAL-PERSISTENCE-CHECKPOINT.md; PROPOSAL-PERSISTENCE-CONTRACT.md; PROPOSALS-CHECKPOINT.md; PROSPECT-BRIEF-CHECKPOINT.md; PROSPECT-CONTACTS-CHECKPOINT.md; PUBLIC-EVENT-CHECKPOINT.md; REGISTRANT-INTAKE-CHECKPOINT.md; RELATIONSHIPS-CHECKPOINT.md; REPOSITORY-MOVE-OUTLINE.md; SAVED-LAYOUT-FRONTEND-CHECKPOINT.md; TASKS-CONTRACT-CHECKPOINT.md; THREAD-MAIL-CHECKPOINT.md; VISUAL-ASSERTION-CHECKPOINT.md; VOICE-SOURCE-CHECKPOINT.md; WORK-HANDOFF-CHECKPOINT.md.

Baseline source/config directories to retrieve entire trees, not just names:
apps/portfolio-web/ (src/, tests/, scripts/, public/, deployment/, AGENTS.md, README.md, Dockerfile, .dockerignore, .env.example, next.config.ts, package.json, package-lock.json, playwright.config.ts, vitest.config.ts, tsconfig.json, eslint.config.mjs);
apps/web/src/app/, apps/web/src/features/, apps/web/src/shared/, packages/ui/, root package.json and package-lock.json.

### Unpublished new-session context to recover from original worktree

- docs/portfolio-31/CONTINUATION-2026-10-11.md
- docs/SHARED-INTEGRATION-CONTRACT-2026-10-12.md — earlier reported locally committed ff7eabf...
- docs/SHARED-FRONTEND-PREVIEW-GUIDELINES-2026-10-11.md — exported at /workspace/scratch/158b6018a5d3/capiro-frontend-portfolio/docs/, not published in GitHub
- docs/portfolio-31/MERI-PR4-SEAM-REVIEW-2026-10-12.md
- apps/web/deployment/portfolio/README.md
- outputs/evidence/portfolio-shared-integration-20261011/, other outputs/evidence/portfolio-* raw tests, captures, logs, Figma screenshot attachments, SHA manifests, architecture reports and file-by-file 703-file transfer mapping.
- three worktree uncommitted or committed source histories listed above.
- earlier portable bundles portfolio-continuation-85aa5c0.bundle and portfolio-continuation-ff7eabf.bundle; prior 85aa5c0 bundle SHA-256 was recorded as e20a45c16b40200c9d7178be3c4aff4d24c18d775cd3646e003f38ea6cb3e7f2. Verify hashes/heads and base dependency before import.

External required context:
- Original user-uploaded Capiro-3.1-Portfolio-Audit (1).xlsx. Prior session observed 345 IDs across 6 sheets, including six formulas; this original file is NOT proven to be in GitHub. Reattach or carry it to next session.
- Figma file and newly created frames listed above.
- neo-capiro/capirov2 current service/controller/contract source; meri-greenfield governed integration/retrieval docs.
- latest PR #4 and #5 docs/source and their exact HEADs, not older snapshots.

**Inventory limitation:** this enumerates every specifically identifiable published context document and prior local artifact named in the record. The absent local 703-file source and ignored evidence cannot be byte-verified here. For a genuinely exhaustive per-file inventory run git ls-tree -r --name-only on the recovered source HEAD and hash ignored/untracked artifacts separately. Do not assert that a directory name alone means all bytes have been archived.

## 11. Deployment, acceptance and next-session procedure

Preview plan: one reviewed apps/web Next.js source commit → one CodeBuild source upload/build → one scanned ECR image digest → an approved update to the existing isolated ECS/Fargate preview service → HTTPS/ALB/DNS/Clerk and exact task digest read-back → signed-in user/client/tenant/canonical service acceptance. Preserve prior image digest/task revision for rollback. The previous preview had historical healthy infrastructure, but this continuation was **not** deployed; fresh AWS read access and user coordination are needed, no new resources or credentials authorized by this handover.

Safe restart sequence:

1. Fetch this handover, the original immutable October 11 HANDOVER.md, PHASED-PLAN.md, 345-row JSON, Figma/implementation indices and original audit workbook.
2. Recover the original local Git checkout and all three worktrees. Record git status, branches, exact HEADs and base. Save dirty patches and ignored evidence FIRST; verify portable bundle integrity. Do not reset/discard.
3. Fast-forward publish recovered Portfolio continuation to codex/portfolio-continuation-20261011, which was still at base when checked. Read back exact GitHub commit/tree. Open DRAFT source PR. Do not mistake this documentation-only commit for source.
4. Fix Intel saved-targeting receipt mismatch and expand the failing regression tests. Run all combined clean-install/check/build/actual-server/browser tests at one exact source SHA. Preserve raw failed attempts. Update the row ledger without unsigned acceptance.
5. Reconcile common-shell ownership and integrate fresh Meri PR #4 and Modules PR #5 while preserving PR #1 ancestry. Unify root route, auth/client context, HeaderFrame, config, styles, dependencies/lockfile, one release process.
6. Re-run qualification on combined exact source and compare Figma desktop/mobile. Obtain authorized AWS/Clerk read-back before preview shipment; tell user when authentication/deployment is needed. No production cutover, unreviewed merge, provider send, DB change or resource creation.
7. Verify deployed signed-in Portfolio flows against existing capirov2 and canonical data; close audit rows only with accepted native evidence.

**Current holds:** unpublished source recovery; unresolved Intel watchlist receipt correctness; incomplete final combined full-browser gate; shared-shell owner not assigned; Meri/Modules merge conflicts; live AWS/Clerk/digest and signed-in acceptance unverified; 337 in-scope audit rows remain open. No deployment or merge authorization is implied by this file.
