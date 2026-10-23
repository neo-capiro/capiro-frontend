# ST24 Branding logo confirmation — 23 October 2026

The previous logo form used plain `useSettingsAction`: a branding-shaped response could claim upload success for another key/type, and a lost confirmation was forgotten across reload. This checkpoint routes only canonical logo confirmation through the existing scoped Settings journal. It is a bounded continuation, not completion of ST24 or A2.

## Existing owners and behavior

`branding/useBrandingLogo.ts` uses the unchanged upload-ticket operation and `uploadCapiroLogo` transport, then the existing `useSettingsMutation` confirmation path. It adds no store, transport, retry or provider owner. Ticket issuance does not mutate the canonical logo; upload bytes and presigned fields are never journaled. Name and logo controls lock while either form is busy or uncertain. Local Branding name/logo components separate presentation from the existing form lifetimes.

Core's current `BrandingService.confirmLogoUpload` verifies the unique tenant upload key/type and serializes replacement on the existing tenant row. The frontend checks the delivered receipt's exact key/type, then re-reads current branding. Only the delivered matching receipt plus the matching current read can clear uncertainty. The retained comparison is bound to the existing actor/session/organization, operation and attempt digest. No raw upload key, bytes, ticket or signature is persisted in the recovery journal. A lost or mismatched confirmation stays fenced across navigation/reload, with no automatic replay. A stale account callback cannot update a new actor's form.

The name/provider convergence notice remains truthful; this change does not implement ST27 provider reconciliation.

## Evidence

Windows Node24.22.1, Playwright1.61.1, existing loopback fixture and real Chromium. All data is synthetic. The S3-like HTTPS hostname is intercepted in-browser; no AWS request or provider operation occurred.

- New Branding browser cases:6/6 pass. They cover busy name/upload controls, delayed exact canonical readback across reload, wrong key, wrong type, lost confirmation despite equal current state, invalid local files and account replacement during confirmation. Exactly one ticket/upload/confirmation occurs; external upload carries neither authorization nor cookies.
- Exact pre-repair a280d791566bca7e3461fa08182ded133e6f1438 Branding/recovery owners fail both wrong-key and lost-confirmation controls at the expected missing recovery notice. All three files restored byte-for-byte.
- Final combined Settings browser suite:20/20 pass, no skipped cases or page/runtime errors.
- Focused ordinary/Settings/execution source suites:32/32 pass, including exact key/type, matching delivered receipt, changed readback, hashed persisted recovery and lost-response rejection.
- Web TypeScript: exit0. Touched ESLint:0 errors,1 `no-img-element` warning on the existing signed logo rendering. The same warning reproduced on exact a280 Branding source; the image transport/rendering was preserved.
- Prettier and diff whitespace checks pass.

Evidence: `work/a2-repairs-20261023/branding-controls/{positive.json,base-controls.json,base-controls.log,base-lint.log,restored-combined.json}` outside the checkout.

Architecture remains exit1 with20 blocking findings, down from21 because BrandingForm's independent upload work and field markup are now separated. No review/baseline exemption was added. Full ST24 remaining inventory, other A2 rows, independent review, production gates and deployed/provider acceptance remain open in PREREQUISITES.md.
