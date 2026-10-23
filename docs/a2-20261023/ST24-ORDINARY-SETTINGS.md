# ST24 Personal, Contact and Signature continuation — 23 October 2026

This checkpoint preserves the existing Settings request, receipt and recovery contracts. It does not close ST24 or the full A2 brief.

## Responsibility changes

- `PersonalSettings` composes account information and the existing signature surface. Its local `PersonalTitle` owns one title draft and its existing write/refresh lifecycle, including Core's trim-or-null receipt comparison.
- `ContactForm` keeps its draft, write and notice. Local `ContactFields` renders the organization/address inputs. It has no transport or persistence.
- `SignatureEditor` keeps its HTML/default draft, the existing `useSettingsMutation` owner, canonical readback and save/cancel controls. `useSignatureFile` owns only the local FileReader, size/type validation, stale-reader guard and abort cleanup. `SignatureUpload` owns browse/drop markup. Local `SignatureOptions` renders the preview and campaign default switch. The rich editor and existing canonical signature sanitizer/readback remain their original owners.

There is no new state machine, store, transport or public API. The API-scope cleanup timing, image/HTML limits, draft reset, busy controls, request shapes and unknown-outcome behavior are preserved. Existing same-command scoped hashes remain free of raw contact/signature content. All fixture records and addresses are synthetic; tests make no provider requests.

## Verification

Environment: Windows, Node24.22.1, Playwright1.61.1, real Chromium through the existing Vite fixture on loopback5191.

- Web `tsc --noEmit --incremental false`: exit0.
- Touched source and browser fixture ESLint: exit0, no errors/warnings.
- Three focused source suites (`a2-settings`, `a2-ordinary-writes`, `a2-settings-execution`):31/31 pass.
- Six new browser cases:6/6 pass. The exact pre-extraction Personal/Contact/Signature source from25697d5ac41c834c005646e805f1b73e2938a509 also passes those same6 cases. Current files were restored byte-for-byte afterward.
- Deliberately replacing normalized title comparison with raw title: the title control fails at the expected canonical refreshed value. Deliberately removing exact canonical projection comparison: the signature control fails because it falsely clears the unknown-result notice. Both source mutations were restored byte-for-byte.
- Final restored combined Team/Billing/Personal/Contact/Signature suite:14/14 pass,0 skipped, no page/runtime errors.
- Prettier and `git diff --check`: pass.

The six new cases cover trimmed and cleared titles; lost contact response across reload despite equal current state, with no raw draft persisted or replay; exact/mismatched contact receipt; signature duplicate-submit suppression and all busy controls including direct drop, then delayed exact sanitized readback; unsupported/oversized files, valid drop and cancel; and a real native FileReader with controlled start timing across account replacement, including abort and stale callback suppression.

Local evidence is preserved outside the checkout under `work/a2-repairs-20261023/settings-ordinary-controls`: `extracted-positive.json`, `original-views.json/.log`, `raw-title-mutant.json/.log`, `signature-equal-state-mutant.json/.log`, and `restored-combined.json`. Initial control runs had no assertion failures other than the two deliberate mutants. The previously recorded Team/Billing fixture development failures remain in its separate checkpoint evidence.

## Architecture and remaining acceptance

Architecture exits1 with21 blocking findings, down from23. This is **not a passing architecture gate**. Personal and Contact no longer trigger changed-size findings. SignatureEditor reduced177→81 nonblank lines. The81-line function owns one draft and its save/cancel/recovery lifecycle; independent local-file I/O and presentation are extracted. Retaining that coherent lifecycle avoids another fragment solely to cross the80-line signal. Its exact fingerprint still requires independent responsibility review; no baseline or review exemption was added.

Other unresolved findings remain in Files/batch move, Branding, Integrations, Profiles/RegisterAccount, security-write tests, SettingsScreen, shared Settings operation definitions and broadcast presentation/lifecycle. The existing21 findings remain visible in `settings-ordinary-architecture.json`.

Remaining ST24 includes the full HQ/mappings/analyst/profile/branding/integration surface inventory and required cross-tab, revocation, recovery, accessibility and deployed qualification. Independent exact-head review, production/build gates and live acceptance are not supplied by synthetic fixtures. Remaining PF16 hearing support, PF18 modes, Mail prerequisites and all other open rows remain in the full A2 matrix. No new Mail contract, schema or writer was changed in this checkpoint.
