# Frontend integration ledger (2026-10-18)

Branch `fable/frontend-integration-20261018` merges every frontend line that was already built into one candidate. It is not deployed, no image was built, and merging it does not make anything complete. Live qualification (sign in, prompt, real response, saved history after reload, follow-up turn) happens later, on the combined candidate with the runtime and Core integration branches.

- **Base:** `fable/meri-host-size-split-20261017` @ `4ea553fe`, the deployed preview rev 17 line (contracts 0.1.10, `X-Meri-Action-Session`, `publicRequestOrigin`, fresh 300 s Clerk token for the Meri session route, stored-conversation recovery, WAF-safe history/list bodies).
- **Method:** merge commits only (`--no-ff`, no squash, no rebase), so every input keeps its own commits. Conflicts were resolved as a union of intent. Where two versions of the same concern really conflicted, the deployed behavior stayed, unless dot's version was strictly newer for that concern.
- **Coordination:** [meri-greenfield#121](https://github.com/neo-capiro/meri-greenfield/pull/121), posts prefixed "Fable frontend lane:".

## 1. Inputs merged

Every open capiro-frontend PR head (#1, #4–#91) is now an ancestor of this branch. The table lists the merges that brought in commits the base did not already have, in merge order. All other PRs were already ancestors of one of these.

| Merge commit | Input | Head | Content effect |
|---|---|---|---|
| `e115dcc7` | PR #91 (dot): Outreach-only Engagement + first-chat receiving; stacks #77, #78, #81, #82, #83, #86–#90 | `143c20a1` | 31 commits; conflicts in §2.1 |
| `9f17eb01` | PR #85: non-Meri desktop product fixes | `f3e24825` | No content change. The branch was rewritten after #86 forked from it; its 18-path delta is already in #91 as separate commits |
| `00d68776` | PR #84: docs, PR81 image terminal (contains #81) | `2c7e73b1` | Docs |
| `9cb839c9` | PR #79: held PR70 first-chat preview config | `7e0c5da4` | Deployment template and docs; see §2.4 |
| `f94f86c6` | PR #89: task-command root origin (contains #61) | `0936b4b6` | Desktop governed task updates; clean merge |
| `0ed048a0` | PR #65: Meri preferences handoff (contains #62, #63) | `b1297802` | Personal Meri preferences; conflicts in §2.5 |
| `f06960a2` | PR #80: held governed Objective Strategy intake UI (contains #66, #68, #69, #75) | `de59687e` | No content change; see §2.6 |
| `28de5d1c` | PR #76: Research create intent survives reload (contains #74) | `eee2791a` | No content change; already in #91 as patches |
| `27634ab7` | PR #73: Settings profile dialog write lifetime | `2220a4a6` | No content change; already in #91 as a patch |
| `6b1dba57` | PR #72: commitment due day in local time | `009430af` | No content change; see §2.3 |
| `9cdcf87a` | PR #71: Clerk production domain readback (docs) | `a841d5aa` | Docs |
| `73076dc8` | PR #7: Portfolio session handover (docs) | `c953bc08` | Docs |
| `4f535943` | PR #11: remaining-screens assessment (evidence) | `e9ba4c32` | 562 evidence files under `docs/remaining-assessment-20261012/` |
| `bd0823d7` | PR #12: frozen-image build execution archive | `305180e5` | `execution/portfolio-4a16148/` tooling and evidence; no application source |
| `9cf8f51a` | PR #43: Meri phone Home parity, Figma 3.1 | `d542239d` | Evidence only; the layout was superseded (§2.7) |
| `73deb9aa` | PR #55: selected-meeting desktop Prep layout | `9b7e087c` | Provenance only (§2.3) |
| `148993da` | Branch `fix/meri-exact-run-reconnect` (no PR) | `c060f046` | Exact-run pin on same-host reconnect (§3) |
| `6bbbedfb` | Branch `fix/portable-desktop-test-harness` (no PR) | `74a2008a` | Windows Bash selection for the container smoke test |

## 2. Conflict resolutions

### 2.1 #91 against the deployed first-chat line

dot's `4bc12537` (bind the Meri proxy origin to the configured public preview host) and `143c20a1` (carry browser Meri sessions outside Clerk Authorization) port Fable's `0b03d4a2` and `2651a8a1` onto dot's line. Most files were identical. Fable's later `17bc7e3c`, `5d0905b1` and `4ea553fe` were kept.

- `meri-conversations/config.ts` and `proxy.ts`: union. The branch keeps the deployed same-origin session header and Bearer upstream. It also keeps #90's upstream `Origin: frontendOrigin` and its `frontendOrigin` gate: conversations are enabled only when `CAPIRO_REQUEST_ORIGIN` is configured, and in read-only preview only when that origin equals `CAPIRO_EXISTING_APP_URL`, which must also be `https://portfolio-preview.app.capiro.ai`. `history-proxy.ts` auto-merged the same way.
- `preview/meri-conversation-route.server.ts`: dot's fixed public-origin admission (no fallback to `request.url`). This is newer and stricter for the same concern. Contracts pin stays `0.1.10`; #91 had `0.1.8`. A read-only check of task definition `capiro-portfolio-preview:17` shows it already sets `CAPIRO_REQUEST_ORIGIN` = `CAPIRO_EXISTING_APP_URL` = the preview origin and `CAPIRO_PREVIEW_MERI_CONTRACT_PACKAGE_VERSION=0.1.10`, so the stricter gate holds for the deployed configuration.
- `host-controller.ts`: dot's `credentialHeader`, which sends `authorization` only for an explicit direct Meri origin and `x-meri-action-session` otherwise. On the same-origin path this is the deployed behavior.
- Tests: dot's added Origin, configuration-split and direct-origin cases kept; the deployed test title kept where only the title differed.

### 2.2 Packages

`@capiro/meri-contracts` stays `file:../../vendor/capiro-meri-contracts-0.1.10.tgz`. No lockfile change. `packages/meri-client` ships both vendored applications (`task-command-application/0.1.0`, `user-preferences-application/0.1.0`) and both subpath exports (§2.5).

### 2.3 Outreach-only Engagement (#87) against older Engagement edits

#87 (`b57072a5`) made Engagement Outreach-only, removed Engagement commitments, the meeting library and split view, and manual Engagement plans, and routed meetings to Portfolio.

- #85 and #72 edits to `CommitmentView.tsx`, `commitment-fields.ts` and `engagement-commitment-fields.test.mjs`: the deletion is kept. The #72 due-day fix had already landed (`cd242ad7`) before #87 removed the view.
- #55 edits to `MeetingLibrary.tsx`, `MeetingSplitView.tsx`, their CSS and the selected-meeting browser spec and fixtures: the deletion is kept, along with #87's size-review records.
- `registry.ts` / `registry.test.ts`: `engagementPlanOperations` is not registered.
- `module-catalog.ts`: #87's Outreach-only Engagement card is kept; #85's scoped hub copy is already present via `1fd6f72c`.

### 2.4 #79 held preview template

The template allowed only contracts `0.1.8`, while the app and rev 17 require `0.1.10`. `aa889996` aligns `preview-config.mjs`, `service.yml` and `scripts/preview-config.test.mjs` to `0.1.10` (9/9 pass). The template's Meri runtime pins (`f005f773…` / `sha256:6a03d536…`) are stale against rev 17 (`e2723ed8…` / `sha256:c2b6369d…`). They are left for the runtime owner (§6).

### 2.5 #65 against #89

These are sibling task6 branches. Union: both vendored applications in `files`, both subpath exports, and both server adapters in `scripts/architecture/dependencies.mjs` (`api/task-commands`, `api/settings/user`). The browser harness port parsing was equivalent; one form is kept.

### 2.6 #80 against dot's integrated intake

`ObjectiveStrategyIntake.tsx` and `objective-strategy-intake-session.ts` were added on both sides. The branch keeps dot's later integrated version `2f0a5300`, made five minutes after `de59687e`. De59687e's `observedState` was written but never rendered, and its "Refresh current work to check progress" copy promised progress the UI does not show.

### 2.7 #43 Meri phone Home (Figma 3.1)

The base has since rebuilt the same phone Home against the later Figma 3.4 and 10.04 frames (`5ce8ea37`, `b2c7b172`, `d03a5e60`). It also wraps the third start tile instead of putting it in a scroller (`9b4de058`), so #43's focus-scroll reveal has nothing left to fix. The newer layout is kept in `MeriSuggestions.tsx`, `MeriHomeFixture.tsx`, `home.module.css`, `shell.module.css` and the theme/parity specs. `meri-phone-parity.spec.ts`, which asserted the Figma 3.1 geometry, is not carried. `docs/meri-phone-parity-20261014/` is retained.

### 2.8 Smaller merges

- #76 `ResearchPortfoliosScreen.tsx`: keeps #78's URL-state screen, which already mounts `ResearchCreateAction`.
- `fix/portable-desktop-test-harness`: `preview-backend-boundary.test.mjs` keeps the integration side, which already normalizes Windows paths and also checks the Meri conversation routes.

## 3. Integration fixes (non-merge commits)

| Commit | Fix | Why |
|---|---|---|
| `aa889996` | Contracts `0.1.10` in the held preview template | §2.4 |
| `59ffd28c` | Task commands and preferences compare Origin through `sameRequestOrigin` with `CAPIRO_REQUEST_ORIGIN`. Task commands send the session in `X-Meri-Action-Session`, refuse a browser `Authorization` header before `auth()`, and forward the session to Meri as its bearer | #61/#89 and #62/#65 branched before `0b03d4a2`/`2651a8a1`. Behind the standalone bind address, `request.url` is the internal origin, and Clerk reads a browser bearer as signed out, so both routes would refuse every real request once enabled |
| `29cae7b9` | Add `/api/documents/*`, `/api/task-commands/*` and `/api/settings/*` to the Clerk proxy matcher, with a test | Their handlers call `auth()`, which throws unless `clerkMiddleware` ran; none was ever matched |
| `cdf1f0a9`, `27f3c28b` | **H1 (runtime 00076b0a):** 404 `NOT_FOUND` before a conversation's first run is a quiet empty state on both reads (details below this table) | Before H1, control returned 502 and every fresh conversation showed an error |
| `108baa16`, `7aa8ed22` | "Task updates" link in the sidebar and phone menu (`ClientScopedLink`) | `/meri/task-updates` was routed but linked from nowhere. It shows its own unavailable state while held |
| `07120781` | Size-review records for `PersonnelDirectory`, `QuickLogSession`, `IntegrationSettings`, `DataTable` and `taskCommandTransport`; scoped lint exemption in `objective-meeting-destination.test.ts` | #91's own tip fails `npm run architecture` (4 blocking) and `npm run lint` (1 error). Each delta was read and its reason recorded |
| `148993da` | Merge of `fix/meri-exact-run-reconnect`: after a session binds, the host keeps the admitted client/conversation/run as its hints | A same-host expiry reconnect re-authorizes the exact run, and a substituted run is refused. Reviewed on 2026-10-15 but never in a PR |
| `25742e9a` | Boundary test lists `api/task-commands` and `api/settings/user`. Task commands are held in preview like documents and settings | #89's and #65's own tips fail this "review newly introduced API surfaces" assertion |
| `4d329aa7` | The "Search conversations" tooltip now says only search is missing | `POST /api/conversations/list` backs Recents |
| `95a0d908` | Preferences route forwards the native Clerk session token instead of the `capiro` template token | Runtime preferences check Core identity/membership with the same bearer, and Core requires the native `sid` (§6.3) |
| `92d8cd16` | Selective receipt of the Figma 3.4 docs evidence from `docs/figma34-gaps-20261016` @ `8a9c7da1` | dot's docs disposition (§8) |

**H1 (runtime 00076b0a).** Before a conversation's first accepted input, Meri has no run, and from transcript's point of view no conversation row (`apps/control/conversations/history/store.mjs` on the runtime integration branch). Both reads answer the contract's 404 `NOT_FOUND`:

- `POST /api/conversations/history` (session-bound current run; `useRunCommands` → `port.history()`): `NOT_FOUND` sets the transcript to `empty` (`27f3c28b`). RunStatus shows nothing, no operation alert is raised, and no observation starts. Previously this showed "The current transcript could not be loaded" plus an alert.
- `POST /api/conversations/transcript` (native saved history; `useConversationHistory`): `NOT_FOUND` sets `empty`. ConversationHistoryStatus shows "No saved turns yet." instead of "Saved conversation history unavailable" (`cdf1f0a9`).
- Only `NOT_FOUND` with status 404 is quiet. All other codes and statuses keep their current handling. A 404 never revokes the session: the client revokes only on 401/403 (`packages/meri-client/src/conversation-network.ts:150`), and history `denied` covers only 401/403/`MEMBERSHIP_CHANGED`. Write gating (`sessionHistoryState`) does not read either flag, so the first message can still be sent.
- Tests: `meri-session-history-not-started.test.ts`, `meri-history-not-started.test.ts`; live, input-recovery and first-chat host suites still pass.

## 4. Checks (quick only)

All of these ran on this branch's head, on Windows with Node 24.

| Check | Result |
|---|---|
| `npm ci --ignore-scripts` | OK, once (no lockfile change afterwards) |
| `npm run typecheck --workspace @capiro/web` | 0 errors |
| `npm run lint --workspace @capiro/web` | 0 errors, 94 pre-existing warnings |
| `npm run architecture` | 0 errors, 0 blocking (519 findings: 501 reviewed, 18 inherited-unchanged transfer findings, non-blocking by design) |
| vitest, touched or conflicted (`tests/`) | Meri conversation host/proxy/route/live/reconnect/history, first-chat core/host/route/policy, action/document proxies and transports, request-origin, initial-input, task-command proxy/adapter, user-preferences, preview route activation, objective-meeting-destination, objective-strategy-intake: all pass (18 files / 452 tests, 11 / 153, plus singles) |
| vitest, `src/**` (capiro config) | 10 files / 59 tests pass. `src/shared/capiro/vitest.config.mts` computes `root` with `URL.pathname`, which yields `C:/C:/…` on Windows; this run used a temporary uncommitted config with `fileURLToPath` |
| `node --test apps/web/test/*.test.mjs` | 16/16 files pass |
| `npm run test:transport` | 112/112 |
| `node --test scripts/preview-config.test.mjs` | 9/9 |
| `node --test scripts/deployment-cli.test.mjs` | 1 pass, 2 fail on this Windows host only: the shipping tool requires `linux-x64`, and symlink creation needs privileges. Neither is related to the merge |

Not run (deferred by plan): full vitest/jest suites, `npm run build`, browser/Playwright parity, image builds, live qualification.

## 5. Wiring inventory

"Reachable" means a route renders the feature and its gate is open in the deployed preview env. In rev 17 these are open: `MERI_CONVERSATION_WORKFLOW_ENABLED`, `MERI_FIRST_CHAT_BOOTSTRAP_ENABLED`, `CAPIRO_PREVIEW_MERI_CONVERSATION_ROUTES_ENABLED`, `CAPIRO_PREVIEW_READ_ONLY=true`. These are held: action, documents and task commands.

### 5.0 Completion-gate status per family

Status values: **wired** (frontend reaches the backend route in the integrated candidate's configuration), **source-only** (frontend source exists; the remaining task is listed) or **deferred by Neo** (none recorded). Merged source alone is not completion. Every source-only row keeps the gate open.

| Family | Frontend status | Exact remaining task (owner) |
|---|---|---|
| Conversations: first-chat bootstrap, allocate/admit/submit, stream and reconnect, Stop and recovery, next turn, list (Recents), transcript, stored-chat recovery, exact-run reconnect pin, H1 pre-first-run empty states (history and transcript) | **wired** | Live qualification on the integrated candidate (prompt → response → saved history after reload → follow-up); the runner exit 2 (runtime D14) blocks it (runtime lane). Confirm the runtime accepts #90's upstream `Origin` (§6.1) (runtime lane + this lane) |
| Conversation artifact preview/download | source-only | Meri artifact/document read service; preview activation for `/api/documents/*` reads (runtime lane; frontend preview policy here) |
| Meri Files (document workflow) | source-only | Meri document service; `MERI_DOCUMENT_WORKFLOW_ENABLED` + `MERI_DOCUMENT_OPERATION`; preview activation (runtime lane, deploy config) |
| Recommendation actions | source-only | Meri action service; `MERI_ACTION_WORKFLOW_ENABLED`; preview activation (runtime lane, deploy config) |
| Desktop task updates | source-only (now linked, proxy aligned) | Meri task-command application mounted; `MERI_TASK_COMMAND_WORKFLOW_ENABLED`; preview activation (runtime lane, deploy config) |
| Personal Meri preferences | source-only: composed but disabled (proxy aligned, native token since `95a0d908`) | Runtime preferences are composed behind the conversation membership gate; enabling them needs their tables, audit and schema provisioning qualified, then `MERI_USER_PREFERENCES_ENABLED`, plus a preview activation path if it should run there (runtime lane, deploy config) |
| Governed Objective Planner read and Strategy intake | source-only | Core PR48 + PR53 + PR56 read pin, intake serving authority, reviewed preview routes (Core lane); then flip the two constants (this lane) |
| Meri workspace screens: runs, approvals, memory, routines, data access, sources/coverage, browser, attachments, workspace files | source-only (fixture routes only) | Meri routes listed in `meri-resources/unavailable.ts` (runtime lane), then mount the existing screens on live data (this lane). Browser stays a product default per Neo; only its activation waits on host qualification |
| New conversation | source-only | Meri create-conversation selector (runtime lane), or back the button with `useBeginNewChat` (this lane, after the integrated chat test) |
| Search conversations | source-only | Meri search route (runtime lane) |
| Non-Meri desktop (Portfolio, Modules, Directory, Research, Settings, Outreach-only Engagement) | merged | Served by existing Core/Workspace/Intelligence APIs where configured; the read-only preview admits only identity and client reads. Browser parity was not rerun here |

### 5.1 Wired in this branch (frontend composition only)

- Task updates navigation entry (`108baa16`, `7aa8ed22`).
- Clerk middleware on the documents, task-command and settings API routes (`29cae7b9`).
- Task-command and preference proxies on the shared session-header and public-origin conventions (`59ffd28c`).
- H1 (runtime 00076b0a): quiet empty state for session history and saved transcript before the first run (`cdf1f0a9`, `27f3c28b`).
- Exact-run reconnect pin (`148993da`).
- Accurate "Search conversations" unavailability copy (`4d329aa7`).

### 5.2 Built but not reachable, with what each needs

| Feature | Where | Gate today | Needs |
|---|---|---|---|
| Personal Meri preferences (#62/#65) | `/settings/preferences`, `/settings/meri-preferences` (`MeriPreferencesPanel`, `UserPreferencesHost`); linked from Personal settings and the Meri sidebar | `MERI_USER_PREFERENCES_ENABLED` unset; `/api/settings/user/*` always held in read-only preview | **Meri:** the runtime preferences application is now composed but disabled (meri-greenfield#145). It checks membership through `conversationMembership` → `createCoreMembershipGate` with the same bearer. Enabling it needs canonical settings tables, atomic audit and schema provisioning. **Token (resolved, `95a0d908`):** the route forwards the native `session.getToken()`, because Core's normal authority requires `sid`, which the `capiro` template lacks; the marked Meri control credential is never used here. **Preview:** an activation path if it should run there. The other six preference tabs need Meri settings routes that do not exist (`meri-resources/unavailable.ts`) |
| Desktop governed task updates (#61/#89) | `/meri/task-updates` (now linked) | `MERI_TASK_COMMAND_WORKFLOW_ENABLED` unset; held in preview | Meri task-command application (`/api/task-commands/prepare|execute`) mounted and qualified; preview activation if wanted |
| Recommendation actions | `/meri/actions` (linked) | `MERI_ACTION_WORKFLOW_ENABLED=false`; only `action-followthrough/session` passes the preview | Meri action service; preview activation |
| Meri Files and conversation artifact preview/download | `/meri/files` (linked); `ConversationArtifacts` in the live conversation | `MERI_DOCUMENT_WORKFLOW_ENABLED=false`, `MERI_DOCUMENT_OPERATION` empty; `/api/documents/*` always held in preview | Meri artifact/document service; preview activation for document reads. Artifact links in a live conversation will 503 in preview until then |
| Governed Objective Planner read and Strategy intake (#66–#80) | `ObjectiveEditor` → `ObjectiveGovernedPlanner`, `ObjectiveStrategyIntake` | Hard-coded `governedPlannerReadEnabled = false` and `governedStrategyIntakeEnabled = false` | **Core:** a coherent PR48 + PR53 + PR56 read pin, positive serving authority for intake, and reviewed preview routes. The preview admits only identity and client reads (`me`, the client list, one client), so all Objectives data is held there. Flip the constants only after Core lands |
| Meri workspace screens (runs, approvals, memory, routines, data access, sources/coverage, browser, file attach/filing, command palette, run workspace/steer/checkpoint) | `features/meri/screens/**`, `workspace/**`; reached only via `/meri/fixture/[screen]` (about 260 slugs, sample data) | Sidebar Runs, Approvals, Memory, Routines and Data access are disabled with explanations | Each needs a Meri route listed in `meri-resources/unavailable.ts`: run list/control, approval list and decision, memory, schedules, source coverage, workspace files, uploads |
| New conversation (live) | Sidebar and phone menu button, disabled outside fixtures | `unavailableTitle("newConversation")` | **Meri:** a create-conversation selector. **Option:** the host's `useBeginNewChat` (stored-chat recovery) could back the button as frontend-only composition. Deliberately not wired before the integrated chat test, to keep the first-chat bootstrap path unchanged |
| Search conversations | Sidebar, disabled outside fixtures | — | **Meri:** a search route. List and paging exist and back Recents |
| `MeriFixtureEntry.tsx` | `features/meri/MeriFixtureEntry.tsx` | Imported by nothing | Remove, or link from a fixture index (owner's call) |
| `@capiro/meri-client/react` facade (`useMeriChat`, `detachMeriView`) | `packages/meri-client/src/client-facade.tsx` | Not imported by the app | None; the live path uses `./conversation`. Remove or keep as public API (owner's call) |

## 6. Unresolved defects and risks

1. **Upstream `Origin` to Meri (#90) is new against rev 17. Source-compatible (dot, #121 comment 6245670036).** Conversation and history requests now carry `Origin: https://portfolio-preview.app.capiro.ai`. In read-only preview this is exactly `readRequestOrigin(CAPIRO_REQUEST_ORIGIN)` (`url.origin`, no trailing slash), pinned to that constant. The runtime's `http-server.mjs:19` compares Origin exactly with `configuration.http.frontendOrigin`, which `render-material.mjs:328` renders from the reviewed binding `https://portfolio-preview.app.capiro.ai`. Remaining: read back the final rendered and deployed configuration during the integrated deployment.
2. **Stale runtime pins in the held preview template** (`apps/web/deployment/portfolio/{preview-config.mjs,service.yml}`, #79): `f005f773…` / `6a03d536…` against rev 17's `e2723ed8…` / `c2b6369d…` and the coming N19. The runtime owner should re-pin at render time.
3. **Preferences token: resolved** in `95a0d908` (native session token; see §5.2). Covered by `meri-user-preferences-route.test.ts`.
4. **`test:capiro` is broken on Windows** (`URL.pathname` root). Use `fileURLToPath` in `src/shared/capiro/vitest.config.mts`. Not changed here, because CI is Linux.
5. **`scripts/deployment-cli.test.mjs` cannot fully run on Windows** (`linux-x64` platform check; symlink privilege). This is a host limit, not a code defect.
6. **Possible same-class local-day defect:** `meri-actions/projection.ts:18` and `workflow-adapter.ts:214,245` take `deadline/dueDate.slice(0, 10)`, the UTC calendar day of an ISO timestamp. That can differ from the local day shown elsewhere; #72 fixed the same class for commitments. Not verified.
7. **#91's tip is red on architecture and lint** (fixed here in `07120781`). **#89's and #65's tips are red on `preview-backend-boundary.test.mjs`** (fixed here in `25742e9a`). The source PRs themselves are unchanged.
8. **Known runtime-side first-chat state** (from the runtime lane, not frontend): the runner container exits 2 before `cli.main` (N17); runtime H1 and D14 address history and observability. The frontend has no change pending for these beyond H1 (§3, `cdf1f0a9` and `27f3c28b`).

## 7. Held feature flags (frontend)

| Flag | Default | Rev 17 | Gates |
|---|---|---|---|
| `CAPIRO_PREVIEW_READ_ONLY` | unset (ordinary app) | `true` | Preview containment for every `/api` route except activated reads, first-chat POST and Meri conversation routes |
| `MERI_CONVERSATION_WORKFLOW_ENABLED` | off | `true` | Live conversation |
| `MERI_FIRST_CHAT_BOOTSTRAP_ENABLED` + `MERI_FIRST_CHAT_CLIENT_ID` | off / empty | `true` / set | First-chat Core bootstrap |
| `CAPIRO_PREVIEW_MERI_CONVERSATION_ROUTES_ENABLED` + `CAPIRO_PREVIEW_MERI_RUNTIME_{SOURCE,IMAGE_DIGEST,ORIGIN}` + `CAPIRO_PREVIEW_MERI_CONTRACT_PACKAGE_VERSION` | off | `true` / set / `0.1.10` | Preview admission of Meri conversation routes |
| `CAPIRO_PREVIEW_READ_*`, `CAPIRO_PREVIEW_FIRST_CHAT_*` | unset | set | Preview Core reads and first-chat write target |
| `MERI_ACTION_WORKFLOW_ENABLED` | off | `false` | Recommendation actions |
| `MERI_DOCUMENT_WORKFLOW_ENABLED` + `MERI_DOCUMENT_OPERATION` | off / empty | `false` / empty | Meri Files and documents |
| `MERI_TASK_COMMAND_WORKFLOW_ENABLED` | off | unset | Task updates |
| `MERI_USER_PREFERENCES_ENABLED` | off | unset | Personal Meri preferences |
| `governedPlannerReadEnabled` (constant) | `false` | — | Governed Objective Planner read |
| `governedStrategyIntakeEnabled` (constant) | `false` | — | Governed Objective Strategy intake |

## 8. Lines not merged, with evidence

| Line | Why not merged |
|---|---|
| dot Meri UI chain `dot/meri-ui-followup` → `-history` → `-input` → `-initial-input` → `dot/meri-desktop-parity-20261016` → `docs/figma34-gaps-20261016` (no PRs) | **Source** not merged: it is fully received. Of the 49 source files it touched, 30 are byte-identical here, 16 match earlier versions in this branch's history (since evolved), and 3 are older intermediate builds on contracts 0.1.7 without initial input. **Docs received selectively** in `92d8cd16` from `8a9c7da1` (dot's disposition, #121 comment 6245678336): `docs/meri-figma-34-20261016`, `docs/figma-34-gaps-20261016` and the 73 branch-only `docs/meri-figma-34-20261015` records. `LIVE-WIRING-20261016.md` takes the corrected architecture FAIL / browser INCOMPLETE / build UNRUN and links current checks. Each directory's `HISTORICAL-STATUS-20261018.md` labels the 0.1.7, "no 0.1.8" and D01–D04-pending assertions as historical or superseded, and says design completion is not runtime acceptance. Received records stay byte-exact because evidence manifests hash them |
| `test/meri-discovery-state` (no PR) | An unmounted, explicitly "prepared" discovery reducer. The shipped `useConversationDiscovery` (`history-queries.ts`) and Recents supersede it |
| `docs/meri-host-status-correction` (no PR) | 2026-10-15 status docs whose README and REMAINING sections have since been rewritten |
| `meri/f34-evidence-c7e06000`, `integration/capiro-archive-diagnostics-20261012` (no PRs) | Evidence archives (about 2.27 M and 420 k lines), no source. They stay on their branches |
| PR #43 `meri-phone-parity.spec.ts` | Asserted superseded Figma 3.1 geometry (§2.7) |
