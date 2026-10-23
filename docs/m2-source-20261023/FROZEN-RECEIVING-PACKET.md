# Frozen preview receiving work

This is a proposed receiving patch for Fable/root after the Wave1 owner releases the frozen files. It is not applied by U and is not permission to activate a deployment.

## Exact current mismatch

`apps/web/src/shared/preview/meri-conversation-route.server.ts` exports `previewMeriContractsPackageVersion = "0.1.10"`. The application now consumes the separately qualified contracts0.1.11 and stream0.1.1 artifacts. The existing `meri-preview-route-activation.test.ts` package-pin assertion deliberately remains red. Changing the string alone would not qualify the runtime binding: the receiving owner must verify source SHA, image digest, distinct configured HTTPS origin, current package, exact routes and all existing environment gates together.

`apps/web/src/shared/preview/first-chat-gateway.server.ts` currently recognizes only `meri.conversation.bootstrap`, validates one configured client through the v1 schema, and refuses other writes when the preview write target is present. Preserve that v1 behavior. The receiving owner must explicitly decide and qualify each new key, without prefix/regex admission:

| Registry key | Existing Core receiver | Required receiving proof |
|---|---|---|
| `meri.conversation.bootstrap.v2` | POST `/clio/conversations/bootstrap` | Strict General/client discriminant, exact request/actor/tenant/client receipt, immutable persisted General eligibility, current authority, retry/tombstone semantics and separate reviewed target/gate. Null alone is never General. |
| `meri.conversation.bootstrapCapability.v1` | POST `/clio/conversations/bootstrap-capability` | Existing current identity and fresh authorized client wall;30-second receipt is presentation hint only; bootstrap still rechecks. |
| `meri.conversation.management.list.v1` | POST `/clio/conversations/management/v1/list` | Owner-scoped paginated title/status search with current membership/per-row client wall. `managementAvailable` is true only for actual trusted composition. |
| `meri.conversation.management.change.v1` | POST `/clio/conversations/management/v1/change` | Exact CAS/idempotency receipt plus terminal-run/retention lock composition. Unknown commit remains unknown. Delete is30-day Trash; no permanent purge activation from this route. |

The operation constructor permits only these exact Core POST paths alongside its actual pre-existing onboarding/bootstrap predicate. Wrong method/service and neighboring paths reject. This constructor is not a preview allowlist bypass. The new registry rows do not enable frozen receiving paths.

General conversation sessions use the public `conversation-session` receiver with explicit kind and nullable selected client only for General. Existing client-only action/document receivers retain their restrictions. The receiving owner must preserve lifetime abort, actor/tenant/context epochs, token handling and current authority before accepting General input/history. A browser URL or a private-user history row never supplies durable kind authority.

## Required controls before activation

Keep all existing off switches and wrong origin/source/image/package/route controls. Add closed v2/capability/management path controls, substituted receipt/client/kind/request, membership/wall loss, legacy null chat, missing management owner, active run, stale revision, lost reply and exact replay. Verify actual Core/Meri composition and no accidental broadening of proposal/write interfaces. General source availability remains held until signed read-delegation/memory prerequisites are restored and qualified by their owners. Reserved18060000/30000 are not in Core's deploy ledger; the withheld memory-helper migration and dependencies need their own reviewed restoration packet.

MG02 has no newly allocated browser availability route. Its canonical admission owner must supply the exact qualified selection/window/installation receipt through the existing flow before the disabled launcher changes. MG05 ordinary startup delivery remains with the frozen startup owner. MP stays explicitly mock/unsaved and does not join runtime or defaults configuration.
