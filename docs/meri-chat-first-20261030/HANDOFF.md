# SCRUM-242 — Meri chat-first landing, daily Stoic quote, General default

Frozen review-ready source candidate. Root opens the PR and owns release; nothing here is
deployed or production-accepted.

## What changed

**Normal entry is Meri with General selected**

- `src/app/page.tsx`: the bare app entry now `redirect("/meri?scope=general")` (installed Next
  redirect guidance read: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`).
  `force-dynamic` is kept so the redirect stays a runtime decision.
- `src/app/sign-in/[[...sign-in]]/page.tsx`: Clerk `fallbackRedirectUrl` is
  `/meri?scope=general`. `forceRedirectUrl`, return handling and auth/provider checks are
  unchanged, so an explicit `returnTo`/deep link still wins.
- `src/shared/session/client-route.ts`: unscoped `productHref("meri")` → `/meri?scope=general`,
  unscoped `productHref("portfolio")` → `/portfolio`; `productModes` hrefs match. An explicit or
  verified `clientId` still produces `/meri?clientId=…` and `/portfolio/<clientId>`.
- `src/shared/session/SelectedClient.tsx`: the existing "Open Portfolio" recovery link points at
  `/portfolio`.
- `src/shared/shell/Header.tsx`, `src/shared/shell/ModuleHeader.tsx`: the existing Quick log alias
  is `/portfolio?log=1` so it still reaches the Portfolio feature from the new root.
- `src/features/modules/intelligence/changes/MonitoredChanges.tsx`: the same-class "Open
  Portfolio" label pointed at `/`; it now points at `/portfolio` (one line, Root-approved).
- Wordmark links stay `/`, which now means the actual default app home.

**Chat-first canvas** — `chatLayout` on `/meri` fills the viewport; sidebar order is new chat,
search, recent conversations, then Library (Library omits Conversations, Runs and the route-less
Approvals row on this surface only); no duplicated scope badge, workspace footer or landing
footer links; real workspaces stay reachable as secondary Tools links through
`meriCapabilityHref`/`scopedHref`.

**Empty-state hero** — derived from the conversation owner's own admitted state (no current turn,
no submit intent, no earlier/saved turn, no accepted request, no captured prompt; suppressed when
the history read failed). A first accepted prompt removes it without a URL change, and reopening a
populated current conversation without `conversationId` also omits it. `DailyQuote` renders the
day's verified quotation, its author, a collapsed Source disclosure and the Meri orb; the first
render is quote-free so server and client markup agree.

**Daily rotation** — index is the local civil day number modulo 120; the next rotation is a single
timeout to the next local midnight built from calendar parts (23h/25h DST days handled), and a tab
that wakes from suspension/focus re-reads the date. No backend, storage, cookie or cron.

**Composer / Tools** — Attach · Tools · one scope control · Send/Stop with removable context
chips; placeholder is the Figma wording `Ask Meri anything…`; desktop Tools is a non-modal column
(the composer stays usable), phone is a dismissible sheet (Escape closes, focus returns), and one
composer stays mounted across connection states.

**Reviewer regressions fixed**

- The single authorized `MeriClientSelector` is rendered in every non-composer host state
  (disabled, invalid scope, no account/no selection, archived client, bootstrap pending/failed), so
  plain `/meri` keeps a control next to "choose a scope"; the ready composer still has exactly one.
- `RunLifecycleControls` keeps its verified checkpoint inspection/fork entry after a run finishes
  (`checkpointId` counts as relevant); opening a finished conversation issues no lifecycle, pause,
  resume or fork write.

**Presentation** — healthy history is one quiet line (manual re-read only behind diagnostics),
failed reads keep retry, empty lifecycle chrome removed, no empty files warning, hero centred in
the transcript area with the author directly under the quotation.

**Harness** — one narrow Vite `define` for
`process.env.NEXT_PUBLIC_MERI_SELECTED_TAB_EXTENSION_ID` (synthetic empty value; without it ready
attachments threw `process is not defined` and the composer never settled), and the same signed-in
identity answered at `/api/capiro/me.read`. Product code, auth, browser internals and pins are
untouched.

## Checks actually run (native exits, this machine)

Tooling: **Node v24.22.1**, **npm 11.19.1** (readback in this session). The repository pins
`npm@11.9.0`; the pin is not evidence of the executable used, and global tooling was not changed.

| Check | Command | Native exit | Result |
| --- | --- | --- | --- |
| Typecheck | `npx tsc --noEmit` (apps/web) | 0 | clean |
| Format, exact touched files | `npx prettier --check <19 changed paths>` | 0 | "All matched files use Prettier code style!" |
| Lint, exact touched files | `npx eslint <same 19 paths>` | 0 | 0 errors |
| Lint, broad touched trees | `npx eslint src/features/meri src/shared/shell …` | 1 | 6 inherited errors in `QuestionCard.tsx`, `useRunQuestion.ts`, `useQuickActionCatalog.ts`, `TimezonePreview.tsx` (untouched, present on the base) |
| Route unit | `npx vitest run tests/settings-client-route.test.ts` | 0 | 3 passed |
| General browser | `CAPIRO_BROWSER_TEST_DEV=1 … test/browser/meri-general.spec.ts` | 0 | 8 passed |
| Chat-first browser | `… test/browser/meri-chat-first.spec.ts` | 0 | see below |

`meri-chat-first.spec.ts` history: attempts `cf11` (2 failures) and `cf12` (1 failure) were real
failing attempts and are retained, not claimed as passes. `cf13` ran 12 cases with 11 passed and
one genuine failure — a wrong test timestamp in the spring case
(`2026-03-08T23:59:59-05:00`, which is 00:59 on the next local day) — not a scheduler defect. After
correcting the offset to `-04:00`, the two required cases
(`the default General scope lands on the same quiet hero with its own picker`,
`daily quote clock (America/New_York) … spring's 23-hour midnight`) were re-run alone: native exit
0, 2 passed. The other ten chat-first cases passed in `cf13` and were not re-run just to produce a
new aggregate.

Reused, unchanged evidence: history 7/7, approvals 34/34, unit suites 68/68.

Clock proof is now mounted-browser proof with `timezoneId: America/New_York`: same-date reload
stability; `new Date(2026,2,8)` → `new Date(2026,2,9)` measured as 23 hours and
`new Date(2026,10,1)` → `new Date(2026,10,2)` as 25 hours; the mounted quote stays on the old date
one second before each boundary and advances exactly once at it; a tab jumped forward with
`setSystemTime` and woken by `visibilitychange` shows that date's quotation. The older "no clock
faked" limitation is superseded. A long synthetic session lifetime is used only inside these clock
cases so the fake clock cannot expire the fixture receipt.

## Not run / unqualified

- `tests/browser/portfolio-index.spec.ts` lives under a different Playwright config
  (`tests/browser`) and was **not** executed here after its expected-href update; the same alias is
  covered by the route unit test and the General/chat-first browser runs.
- `tests/production/verify-standalone.mjs` needs a production build, so it was **not** executed
  locally; its `/` status entry and Portfolio href expectation are updated for the next ordinary
  release run.
- `test/browser/meri-current-header-assets.spec.ts` (1 failure) and
  `test/browser/settings-client-continuity.spec.ts` (3 failures) remain **unqualified**: the
  Settings failures surface `Unconfigured test operation: settings.hq.impersonation.active` from
  that spec's fixture map, and the header spec opens the legacy `/meri/fixture/home` screen. A base
  comparison was attempted but **did not run** (the stash step exited 1 before any log existed), so
  these five are not claimed as base-reproduced and no fixture/auth/platform repair was made.
- `test/browser/meri-sidebar-toggle.spec.ts`: the ordinary-route case passes; the legacy Figma Home
  fixture case fails and was reproduced on the untouched base earlier.
- Broad unit baseline: 41 current vs 49 base failures recorded earlier; untouched owners were not
  edited.
- No deployed/authenticated acceptance, no local production build, no cloud/DB work.

## Screenshots (real components, healthy fixtures, this head)

Captured with `CAPIRO_BROWSER_TEST_DEV=1` against the real `/meri` route; each capture is preceded
by landmark assertions (quote non-empty with author, orb `naturalWidth === 320`, one composer,
`#main-content`, no failure chrome), with `scrollY === 0` and Source collapsed for the landings.

- `screenshots/desktop-general.png` — General landing from the real General fixture (General
  session context, General first-chat bootstrap, `/meri?scope=general`); the picker reads
  "General" and there is one composer.
- `screenshots/desktop-new-chat.png` — verified-client landing.
- `screenshots/desktop-tools-open.png`
- `screenshots/desktop-existing-conversation.png`
- `screenshots/phone-new-chat.png` (390×844)
- `screenshots/phone-tools-open.png` (390×844)

All six verified non-blank by channel standard deviation (18–40) at expected dimensions.

## Limitations

- The browser harness mounts the production component tree, not a Next server; the root redirect
  and the Clerk fallback are covered by source review and the route unit test rather than a live
  sign-in.
- The fallback-only Clerk return behaviour relies on the installed Clerk declaration; an explicit
  `returnTo` path is preserved by construction because only `fallbackRedirectUrl` changed.
- The orb is one raster asset (320×320 derived from the supplied 1254×1254 source); dark-mode
  treatment was left as designed.
