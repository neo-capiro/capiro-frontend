# Independent Relationships candidate review

**Disposition: accepted at the static/source-review boundary, pending root qualification.** No additional source defect was established in this bounded review. This is not a post-change test pass or native acceptance.

Reviewed the exact 15 files pinned by `root/relationships-format/binding.json` (2026-10-13 12:07:30 UTC). All current SHA256 values match that pin; the complete binding is in `REVIEW.json`. The review wrote only this evidence directory and ran no tests, browser, server, install, typecheck, scanner or build.

## Current reads and selection

- `RelationshipsPage.tsx:36` and `GovernmentRelationships.tsx:14` derive rosters and selected drawers from successful, error-free current queries. A failed roster read hides the former drawer and removes its URL selection; recovery requires a new selection. Local hierarchy/add/search presentation is reset when its supporting read fails. Successful background refresh does not tear down an existing editor merely because a write invalidates its query.
- `DirectoryResults.tsx:16` and `TargetRecommendations.tsx:10` admit only their respective current, non-fetching successful feed. Their error/retry presentation remains, while an independent successful feed remains usable. Empty successful results remain distinct from a failure. Recommendation refresh stays an explicit mutation; the patch adds no automatic refresh write.
- `TargetDrawer.tsx:17` separates current target facts from subordinate Directory contact/position details. A failed detail read removes positions, email choices and the nested Mail UI without pretending that the independent target record failed. The selected email is reset on that failure.
- `ContactMail.tsx:8` treats current history and selected thread detail separately. History failure disposes selection/composition; detail failure withholds messages and Reply and disposes the reply draft. Contact identity replacement also clears local intent. Existing successful background fetches keep the current view but disable opening another composition until the read settles. Recovery restores accessible data, not the discarded draft.

## Requested thread and association

`email.ts:72` now refines the existing thread receipt against the exact requested ID. It does not incorrectly equate the returned stored `clientId` with recipient-derived history membership. `threadsForRecipient` is unchanged, so direct, null and other stored client associations remain eligible for reading when the selected contact is actually represented in the returned history. This read admission does not broaden the separate existing send preflight: its client/mailbox/thread checks remain unchanged. The positive three-association control and wrong-ID negative control are preserved.

## Submitted attempt and callback lifetime

- `contact-create-attempt.ts` retains a copied create intent in the existing canonical QueryClient under tenant/actor/client/new-contact identity. Reservation is synchronous; pending and unknown attempts block another creation in that scope. A successful roster GET cannot erase uncertainty or prove causation. A matching verified success or definite refusal releases the fence. Cleared cache or a replacement token cannot be repopulated or settled by an old completion.
- `mutations.ts:21` rechecks current identity and canonical roster state before dispatch. Existing mutation-cache counting still excludes concurrent contact changes. A captured mount-lifetime object controls the `onSaved` presentation callback after invalidation, preventing a disposed submitting drawer from closing a newer drawer. Existing contact receipt parsing and definite-refusal semantics remain canonical in `contact-api.ts`.
- `email/send-attempt.ts` applies the same cache-lifetime reservation principle to the existing `MailSendError.uncertain` classification. `email.ts:110` captures the established Mail authority, reserves the exact copied send input, and settles only its own extant token. `MailCompose.tsx:64` supplies explicit thread/person/normalized-recipient identity. Reopened presentation observes the pending/unknown fence rather than resetting it; it does not replay or claim delivery. Existing sender, signature, attachment, rich body, rewrite/Undo and send receipt logic is untouched.
- `target-queries.ts:48` uses current target-list admission, a captured mount lifetime, and a pending count specific to the member ID. A held removal prevents another action for that target across drawer replacement while permitting an unrelated target. Its late callback cannot close that unrelated drawer. This is a pending-operation fix; it does not add an unknown-target or recommendation-refresh reconciliation policy.

These records are local to the canonical QueryClient and its existing session/client disposal. They are not backend idempotency, durable recovery, provider delivery evidence, or a new authorization owner. Native authority remains with the existing services.

## Preservation and test assessment

- Independently compared all four original Phase A test/helper files with the root sealed source: byte-identical. They contain 14 original cases, with the retained baseline classification of **12 product reds and 2 positive passes**. The failed cases' recovery tails remain unproved until post-change execution.
- Independently compared 22 existing tracked Relationships, Government, Committee, mail and email-composition test files with their base Git blobs: all unchanged. The exact file inventory/hashes are in `REVIEW.json`.
- The four additive browser cases meaningfully exercise held contact create success/unknown outcome, stale-read drawer disposal, continued create fencing, replacement-drawer survival, target-specific held removal, and pending/unknown mail after current-history loss and same-thread reopen. They assert effect counts and explicit UI outcomes, not snapshots. They are **unrun** in this review and have no original baseline-red receipt.
- The 12 additive pure cases inspect real QueryClient reservation/settlement behavior: copied intent, duplicate reservation refusal, unrelated successful read independence, definite/unknown settlement, scope-key isolation, cache clear, and replacement-token ownership. These support the helper contract but do not prove mounted React behavior. They are **unrun** in this review.

Root should run the original 14 plus four later browser cases, the 12 pure controls, and the preserved relevant suites. Type/lint/format/architecture and final combined qualification remain root-owned. The existing direct/null/other read-association positive must remain, as must provider refusal and rich-mail assertions.

## Cohesion and remaining review limits

The changes preserve domain ownership. The two small cache helpers have different outcome semantics and no new persistence, transport or framework. The page and drawer functions continue to own their existing presentation flows; the added state exclusively determines whether that presentation is currently usable. MailCompose receives one identity argument and retains its existing cohesive composer/review responsibilities. The target mutation hook remains one target write/receipt/lifetime owner.

Large existing render functions and the MailCompose module remain visible review signals. This review accepts the stated responsibilities and exact file hashes; root must bind the final architecture scanner's exact function fingerprints, with no blanket size waiver. No runtime gate, full Figma, assistive-technology, provider/native behavior or any of the 337 native acceptance rows is marked complete here.
