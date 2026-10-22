# PR120 Desktop Send correction

This is a bounded M1 correction following [retained evidence6342058074](https://github.com/neo-capiro/capiro-frontend/pull/120#issuecomment-6342058074), updated 2026-10-22T13:33:31Z. Parent: `8b2a702a2f4b6e849083acfb3514105c2c0e04c9`, tree `92ed0c94793452afb9919ef169dc78a1fe33a340`. PR119 remains `5c86f9b3e6b138fe1b572b071d66766591f6dd7e`.

## Evidence and diagnosis

The packet is an offline sanitized extraction from the completed cb09a207 comparison, not a rerun. Original report SHA256: `a305216bf25ce43012cf46e5dbfc3e7be029f47784ebaaaf66d0642abf18d76e`. Reported sanitized packet SHA256: `d809a77a5c29a9eb4de58ebff4797f6b8d762211357ea9b419048e1579f70ff4`. This session read the complete GitHub comment; it does not claim receipt or independent hashing of the original trace archive.

The desktop trace shows session 200, transcript 404 and history 404 during the fill. The editor changes from Connecting to Meri to the SDK-busy presentation; immediately after fill its value is empty. The final Send title is ordinary Send to Meri, with no connection/busy suffix. No allocation, admission, submission or cancellation was recorded. No page error was captured; the two console errors were 404 responses. The fixture's unexpected-request array was not serialized.

Source inspection found no draft-journal clear corresponding to those events: the explicit conversation keeps the same draft scope, 404 is not access denial, and no captured/observed submit can acknowledge this unsent text. However, `ConnectedConversation` replaced the whole `ConnectionPending → ConversationFrame → MeriComposer` subtree with `MeriLiveConversation → ConversationFrame → MeriComposer` when the session became ready. This necessarily replaced the focused textarea. That lifecycle defect is consistent with a fill losing its focused target during connection; the sanitized evidence does not instrument whether the original onChange callback ran. No claim of a proven journal reset is made.

The same packet confirms R5's ambiguous-heading diagnosis for selection: the pre-account/client notice satisfied visibility before the request/handler. It also retains the Recents formatter stack after clock installation and bundle loading. Exact Temporal constructor evaluation order was not instrumented. The source-reviewed native-refusal and date-rendering changes at the parent are preserved unchanged; their browser outcomes remain unqualified.

## Bounded ownership change

The existing account/client/conversation-keyed host now mounts one `ConversationView`. That view owns the stable frame and composer position. Only the session-bound transcript/status/files body is replaced. DOM wrappers, CSS, textarea component, raw draft/revision owner, identity keys, storage and request journals are unchanged.

`MeriLiveConversation` still owns the existing run hooks, availability calculation and explicit command callbacks. A small conversation-local presentation channel publishes those controls after commit in a layout effect. Only the composer sibling subscribes, so a publication cannot rerender its publisher or form a feedback loop. The channel owns no authority, admission, timers, transport, persisted state or request identity.

The composer accepts controls only from the exact current `ready.port` object while access is retained and no newer target supersedes it. The context-derived lifetime key alone is insufficient because it can repeat across renewal. Each cleanup retires only its own exact publication; an older cleanup cannot clear newer controls, even for the same port. Missing, expired, revoked, superseded or mismatched publications fall back to the existing blocked pending controls. A ready body waiting for its first publication remains blocked. Existing superseded-run guidance is preserved.

Drafts remain editable for a known selected conversation during connection. There is no DOM-text recovery, cross-scope text transfer, automatic send or timer-based readiness. The outer scope key still remounts on account/client/conversation changes; revocation still hides and clears through the existing owner. SDK/backend authority remains canonical.

## Verification and limits

- Focused unit run: **15 files / 82 tests PASS**, including the new presentation-channel checks and existing first-chat, readiness, identity, draft retention, expiry, session-boundary, revocation, tab identity, initial-draft, readmission, Stop, input-recovery and turn-settle suites. This overlaps the earlier 31-test development subset; counts are not added.
- The six existing test adapters now compose the stable view or capture the same controls at their new presentation boundary. Every existing assertion is retained. The denied-view test now renders the real frame instead of the previous JSON projection.
- New lifetime checks exercise the actual composer/form callback, exact-port renewal refusal, expired/revoked/superseded controls, positive explicit send, empty-input/no-auto-send, blocked reasons, post-commit publication, stale cleanup and listener disposal. They are Node composition tests, not mounted DOM/focus evidence.
- A new deterministic synthetic browser case holds the original session response, types a prefix while connecting, releases the response through the existing handler, checks focus/text across history 404, then types a suffix without refocusing. It requires zero write RPCs until explicit Enter, one exact request through allocation/admission/submission, and positive-ACK clearing. It is **not run here**. It adds one declaration; all existing 173 browser declarations and their assertions/deadlines remain unchanged.
- The final strengthened stale-control negative fixtures passed **8/8**, zero skips. No product source changed after the 82-test run. Changed-path ESLint and Prettier pass; architecture reports **0 errors / 0 blocking** (539 total signals, 521 reviewed, 18 inherited). No policy exemption changed. No mutation run is claimed for this correction.
- Final TypeScript status is recorded in the PR body. No browser runner, production build, live model or acceptance turn ran in this session.

## Remaining gate and missing evidence

Alignment remains **OPEN**: client translate 663/219 and status translate 808/219 versus expected 804 were retained, and a Geist WOFF2 response returned 200. Full DOMRects, computed font/padding/gap, font-loaded measurements and authoritative design version were not captured. A font response alone does not prove the rendered font metrics. No CSS, expected coordinate or <=3px tolerance changes.

Dot retains the single independent browser-comparison runner. The Desktop Send correction and new focus case require exact-head browser qualification, together with the previous native-refusal and formatter corrections. The parent comparison remains 168 PASS / 4 FAIL / 1 explicit live SKIP; no failed browser case is closed by this source correction. Fable's narrower cb09a207 production PASS does not transfer to the new tree. The combined #119/#120 ship-request remains **HOLD**.

Six product files are inside the Meri feature lane: `MeriConversationHost.tsx`, `ConversationView.tsx`, `ConversationFrame.tsx`, `ConnectionPending.tsx`, `MeriLiveConversation.tsx`, and `conversation-composer.ts`. Six existing unit adapters, one new unit file, one new browser spec and this receipt use the existing M1 tests/docs exception. No shared-shell, API, contract, dependency, feature default, previous browser spec, timeout, retry, skip, alignment rule, Core #108 or #119 change. No Wave 2, SQL, database write, AWS, merge or deployment.
