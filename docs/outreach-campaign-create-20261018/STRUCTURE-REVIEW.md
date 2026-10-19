# Outreach campaign creation review

<span id="outreach-view"></span>

`OutreachView.tsx` has 634 nonblank lines. This change adds one child to the existing owner-wide campaign list header. The route view still coordinates legacy Outreach records, campaign session selection, and list filters. `CampaignCreate.tsx` owns the new mutation, title form, and write-result handling; the route view contains no new request or authority logic. The separate `+ New outreach` action continues to create a legacy record. Independent source review by `/root/outreach_create_review` checked this composition and the Core/gateway contract on 2026-10-18.

Core source defines authenticated `POST /engagement/outreach-v3/sessions` with an optional title of at most 240 characters, returning the existing session-detail shape. The new operation sends only that title through the registered Core service and opens the returned session ID. It does not add a send path. Client-scoped Outreach views do not offer campaign creation because Core's session list is owner-wide.

The UI holds another create after an uncertain response while this component is mounted and asks the user to check the campaign list. Core provides no idempotency key for create, so navigation can clear that hold and a repeated submission can produce a duplicate draft. This is a remaining Core-contract limitation, not a verified live retry path.

The Core state guard defaults off unless `OUTREACH_V3_STATE_ENABLED` is enabled; current read-only preview also rejects this POST. Unit, browser, typecheck and build results verify the source behavior in the local harness only. This review does not assert live availability or Figma pixel parity.
