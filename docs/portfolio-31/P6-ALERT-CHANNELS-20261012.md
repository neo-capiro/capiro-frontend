# BILL-11/12 personal preferences and alert channels — 12 October 2026

## Pre-code scope and ownership

Base: `75409a96d6c58a53c7d44eb6053cc291995caf80`, isolated branch `codex/portfolio-alert-channels-20261012`. This slice owns `bill-tracker/AlertPreferencesDialog.tsx`, `bill-tracker/alert-preferences/*`, and dedicated preference/channel tests and evidence. P2 separately owns shared Watchlist Configure and will pass the explicit configured `backend` into `AlertPreferencesEntry`. No fallback between Core and Intel.

The current user authorized completing the whole Portfolio plan. The earlier Intel-only editor was a bounded implementation checkpoint, not a reason to leave supported Core preferences or channel controls unimplemented. BILL-11 and BILL-12 remain open for final acceptance throughout this local work.

## Responsibilities and dependencies

- Preserve the Intel boundary helpers and their independent assertions; add small explicit Core preference adapters for its actual DTO/receipt. Shared rendering consumes common editable fields, not invented native identity fields.
- The preference reader/editor owns current saved values, a local complete draft, replacement PUT, receipt acceptance and explicit reload. Core uses the database actor. Intel requires the separately returned actual Clerk subject. Shared identity and client owners remain canonical.
- Use P2's byte-identical `client-profile/read-public.ts` façade for existing current client reads, actor and source checks. This is a declared prerequisite excluded from this lane's patch; do not copy a second client/auth implementation.
- Separate phone verification and test-alert action owners from preference saving. Each captures owner/client/current saved-source revision/view lifetime, fences late effects and synchronous authority interruption, and never automatically replays a dispatched request.
- Presentation uses the current Portfolio Dialog/fields/buttons and Figma form. Phone code entry and selected email/SMS tests are explicit user actions. Test recipients come from the current saved preference receipt, not unsaved draft input.
- Native services retain authentication, tenant membership, persistence and providers. Browser context checks are conservative UI guards, not server authority.
- No live preference/verification/test-alert/provider/AWS/deployment calls. All local qualification intercepts synthetic contracts.

## Exact native contract

Published main was independently re-read at `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`. Full source readbacks and blob SHAs are saved in root `outputs/evidence/portfolio-shared-integration-20261011/tracker-alert-contracts-20261012/`.

| Owner | Preferences | Channel routes | Authority and receipts |
| --- | --- | --- | --- |
| Core | GET/PUT `/api/intelligence/clients/:clientId/tracker/alert-prefs` | POST same tracker prefix `/sms/verify/start`, `/sms/verify/confirm`, `/test-alert` | Registered `TrackerController`, minimum standard_user, database `ctx.userId`. Preferences return only 11 fields, with no identity echo, jurisdictions or version. |
| Intel | GET/PUT `/intel-api/tracker/watchlists/:clientId/alert-prefs` | POST `/intel-api/clients/:clientId/tracker/sms/verify/start`, `/sms/verify/confirm`, `/test-alert` | Registered `TrackerChannelController` and watchlist controller; TenantGuard plus explicit TrackerOwnerGuard. Preferences use actual `ctx.clerkUserId`; validate clientId/userId and optional tenantId on actual receipts. |

The complete Core PUT vocabulary is triggers, materiality, emailEnabled, emailAddress, emailCadence, smsEnabled, smsPhone, **smsPhoneVerified**, smsCadence, quietHoursStart, quietHoursEnd. The required verified flag is preserved only from a fresh successful saved receipt for an unchanged saved phone; editing/clearing the phone clears it. It is never a checkbox or synthesized grant. Core accepts string trigger keys, 20-character phone and 5-character quiet-hours values; preserve fetched values without inventing a stricter native contract.

The complete Intel PUT vocabulary is the existing 11 fields: the same editable criteria/delivery/time fields, excluding smsPhoneVerified and adding jurisdictions. Intel's native service owns verification and retains it only for the same normalized saved phone. Preserve full body/null/empty-list behavior and native limits.

Phone start sends exactly `{ phone }` (maximum 20 characters). It returns `{ dormant, masked, devCode? }`; this is a request acknowledgement, not delivery. Intel currently does not return a devCode and only confirms a provider-accepted purpose/client-bound challenge. Core can return a non-production devCode; never log or infer one. Confirm sends exactly `{ phone, code }` with the captured phone and six digits, and accepts only `{ verified: true, phone }` matching that phone. A fresh owner-specific preference GET verifies the resulting saved state; no browser-created verification record.

A test sends exactly `{ channels: [email and/or sms] }`. Validate a nonduplicated exact result for each requested channel, with native sent/skipped/failed/suppressed statuses and optional Intel detail. “Sent” means the provider accepted the request, not mailbox/handset receipt. The native in_app branch only returns sent and writes no notification; it will not be offered as a notification test.

## Native limitations carried forward

- Both preference GETs can produce defaults without proving client existence. Require the separate successful current client read for local actions.
- Both preference PUTs are versionless. Local revisions prevent overwriting the current browser view; no cross-device CAS guarantee is claimed.
- Core's native service trusts the required submitted smsPhoneVerified flag. Safe UI projection does not repair adversarial server enforcement. Core OTP confirmation finds the user's phone challenge without client/purpose binding; the frontend must bind its own exact request scope and record this native consent limitation.
- Intel start's dormant=false still does not prove SMS acceptance. The test route collapses some transport uncertainty into failed and creates no durable test operation or delivery history. Never infer non-delivery or automatically retry from it.
- Abort after dispatch does not prove native cancellation. Unknown attempts stay visible for explicit review; no extra test send or verification request is used as a status check.

## Design before code

Existing Portfolio Configure entry: [411:56471](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-56471). Existing preference frames: [971:187129 desktop](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=971-187129), [975:187289 phone](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=975-187289). 411:106678 is only the prior budget-alert modal primitive, not Tracker Configure authority.

A fresh page inspection found no Portfolio verification or test-alert controls. Only new channel sections/state instances and full-form continuation examples will be authored at x99808,y8200 or below. Reuse Field/Input, Choice/Control, v2/Button, Geist, existing color/space/radius/text/effect styles. The context's old `apps/web/src/vnext/components/fields/index.tsx` Code Connect path does not exist here; reuse canonical local Portfolio controls. No existing unrelated frame/token/component or static asset changes.

## Qualification plan

Preserve exact pristine 75409a96 owned source and hashes before edits. Add semantic baseline cases proving Core owner handling and absence of verification/test controls before replacing the baseline with the fixed candidate. Retain the existing Intel preference/body/identity/currentness/unknown assertions; only the intentional Core entry behavior changes.

Meaningful new units cover distinct owner paths/fields/identity, native Core verified-flag projection, exact channel receipts, unknown dispatch, and current source checks. Browser cases cover both owners, saved-parent failure, changed/lost actor or phone, same-callback actor interruption, stale source, late close/client/owner, invalid/mismatched receipts, deliberate recovery, no automatic send, and desktop/phone/light/dark layout. Record actual baseline/corrected cohorts and source hashes; no fabricated aggregate pass. Source >400 or function >80 nonblank lines requires exact AST responsibility review.

Status at outline: native and current Figma reads complete; dependencies installed; feature source unmodified; design additions and qualification pending.

## Implemented continuation and exact row mapping

The preceding outline is preserved as the pre-code record. The implementation now supplies the supported personal preference and explicit channel controls for both configured owners. It creates no service, provider, identity, verification or notification record in the browser.

| Audit row | This lane's implementation | Separate integration/acceptance gate |
| --- | --- | --- |
| BILL-11 — Configure opens client-scoped watchlist/alert settings | `AlertPreferencesEntry` and its dialog require the actual configured `TrackerBackend`; the session is keyed by owner and client, and actual current client/actor reads gate the personal form. | P2 owns the final Configure caller and combined watchlist availability. Its final Core/Intel entry must be assembled and qualified at root. The local original caller is only an explicitly excluded one-prop prerequisite. |
| BILL-12 — watchlist/alert configuration after navigation | Complete owner-specific replacement preferences, saved-phone verification start/confirm, exact saved-state readback, and selected saved email/SMS test actions. Current-read failures conceal old fields. Interrupted, late or mismatched effects cannot publish success. | Native deployment/roles/channel-owner flag, actual persistence, SMS consent/security limitations, provider acceptance and delivery, and authenticated preview acceptance remain open. P2 separately owns shared targeting. |

`personal-access.ts`, `personal-contracts.ts`, `core-contracts.ts` and `personal-queries.ts` contain the owner-specific adapters. `usePreferenceEditor.ts` retains preference draft/replacement/reload state; `preference-write-lifetime.ts` latches interruptions in its captured actor, parent client or preference source synchronously, including unavailable-and-restored-in-one-callback cases. Only the writer's deliberately flagged target invalidation is exempt. This does not introduce a new shared authority owner.

`channel-scope.ts` captures existing current inputs and their view lifetime without dispatching anything. `usePhoneVerification.ts` owns the single native OTP workflow; `useTestAlert.ts` owns deliberate test dispatch. `channel-attempts.ts` retains pending/unknown attempts in the same browser query cache across dialog closure. It is not a durable native operation log. Unknown results require explicit review and another deliberate click; abort never claims provider cancellation. A pending channel prevents simultaneous preference editing and other channel effects. Unsaved destinations disable channel actions, so a test cannot silently target an older saved destination while displaying an edited one.

The normalizers intentionally differ. Core's existing SMS service strips broader legacy input and accepts its native 10–15-digit normalization; Intel rejects unsupported characters, only adds a country prefix to unsigned 10-digit US or 11-digit-leading-1 values, and requires a resulting `+` followed by a nonzero initial digit and 10–15 total digits. Receipt expectations use the correct adapter. Core's optional email and native quiet-hours string values are preserved during unrelated edits. Intel retains its stricter email, phone, jurisdiction and quiet-hours DTO rules.

Confirmation wording explicitly states that confirming the saved phone enables SMS alerts. Start acknowledges the request and only displays a development code when actually returned; neither acknowledgement nor dormant=false is called delivery. Confirm requires the exact normalized phone receipt and a fresh matching saved preference response with verified phone and SMS enabled. Test results use “Provider accepted”, “Skipped by the service”, “Failed at the service” and “Suppressed by the service”; no email/handset receipt or in-app notification is invented.

## Authored and compared Figma controls

The additions were created in the existing Capiro file before implementing them. The original preference frames and unrelated design components remain unchanged.

| Design | Exact node | Use |
| --- | --- | --- |
| Continuation review wrapper | [1027:188159](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=1027-188159) | New isolated review at x99808,y8200; final wrapper 1098×1984, auto height. |
| Desktop full form | [1028:188273](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=1028-188273) | 720px form with ready phone and saved-channel test sections. |
| Phone full form | [1028:188442](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=1028-188442) | 358px form with code entry and wrapped controls. |
| Phone verification variants | [1028:188271](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=1028-188271) | Ready, code requested, unavailable and unknown states. |
| Test-alert variants | [1028:188272](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=1028-188272) | Ready, exact per-channel results and unknown review states. |

The controls reuse existing Field/Input, Choice/Control, v2/Button, Geist and variable/style tokens. The Code Connect `apps/web/src/vnext/components/fields/index.tsx` path is absent from this repository. The implementation instead uses the canonical `shared/portfolio/ui` field, button, feedback and Dialog owners; no private source from another app was imported. No static asset bytes were added or changed.

All four actual light/dark desktop/phone captures were inspected after the browser run. They retain the 720/358px form widths, readable native controls, wrapped phone actions, visible focus treatment and local section rhythm. The initial Figma creation receipt records a temporary 100px wrapper; `figma-final-wrapper.json` preserves the subsequent successful auto-height correction and exact opt-in-copy update rather than rewriting that historical receipt.

## Qualification chronology

All evidence below is synthetic. No live provider, test-alert, verification SMS/email, AWS or credential action was executed. Evidence root: `outputs/evidence/alert-channels-20261012/`.

| Candidate/check | Actual result | Exact evidence and scope |
| --- | --- | --- |
| Pristine 75409a96 behavioral baseline | 0 passed, 6 expected regressions failed; 0 skips/flakes; 48.606s | `baseline-manifest.json`, `baseline-restoration.json`, `baseline-browser-results/`, `baseline-completion.json`. All nine original behavior files were restored/hash-verified, then the fixed inputs were restored. Missing Core ownership and channel controls were observed. An earlier zero-match grep invocation is preserved as selector preflight only. |
| Candidate02 full focused browser cohort | 72 passed, 2 failed; 0 skips/flakes; 228.342s | `candidate-02-manifest.json`, `fixed-02-browser-results/`, `fixed-02-completion.json`. All 31 inputs were unchanged. Results comprise 15 lifetime passes, 4 visual passes, 23/25 action/preference passes and all 30 preserved preference/current-board cases. |
| Candidate03 affected fixture correction | 11 passed; 0 skips/flakes; 33.223s | `candidate-02-to-03.diff`, `candidate-03-manifest.json`, `fixed-03-affected-browser-results/`, `fixed-03-completion.json`. Only two route-matcher strings in the test helper changed. The two failed Core owner assertions and nine other affected Core channel cases passed; every product input remained byte-identical to candidate02. |
| Final targeted units | 40/40 passed; 0 skipped | `final-unit-results.json`, `final-unit.log`. Includes the two untouched original preference/current-data unit files plus new exact contract, identity, normalization, interruption and unknown-attempt assertions. |
| Final source checks | Web typecheck, scoped ESLint, scoped Prettier and `git diff --check` passed | `final-typecheck.log`, `final-static-checks.json` and corresponding logs. Current AST scan matched all eight exact responsibility reviews; no owned source file exceeds 400 nonblank lines. |

The two candidate02 failures were test fixture routing errors, not native-owner dispatch defects. Captured trace URLs were correctly `/api/backend/core/intelligence/clients/:clientId/tracker/sms/verify/...` and `/test-alert`. The later `**/intelligence/clients/...` synthetic matcher also matched the Core URL and recorded its loop label. Candidate03 added the full `/api/backend/{owner}` prefix to both channel matchers and retained every original request body, receipt, result, unknown-state and call-count assertion. The results remain **72/74 followed by 11/11**; no single all-pass 74-case final cohort is claimed. Root's assembled regression must provide that final-source coverage.

The owned original `tracker-boundary-harness.tsx` change supplies the required explicit backend prop. The original preference spec adds only actual synthetic current-client records for its client-lifetime fixtures; all pre-existing assertions remain. Its historical Core Configure no-entry assertion describes the original local caller and needs the explicit P2 integration adjustment at root, not silent deletion. Both original unit files and `tracker-current-data.spec.ts` remain byte-identical to the base.

## Pinned source references and integration gates

The native manifest now contains 18 byte-verified blobs at `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`. Root preserved a separate receipt for removing a single accidental terminal newline from the first 17 readbacks, then added the Core SMS normalizer. Principal references:

The previously verified canonical [Users controller](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/users/users.controller.ts) returns `user.id = ctx.userId` and separately `user.clerkUserId = ctx.clerkUserId`; [the shared TenantContext](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/packages/shared/src/index.ts) types the Clerk subject as a string. The canonical frontend optional nonempty projection remains unchanged. Core works with its database identity even when that optional Clerk field is absent; Intel requires the actual returned Clerk field and never substitutes the database UUID. See the retained `P6-TRACKER-PREFERENCES-20261011.md` source evidence for that shared prerequisite.

- Core [controller](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/tracker/tracker.controller.ts), [DTO](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/tracker/tracker.dto.ts), [service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/tracker/tracker.service.ts), [verification](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/tracker/sms/sms-verification.service.ts), [normalizer](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/tracker/sms/sms.service.ts), and [alert service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/tracker/notifications/tracker-alert.service.ts).
- Intel [watchlist controller](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/tracker/tracker-watchlist.controller.ts), [watchlist service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/tracker/tracker-watchlist.service.ts), [channel controller](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/tracker/tracker-channel.controller.ts), [DTO](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/tracker/tracker.dto.ts), [verification](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/tracker/sms/sms-verification.service.ts), [normalizer](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/tracker/sms/sms.service.ts), and [test service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/tracker/tracker-test-alert.service.ts).

The frozen manifest distinguishes 20 owned changed/new production files, 10 owned test inputs, an unchanged `queries.ts` reference, the owned reports, and the two excluded prerequisites. `client-profile/read-public.ts` is P2's byte-identical canonical façade; the local one-line Watchlist backend prop has its own before/after receipt and is not part of this lane's patch. P2's complete final caller replaces that temporary dependency at integration. Shared registry, auth, proxy, lockfiles, navigation and routes remain parent-owned.

This locally qualified implementation does not close BILL-11/12. Actual Core/Intel Configure entry and the complete final tree still require assembled source checks; authenticated preview, native authorization/ownership, stored verification and provider behavior remain separate gates. In particular, Core's submitted verified flag and client-unbound OTP lookup remain native security/consent limitations; no UI or synthetic test can certify their server enforcement. The 337 open acceptance rows in the handover are not a count of missing frontend implementations.

