# App focus continuity and Meri visual polish

Base: `254533208fdd188119655431e590400ef4333096` (PR #456 merged). The preceding UI candidate remains unchanged.

## Problem and behavior

The authenticated application wraps every product in `ImpersonationBoundary`. For a Capiro administrator, every window-focus event previously called the same invalidation handler as an explicit support-session change. That handler cleared the verified session, unmounted the page and its local drafts, and displayed “Verifying support session…” even when the service returned the same account scope.

Focus now starts a fresh active-session read while retaining the mounted view, matching the existing polling behavior. Explicit local/broadcast support-scope changes still contain the old view immediately. A failed read still removes private content. A changed server-selected support session still replaces the provider scope. The existing effect-generation guard ignores superseded responses; no global cache, token retry, authority bypass or new transport was added.

The new delayed-response regression failed before the fix because the draft input disappeared during the focus read. It passes after the fix while preserving its value and focus.

## Visual changes

- Center conversation turns in a responsive 760px reading column, aligned with the composer, with more generous paragraph leading and turn separation.
- Tighten recent-history and library spacing, clarify the selected conversation, and align the section label with its links.
- Give the composer subtle elevation and a visible surrounding focus outline instead of a rectangle inside the text area. Keep keyboard focus visible and disable transitions for reduced motion.
- Keep composer footer actions inside its content width; refine the header divider and label icon actions with tooltips.
- Preserve sidebar resizing, transcript scrolling, short-phone composer reachability, existing navigation, and light/dark tokens.

## Verification and limitations

All browser evidence uses isolated Playwright contexts and synthetic mocked services through the existing Vite development harness. No production account, browser profile or prompt was used. The earlier Windows URL-enforcement stop remains in force; these images are not live acceptance.

The focused regressions cover repeated fresh focus reads with draft/focus retention, refusal containment, immediate explicit invalidation, out-of-order success after a newer refusal, and a newly discovered support scope. Existing tests cover identity replacement, disposed reads, support entry/exit, cross-tab changes, expiry and revoked reads. Visual checks cover desktop light, desktop dark, phone, short phone, long history, keyboard/pointer resizing, and blocked preference storage.

Final visual/continuity selection: **17/17 passed**, including all five new focus regressions, seven layout cases and five existing chat cases. The first run also passed all ten existing support-session lifecycle tests (20/20 total in that run). The strengthened stale-response test additionally waits for response completion and two paint opportunities before checking refusal containment.

Changed-file ESLint passed with one pre-existing Header image warning; formatting and whitespace checks passed. Full TypeScript returned exactly the same five XML/Objectives diagnostics as the preserved clean-base proof, with no new diagnostics. The architecture gate retains the same eleven boundary errors and reports 157 blocking size findings versus 156 on the base. These broad inherited failures remain separately owned.

Three touched size findings need independent review; no registry was changed by this author:

| Owner | Nonblank lines | Fingerprint | Responsibility |
| --- | ---: | --- | --- |
| `useImpersonationSession` | 101 | `c2a23e8e6a078992ae3cce89c4d9d04c9b4931cb5f96867b17fb5b01fcce58b7` | Lifetime of one support-session observation owner; this is the additional blocking finding. |
| `home.module.css` | 503 | `a94b9f6caf31cd40813f543bc619d2fc8634b792c30a9bd68efbbcac5da8212b` | Existing Meri home/composer presentation and responsive theme rules. |
| `shell.module.css` | 598 | `3561c2808fb1086e356d2a747d4779e8fd7faf5aef2ed5048e75fb570cd424f5` | Existing Meri navigation, header and responsive shell presentation. |

Development PostCSS and duplicate synthetic session-key warnings remain in the original logs. They were not suppressed. No historical screenshots were changed.

## Synthetic visual evidence

[Before](desktop-before.png) · [Desktop after](desktop-after.png) · [Dark after](dark-after.png) · [Phone transcript](phone-transcript-after.png) · [Short phone composer](short-phone-after.png)

No product build, merge or deployment was performed in this follow-up lane. Root coordinates independent review and release; live reproduction/verification after deployment remains required.
