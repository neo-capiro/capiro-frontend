# Conversation history integration outline

Isolated branch `dot/meri-ui-history-20261016` starts at the reviewed UI candidate
`36974aa470d9e1ae5b6cd89c16b8e19dc77e2b6e`. Existing source-analysis and refactor
review evidence remains bound to its unchanged source. The parent accepted the
L3 protocol at `5abfa6535263e2a8d2a7cd8cacadd86305227844`; adoption of its generated
public artifact remains conditional on artifact review. Only that accepted
tarball/package-pin/lock refresh is authorized; no unrelated upgrade is included.

## Responsibilities and paths

- `shared/meri-conversations`: fixed native-token history proxy, public receiver
  composition, scoped discovery/transcript query state and immutable paging.
  Existing opaque-session/run-local transport, SDK cursors and command journal
  stay canonical. New-turn admission recovers the same source-to-target receipt,
  then opens an exact target session and retains the original submit identity.
- `app/api/conversations/[...path]/route.ts`: thin routing and server-only
  existing Clerk `capiro` token. Native history requests never accept an action
  session as membership authority or expose the native credential to the browser.
- Meri conversation feature: render admitted saved run segments with one prompt
  per `(conversationId, logicalRequestId)`, retain distinct same-text submissions,
  and show loading, partial paging, errors and unavailable states explicitly.
  Browser route selectors are hints, never authority. Reading old runs grants no
  writer eligibility. Current observation retains its separate run-local cursor.
- Shared shell Meri recents: real admitted conversation links and paging for the
  current verified account/client; unchanged fixture-only sample records. Search
  and new-conversation controls remain unavailable without those contracts.
  Frontend owner confirmed no overlapping edits to these files or package pins.

## Implementation order and checks

First prepare the UI prompt-lineage presentation and its focused synthetic
regressions. After the canonical artifact is independently reviewed, adopt its
exact public receivers and types; do not create a second DTO definition or ship
private backend imports. Then compose discovery, saved transcript paging,
selection/reload and explicit next-turn recovery in one coherent batch.

Changed-code checks target logical-prompt identity, paging/cursor continuity,
native/session credential separation, changed-client/account disposal, revoked
membership, unknown turn/submit recovery and malformed/foreign responses. Full
typing/build/browser matrices stay at the reviewed integration checkpoint and
remain subject to Shipping's explicit capacity grant. No provider, cloud, paid,
credential or live database action is authorized. Preserve failed/unrun evidence,
manual accessibility incomplete records and states outside automated audit points.

## Preparation checkpoint (not native history completion)

Implemented prompt-lineage display keys and an exact conversation URL selector.
The selector is passed only as an existing opaque-session constraint, with its
remembered run hints isolated by account/client/conversation. Invalid or duplicate
selectors cannot fall back to an unrelated current conversation. Canonical
bootstrap receipt validation still decides whether a session matches those hints.
This is not yet the list/transcript/new-turn integration: no new public contract
was copied, imported or installed before artifact acceptance.

Focused synthetic Node checks: **10/10 PASS**, 128 MiB heap, no isolated test
children, 120-second outer bound; actual test duration 1.112 seconds. Fresh memory
was recorded. Checks cover resume/fork logical-prompt identity, distinct
submissions, missing lineage, URL reload/invalid/duplicate selectors, conversation
selection cache separation, account/tenant/client isolation and late writes after
canonical cache replacement. The unchanged source-only architecture scanner also
passed: zero errors/blockers; 19 inherited unreviewed signals retained.

The first six-case check was **5/6**, because its uppercase-negative fixture was
an all-numeric UUID and therefore unchanged by uppercasing. That failed report is
retained; the corrected six-case check passed before the four real QueryClient
scope regressions were added. The original journal was then temporarily restored
for a negative regression; the changed journal was restored byte-for-byte in a
finally block. Exact positive/negative output and cleanup receipts remain in the
task's external `evidence/history-*` files. No broad suite or compiler ran.

Three browser cases are authored for selected-conversation reload, malformed
selection and mismatched session denial. They are **UNRUN**, held for the coherent
integration checkpoint and explicit Shipping capacity grant. Native list/history
and next-turn adoption still require the independently reviewed generated artifact.
