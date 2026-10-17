# Coherent non-Meri size review, 2026-10-17

This independent source review inspected coherent checkout `2f0a5300` and the
architecture result at `%TEMP%/capiro-integrated-architecture.json`. That scan
reports 537 size findings, 497 exact reviewed, 19 inherited unchanged and 21
blocking. Eleven blocking findings are covered here; the other ten belong to
the Objective UI review. The SHA-256 values below are the scanner's exact
function fingerprints. They are source-specific review evidence, not a waiver
of the architecture thresholds. A source edit requires a new scan and review.

| Function and exact fingerprint | Responsibility review | Decision |
| --- | --- | --- |
| `PersonnelDirectory.tsx` `PersonnelDirectory` (247 nonblank lines), `d989c6b78b1f56d7be37cce7b6a11b61583a876f58a1e287c06221a402079c04` | One directory list binds validated URL filters, a filter-scope-bound row selection, the list query and the table. The selected profile has its own component and exact-id read. The large table column definitions are presentation, not another data or write owner. | **Historical conditional review:** the contact link correction below supersedes this fingerprint. Review the corrected bytes before recording the final fingerprint. No size-driven extraction is needed. |
| `PersonnelProfile.tsx` `PersonnelProfile` (155), `311bf8d2b7cd5efa4d98e50c812fc6bdd82396e02071ceabafff78a9739e5a37` | One selected profile exact-id query renders identity, role/contact facts and source chronology. It rejects a mismatched returned id, parses outbound URLs and labels observation dates as evidence rather than employment tenure. It has no independent writer or selection owner. | Exact-source design review supports retention. |
| `CommitmentView.tsx` `ScopedCommitments` (105), `2e0b4c173dd6eb9c4a0c066b58209e2da3da5351489dd68a5e9803e1b882c511` | One client-keyed commitment list owns status filtering, selected editor lifetime and completion pending guards. The table and form are child owners; canonical Capiro hooks own the reads and mutations. The source remains within the prior reviewed workflow. | Refresh exact-source review. |
| `CommitmentView.tsx` `CommitmentForm` (91), `89f438c736ab0ca9b751c883d631aa4e5903b0bd1f73cba8319350f9cc9207bc` | One draft form owns title, description, due day and a pending submit/dismissal barrier. The changed due-day initialization delegates to `commitmentDueDay`; `commitmentFields` remains the pure save projection. No second persistence path was introduced. | Refresh exact-source review. |
| `PlannerScreen.tsx` `PlannerScreen` (148), `a03dc9db150c7a345d9a9652d5eac51b537ce6dd9a78769e2daf251eb667543b` | Existing page composition chooses ordinary Planner sections, saved-plan observation or the separate current-project receiver. The latest change delegates current-link eligibility to `canReadCurrentProjectLink`; `CurrentProjectLink` still validates the URL, selected client and fresh project read before showing the workspace. | Refresh exact-source review; no additional split. |
| `create-intent.test.ts` `<anonymous>` `describe` callback (196), `a4a659d23bc5d6409da38dcf62ddd47425b6956a41f98f2863efb8798d9799bd` | One grouped test suite covers persisted-before-POST replay, changed-draft refusal, explicit abandonment, scope isolation, storage failure and an in-flight duplicate guard. Each `it` callback is separate; the scanner counts their lexical parent. | Exact-source test review; splitting the suite does not simplify production ownership. |
| `research-navigation.test.ts` `<anonymous>` `describe` callback (90), `acd5a713eb5ea8555cca08e740066fd1b26603716278ca3823dc0f892ab4044f` | Four related URL projection tests exercise selected tab/history, duplicate/invalid hints, filter restoration and cursor omission. The test callback has no runtime responsibility. | Exact-source test review. |
| `ResearchCreate.tsx` `ScopedResearchCreate` (184), `10090a70383d44e07660d06b9bb99489937da86e2315c554210c5fbb5cc7bcb4` | One account-keyed create dialog owns form and pending-result presentation. `ResearchPortfolioCreateIntent` separately validates and persists exact draft/idempotency identity before POST, survives reload and blocks changed details; the component checks the current actor before and after dispatch and requires the returned actor to match. It does not implement a second replay mechanism. | Exact-source design review supports retention. |
| `ResearchPortfoliosScreen.tsx` `ResearchPortfoliosScreen` (182), `6b5f66ec97befa656e0260e938eb33fed8a1f8ea88792e1948df09775b7d10e1` | One portfolio list owns bounded URL filters, cursor history, list query and row opening. URL construction is in `research-navigation`; `ResearchPortfolioDetail` owns the selected exact-id read and tab content. A render-time reset discards cursors when filters change, and detail return reloads the list. | Exact-source design review supports retention. |
| `ProfileSettings.tsx` `ProfileSettings` (203), `be3e73fe9248163d334ba8e88cea4bdea14ceec897db3d1fe6634c898612f97e` | One Settings profile list owns search/status tabs and archive/restore dialog lifetime. `useSettingsAction` serializes local mutations; the helper verifies the returned profile id and achieved status. The changed `action.busy` close guard retains the archive dialog during a pending write. | Refresh the existing exact review for this source; no new owner. |
| `ProfileSettings.tsx` `CreateProfile` (86), `3903509085a7e126734a5e96fcd57f8b6ca4ee4572069f7fc8e80d0571634fdd` | One create form owns its three draft fields and submit feedback. The changed close guard retains the form while `useSettingsAction` is busy; the success callback refreshes and closes it. | Refresh the existing exact review for this source. |

## Personnel contact link correction

The list's Contact column checks `publicProfileUrl` with a scheme regex only
inside `href`. A nonempty invalid URL therefore still renders a “Public
profile” anchor with no `href`, presenting an unavailable action as a link.
`PersonnelProfile.externalUrl` already used a URL parser, restricted to HTTP(S)
and rejected embedded credentials. The correction moved that pure validator to
`personnel-links.ts` for both list and detail, renders “Not available” for an
invalid list URL, and adds focused list cases including non-HTTP and credential
URLs. The list test now renders the Contact column. Focused tests and the new
architecture fingerprint remain for the integration owner to verify.

## Composition and duplication check

`DirectoryScreen` mounts `PersonnelDirectory`, which alone mounts
`PersonnelProfile` after choosing a returned row. `ContactPreview` belongs to
the separate congressional contacts path. `ModuleScreen` mounts
`ResearchPortfoliosScreen`, which mounts `ResearchCreateAction` on the list and
`ResearchPortfolioDetail` for selection. The detail delegates tab content to
its existing children. No duplicate or unreachable Personnel/Research/Settings
component was found in these inspected paths. The only production-source edit
after this review is the narrow personnel link correction above.
