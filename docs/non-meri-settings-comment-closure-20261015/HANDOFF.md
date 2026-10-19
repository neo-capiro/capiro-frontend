# Focused non-Meri Settings and comment source checkpoint

Based on accepted frontend `4e1421054df0d32c564f7c9bc75cbd5e5366b428`, on isolated branch `fix/non-meri-settings-comment-closure`. The sealed commit/tree and patch/bundle pins are in the task's external `audit-evidence/non-meri-settings-comment-closure/SOURCE-HANDOFF.json`, avoiding a self-referential commit field here.

## Result

- Profile archive/restore confirms the requested profile ID and achieved status before success, closing its dialog or refreshing the list.
- Existing-account OAuth reconnect, sync and disconnect confirm the requested connection ID before navigation or success. New-account OAuth retains its existing behavior. Connected IMAP accounts no longer expose an enabled Disconnect control with no implemented action; the unavailable behavior is explicit.
- Comments now reuse the existing Markdown toolbar, safe preview, link insertion, keyboard editing and native Undo owner. Required/empty handling, the 20,000-character limit, pending fences and replacement disposal remain enforced. The wire stays `{kind: 'comment', text}`. Saved comments remain literal by default and offer explicit formatting preview; other activity remains literal.
- Contact and Branding source did not need speculative edits. New tests cover their existing validated mutation/read-back and refusal behavior. Existing description test locators now explicitly choose the Description toolbar; no assertion was removed or weakened.

## Verification actually completed

- **29/29 local desktop browser cases passed**, one worker, zero retries/failures/skips/flaky results: 11 new Settings, 8 new comment cases, 6 affected description cases and 4 affected comment lifecycle cases. Exact IDs match the separately retained 29-case inventory.
- Canonical full web `tsc --noEmit --incremental false` passed. Changed-file ESLint passed. Architecture passed with zero errors/blockers; 19 unchanged inherited size findings remain visible and unreviewed. Specific changed size findings received independent responsibility review.
- Local runtime: Windows, Node 24.19.0, Playwright 1.61.1, existing Chrome for Testing headless 153.0.8010.12. No dependency/browser installation or required proxy alteration. This differs from the prior accepted Linux Chromium 149 environment.
- The two representative synthetic trace frames show readable desktop comment controls and the literal/explicit-preview distinction. They do not establish whole-frame pixel/dark parity.

Initial evidence is preserved: missing default cached browser; two intended regression failures on old source; one incorrect transient-label test selector; local Chrome reload/startup resource failures; and Description-toolbar locator ambiguity after the new toolbar appeared. The unchanged reload case subsequently passed at the same 15-second limit, and the final complete cohort passed using the already installed headless browser. No timeout/assertion relaxation or automatic retry obtained the result. The cause of the earlier resource errors is not established.

## Exact unqualified items and release handoff

The default Next 16.4 production build was attempted and **failed before compilation**: Turbopack rejected `apps/web/node_modules` because the reused junction target leaves the worktree filesystem root. The failure is retained. No root expansion, alternate bundler, new install or build-policy change was used. A production build using the canonical in-root dependency layout remains required, followed by release-owner image/origin/runtime/security/smoke/rollback checks. No standalone server/image/deployment acceptance is claimed by this source checkpoint.

The earlier accepted 480 identities remain evidence on source 4e; this checkpoint does not relabel them as freshly executed here or add 29 repeated cases to their unique total. Reuse needs the affected-input mapping. The selected Linux-149 run, real backend/auth/PG/provider effects, actual OAuth/uploads/billing, full native Portfolio and full design/dark parity remain unrun here.

See [owner decisions](OWNER-DECISIONS.md) for Active Objective operational bindings, Engagement plan/wave/office contracts, the full selected-meeting reference, and saved-comment default-format/mentions/edit-remove contracts. All Meri remains Fable-owned. No mobile, AWS, paid operation, credentials/security change, push, merge or deployment occurred.
