# Exact reviewed sender integration

Consumes Core PR2393 `b1ac2649e134af560d41bee790cacbd61de01c9b` as a source
contract. New-message composition requires an explicit current-actor mailbox;
replies display and lock the originating thread mailbox. Unavailable, failed,
loading and no-selection states retain the draft without substituting a sender.
The review freezes connection, address, display name and actor signature policy.
A fresh mailbox/thread read and current authority guards precede the sole send.
Success requires the selected sender receipt; uncertain dispatch or a mismatched
receipt never enables a retry. Signature application is reported from the receipt.

`useMailboxes` owns scoped reads, `MailboxField` their presentation, `mailboxes.ts`
safe projections and exact review comparison, and the existing `sendReviewedMail`
owns dispatch/certainty. The compose container only binds these to its existing
draft/review flow. Optional selector omission remains accepted by the low-level
legacy send contract and its original tests; active send-enabled UI always selects
or locks a mailbox. Local reviewed metadata is excluded from the wire DTO.
Blocked native-reply review remains blocked; this does not add provider-native
headers, a durable send ledger, or a second provider implementation.

## Evidence

- New regression initial baseline: 14 failures / 3 passes. One table-input harness
  defect was corrected explicitly; the original result remains in
  `evidence/mailbox-regression/red.txt`. Final sender/legacy units: 44 passed.
- Initial compose/rewrite browser run: 27 passed / 2 failed. The prepared-draft
  case needed explicit mailbox selection before its original recipient/attachment
  assertions; actor-switch errors needed distinct rewrite/mailbox status scope.
  Abort, retained draft and zero-send assertions survive. Failed traces and JSON
  remain under `evidence/mailbox-browser-initial`.
- Corrected compose/rewrite: 29 passed. Affected Portfolio/Government/Relationships:
  21 passed. Full JSON and logs are preserved separately.
- Workspace typecheck and focused lint/format pass. Architecture: 391 signals,
  366 reviewed, 25 inherited unreviewed, zero blocking, no boundary errors.
  Exact changed MailCompose/sendReviewedMail reviews are recorded in the existing
  fingerprint registry; thresholds and guard rules are unchanged.

All requests in these tests are synthetic/intercepted. Live Clerk/Core/provider
consent, Sent Items reconciliation, RLS and native acceptance remain unrun. The
complete new candidate browser/build/actual-server qualification is pending; no
prior source run qualifies this change. All 337 Portfolio rows remain unaccepted.
