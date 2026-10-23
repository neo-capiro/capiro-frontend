# A2 frontend checkpoint — 2026-10-23

Historical checkpoint below. Read `CONTINUATION.md` and the refreshed `PREREQUISITES.md` for current ST20/ST24/PF16 source and remaining scope; the original “not implemented” entries below describe the earlier rotation only.

This is a partial, reviewable source checkpoint. **A2 is not complete.** The full 25-ticket inventory and absent Core protocols remain in `PREREQUISITES.md`. Worker rotation is for gate repair and independent review, not a scope reduction.

## Changed behavior

- ST03: server Settings page supplies read-only presentation mode from `CAPIRO_PREVIEW_READ_ONLY`. Undefined/false preserves ordinary behavior; any other configured value displays restricted mode. The gateway remains authoritative. Preview mounts identity plus active client roster only; no signature, archived roster, owner, Team, integrations, billing, HQ, or preference readers mount on entry. Mutations are unavailable there.
- ST04: Settings/Modules header uses a session-aware Clerk UserButton, retaining provider identity ownership.
- ST05: per-target role/billing/remove availability mirrors current Core policy, explains inactive/nonbilling/self/staff restrictions, and reloads identity after changes or errors. Core still rechecks writes.
- ST19: feedback no longer renders the designed submitted callout. Disconnected feedback explains no report was sent, no attachments and no automatic run/private content attachment. Keyboard copy lists implemented ordinary composer/dialog/tab behavior, not promised workspace search.
- ST24 partial: Personal, Contact, Profiles and signature hooks bind to API lifetime and pass cancellation where changed; ordinary inputs/dialog closing freeze during pending work. Contact/title/branding validate returned values. This does not add missing durable command receipts or finish the enumerated form inventory.
- ST27: branding explicitly distinguishes local Capiro name save from unconfirmed provider convergence.
- ST28: Personal monitoring/preferences and Billing usage links preserve verified client navigation hints.
- ML11: callback parsing uses allowlisted providers, bounded structured result kinds and exact connection IDs; rejects duplicate/malformed hints; never displays raw provider errors; connected copy requires a fresh owned matching connection. Transient callback parameters are removed without dropping client scope.
- ML12/14: scopes are labelled recorded/requested rather than actual grant proof. Sync activity timestamps and bounded batch outcomes no longer claim complete mailbox coverage. Failures, absent mail results and remaining pages are distinct.
- ML13/17: transient error rows can retry bounded sync; reconnect-required/disabled rows cannot. Existing supported connections can disconnect from stale/error states. Copy states retained mail disappears from current mail views, reconnect recovery is not guaranteed, and provider grants have separate removal semantics.
- ML26: IMAP/CalDAV is labelled unsupported; registration/connection unavailable; no promise credentials would create ingestion. Microsoft work/school and Google app eligibility are explicit.

## Verification actually run

- `npm ci --ignore-scripts --no-audit --no-fund`: passed; no manifest/lock changes.
- `npm run typecheck --workspace @capiro/web`: passed on the implementation checkpoint, repeated after final edits.
- `npx vitest run tests/a2-settings.test.ts tests/a2-settings-preview.test.ts tests/settings-client-route.test.ts` from `apps/web`: **26/26 passed**, all synthetic fixtures. Actual components are SSR-rendered for preview mounting and feedback; shell navigation is isolated in the preview tests.
- Six temporary production mutations rejected: inactive target made active; spoofed callback forced success; failed-record branch removed; remaining-page branch removed; preview archived query forced true; false submitted callout restored. Each produced test exit 1; originals restored and 26/26 rerun passed.
- Targeted ESLint: zero errors, three existing `<img>` warnings in Branding/Profile/ModuleHeader.
- Prettier on all changed TS/TSX and new tests; `git diff --check` passed.
- Architecture at `34805cc4`: **exit 1**, zero boundary/review errors but **14 blocking changed size-review obligations**, 554 total signals. This was not a passing gate or an inherited baseline failure. The attempted preview-policy import was removed after the guard correctly rejected it. No guard exception or weakening. Changed functions require exact-head responsibility review.

## Remaining work before lane completion

ST20 recipient inbox/explicit ack is allocated but **not implemented**. PF07 Objective association review/recovery is **not implemented**. PF09 existing canonical client binding still needs focused verification. PF14 note-only disposition needs final visible-copy check. ST24 remains partial: durable uncertainty/recovery and all original remaining form cases must be completed, including signature asynchronous file-read races and exact-resource readback before retry. ML11 callback browser lifecycle, wrong-scope/401/403/source mismatch, blocked-vs-upstream-error, and live Clerk actions need qualification. All other open rows and Core minimal proposals are in `PREREQUISITES.md`.

No browser visual/accessibility qualification, full frontend Docker/production gate, independent exact-head review, PostgreSQL tests, provider tests, deployment, migration, AWS action, secret read, or live acceptance ran. These are not implied by unit/SSR checks.

## Independent review repairs — 2026-10-23

The independent review of `34805cc4` found three P2 regressions. Personal title receipts now compare Core's canonical `trim() || null` value. Microsoft admin consent uses Core's `admin_consent=1` success contract. SettingsScreen retains the Team rejection message, bound to the current API lifetime, while identity reload unmounts Team; fresh authority still controls whether Team remounts.

The reviewer-derived synthetic browser fixture ran eight cases: empty, whitespace-only, padded and ordinary title; definitive Team rejection; unknown write; revoked actor; and confirmed billing update. Each issued one mutation with no page errors. Title saves refresh identity, definitive rejection remains visible, revoked access hides Team, and unknown writes remain fenced. Evidence is retained in root `work/a2-repairs-20261023`. The 26 targeted tests and native typecheck pass after repairs. This is bounded local browser lifecycle evidence, not full-app visual/accessibility, Clerk or provider qualification. The full A2 inventory remains open.

## Ownership for resume

Worktree `C:/dev/fable/wt-codex-wave2-a2-frontend`, branch `codex/wave2-a2-20261022`, base `e5f1f263f94ede9b785e4eabc3a5afe84b0f03c2`. A owns Settings/Portfolio/Mail, ST19 explicit exception, `ModuleHeader.tsx` Clerk opener plus `AccountProfileControl.tsx`. Root allocated but not yet edited `shared/session/ApplicationBoundary.tsx` broadcast slot, `app/layout.tsx` presentation flag, Settings operations/schemas and shared broadcast modules. No registry edit is necessary because it already spreads Settings operations. U owns Meri features, PF02/shared entry, shared `meri-first-chat.ts` and new Meri registry keys; all remain frozen here. All `shared/preview/*` untouched.

Figma session `5233aa33-d93a-4c29-9fbb-d6364dad4c1c` inspected Team `1064:244607`, Integrations `1064:244275` and Motion specification `3141:40968`. Existing exact local static assets and shadcn patterns reused; no new library package or master was invented. Coordinate U's future pinned Motion/ReUI/Sonner APIs before adoption. Full UI visual acceptance remains open.
