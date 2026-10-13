# Onboard shared boundary and routes — independent WIP review

**One newly identified receipt defect was corrected during review; one known navigation mismatch remains open at the inspected bytes. No additional confirmed credential-forwarding or fixed-auth-template defect was found.** This is a static review of changing, uncommitted source, not final port or native acceptance. [Initial per-file bindings](SOURCE-SNAPSHOT.json), [findings](FINDINGS.json), [corrective bindings](CORRECTION-REVIEW.json), and [needed controls](TESTS-NEEDED.json) distinguish those states.

No application, tests, browser, server, build, installation, native endpoint or AWS/provider operation was executed by this reviewer. Four authorized GitHub reads obtained exact native source to resolve client-creation semantics. Only this new evidence directory was written; shared source and other review packets remain untouched.

## OBSH-01 — malformed or unrelated client creation receipt

The initial Onboard adapter at `onboard-core-api.ts:31–32` (SHA256 `b96b54a17da845f6a7aee3c211b46e0cb772ba3419694e3d6ddc11ad744940a3`) returned `settings.profiles.create` without checking its receipt. The reused Settings schema at `operations/settings-admin/schemas.ts:112–120` accepts any string id/name. A200 receipt with empty/non-UUID id, or a valid id but another client's name, therefore resolves. `ImportOverlay.tsx:217–230` then increments the Added display, calls `onImported(1)` and clears its retained form after that follow-up succeeds. This is a source-confirmed acceptance gap, not a claim that the native service has returned such a response or that a duplicate native effect occurred.

Exact native `capirov2@7b5a9644d30d22389b23f0e07f923c8925682047` establishes the narrow correction:

- `clients.controller.ts:52–64,343–345` accepts the name DTO and delegates unchanged (blob `54be4e4148352309522eb1632ca2e3750940dcb9`).
- `clients.service.ts:1183,1216–1221` stores `validated.name`; the funding validator contributes only funding fields, with no name normalization. The service returns the inserted client plus `logoUrl` at1160/1974–1982 (service blob `c2bc995104db4762be078f42b00232ea1790029c`; validator blob `5bc4704b0f26cbef2f6b3e8cfb3135324da6f5df`).
- Core Prisma `schema.prisma:845–850` declares UUID Client.id and tenantId (blob `fb0da469e88b5941e5b17c9ac2df9c88319cfd81`). [Pinned excerpts](NATIVE-CLIENT-CREATE-PINS.json).

Root's corrective adapter (`c7fbf99299408ecc1e0508bf64c56c2eb5eb6938f93ab4e3d854d623e110bbcc`) now captures the submitted body, requires a UUID and compares the returned name to the exact captured submitted name. It rejects conflicts as502 without retry. This resolves the source defect while leaving the broad shared Settings contract intact. It correctly adds no invented tenant echo: the reused Settings projection strips tenantId, and the trusted backend/session lifetime remains tenant authority. The UI's own trimming is distinct from native receipt admission.

The four new consumer controls reject empty id, malformed id and wrong name, and preserve the captured spaced name when the caller mutates its original body after dispatch. Root's preserved red log shows the three rejection cases failing against the original forwarding behavior (3 failed/39 passed); the subsequent adapter/gateway run shows55 passed. I inspected these author logs and the correction; I did not rerun them or claim a rendered UI pass. A composed UI assertion that malformed acknowledgement retains the draft/unknown fence and never increments Added remains meaningful.

## OBSH-02 — current-origin subscription link has no route

The reviewed `OnboardHost` deliberately replaces public `appBaseUrl`/`onboardingBaseUrl` with the current frontend origin. However, `ImportOverlay.tsx:838` still navigates its eligible trial-cap CTA to `${appBaseUrl}/onboarding/subscribe`. The current Next route inventory has no `/onboarding/subscribe` destination. The port's `/billing` page is a purchaser-funnel step and must not be assumed equivalent to a post-setup subscription upgrade.

Root and the feature owner are aware. Choose an explicitly supported destination or present truthful unavailable guidance; preserve cap, selection, pending and error gates. Do not restore arbitrary public config as navigation authority. This is a static route mismatch, not a browser-observed404; no route was executed here.

## Shared ownership and isolation observations

`ApplicationBoundary` retains the signed-in key over user/session/org and the inner selected-client replacement. IT routes use a separate canonical query/request scope keyed by pathname, so token replacement disposes old cache and pending observations without depending on Clerk startup. Signed-out/loading onboarding gets the existing DataProvider/CapiroDataProvider ownership rather than another cache or credential store. Later boundary edits inspected here only simplify nested conditions and do not alter this behavior.

`CapiroBoundary`'s public API omits browser credentials, shares the disposable request owner, and suppresses signed-in expiry handling for public401. `useScopedCapiro` retains component cleanup and combines caller/lifetime signals. The shared HTTP client checks those signals before admitting a response/body. Rendered composition still needs held-response controls; pure controller tests cannot establish React remount behavior.

The gateway uses fixed server-configured origins and the closed operation registries. Inbound Authorization, cookies and tenant hints do not become upstream authority. Public operations supply no bearer and explicitly omit credentials. Funnel/setup descriptors select the default Clerk session token; Core and inherited Modules/Settings retain the `capiro` template. The browser cannot select that mode through operation input. The definition guard limits default-session mode to the reviewed Onboard service path families.

The public Onboard namespace bypasses Clerk initialization, then the route invokes its separate closed capability allowlist. Public writes still require exact same origin. Unknown cross-namespace operations fail closed; no arbitrary path/URL forwarding is added. IT pages receive no-referrer/no-store/noindex headers, and capability responses use no-store/no-referrer. The thin route entries contain composition only.

Root independently found and corrected the public401 gateway copy during this pass. The captured gateway now returns public-link expiry wording for tokenless public dispatch while retaining authenticated session-expired wording. Its new integrated API→gateway control checks that public401 does not invoke session expiry or leak the private upstream message. That test was inspected statically; its execution belongs to root's logs.

`OnboardHost` keeps unconfigured/loading/failed current config unavailable, checks the designated Clerk key for non-capability pages, and never uses public `apiBaseUrl` to choose a gateway upstream. The public API uses it only to validate the fixed native callback. Provider origin/path and selected provider, exactly one redirect URI/state, callback prefix and opaque server state are preserved. No provider-registration or connection success is inferred. The adopted signed-download owner retains fixed safe filenames, PDF MIME and30MB bounded response policy.

Other adapters correctly capture or bind requested import ids, registrant id, memory type/firm slug/null client, task/target state, payment method, and normalized invitation recipient/role. Import duplicate semantics follow the native distinct-input set per chunk, not a new global deduplication rule. Memory submissions remain pending-review receipts. Minimal native acknowledgements are not augmented with fabricated scope echoes.

## Remaining qualification and source movement

[TESTS-NEEDED.json](TESTS-NEEDED.json) gives bounded regression inputs. Priorities are rendered actor/session/org and token replacement with held200/401; signed-out→signed-in transitions; config errors/refetch without stale authority; public401 versus protected401; existing Planner/Modules/Portfolio behavior; and malformed client acknowledgement retaining uncertainty.

A separate **source-traced test gap** is actual funnel `sessionId` replacement under the same Clerk identity: the initially inspected feature used a fixed session query key and an API-owned attempt lifetime, with no sessionId guard. The contract requires a current funnel association when that id is available. Hold an A write, publish an authoritative B session, and ensure A cannot advance B or reuse A payment/legal state. This was sent to the feature owner via root. Subsequent feature lifetime edits were observed but are outside this shared-source acceptance; they need their own exact-source review and tests. No runtime reproduction or claim that native spontaneously replaces sessions is made.

Prior schema-review follow-through also remains explicit: native identifier/count validation and distinct stored/write organization projections must be closed against final bytes. I did not turn an evolving WIP schema into a final blanket acceptance. The correction/current-source hashes and other changes since snapshot are recorded in the JSON receipts. Formatting, dependency qualification, architecture fingerprints, full rendered/browser behavior, live native authorization and provider effects remain separate root/owner gates.
