# Alert preferences and channels responsibility review — 12 October 2026

Review scope: the exact candidate03 product in `outputs/evidence/alert-channels-20261012/candidate-03/`, based on `75409a96d6c58a53c7d44eb6053cc291995caf80`. Candidate03 has the same production bytes as candidate02. The only later candidate change was the exact synthetic channel route matcher; no product behavior or assertion was removed.

The TypeScript AST scanner `scripts/architecture/scan.mjs` was run against each owned product TypeScript module. Eight functions exceed 80 nonblank body lines; no source file exceeds 400 nonblank lines. Each body was read for responsibility and effects. These are individual source reviews, not threshold exemptions or approval of unrelated inherited findings. Exact machine records are in `candidate-02-reviews.json`, with the current scan in `final-size-findings.json`.

All paths below are under `apps/web/src/features/portfolio/bill-tracker/alert-preferences/`. Fingerprints use the repository's normalized exact AST node text. Parent owns integration into the central registry.

| Module / function | Nonblank body lines | SHA256 fingerprint |
| --- | ---: | --- |
| `AlertDelivery.tsx` / `AlertDelivery` | 90 | `6e27b4d61f6c1c9ed415fce7c3234ce05ae466620bd92cb5cd32f7392edefeac` |
| `PhoneVerification.tsx` / `PhoneVerification` | 107 | `837805fab28d6fb757d965bfbcc63cefc7adfc9ee6371364cb69dcffd25624d9` |
| `PreferenceForm.tsx` / `PreferenceForm` | 163 | `fe2cbf38239119259ac05eaf059435b109c3309d40f20f182a4c428aaeda5ff7` |
| `TestAlert.tsx` / `TestAlert` | 90 | `caec69bf1c256df893fc13775878c5333a1c8a719968c9d1eb43c8226150611a` |
| `channel-scope.ts` / `useChannelScope` | 82 | `8e0abef9cd178a81d4ec7370632bdf5a323d5dd6e1ea5c472f395b64f0af7135` |
| `usePhoneVerification.ts` / `usePhoneVerification` | 189 | `a1f8d8de7e033d105c997b64f920cad4fe92f476d020a15a82efecdaffe24d6b` |
| `usePreferenceEditor.ts` / `usePreferenceEditor` | 183 | `037fe858ea4f4dae8cdbae8a5eeb90967af5e021e0344b51da8ffc50707cfa76` |
| `useTestAlert.ts` / `useTestAlert` | 95 | `62bb6b8f0c16c335ab36650289beffc19fa779fbb38e5800071fd06e77876e93` |

### AlertDelivery

Owns the paired email/SMS preference fields only. Core field length/optional-string input and Intel strict email input stay presentation props; native serialization, authority, verification actions, and effects remain in separate owners.

### PhoneVerification

Owns OTP-control presentation for one phone workflow: request acknowledgement, code entry, explicit confirmation/opt-in, refusal, and unknown-result review. It dispatches hook commands but contains no API, cache, recipient, or receipt-validation implementation.

### PreferenceForm

Owns composition and interaction gating of one personal preference form: criteria/delivery/quiet fields, separate phone/test sections, footer, and explicit discard/reload disclosure. Native adapters and save/action lifetimes are delegated; its only local UI state is the reload disclosure.

### TestAlert

Owns the saved-channel test controls and native-result wording. It presents selected supported channels, availability, uncertainty review, and per-channel outcomes; it does not choose native routes, execute provider requests, or infer delivery.

### useChannelScope

Owns only the current alert-action view lifetime: capture of existing actor/client/preferences/draft inputs, synchronous interruption subscription, post-await assertion, and disposal. It deliberately owns no request body, provider dispatch, response interpretation, retry, or presentation state.

### usePhoneVerification

Owns one native OTP workflow, whose start and confirm operations share the captured saved phone and challenge state. Exact start/confirm receipts, the required saved-preference readback after confirmation, and in-browser unknown-attempt recovery form one responsibility; test alerts and preference replacement writes remain separate hooks.

### usePreferenceEditor

Owns the full personal preference draft and replacement-save/reload lifetime. Owner-specific serialization/receipt rules and synchronous captured-input subscription are separate modules; retaining baseline/draft/status and replacing them only after a current accepted receipt is cohesive form state.

### useTestAlert

Owns a single deliberate test of current saved channels and its local outcome/uncertainty state. It retains no scheduling, OTP, or preference-saving behavior; domain receipt validation, common current-input lifetime, and result presentation are separately owned.

## Boundaries retained

The shared identity/current-client owners are imported through their canonical façades. Core and Intel normalizers, full PUT vocabularies, identity receipts and limits remain distinct. The read adapter does not become an authority service; the passive action lifetime helper does not dispatch, interpret receipts or implement retries. Preference saving, OTP verification and saved-channel testing each own their effects and return state to separate view components.

Native providers, authentication enforcement, persistence, cross-device conflicts and consent guarantees remain service-owned. Synthetic guards do not establish delivery or repair Core's weaker verification enforcement. No extraction of unrelated concerns remains necessary within these eight reviewed bodies; a future substantive change must refresh its exact fingerprint and responsibility review.
