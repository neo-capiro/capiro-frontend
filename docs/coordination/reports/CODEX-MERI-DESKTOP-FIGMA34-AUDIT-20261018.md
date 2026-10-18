# Meri desktop Figma 3.4 visual audit

Owner: Codex Meri frontend lane. Date: 18 October 2026 UTC. Source base: frontend PR92 commit `271a267d`; the newer `codex/memory-review-ui-20261018` successor at `88bf4005` belongs to the separate memory/settings lane and is outside this report's edit scope. Target: [Capiro 3.4 — Meri](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-%E2%80%94-Meri?node-id=1064-143240), review board `1064:143240`. `AGENTS.md`, implementation standards, architecture ownership, and the required Figma design-to-code skill were read before design-context calls. Figma access succeeded; the board's sparse response was followed by high-fidelity context and screenshots for individual frames.

## Desktop frame-to-fixture checklist

All listed desktop frames have a natural **1440 × 1040** canvas. Paths below are disconnected design fixtures under `/meri/fixture/`, not live Meri runtime qualifications. Exact 1440 × 1040 Figma PNGs saved in `/tmp/meri-figma-3-4/` are reference evidence for same-viewport Playwright comparison.

| Fixture path suffix | Figma frame | Saved PNG | Review target |
| --- | --- | --- | --- |
| `home` | 01.01 `1064:144075` | `home.png` | Home greeting, composer, suggestions |
| `cited-answer` | 01.02 `1064:144239` | `cited.png` | Conversation, cited answer, source actions |
| `conversation-history` | 01.04 `1064:144425` | — | History table and filters |
| `command-palette` | 01.05 `1064:144529` | — | Search dialog and keyboard state |
| `run-detail` | 02.03 `1064:144708` | — | Metrics, four-step plan, activity |
| `background-runs` | 02.04 `1064:144817` | `runs.png` | Active/Recent list and outcome notice |
| `workspace-files` | 03.01 `1064:145204` | `files.png` | Tree, file table, selected artifact |
| `evidence-sources` | 05.01 `1064:146715` | `evidence.png` | Three source cards and selected evidence detail |
| `data-coverage` | 05.02 `1064:146817` | `source.png` | Data access domain coverage table |
| `file-to-client` | 04.04 `1064:146428` | inline Figma screenshot | Filing review bound fields, source-scope action, proposed filename |
| `approval-center` | 06.01 `1064:147397` | `approvals.png` | Pending table and governed review actions |
| `routines` | 08.01 `1064:148241` | `routines.png` | Routine list, actions, scope notice |
| `personal-preferences` | 09.01 `3022:29587` | `settings.png` | Settings tabs and personal defaults; memory/settings lane owns changes |
| `dark-workspace` | 10.01 `1064:148697` | `dark.png` | Dark Home with a white shared global header |
| `workflow-library` | 12.01 `1064:151092` | `workflow-library.png` | Search/actions row and 14-workflow catalog |

The fixture registry at `apps/web/src/features/meri/fixtures/screens/registry.ts` records the frame IDs for registered screens; Home and cited answer also have direct fixture routes. The separate `/meri/fixture/run-activity` route targets earlier sparse-contract design node `443:82027`, outside this 3.4 whole-screen checklist. The registry is a coverage index, not a parity result. Existing fixture content is synthetic and disconnected. Desktop screenshots must match the Figma viewport, theme, content, and interaction state before a visual claim is made.

## Measured visual system and asset audit

Figma's shared global header is **64 px** high. The Meri sidebar is **232 px** wide with **16 px** inner padding; the main content has **28 px** padding. Home's centered welcome/composer block is **716 px** wide; the three suggestion cards are **230 px** each with **12 px** gaps. Workflow catalog cards occupy two **568 px** columns with a **16 px** column gap and **12 px** row gap. The light tokens include foreground `#0a0a0a`, sidebar/background `#f5f5f4`, card `#ffffff`, border `#e7e5e4`, and muted foreground `#78716c`; typography is Geist. The dark workspace uses `#242424` to `#0a0a0a` gradients, `#242424` borders, and `#f5f5f4` text while retaining the white global header.

The principal static image slots are the Capiro wordmark PNG at **77 × 26**, Meri ink/wordmark at **62 × 20**, neutral profile SVG at **32 × 32**, and small SVG interface icons, usually **16–18 px**. Home also uses a sparkle icon; Files has a file-text icon. There are no large decorative image slots in the reviewed desktop frames. A SHA-256/byte-count check passed for all 21 local Home-manifest records, 22 Cited-manifest records, and the four current-header SVG provenance records; their 18 × 18 root dimensions also matched the provenance file. Rendered browser images in the reviewed base routes all loaded, and the focused current-header asset browser checks passed. This validates the checked-in files against their manifests, not fresh byte identity with Figma. Figma supplied temporary `www.figma.com/api/mcp/asset/...` URLs, but shell `curl -fL` returned **HTTP 403** for both a screenshot URL and the Home `imgInk` URL. The saved reference PNGs came from `get_screenshot` inline bytes. Exact downloaded SVG/PNG asset identity remains an open validation item; temporary Figma URLs must not become runtime sources.

The adopted `@capiro/ui` source is recorded in `packages/ui/provenance.json` as promoted AI Elements and shadcn source with pinned upstream lineage. The active Meri command palette is project-authored `CommandPalette` inside a `MeriDialog`, and Meri toasts are project-authored `ToastCard`/`ToastRegion` styled after the design's Sonner surface. Do not attribute these two widgets to upstream Command or Sonner implementations. Motion's upstream shimmer is recorded as deferred; generated Figma `motion/react` code is a design reference, not evidence that Motion is active in the frontend.

## State coverage and ownership gaps

- The review board includes History empty `3034:32186` and no-match `3034:32443`, Sources loading `3026:27513`, unavailable `3026:27760`, and retry `3062:39648`, plus approval decision variants and routine create/edit/paused/disabled/cancelled frames. These must be compared in their own fixture states rather than inferred from default screens. Board 11.05 `1064:149837` shows generic empty/success cards for conversations, files, approvals, routines, memory, search, sources, and scope. It has no dedicated empty Runs-list card or full empty Runs frame.
- Dedicated dark desktop frames are present for Home, Run detail `3032:32570`, Approval center `3032:33006`, Workspace files `3032:33402`, Memory recall `3033:31453`, and Routines `3033:31843`. The reviewed board has no dedicated dark cited-answer, conversation-history, evidence/Data access, or Settings frame. Ask the design owner for these states if exact parity is required there.
- Settings frame 09.01 explicitly labels the Meri settings preview as not connected. Generic saving/saved cards on board 11.05 do not specify a complete Settings save composition. Memory-review and Settings components remain in the separate memory lane.
- The follow-up delegated this lane sole receiving ownership for Meri's shared visual shell. It changes Meri's own header, sidebar, shell layout, and command palette presentation. `HeaderFrame`, Portfolio, Modules, global tokens, asset manifests, and lockfiles remain untouched. Design fixtures, state boards, and a successful build cannot establish authenticated access, Meri runtime behavior, durability, or deployment readiness.

## Browser comparison and bounded source fixes

The local Meri design fixtures were rendered with Chromium at **1440 × 1040**, device scale 1, matching the Figma frame and light theme; Home was also rendered in dark mode. Captures for `home`, `cited-answer`, `conversation-history`, `command-palette`, `run-detail`, `background-runs`, `workspace-files`, `file-to-client`, `evidence-sources`, `data-coverage`, `approval-center`, `routines`, `personal-preferences`, `workflow-library`, and `dark-workspace` are in `/tmp/meri-audit/`. The captures returned HTTP 200 without page errors. The open client/status filter states were also captured in `/tmp/meri-filter-client-after.png` and `/tmp/meri-filter-status-after.png`. The saved Figma PNGs and inline 04.04/02.03 screenshots were inspected beside matching route captures. These are local review artifacts; they are not a complete pixel-diff qualification.

- Home 01.01/10.01: the disconnected Send control looked active despite its disabled behavior. Its Figma dark gradient is now at 40% opacity in both themes, with the white icon retained in dark mode.
- Conversation filters 13.21/13.22: open triggers now use the dark design surface, and the 480 px menus align to the right at Figma's desktop anchors (client x≈662, status x≈804; y≈219). Keyboard Escape and focus return were checked.
- Filing review 04.04: the four bound, read-only fields now have white Figma card backgrounds; `Review source scopes` is visible between Cancel and Review filing proposal. It remains an explained disabled control until a verified destination exists. The filename remains locally editable.
- Approval center 06.01: table columns now start at Figma's 420/140/340/252 px distribution in the 1152 px table. The Expires header moved from x≈1099 to x≈1169, within about 2 px of the design.
- Workflow library 12.01: heading typography uses Geist 20 px/26 px Medium, and 12 px row spacing places the first catalog tile at y≈276 versus Figma y≈278 and footer near y≈897 versus Figma y≈900.

The Meri header now has a functional 32 × 32 PanelLeft toggle at x≈180/y≈16 (18 × 18 glyph), within its existing 196 px brand slot. It hides and reveals the 232 px desktop sidebar, exposes `aria-expanded`/`aria-controls`, preserves visible keyboard focus, and stays hidden at tablet/phone widths. The seven Figma workspace destinations remain in the sidebar. The two additional real workflow routes, Recommendation actions and Task updates, are reachable from client-scoped links in ordinary `/meri` Home; the mobile menu retains its existing direct links. Removing their two sidebar rows restores the `RECENT` and Preferences blocks to the Figma desktop positions without dropping access. `HeaderFrame`, which Portfolio and Modules also consume, was not modified.

A fresh post-change Home capture at `/tmp/meri-home-shell-20261018.png` uses 1440 × 1040, device scale 1, light theme. Against `/tmp/meri-figma-3-4/home.png`, the browser measured PanelLeft button at x180/y15.5 (design x180/y16), mode tray x232/y9.5, sidebar x0/y65/w232, `RECENT` x16/y550, first recent x16/y576.3, Preferences x16/y793.3, and main x232. These shell anchors match the reviewed Figma layout to about 0.5 px. Remaining glyph rasterization and unverified asset bytes preclude an exact-pixel claim; the collapsed sidebar has no dedicated Figma frame.

The 01.05 command palette alone now leaves the page undimmed. Its Radix modal behavior, keyboard focus outline, Escape, and return focus remain, and other dialogs retain their scrim. The shared selected-row stripe appears in History/Runs/Sources/Routines/Files even though reviewed base frames do not show it; selected-state intent is still missing, so the shared table/card primitive was not changed. The Runs fixture preselects a cancelled toast absent in 02.04, and the Cited answer fixture honestly labels its disconnected sample as not saved whereas the Figma frame says saved. The `run-activity` fixture maps an older deleted node; `tool-activity` maps current 02.07. The filter fixture registry maps cropped overlay nodes, while the reviewed full-screen open states are `3067:40614` and `3067:40882`.

Fresh Figma 01.05 and browser captures were compared at 1440 × 1040; the browser capture is `/tmp/meri-command-palette-20261018-after.png`. The dialog starts at x260/y93 and is 800 px wide in both; the browser height is about 489 px versus Figma's 488 px. The browser keeps its visible blue 2 px keyboard focus ring although the static Figma input shows only a neutral border. That accessibility state is intentionally preserved. The field's measured width differs by about 2 px; this remains a small unresolved alignment detail.

Fresh Figma `download_assets` calls returned an SVG URL for PanelLeft (reported 638 bytes), a PNG URL for PanelLeft (reported 298 bytes), and the four header action SVG URLs. Following the tool's `curl -L` retrieval method returned HTTP 403 and zero bytes for each. The installed Lucide PanelLeft renders the specified geometry, but no fresh Figma byte identity can be claimed. No asset manifest was changed or fabricated. The visual audit does **not** establish exact parity across all registered fixtures or Meri runtime behavior.

## Verification and existing test debt

The new focused Playwright spec checks 06.01 column anchors, 12.01 heading and tile rhythm, 13.21/13.22 open-menu position and Escape/focus return, and 04.04 read-only context plus editable filename. All four tests passed. The two existing current-header asset tests and both authored dark-Home theme tests also passed. `npm run build` passed for `@capiro/meri-client` and the Next.js web app, including TypeScript and generation of 283 static pages. The separate `@capiro/web` TypeScript check and changed-file Prettier check passed; `git diff --check` found no whitespace errors. `npm run architecture` exited with `errors: []`; web lint exited with 0 errors and 94 warnings across existing source/tests.

The shared-shell follow-up passed seven focused Chromium checks in one run: both 1440 px and 375 px client-scoped action navigation, ordinary Home's Task updates route, functional PanelLeft toggle on the Home fixture and ordinary `/meri`, command palette focus/transparent overlay, and unchanged file-picker scrim. The two link targets navigate with the selected client and do not dispatch action calls merely on route entry. The command palette check includes axe, request isolation, focus trapping, Escape/return focus, and Ctrl+K reopening. The architecture gate initially identified new >80-line `MeriHome` and `Header` functions; cohesive view components were extracted, and the final architecture run reported zero errors and zero blocking size findings. The scoped overlay test and CSS do not change the shared copied shadcn Dialog primitive.

A broader, read-only regression sample ran **26 Playwright tests: 15 passed, 11 failed**. Its failures reproduce three PR92 baseline fixture/assertion mismatches outside this visual lane:

1. Four theme navigation tests still expect the Modules heading `Everything in Capiro`; unchanged PR92 `ModuleHub.tsx` renders `Work in Capiro, across your modules`.
2. Six Files workflow tests expect a browser `Authorization` header, while unchanged PR92 transport sends `X-Meri-Action-Session` and the proxy forwards bearer server-side.
3. One History paging fixture slices with omitted `input.limit`, producing an empty first page even though the contract defaults it to 50. The live query intentionally omits the first-page limit.

The failing expectations and relevant Modules, Files transport/proxy, and conversation source were not edited here. Coordinate them with their owners; no app fixtures or test bypasses were added for this audit.
