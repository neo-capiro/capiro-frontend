# PR2449 / frozen frontend Meri compatibility

**PASS — bounded source compatibility; no concrete contract mismatch found.** The two missing Capiro authority endpoint implementations are now present at `neo-capiro/capirov2@60cf2e51129f8358e6afe5fc600ffcdb6de01759`. This closes their **source-existence** blocker only. No frozen frontend change, private-contract browser import, token-template change or action activation is required or performed by this review.

Compared pins:

- Capiro PR2449 published head `60cf2e51129f8358e6afe5fc600ffcdb6de01759` (observed open/draft).
- Meri PR47 bootstrap/private authority owner `84c2ca01d0bce025a0003b6e724d675a05f2975a`.
- Frozen frontend `93b3617f5d0599f34da373525a96dfc70eaa85d6`, `/workspace/capiro-onboard-port-20261013`.
- Public action receiver `@capiro/meri-contracts` 0.1.1, source `83d1d8b2ae4604ca259be17461ae71ca60f5fb6e`; exact 175627-byte tar SHA256 `0ca8d0552a2960157ebdf7b8cecf6cacdcda48ef91c475060a54f15192535651`.

## Contract comparison

| Boundary | Reviewed match |
| --- | --- |
| Private identity | POST `/api/clio/application-authority/identity`, exact `{}` input, HTTP 200 JSON `{principal:{tenantId,actorId},identityRevision,checkedAtMs,expiresAtMs}`. |
| Private context | POST `/api/clio/application-authority/context`, exact `{identitySha256,conversationId,clientId}` input; exact identity fields plus `identitySha256,conversationId,selectedClientId,contextRevision`. Lowercase 64-hex hash and lowercase UUID syntax match the private Meri validator. Capiro's 64-hex revisions fit Meri's nonempty <=256-string allowance. |
| Identity ownership | `actorId` is native `TenantContext.userId`, not a Clerk subject. The owner correlates the verified Clerk subject/session with the original selected membership and local user mapping. Frontend treats receipt actor/tenant strings as server-owned and compares them exactly with later public action bindings. |
| Current authority | Current Clerk `sid`/subject, active status and original JWT/session bounds are checked. Local membership/role, tenant and selected impersonation are rechecked; activity timestamps are excluded from revision input. Context checks active, unarchived, owned, nonnull-client conversation, existing portfolio/prospect predicates, nonarchived client and tenant-scoped wall grants. Hash echo grants no authority. |
| Bootstrap/public actions | Frontend calls only same-origin `/api/action-followthrough/session` and `/query`, `/draft`, `/prepare`, `/execute`. Its server route uses existing Clerk `capiro` token for session forwarding; subsequent action forwarding requires the opaque action bearer. PR47 emits the exact minimal session receipt the frontend parses, with max issued TTL 300000ms and a 4096-byte receipt ceiling. Four action envelopes still use the unchanged public receiver. |
| Lifetime / activation | Frontend receipt expiry, captured hints, exact request lineage, opaque private handles and QueryClient journal ownership are not widened by PR2449. Private authority calls remain Meri-to-Capiro. Frontend requires explicit `MERI_ACTION_WORKFLOW_ENABLED=true` plus valid existing auth/Meri config; this review changes none of it. |

Exact supporting source:

- [Capiro controller](https://github.com/neo-capiro/capirov2/blob/60cf2e51129f8358e6afe5fc600ffcdb6de01759/apps/api/src/meri/meri.controller.ts#L336) and [closed request/receipt owner](https://github.com/neo-capiro/capirov2/blob/60cf2e51129f8358e6afe5fc600ffcdb6de01759/apps/api/src/auth/application-authority.ts#L38). The canonical bootstrap supplies the `api` prefix; inherited controller guard requires at least `standard_user`.
- [Current Clerk check](https://github.com/neo-capiro/capirov2/blob/60cf2e51129f8358e6afe5fc600ffcdb6de01759/apps/api/src/auth/clerk.service.ts#L110), [tenant owner](https://github.com/neo-capiro/capirov2/blob/60cf2e51129f8358e6afe5fc600ffcdb6de01759/apps/api/src/tenant/tenant-context.middleware.ts#L416), [Meri owner composition](https://github.com/neo-capiro/capirov2/blob/60cf2e51129f8358e6afe5fc600ffcdb6de01759/apps/api/src/meri/meri.service.ts#L395), and [client/wall owner](https://github.com/neo-capiro/capirov2/blob/60cf2e51129f8358e6afe5fc600ffcdb6de01759/apps/api/src/context/context-security-scope.service.ts#L30). Module exports and the Meri runtime proxy preserve access to these canonical methods; no second frontend authority implementation is involved.
- [Pinned private wire](https://github.com/neo-capiro/meri-greenfield/blob/84c2ca01d0bce025a0003b6e724d675a05f2975a/packages/contracts/action-authority-0.2/validate.mjs), [Meri HTTP authority client](https://github.com/neo-capiro/meri-greenfield/blob/84c2ca01d0bce025a0003b6e724d675a05f2975a/apps/control/action-host/application-adapters/authority-http.mjs), and [context/current-run correlation](https://github.com/neo-capiro/meri-greenfield/blob/84c2ca01d0bce025a0003b6e724d675a05f2975a/apps/control/action-host/application-adapters/context-adapter.mjs).
- Frozen frontend `shared/meri-actions/{proxy,session-bootstrap,session-receipt,workflow-transport,correlation,config}.ts` and `app/api/action-followthrough/[operation]/route.ts` are preserved with Git blob/SHA256 bindings in this packet. They contain no private Capiro authority route call or private wire import.

## Verification and limits

Independently recomputed all **23 fetched Git blob IDs**, compared all **8 published source bodies** with PR2449 `SOURCE-BINDINGS.json`, and verified **18 frontend/config/package files** equal the exact frozen commit. Frontend working tree is clean. The public receiver artifact size and SHA256 match its pinned inventory. Source reads and file hashing only: no tests, imports of executable backend modules, installation, browser, provider/native/Clerk/RLS/HTTP calls or source edits.

PR2449's reported 72 wire cases, 64 final mocked-owner cases and 41 adversarial controls are retained as **publisher evidence**, not independently rerun or aggregated into native acceptance here. Earlier PR47 documentation saying the endpoints were absent describes its inspected `4be13b0b` source and remains valid historical evidence; it is superseded only for endpoint source existence by this comparison.

**Still unqualified:** real existing Clerk `capiro` tokens carrying valid signed `sid`; live Clerk revocation/latency; native RLS and authorization state; deployed HTTP/media/status behavior; cross-service clock freshness; trusted services and current admitted Meri run/binding/policy owner; process-local session affinity; native activation and end-to-end browser execution. Sequential online/local rechecks are not an atomic Clerk/Postgres authority lease. Existing authentication middleware may provision, self-heal, update activity and audit, so a native authority read is not claimed globally mutation-free. No earlier frontend, Meri, Newsletter or shipping qualification is transferred to this composition.

`SOURCE-VERIFICATION.json` binds the exact reads. `github-source-records.json` / `github-wiring-records.json` preserve connector responses without the unbounded PR diff. `READ-ATTEMPTS.json` records unavailable local refs and one corrected package member lookup. `MANIFEST.json` seals this packet.
