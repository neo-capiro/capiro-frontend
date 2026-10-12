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

This is a Planner-only durable step. Full Core Quick log still lacks its activity
command/outbox, partial-state owner, lineage and product decisions for task
audience/date-zone semantics. It does not authorize two unrelated frontend POSTs
as an atomic action. No Quick log behavior or availability was changed here.
