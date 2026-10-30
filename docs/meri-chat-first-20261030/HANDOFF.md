# SCRUM-242 — Meri chat-first layout, daily Stoic quote and Meri orb

Review-ready source candidate. Root opens the PR and owns release; nothing here is deployed or
production-accepted.

## What changed

**Chat-first canvas**

- `shared/shell/ProductShell.tsx`, `shell.module.css`: `chatLayout` fills the visible viewport
  instead of the fixed 1040/975px design frame; the repeated workspace notice is not rendered on
  that route. Other routes keep their existing design frame exactly.
- `shared/shell/Sidebar.tsx`, `SidebarDestinations.tsx`: order is New conversation → Search →
  Recent conversations → Library destinations. On the chat canvas the Library group omits
  `Conversations` (recent chats are the chat navigation) and `Runs` (secondary Tools link); other
  pages keep their existing destinations. The redundant "Capiro · Your authorized workspace" line
  is gone.
- `features/meri/MeriHome.tsx`: one accessible `Meri` heading, the authorized client selector as
  the single scope control, the conversation host, and nothing else — no welcome prose, no
  duplicated payload of workspace links, no footer boilerplate.
- `features/meri/conversation/ConversationFrame.tsx`, `live.module.css`: the transcript scrolls
  inside the frame, the composer is docked and centred (max 760px) with safe-area padding; the
  duplicated scope badge above the transcript is removed.
- `MeriComposer.tsx`: Attach · Tools · scope control · Send/Stop, plus compact removable chips for
  the selected skill/website/work/procedure/revision/model.
- `conversation/SessionTools.tsx` (+ `tools.module.css`): non-modal desktop column, dismissible
  phone sheet, Escape closes and returns focus to Tools, and the real workspaces
  (recommendation actions, task updates, runs, personal memory review) stay reachable as secondary
  links through `meriCapabilityHref`/`scopedHref`. No approvals inbox or skills route is invented.
- `conversation/session-composer-controls.ts`: one subscription for the composer and the panel; the
  composer is mounted once across connection states.

**Empty conversation hero (owner-derived)**

- `conversation/MeriLiveConversation.tsx` decides emptiness from its own admitted state — no
  current turn, no submit intent, no earlier/saved turn, no accepted request, no captured initial
  prompt — and additionally suppresses the hero when the saved-history read failed. No URL hint,
  DOM detection, route mutation or new persistence decides it.
- `quote/DailyQuote.tsx`, `quote/daily-quote.ts`, `quote/useDailyQuote.ts`, `quote.module.css`: the
  day's quotation, its author, a quiet collapsed Source disclosure, and the Meri orb. The first
  render is quote-free so server and client markup agree.

**Daily rotation**

- Index = local civil day number (from the local year/month/day) modulo 120, so the same date gives
  the same quote across reloads, tabs and client switches. The next rotation is scheduled at the
  next local midnight (constructed from calendar parts, so DST days are 23 or 25 hours), and a tab
  that wakes from suspension or focus re-reads the date. No backend, storage, cookie or cron.
- Catalog: `quote/stoic-quotes.json`, 120 unique verified quotations, max 163 characters, authors
  interleaved. SHA256 `299e82914e386f0f49a72f4f5cadc72f5a4b56f8a2e380bf2d5435062c7b243c`.
  Attribution/works/translators: `quote/DAILY-QUOTE-SOURCES.md`.
- Orb: `public/design/home/meri-orb.png`, derived from the supplied 1254×1254 RGBA asset
  (SHA256 `C8BA5D5F0116C47B8FE01B92977228F0E083515802CA3E203CD88AACD9FF3624`) resized to 320×320
  with the existing `sharp` dependency — 81 KB instead of 1.0 MB, no new pipeline, fixed 160px
  desktop / 144px phone boxes.

**Presentation fixes from the pre-freeze review**

- `quote.module.css`: the author sits directly under the quotation; hero space is reserved on the
  container (`min-height`), not between text and author.
- `ConversationHistoryStatus.tsx`: a healthy conversation shows one quiet line; the manual re-read
  and diagnostics appear only behind the "History details" disclosure and only when there is a
  tail error or a newer accepted turn. Failed reads, empty-vs-failure, retry, paging, recovery and
  access loss stay explicit.
- `lifecycle/RunLifecycleControls.tsx`: no Pause/recovery chrome when there is no turn, command,
  error or checkpoint.
- `ConversationArtifacts.tsx`: no empty files warning.

**Test harness**

- `test/browser/server.mjs`: one narrow Vite `define` for
  `process.env.NEXT_PUBLIC_MERI_SELECTED_TAB_EXTENSION_ID` (synthetic empty value). The fixture has
  no Next build step; without it, mounting ready attachments threw `process is not defined` and the
  composer never settled. `SelectedTabSharing` and all production env behaviour are untouched.
- `meri-conversation-fixtures.ts`: supplies the same signed-in identity at
  `/api/capiro/me.read` that the shell already resolves through `/api/backend/core/me`.

## Verification (native exits, this environment)

Node 24.22.1 / npm 11.19.1 (repo expects >=24 <25, npm 11.9).

| Check | Command | Exit |
| --- | --- | --- |
| Typecheck | `npx tsc --noEmit` (apps/web) | 0 |
| Format (touched files) | `npx prettier --check src/features/meri src/shared/shell src/app/meri/page.tsx test/browser/... tests/...` | 0 |
| Lint (touched trees) | `npx eslint src/features/meri src/shared/shell ...` | 0 new; 6 errors remain in the untouched `QuestionCard.tsx`, `useRunQuestion.ts`, `useQuickActionCatalog.ts`, `TimezonePreview.tsx` (present on the untouched base) |
| Quote/logic unit tests | `npx vitest run tests/daily-quote.test.ts` | 0 (6 tests) |
| Capability/unavailable/quick-actions/identity/composer-lifetime/approval-refresh units | `npx vitest run tests/…` (7 files) | 0 (68 tests) |
| Chat-first browser | `CAPIRO_BROWSER_TEST_DEV=1 CAPIRO_BROWSER_TEST_PORT=5311 npx playwright test test/browser/meri-chat-first.spec.ts --config test/browser/playwright.config.ts` | 0 (6 tests) |
| History browser | `npx playwright test test/browser/meri-history.spec.ts --config test/browser/playwright.config.ts` | 0 (7 tests) |
| Sidebar browser | same, `meri-sidebar-toggle.spec.ts` | 1 pass, 1 inherited failure (below) |
| Approval evidence | previously passed 34/34 `meri-task-approval-run-refresh` on this head's predecessor; unchanged by these presentation edits | 0 |

Inherited failures (reproduced on the untouched base in this environment, not fixed here):

- `meri-sidebar-toggle.spec.ts › Figma Home fixture…`: the legacy `/meri/fixture/home` design screen
  fails on base for the same `/api/capiro/me.read` gap; it is not evidence for this production page.
- Broad unit baseline: 41 failures on this head vs 49 on base (recorded in run02); remaining ones are
  unrelated owners (`QuestionCard`, `useRunQuestion`, `useQuickActionCatalog`, `TimezonePreview`,
  task-approval lists, artifact capabilities) and were deliberately not edited.
- `tests/meri-m1-readiness.test.ts › acknowledged input with unavailable history…` fails identically
  on base.

## Screenshots (real components, healthy fixtures, this head)

Captured with `CAPIRO_BROWSER_TEST_DEV=1` against the real `/meri` route (ProductShell →
RequireSession → MeriHome → ConversationView), healthy `installInitialInput` not-started history,
empty conversation list, permitted skill catalog and the current preferences document. Every capture
is preceded by landmark assertions (quote non-empty with author, orb `naturalWidth === 320`,
composer visible, `#main-content`, one composer, no failure chrome) and the desktop/phone landing
shots assert `scrollY === 0` with the Source disclosure collapsed.

- `screenshots/desktop-new-chat.png` (1440×1040)
- `screenshots/desktop-tools-open.png` (1440×1040)
- `screenshots/desktop-existing-conversation.png` (1440×1040)
- `screenshots/phone-new-chat.png` (390×844)
- `screenshots/phone-tools-open.png` (390×844)

Non-blank confirmed by channel standard deviation (18–40); sizes 45–104 KB.

## Limitations

- No deployed or authenticated production acceptance; that belongs to Release.
- The browser harness runs the production component tree, not the Next server; server-rendered
  hydration of the quote is covered by the unit render test (quote-free first render) rather than a
  live Next server.
- Longest-quote coverage is a unit render assertion plus a 320/390 overflow assertion with the
  actual day's quote; no clock is faked in the browser.
- The generated orb is one raster asset; dark-mode treatment of the orb was left as designed rather
  than inventing a second asset.
