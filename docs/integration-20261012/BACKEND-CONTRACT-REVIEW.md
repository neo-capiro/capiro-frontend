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

Reviewed capirov2 PR2393 `8340ac22cdb5c9f4d03e1f36b7f96d30b2af4502`, including
SENDER-CONTRACT.md and its source-bound qualification. The candidate supplies:

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
The source handoff explicitly still requires independent Engagement/security
review before activation. Parent is coordinating the detailed API-schema handoff.

TimelineMailThread's native reply action remains unavailable: the candidate does
not introduce provider-native parent headers or durable replay/recovery. Proposal
send/version binding is a separate contract and cannot be unlocked by generic
mailbox selection. Existing synthetic fixtures were not broadened to imply that
these undeployed features are live. This inspection adds no feature flag, endpoint
fallback or provider action.
