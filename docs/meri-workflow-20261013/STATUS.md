# Meri action host receiving implementation — 13 October 2026

This source adds an explicitly connected recommendation → reviewed draft → prepared proposal → explicit execution workflow at `/meri/actions`. Existing disconnected chat/workspace and immutable event-stream contracts remain. It introduces no approval endpoint or browser approval authority. The new server configuration `MERI_ACTION_WORKFLOW_ENABLED` is off by default; no environment was activated.

The native session/four-action mount exists in Meri PR47 at `84c2ca01d0bce025a0003b6e724d675a05f2975a`. The public action receiver is `@capiro/meri-contracts` 0.1.1, PR43 `83d1d8b2ae4604ca259be17461ae71ca60f5fb6e`, publication `08ba900965f54d4f0cd3776a9bb2158877e76dfd`, archive 175,627 bytes / SHA256 `0ca8d0552a2960157ebdf7b8cecf6cacdcda48ef91c475060a54f15192535651`. The original root contracts0.1.0 and ui-stream0.1.0 peer graph remain unchanged; the web app receives0.1.1 separately. No private backend implementation is imported.

## Ownership and behavior

`shared/meri-actions` owns strict bounded session receipts, five fixed same-origin proxy paths, the four-action public receiver transport, immutable opaque handles, exact captured request/response correlation and the nonsecret attempt journal. Thin Next routes adapt existing Clerk admission and server-owned configuration. Feature modules own presentation and local interaction; the app host composes the port with the existing ApplicationBoundary, canonical QueryClient and service-verified selected client.

All action sends, including recommendation lookup with durable lookup metadata, enter a pending journal before dispatch. Unvalidated/interrupted results remain uncertain, with no automatic replay. Only a validated NOT_DISPATCHED result permits another attempt. Approval refusal is treated as pending only for the exact409 COMMAND_APPROVAL_REFUSED + NOT_DISPATCHED disposition. Observed/replayed results are displayed only after public validation and exact proposal/task/context correlation. Required approvers may differ from the acting user; recovered worker attempts may change worker/fence while preserving stable context. Unknown, withheld, not-stored and unavailable outcomes remain distinct.

The host disposes credentials, private views and opaque handles on expiry or principal/client replacement. Routine verification of the same selected client hides and pauses the existing view, then restores its unchanged draft on current authorization. Held results cannot restore replaced authority. Uncertainty survives route navigation only within the same canonical QueryClient and context; this is not durable recovery. Cleared/replaced cache generations cannot be repopulated by an old journal writer. Backend authorization remains authoritative.

Session bootstrap uses the existing native `capiro` token and bounded native hints. Four action calls use a separate in-memory opaque credential. The proxy has no arbitrary URL, approve path or client-provided authority, omits cookies upstream, rejects encoded/nonliteral routes, and preserves bounded body cancellation/deadlines. Local failures do not invent a remote execution disposition.

## Verification at publication

- Final targeted pure adapter/session/transport/proxy/bootstrap/host controls: **225/225 in8 files passed**. Original feature controller tests: **26/26 passed**. Original26 browser specs remain byte-identical.
- Final web typecheck, targeted lint and architecture passed. Independent responsibility reviews bind exact functions/source hashes. The formatter's initial failure covered10 immutable fixture JSON files; these bytes remain sealed and narrowly excluded from rewriting, with all57 imported fixture files bound in `RECEIVING-FIXTURES.json`.
- Actual mounted host browser development run: **18/18 passed**, one worker,30-second timeout, zero retries, system Chromium154. The preserved initial attempt failed on an accessible-name whitespace locator mismatch; only the two regex locators were corrected. Assertions and original tests remain. This run covers user/session/organization/client replacement with held200/401, expiry, current401 disposal, same-client revalidation, pending/unknown writes across navigation and Back/Forward, explicit connection and action dispatch, keyboard/date controls, desktop1440 and mobile375 geometry.
- Genuine failing regression baselines are retained for interrupted-query fencing, malformed401 disposal, foreign query intent, forged action paths, nonliteral proxy routes, native receipt grammar/body cleanup and stale cache writers. Independent review packets and raw failures are preserved under `review-evidence`; their historical status statements describe their respective checkpoint.

These are source/development results on a borrowed read-only dependency graph. A clean install, complete combined source/browser suites, production build and actual-server qualification will run after consolidation with Newsletter, shipping and Onboard on a new integration branch. They are **not** claimed complete for this branch.

## Remaining acceptance

Native current tenant/actor/client authority, admitted-run ownership, allocator composition, host affinity/revalidation, real policy/approval/task effects and live activation remain unqualified. No real provider/model workload, security/database change, deployment or AWS shipping occurred. Synthetic public fixtures cannot close those gates. Full Figma fidelity and accessibility acceptance remain open. The337 Portfolio rows remain unaccepted until their native criteria are met.
