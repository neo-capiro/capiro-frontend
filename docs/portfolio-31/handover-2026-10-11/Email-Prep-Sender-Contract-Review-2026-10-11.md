# Email prep sender selection: contract review

As of 2026-10-11 13:52 UTC. Audit row `ENG-prep_sender_select` remains **BLOCKED** for product integration and **NOT RUN** for live acceptance. This review is source inspection, not a backend change or send authorization.

## Current source facts

- Backend source: `neo-capiro/capirov2` remote main `fd8765ec01d292013758606204f2c9d886cd31c1`. `POST /engagement/mail/send` uses `SendSingleMailDto` in `apps/api/src/engagement/engagement.controller.ts`; it has recipient/content/attachment fields but no `senderConnectionId`.
- `SendSingleMailInput` likewise lacks a sender field. `EngagementService.sendSingleMail` calls `findCampaignSendConnection(ctx)` without an ID, which chooses the caller's most recently updated connected Outlook/Gmail inbox. The resolver already supports an explicit preferred connection ID and rejects a disconnected or non-owned selection without fallback.
- `GET /engagement/integrations` lists the caller's connection records, but `listIntegrations` returns full records without a dedicated minimal sender-picker projection. Its exact browser-visible data shape and permission policy need an owner review before using it for this control.
- Sender identity in the outbound local `MailMessage` is currently derived from the signed-in user's `email` via `resolveSenderSignatureHtml`, while the dispatch uses the selected integration connection. A selected mailbox with a different address needs consistent reviewed From display, saved message provenance, and signature behavior.
- The Portfolio `MailCompose` in `apps/portfolio-web/src/features/relationships/MailCompose.tsx` sends through this single-mail route. Meeting prep's Email PDF action seeds that composer. The current UI promises the user's connected mailbox, not a specific mailbox.

## Contract needed for an honest picker

1. Engagement owner exposes a caller-owned, connected, send-capable mailbox list with only the fields needed for display and selection (`id`, provider, account address/display label, availability). The picker must not infer send permission from a broad integration record or a presence-only status.
2. Single-mail DTO and internal input accept a selected connection ID. The send path resolves that exact ID with its existing tenant/user/provider/token/status guard and never falls back to another mailbox if the choice becomes unavailable. Reply sends must also respect the originating thread's connection and fail rather than switch identities silently.
3. The review and exact send receipt identify the chosen sender. Persisted From address, signature treatment, and thread/message connection identity must agree with the actual provider dispatch. Unknown send outcomes continue to freeze retry and require mailbox reconciliation.
4. Portfolio then adds the picker to Email prep, binds the selected ID into the reviewed send input, rechecks actor and mailbox availability immediately before POST, and displays failures without claiming delivery. A live test must use only an explicitly approved sender account and recipients.

## Acceptance to close the row

- Two connected caller-owned mailboxes appear distinctly; another user's or tenant's mailbox cannot appear or be selected.
- Send from mailbox B uses B at the provider and in the resulting Sent Items/local message. Disconnecting B between review and send fails closed; it never silently uses A.
- Reply from a thread tied to A cannot be sent as B unless the backend's reviewed reply contract explicitly permits and records it.
- Signature, attachment ACL/readiness, permission loss, ambiguous provider outcome, and reload/recovery cases retain their existing safety behavior.
- Signed-in native browser and provider read-back pass on the deployed exact commit, alongside the local component and regression checks.

No mailbox was connected, no email was sent, and no backend route or access boundary was changed for this review.
