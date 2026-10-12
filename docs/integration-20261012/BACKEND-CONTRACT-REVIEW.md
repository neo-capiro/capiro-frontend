# Backend handoff inspection — 12 October 2026

Source inspection only. These draft candidates are not deployed endpoints or
native acceptance. No backend source is imported, changed or activated here.

## Facility / Cleanup

Reviewed capirov2 PR2394 `5d075af9b376cd3ed67256b5c38e4a2a2130a51d`, including
CONTRACT-CANDIDATE.md and RECONCILIATION-20261012.md. Its facility source preserves
PR2373; existing Portfolio facility-action-writer and FacilityGeocoding already
retain the optional opaque `geocodeCandidateRevision`, require it for selection,
and send only `{candidateIndex, expectedRevision}` to the reviewed route.
Missing revision disables selection; 404 does not fall back to the legacy route;
409 requires fresh visible review. Existing facility unit/browser regressions are
part of the combined suite. API and both workers, native CAS/RLS and signed-in
acceptance remain owner gates. The browser never reconstructs the server hash.

## Exact mail sender

Initially reviewed capirov2 PR2393 `8340ac22cdb5c9f4d03e1f36b7f96d30b2af4502`;
refreshed to `b1ac2649e134af560d41bee790cacbd61de01c9b` after the independent
repair. Read the changed service receipt check, SENDER-CONTRACT.md and exact
FRONTEND-HANDOFF.md. The repair now rejects an upserted message whose thread ID
differs from the returned thread, as well as a different connection. Parent and
handoff report 168 independent source tests; this frontend session did not rerun
the backend suites or transfer an old-head acceptance. The candidate supplies:

- `GET engagement/mail/mailboxes`: exact owner-scoped id/provider/accountEmail/
  displayName/availability/signaturePolicy projection, without token records.
- Optional `senderConnectionId` on the existing single-mail POST. Selected IDs
  never fall back; replies pin the originating connection.
- Success sender ID/email/name plus actor signature policy and applied status.
- Explicit unknown/receipt-unavailable 503 outcomes with no automatic retry.

Current MailCompose/sendReviewedMail has no mailbox picker and validates only
its historical ok/thread/message receipt. Therefore ENG-prep_sender_select stays
open. Wiring requires a current-actor mailbox query, explicit reviewed selection,
preflight reread, exact sender receipt matching and actor-signature copy, with an
unavailable selector on 404/old service and retained drafts on refusal. Its new
receipt must not be treated as proof of delivery or a durable idempotency ledger.
The refreshed handoff records independent source review of repair `14d66227`;
release/activation and native acceptance remain separate. Parent coordinates the
API-schema handoff and deployment, not this frontend session.

TimelineMailThread's native reply action remains unavailable: the candidate does
not introduce provider-native parent headers or durable replay/recovery. Proposal
send/version binding is a separate contract and cannot be unlocked by generic
mailbox selection. Existing synthetic fixtures were not broadened to imply that
these undeployed features are live. This inspection adds no feature flag, endpoint
fallback or provider action.

## Planner durable receipt prerequisite

Read PR2395 `c5e41e320af4b4d841d4b3136777d712116916ed` CONTRACT.md and
QUALIFICATION.md. Its task-create command accepts a caller-retained UUID and
canonical task data; the trusted Planner owner binds actor/tenant and returns an
immutable task receipt. Recovery and identical replay recheck current authority;
a different payload conflicts, and a new key must never work around an unknown
outcome. The reported 194 independent source tests do not establish native
PostgreSQL/RLS contention or deployment acceptance.

PR2395 is a Planner-only durable step. The later Core bridge below adds a
source-qualified activity owner; neither authorizes two unrelated frontend POSTs
as an atomic action. No Quick log behavior or availability was changed here.


## Core Quick log next-candidate contract

Parent supplied PR2396 at `e2c2c110edd986e799d47d43b0db50b24fab0201` during the
frozen 9fa5e2c browser run. CONTRACT.md and QUALIFICATION.md at that exact head
were inspected read-only. Its reviewed source candidate is `961cbe0204d762ddfcb96ec054a907665720380e`
(tree `04749f1c520bc68ee5b68b1516b4256c2009cb27`), stacked on PR2395. The handoff
reports 284 independently run overlapping synthetic tests plus final serial
Core/Strategy type/build passes; this frontend session did not rerun those suites.

The new Core owner provides `POST /api/clients/:clientId/activity-commands`,
read-only receipt GET by the retained request UUID, and explicit resume with
`expectedVersion`. It commits local activity and durable intent together and
keeps remote Planner calls outside the transaction. A generic Planner follow-up
uses a separate server command UUID, fixed title and no copied protected client
text. The browser must retain its reviewed command key and receipt version;
unknown remote outcome never permits a new key, automatic retry or task fallback.
Same-key creation replay does not start a remote attempt. Completed task links
require current scoped receipt confirmation.

Receipt version 1 distinguishes completed, pending, in_progress and
needs_attention, with bounded reason codes and withheld unavailable destinations.
The optional task date/time requires an explicit zone and preserved civil date;
no midnight/UTC invention. Existing ClientPerson identity is required, with no
Directory-ID translation. Canonical legacy activity routes also gain the current
client wall. Browser selection remains only a hint, never current authorization.

This source requires migration/native PostgreSQL/RLS qualification and authorized
server configuration, including the new HTTPS-only Core Planner origin. None is
assumed deployed or configured. Full commitment direction, Directory identity,
objective/strategy links and rich task visibility remain unclosed. Frontend
receipt handling requires a separate source candidate and review after preserving
the running 9fa5e2c result. No live endpoint or action is enabled by this record.

## Approved memory wording only

Parent supplied PR2397 at `4915f3fa5c938182b2624377375674654baa5337`; its CONTRACT.md
was inspected. It records wording source `539f62e7f2a3f87d9f56f1281e6fff717aed0958`.
The existing response stays `{saved:false, scope, candidateId, message}` and every
shared proposal starts pending. An administrator with current governed approval
authority may later approve their own proposal under existing policy; ordinary
firm grants do not confer approval, and ordinary client review keeps its current
grant, assignment and different-proposer requirements. Personal memory remains an
offer requiring another user request. No permission, evaluator, endpoint, JSON
shape, Meri public package version or automatic save was added. No frozen
frontend code or governed authorization behavior changed here.
