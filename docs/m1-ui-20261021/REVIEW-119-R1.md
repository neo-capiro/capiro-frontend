# PR119 next-head review corrections

## Authorization and scope

This bounded follow-up responds to Fable's review of `1cec16f18d359ef9152f996dc4dd0f976a2780eb` against `main` `84f5ba29fe868b6b1ec701a9a3f383e0d14cb352`, in PR119 comment6327902663. The requested next head supersedes PR119's earlier freeze for these corrections only. PR120 remains a separate integration stack with no inferred verdict. Core PR107 remains frozen. No merge, deployment, runtime contract, dependency or lifecycle activation is included.

The existing public run snapshot owns cancellation outcome; `RunStatus` owns its presentation. `ConnectionPending` consumes the existing access-loss latch and exact-run retry callback. The existing lifecycle availability owner supplies the single held explanation. Browser fixtures verify the same canonical read and command paths. No alternate state machine, readiness endpoint or authority owner is introduced.

## Review response

1. Cancel receipts are presented by their actual state. A receipt for an already completed run cannot claim cancellation. A cancellation fence remains distinct from terminal observation and physical retirement.
2. Sidebar-copy assertions follow the existing source-aware unavailable explanation. Revocation assertions require the denied state and private-content removal rather than an obsolete saved-history error.
3. Access loss takes precedence over the generic expiry and newer-target presentation. The explicit action checks access again through the unchanged exact-run retry callback; it does not open a different run. Ordinary expiry keeps its reconnect behavior.
4. Stop presentation reuses the existing `StatusPill` and tokens. Figma `450:88532` was read through design context and rendered reference; relevant cards are Cancelling `450:88742` and Cancelled `450:88754`. The stronger state-board wording and positive readiness claim below remain held. The card uses the existing read-only transcript action; no receipts viewer or unsupported action was invented.
5. Held lifecycle operations have one explanation and no permanently disabled action row or repeated fixed ID. No lifecycle consumer is activated.
6. The phone-flow assertion waits for the actual saved-history re-verification after `retire()` before checking Send. It does not rely on a longer arbitrary sleep or a fabricated ready state.

## MF-06 evidence conflict for Fable through dot

The requested positive **“Ready for your next message”** state and unqualified **“Remaining work stopped”** sentence cannot be established by the current public evidence after Stop:

- `sessionHistoryState` in `saved-turns.ts` derives a candidate source from the latest terminal run and absence of a pending turn. That is permission to attempt the existing reservation path, not proof of completed retirement.
- Installed `@capiro/meri-contracts` 0.1.10 exposes transcript `latestRun` / `pendingTurn` and cancel receipt `completed` / `failed` / `cancelled`; it has no retirement-complete or readiness readback field.
- `turn-journal.ts` deliberately handles a retirement409 even after a terminal source record. The existing bounded retry may finish while cleanup remains incomplete.
- A successful `RESERVED` / `ACCEPTED` next-turn receipt binds one already-captured successor. A replayed mapping does not prove readiness for a further message.

The existing qualified terminal-record and cleanup wording is preserved. No missing field, new timer, optimistic readiness inference or alternate completion wording resolves this conflict silently. Fable must identify existing sufficient public evidence or clarify the allowed copy; a new backend field/route requires its owning lane and authorization. Native subject-to-actor mismatch and live retirement remain independent acceptance gates.

An acknowledged cancellation uses the board's in-progress explanation, “Meri is finishing the current safe step before stopping,” alongside the explicit fence-versus-cleanup qualification. This explains the acknowledged cancellation process; it is not a new observed backend phase or a readiness gate. Pending and unknown requests retain their distinct wording. Titles, tones and card structure are implemented without claiming that all of item4 is complete.

## Validation

- Full `apps/web` Vitest: **236 files, 3,072 tests passed**. The final acknowledged-Cancelling copy/qualification amendment was then rechecked in the focused **26/26** Stop suites; no whole-suite rerun is claimed after that narrow amendment.
- Full web TypeScript (`tsc --noEmit --incremental false`) passed. Full `eslint src tests` completed with no errors; existing warnings remain. Changed-path formatting and `git diff --check` passed. The final Stop amendment also passed scoped TypeScript, lint and formatting.
- Architecture: **0 errors, 0 blocking violations**, 539 total signals, 521 reviewed and 18 inherited.
- Focused access-status suites: **8/8 passed**. Isolated transformations killed **13/13 mutants**: 6 original Stop/lifecycle mutants, 3 acknowledged-copy/gating/qualification mutants and 4 access-status mutants. Source hashes were verified after restoration.
- All `meri-*` browser specs selected **169 tests in 32 files**. Execution is **BLOCKED**: 58 completed attempts failed at Chromium launch because its executable is absent; 111 had no completed result when repeated launch attempts were interrupted. Zero test bodies passed and zero skips were recorded. No browser assertions, browser mutation checks or visual qualification ran. Browser TypeScript and formatting passed. The three failures shared with the original base cannot be reclassified from this environment.

No ticket is closed by these receipts. The two MF-06 claims above, native subject-to-actor acceptance, browser execution and real lifecycle receipts remain held. Core migration work is tracked separately and is not included in these M1 corrections.
