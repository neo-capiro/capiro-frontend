# Rich newsletter implementation boundary

Continue PR16 above `8ef07b197eb3d41685aaba897a6ef208d43f2277`; PR15 remains frozen. Preserve the scope audit's43 runtime facets,179 assets and37 original test histories. The existing exact saved-version workflow remains independently owned and unchanged.

## First receiving slice

The generic Outreach response schema owns validation and selective preservation of the existing optional routing metadata. The Engagement feature owns route discrimination and presentation; it must never feed a rich record into the plain-text editor. A valid UUID is only a route hint. The dedicated backend record owner must verify record, stage, actor, tenant and every source client before rich data is admitted. Wrong-type hints, malformed markers, duplicate or mixed route identifiers fail closed. Decoding/navigation must not open a stage, associate a record, prepare, test or send.

Re-use the canonical Capiro gateway, session/client remount and scoped query cancellation, route search parameters, module controls and current backend routing contract. No additional authorization or generic HTTP client. Record ID and stage ID remain separate from WsDocVersion and OutreachV3 session identifiers.

## Editor and backend dependency

The qualified public `@capiro/shared/newsletter` and `newsletter-render` own rich content types, factories, source provenance and rendering. Frontend presentation can build against those public exports. Persistence, collaboration, asset services and dispatch admission need producer-owned receiving parsers/types: the qualified package currently has no runtime validator and no rich record/stage-read envelope. `NewsletterStage` is the creation receipt, not the stage-read response. Do not cast unknown responses or introduce a second handwritten content DTO/renderer. The backend owner must publish additive runtime parsers for document/create/save/preview and dedicated rich record/stage-read responses before these native flows can be enabled.

The intended revisioned editor separates local draft state, canvas/block controls, campaign settings, preview and CAS persistence. Save conflicts retain local edits; uncertain writes require explicit reconciliation and never automatic replay. Route/session/client replacement disposes the entire editor. Stage navigation must wait for an admitted receipt and a receiving owner. Missing functionality remains visibly unavailable; this slice does not retire any original facet.

## Verification

Retain a failing generic-metadata regression baseline. Qualify optional/null metadata, UUID versions1–5, positive safe integer revisions, unrelated-field stripping, malformed reserved fields, wrong-type markers, ambiguous/deep-link dispatch and ordinary editing. Intercept all backend paths and assert zero effectful operations, no plain-text form for rich candidates and no route-ID conversion. Re-run the exact saved-version tests, type/lint/format/architecture/public package checks. Keep clean-install/full-build/native/backend/Figma acceptance separate and report unrun gates. Dependency borrowing for bounded checks must not be described as a new clean install.
