# Overview Timeline recovery — DG-09

Added 11 native editable desktop 1440 screens in Portfolio 3.4, reusing 13 existing recovery states.

[Review entry](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3132-78373) · [Section](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3132-78372)

## Added presentations

- [tlRecoveryCurrent · Recovery is unavailable (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3132-78373)
- [tlOriginalLookup · Checking the original request (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3132-78457)
- [tlLookupUnknown · Original outcome still unknown (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3132-78528)
- [tlSameRequestReplay · Retry the same original request (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3132-78604)
- [tlRejectedUpdate · Update definitely rejected (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3132-78689)
- [tlRejectedRemove · Removal definitely rejected (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3132-78765)
- [tlDraftRestored · Return to timeline with draft retained (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3132-78850)
- [tlScopeRedacted · Account or client changed (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3132-78926)
- [tlOriginalRemovalLookup · Checking the original removal (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3132-84677)
- [tlSameRemovalReplay · Retry the same original removal (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3132-84731)

The new screens distinguish an unknown dispatched update/removal from ordinary update error 1064:161135, history read error 1064:162784, validation before dispatch and an authoritative definite rejection after dispatch. They show original-request lookup and unchanged-request replay separately for update and removal. Current lookup/replay unavailability is a distinct state, with primary controls disabled.

The original draft remains visible and separate from new input while recovery is unresolved. The focus-restoration design returns to the original activity actions or an authorized Timeline fallback if the row is gone. Account/client changes hide the original activity title, body and draft rather than rebinding them into the new context.

## Existing frames reused and corrected

Unknown update 3110:63793 links to current update recovery 3132:78373. Unknown removal 3110:64009 links separately to [current removal recovery](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3146-90478), which retains only the original activity target and removal intent. The removal path never displays an update draft. Existing latest activity comparison, changed snapshot, acknowledged save/removal, tablet and missing-current-entry states remain valid references. Directory labels no longer call a current-record read an original-request lookup or safe replay. The validation frame 3110:64659 is now named as not submitted, rather than suggesting a rejected dispatched operation. The prior account/client-change frame was corrected to redact identifying activity details.

The ordinary 1064:161135 update-error and 1064:162784 feed-error frames were not changed. No original Overview trigger was replaced.

## Explicit backend and implementation dependencies

Current source was rechecked on 26 October 2026. Activity attempt tracking is session-cache protection, not an immutable native receipt. The mutation uses retry:false; reviewing current activity is read-only comparison and does not prove the original command outcome. There is no admitted immutable original-request receipt lookup or safe replay endpoint in the inspected source.

Accordingly, the lookup/replay design previews are visibly labeled as requiring an accepted owner contract. Primary lookup/replay controls remain disabled; review-only prototype links demonstrate presentation. Definite rejection requires authoritative evidence for the exact operation; a timeout, generic error or absent row is not that evidence.

Current entered draft retention is guaranteed while the editor remains open. Retention across close/refresh is explicitly marked as a design requirement needing scoped storage and access checks. The mockups do not claim that this is already implemented.

Source evidence (blob SHAs recorded in LEDGER.json):

- [activity-attempt.ts](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/client-profile/activity-attempt.ts)
- [activity-mutations.ts](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/client-profile/activity-mutations.ts)
- [ActivityDialogs.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/client-profile/ActivityDialogs.tsx)

## Validation

11 new frames; 406 text nodes use Geist/Geist Mono; zero horizontal text overflow; zero missing prototype destinations. Native hierarchy: 243 frames, 547 instances, 53 rectangles, 616 vectors and 66 ellipses. The only raster content is eleven reused 77 × 26 Capiro wordmarks. Full-view screenshots of current unavailable and update/removal replay presentations passed visual inspection. No application code, runtime behavior, backend routes or tests changed.


Independent-review correction: added distinct current removal-unavailable frame 3146:90478. Its read-only review routes to removal comparison 3113:75966, and its design-preview link routes to removal lookup 3132:84677. Explicit payload-leak check returned no update draft, and the full-view screenshot passed.

