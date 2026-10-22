# PR120 broader-browser reconciliation — partial correction

Review: [dot6341454933](https://github.com/neo-capiro/capiro-frontend/pull/120#issuecomment-6341454933), updated 2026-10-22T13:04:25Z. Reviewed parent: `cb09a207492fb0dedc921e49e4e3105ac52602ca`, tree `da3f39df3e6461bb55182466ff6c9ef91e5ae7d2`. PR119 remains `5c86f9b3e6b138fe1b572b071d66766591f6dd7e`. Current authorized M1 corrections only.

## Preserved gate evidence

The completed independent synthetic run reported **168 PASS / 4 FAIL / 1 explicit live whole-flow opt-in SKIP**, all 173 declarations accounted for, retry 0, flaky 0, exit 1. Report SHA256: `a305216bf25ce43012cf46e5dbfc3e7be029f47784ebaaaf66d0642abf18d76e`. The report's runner used Node 24.19.0, npm 11.9.0, Playwright 1.61.1 and Chromium 149.0.7827.55 revision 1228 with a fresh locked install and clean tracked source.

The four failures remain the qualification baseline. Neither this source correction nor its unit checks closes a browser failure. The combined #119/#120 ship-request remains **HOLD**. Fable's narrower production PASS at the parent ([6341027944](https://github.com/neo-capiro/capiro-frontend/pull/120#issuecomment-6341027944)) is separate valid evidence, not a substitute for the broader comparison and not qualification of this new tree.

## Corrections supported by source evidence

### Selected-conversation refusal synchronization

`meri-conversation-selection.spec.ts` previously waited for a heading shared by the pre-account/client-loading notice in `MeriConversationHost` and the native session-refusal surface in `ConnectionPending`. The former can appear before the request or handler, consistent with the review's empty hints array.

The existing heading assertion now also requires the native refusal's exact explanatory paragraph in the same status section. The test still asserts the exact client/conversation session hint, zero history reads and zero unexpected requests. The assertion deadline is unchanged. No polling loop, retry, timeout increase, removed assertion or additional skip is introduced. The source correction does not claim the retained trace has independently confirmed which heading was observed.

### Ready-flow Recents date rendering

`shared/shell/ConversationRecents.tsx` now formats the existing timestamp through `Date.toLocaleString` with the same `en` locale, medium date, short time and UTC zone. It preserves link scope, discovery gates, loading/unavailable states and visible UTC text. This bounded **MF-06** shared-shell exception addresses the Recents render exception blocking the Ready/409/retry browser scenario; no other shell behavior changes.

The installed Playwright clock's `createIntl` adapter gives its formatter prototype inherited methods. The installed Temporal global adapter copies the current formatter prototype's own descriptors. Applying those adapters in clock-then-Temporal order reproduces the missing `format` method. The old component throws the reported `format is not a function` error in that composition. The actual failed browser's import order remains unconfirmed; this is an adapter-composition reproduction, not a full installed-clock/browser replay.

The new `meri-conversation-recents-clock.test.ts` reads the actual pinned Playwright and Temporal sources into an isolated Node VM. It renders the real component with native globals, each adapter alone and both orders. All five preserve the native expected UTC text for three dates, exact conversation/client links and scoped discovery after the correction. Two additional cases retain the signed-out, disabled, unverified identity/client, loading and unavailable negatives. Product code does not modify global constructors or adapter libraries. No dependency, fixture clock or application import order changes.

## Findings still blocked on retained evidence

The specific request is [6341585384](https://github.com/neo-capiro/capiro-frontend/pull/120#issuecomment-6341585384). It asks dot for artifacts from the completed run, not another runner or a blind retry.

| Finding                                                              | Current disposition                                                                                                                                                                                   | Evidence needed                                                                                                                                                                                                     |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop core flow: initial Send disabled after filling, assertion 32 | Unresolved; no product, fixture, deadline or assertion change. Source has distinct connection, SDK busy, retention/identity and draft-admission gates; the summary does not identify the active gate. | Retained trace/error-context, Send title/described-by text and textarea value, connection/history UI, session/history/transcript timeline, page errors and fixture unexpected entries.                              |
| Desktop alignment: 4px versus at most 3px, assertion 80              | Inherited and still unresolved. No CSS, target or tolerance change. The third test does not await font readiness; that alone is not proof of the cause.                                               | Retained full trigger/menu rectangles and font readiness/computed style, plus the intended pinned design version for screen-map nodes 3034:37582/3034:37596. The previously examined 3067 composition is different. |
| Ready-heading absence after Recents exception                        | Bounded date-rendering correction provided; exact failing browser load order and subsequent 409/retry checks remain unverified.                                                                       | Full retained error stack and clock/Temporal script/import timing, then central exact-head qualification.                                                                                                           |
| Empty selected-conversation hints                                    | Source-proven ambiguity removed; browser outcome remains unverified.                                                                                                                                  | Retained snapshot identifying the observed heading, then central exact-head qualification.                                                                                                                          |

The desktop flow's phone and draft-recovery passes do not identify its blocked gate. The inherited alignment failure is not dismissed. All original browser declarations, negative cases, exact-target explicit-retry/no-auto-resend guards, deadlines and alignment thresholds remain.

## Local evidence and scope

- New real-component regression suite: **7/7 PASS**, zero skips. The clock-before-Temporal case fails against the original formatter expression with the reported TypeError and passes with the correction. This is browser-free unit evidence.
- Changed-path ESLint and Prettier pass. Architecture exits 0: **0 errors / 0 blocking size findings**; existing review signals remain. Diff whitespace check passes.
- Full web TypeScript passes: `node --max-old-space-size=4096 ../../node_modules/typescript/bin/tsc --noEmit --incremental false` exits 0. No full unit-suite or browser-suite rerun is claimed here.
- Independent read-only review found no source, scope or test-weakening blocker. It confirmed the preserved locale/options and authority negatives and the stricter refusal locator.
- Four paths only: the MF-06 shared-shell file, the existing browser specification, the new unit test and this receipt. #119, Core #108, admission/retention/retry product code, API routes, feature authorization/defaults and production smoke remain unchanged.

Browser execution remains with dot's independent comparison owner and production/image qualification with Fable. This session did not launch Chromium or retry the previously denied runner. No live model turn, SQL, database write, AWS action, merge, deployment, Wave 2 work or combined ship-request.
