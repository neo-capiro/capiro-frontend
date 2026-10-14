# Smallest next preview upgrade

Base consolidated candidate: `6505e5014886625cad7dacd70fb11f607445791a`. Deployed source remains frozen at `5ca42049325881782bc9d2ac557450d642eccee8`. This successor adds one public favicon fix and its checks to the existing consolidated history. No backend/image/environment/feature-flag change, SDK adoption, migration, AWS image build or deployment is included. Local production build and standalone verification are complete.

## Delta from the deployed source

- API 404 feedback distinguishes unavailable records/actions from empty success; owner controls withhold stale/failed reads.
- Customize works from filtered/list views; Files All-files navigation, visible/hidden selection and keyboard/a11y feedback are corrected.
- Scoped Outreach refuses wrong-client list receipts; pending edits cannot drift or close. Workspace rejects wrong returned document IDs and keeps submitted sections stable across pending writes.
- Prolonged Clerk initialization offers elapsed-time/reload guidance. ClerkLoaded remains the only unchanged child admission; authentication/session/client boundaries and provider configuration are preserved.
- Layout uses the backend-authorized catalog and fences late/unknown receipts. **Persistence requires backend PR10 and its unexecuted migration**; keep that capability unavailable until separately received. Existing GET failure blocks customization/write rather than inventing a local store or success.
- `/favicon.ico` now permanently redirects to the existing `/onboard/favicon.svg`; metadata advertises that SVG directly. The asset is byte-identical to deployed source blob `17dd920de230e8f3ba3ac4a3dfa2effe7cbcfede`. No new image, asset editing or brand design was introduced.

## API compatibility and activation boundary

The frontend fixes retain the deployed source's existing service selections, endpoints and request grammars for Files, Outreach, Workspace, owner reads and other existing callers. They change admission/UI/feedback, not those API families. No new business API is added. Current source comparison confirms wire compatibility; actual deployed endpoint availability/persistence cannot be newly confirmed while Neo's authenticated validation is pending. Unsupported existing APIs continue to fail unavailable. Do not label source compatibility as native acceptance.

Saved layout GET/PUT `/api/me/portfolio-layout` is the only backend activation dependency introduced by the changed receiving behavior: backend PR10 `be12f4a2a2ecec43b5d02ea279d9448763415e24` and source migration `20261014050000_user_portfolio_layout`, plus approved service/image/schema/role/native qualification. The route was already requested by the deployed frontend; this successor does not add a fallback, enable it or execute its migration. Existing optional Meri/provider/Newsletter features retain current flags, origins and contracts; no new service activation is part of this preview upgrade. Backend Meetings regression remains with its owner.

## Bounded checks and next release gate

The actual built standalone request gate verifies favicon 308 with fixed relative Location, no cookie, canonical response headers, followed SVG 200/MIME/body and SVG page metadata. The original 78278136 request-URL redirect exposed Next's internal localhost origin and failed; a framework-redirect attempt omitted normal response headers. Both diagnostics remain in the local logs. The final small handler ignores the internal host and reuses canonical responseHeaders; the actual HTTP checks pass without relaxing header assertions. The weaker handler-only tests were replaced by this built request proof. An initial generated-type failure resulted from concurrent build/typecheck; final checks ran after the completed build.

Final local production build and 31 standalone observations pass with zero page errors and Portfolio root smoke. Full npm check passes 2699 web/Capiro units, 111 root controls, 84 transport cases, 385 Newsletter cases/declaration compatibility, workspace types, full lint zero errors/81 existing warnings, full formatting, public packages and architecture zero blocking/boundary errors. Thirty layout/Customize and five auth browser controls pass; their feature bodies remain unchanged by the final favicon correction. The base's 240-browser qualification is preserved, not claimed as a fresh full browser rerun on this successor.

Against an API without PR10, a missing layout GET 404 (or unavailable 503) produces no admitted customization rows or reorder controls, an explicit unavailable explanation and no Save action. Ordinary profiles remain usable in default order. If a formerly valid catalog fails during editing, the local draft is retained but Save is disabled; no PUT may dispatch until a valid current catalog is admitted. The browser cases exercise those failures, blocked actions and zero writes using synthetic responses. These are source/local checks, not a live account or live-save claim.

One focused code PR/source candidate carries the change; no evidence-only PR layer is needed. Before any later preview image is selected, preserve these exact source/check bindings and complete the authorized native account check after Neo's manual sign-in. All 337 native rows remain open. Frozen PR25 is unchanged and no live/API-data/AWS/security/credentials/provider mutation occurred.
