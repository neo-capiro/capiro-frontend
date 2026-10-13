# PR43 public receiver → inactive Meri workflow port

The receiving-package dependency is now available for isolated integration. **This is package/source verification, not frontend runtime, native approval or deployment acceptance.** Fresh GitHub metadata records draft PR43 at `83d1d8b2ae4604ca259be17461ae71ca60f5fb6e`; the handoff pins artifact publication `08ba900965f54d4f0cd3776a9bb2158877e76dfd`. Both revisions return the same tarball bytes. [Verified handoff](https://github.com/neo-capiro/capiro-frontend/pull/16#issuecomment-6137056397), [producer acceptance report](https://github.com/neo-capiro/meri-greenfield/blob/08ba900965f54d4f0cd3776a9bb2158877e76dfd/docs/coordination/reports/CODEX-ACTION-WIRE-20261013.md).

Artifact: `@capiro/meri-contracts` **0.1.1**, `capiro-meri-contracts-0.1.1.tgz`, **175,627 bytes**, SHA256 **`0ca8d0552a2960157ebdf7b8cecf6cacdcda48ef91c475060a54f15192535651`**. Fifteen regular public distribution files; no traversal or links. All nine old package files other than package metadata/README are byte-identical to the frontend's frozen0.1.0 tarball. All eight receiving-metadata provenance source hashes match GitHub files at the exact head. [Verification receipt](VERIFICATION.json), [tar inventory](TAR-ENTRIES.json).

## Public surface and bounds

Import `receiveActionResponse` and `ActionResponseError` from `@capiro/meri-contracts/action-application`. Use `await receiveActionResponse(route, response.status, primitiveJsonText)`. Do not pass `response.json()` or arbitrary objects. It returns detached, deeply frozen, validated wire values; valid non200 error envelopes are returned, not thrown. Invalid route/status/shape/JSON/hash/internal correlation throws a content-free `ActionResponseError`.

The same subpath exports `ActionRoute`, `ActionResponse<R>`, `ActionResponseMap`, `ActionQueryResponse`, `ActionDraftResponse`, `ActionPrepareResponse`, `ActionExecuteResponse` and `ActionErrorResponse`, plus generated nested types. `/action-application/schema` exports the receiving schema. Distribution0.1.1, action-receiver schema `urn:meri:action-application:0.1.0`, embedded UIEvent/command wire0.1.0 and selected canonical task/read wire0.2.0 are separate versions. Existing root/browser/schema exports stay unchanged. Metadata JSON is packed provenance, not an extra sanctioned runtime import.

The browser module is a self-contained ESM bundle, 1,480,808 bytes, SHA256 `9e824b7f814561ec46aa63b0c31057a8292515a9f0186707bc838fed98eb3534`. Static inspection finds no external imports, fetch or Node builtin reference. It requires secure-context WebCrypto SHA-256 and TextEncoder. Receiving limits are16MiB UTF-8, depth64 and100,000 parsed nodes. The adapter must also bound the HTTP read/deadline before fully buffering text; the parser cannot retroactively bound `response.text()` allocation. No runtime execution was performed in this review.

## Exact adapter mapping

All four routes are **POST `/api/action-followthrough/{route}`**, authenticated by the host's opaque bearer session; JSON Content-Type, no compressed body/query string/authority extras. These are implemented, **unactivated** backend routes. Browser origin, selected client hints, context labels or proposal objects do not supply trusted identity or approval.

| UI port method | Wire request and retained object | Projection after receiving and contextual checks |
| --- | --- | --- |
| `query(signal)` | `{request:{limit:20}}` is the actual bounded producer example. Capture host lifetime/current context before dispatch. | From `observation.result.actions`, map each row's `id`, `title`, `body` to local key/title/description. Create an adapter-owned opaque selection handle retaining validated query and exact `{resultReference,resultSha256,actionId}` intent. Preserve recommendations/`acceptedTasks:false`; never call these accepted tasks. |
| `draft(selection, edits, signal)` | `{selection:{resultReference,resultSha256,actionId},edits:{title,dueDate}}`, obtained only from an admitted opaque handle and captured edits. | Verify returned source reference/hash/action ID and original binding/client correlate to the retained query/selected row. Store the entire validated `ActionDraftResponse` as the opaque draft; project its reviewed `task.title` and date. Do not substitute the selection's row for service-reviewed task intent. |
| `prepare(draft, signal)` | `{draft:<exact retained validated ActionDraftResponse>}`. | Require status `approval_required`; correlate the returned supporting draft to the submitted draft. Retain exact validated `proposal` and associated draft/context inside the adapter handle. Project proposal ID, command hash, expiry, task title/date and an honest supplied approver identifier/label. Never mark approved or executed. |
| `execute(proposal, signal)` | `{proposal:<exact retained validated proposal>}`. Replays use the same proposal/command/idempotency key. | First correlate response to that retained proposal and current trusted lifetime. Valid observed success maps receipt ID/completed time/result title to `ObservedExecution`. Indeterminate maps to the existing uncertain fence. Exact approval refusal maps to pending as below. No browser approve action. |

The selection request is not itself emitted by the query receiver; the adapter forms the documented three-field **intent** from validated output and retains its origin privately. A WeakMap/opaque-handle approach can enforce identity and disposal without serializing handles or reconstructing immutable proposals. No frontend JSON-schema copy or private server import is required.

Task due dates are canonical **`YYYY-MM-DDT00:00:00.000Z` or null**, and title is1–240 characters. The HTML date editor uses `YYYY-MM-DD`; conversion must preserve the UTC calendar date without local-timezone shifting. Source recommendation `deadline` may be any UTC timestamp, so preserve its original deadline context and make any suggested calendar-day projection explicit. Reviewed draft/task dates should round-trip to the date input and canonical midnight representation. Do not pass the raw HTML date directly to the task wire. Derive task field types from public types instead of creating a second DTO/schema owner.

Coverage notes must retain `coverage.enumeration/truncated/historySupport/limitations`, per-source status/freshness, page coverage limitations and any remaining continuation. `totalIsExactForScope` is not global completeness; a healthy page or `hasMore:false` cannot erase `absenceSupported:false`, `evidenceReady:false`, unknown freshness or unsupported history. The current port has no pagination action: disclose a bounded first page rather than silently consuming or implying exhausted continuation.

## Error and pending mapping

| Validated wire result | UI disposition |
| --- | --- |
| Execute, HTTP409, `COMMAND_APPROVAL_REFUSED` **and** `NOT_DISPATCHED` | `{ok:true,value:{status:'approval-pending'}}`; retain the same immutable proposal, allow only later deliberate execution. |
| HTTP200 execute `status:'indeterminate', outcome:null` | `{status:'indeterminate'}`; controller fences as unknown. |
| `UNKNOWN` | `unknown`; an effect/record may exist. |
| `RESULT_NOT_RELEASED` | `result-withheld`; no rollback or retry inference. |
| `STORED_NOT_RELEASED` | `stored-withheld`; retained record, withheld result, not task success. |
| `NOT_STORED` | `not-stored`; metadata-insertion disposition only. |
| `READ_UNAVAILABLE` | `read-unavailable`; does not establish absence. |
| Other validated `NOT_DISPATCHED` | `not-dispatched`; never translate every409 or authority refusal into pending approval. |
| Receiver rejection / missing or inconsistent response | `invalid-response` or conservative unknown, preserving any dispatch uncertainty; no automatic retry. |
| Transport loss/timeout after invocation | unknown unless an authoritative disposition proves otherwise. Abort of local observation is not cancellation of the durable operation. |

The receiver validates each error code's HTTP status but does not make every code/outcome pairing an approval decision. In particular, a refusal code with UNKNOWN or a withheld disposition must retain that outcome instead of enabling another request. True current access loss must purge private display/editor data through the shared lifetime owner. The existing UI port has only one problem field: an access-loss purge must not erase an already uncertain/stored attempt or become a retry grant. Preserve that fence through the adapter/host's canonical state semantics.

The public execute receiver admits an `observed` result only when `receipt.outcome === 'succeeded'`. The inactive UI's observed-failed branch is broader than this wire and is not currently reachable through this package. Preserve it as generic presentation if useful, but do not manufacture failed observed receipts from generic HTTP errors.

## Correlation still owned by the adapter/host

The public receiver has no expected-request or expected-host argument. Hash agreement/internal correlation does not authenticate current access or prove that a response belongs to the caller's latest intent. Capture immutable expected values before request dispatch; discard late results after lifetime replacement/cancellation, including after asynchronous receiving hashes.

For query/draft/prepare, correlate the captured selected client and stable tenant/actor/conversation/run, retained result references and hashes, selected action and reviewed draft. The receiver intentionally accepts event sequence gaps and a recovered current command binding whose attempt/worker/fence differ from the draft's original binding; do not reintroduce adjacency/full-binding-equality restrictions. Outer lookup and nested native-read argument hashes also describe distinct normalization domains: the supplied actual query fixture has different values. Do not invent equality between them.

For execute, the response omits the originating proposal. Match receipt `commandId`, `commandSha256`, `idempotencyKey` and stable tenant/actor/conversation/run to the retained proposal/command; check result client/title/date against the reviewed task intent. Distinguish fresh executor attempt/worker/fence from original producer provenance. Preserve scope/lineage under the canonical host policy; browser matching is not new authorization. Receiver validation alone cannot reject a coherent response for a different proposal or determine current policy.

## Remaining work, not package blockers

The receiving-parser/type publication blocker is closed for this bounded surface. Package install/lock/vendor provenance, public-export allowlist and isolated consumer qualification remain with root; none was performed here. The package is private distribution, not npm-registry published. It retains the existing declared Ajv/ajv-formats/canonicalize dependencies.

No outgoing query-request/selection/edits validator or factory is exported. The exact bounded examples above can be encoded as documented intent without duplicating a receiver. If generalized filtering, pagination or request-schema authoring is needed, obtain the canonical public request types/helpers from the backend owner rather than inventing an expanded protocol.

Next qualification should reuse exact producer fixtures, including canonical409 refusal and UNKNOWN/STORED_NOT_RELEASED examples, plus consumer cases for cross-request mismatch, original/current recovered bindings, malformed success/error/status, held host replacement, aborted receiving, UTC date conversion and no automatic retry. Existing local opaque-handle/fence tests remain applicable. Real authenticated host/session/source/approval binding, native effects, browser UI/accessibility and runtime/deployment acceptance remain open.

Producer80/80 and isolated-consumer claims are recorded in the published report; this reviewer did not rerun those controls or treat them as frontend/browser/native acceptance. No shared source, PR17 runtime, dependency installation or backend endpoint was touched.
