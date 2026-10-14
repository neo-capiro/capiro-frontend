# Smallest next preview upgrade

Base consolidated candidate: `6505e5014886625cad7dacd70fb11f607445791a`. Deployed source remains frozen at `5ca42049325881782bc9d2ac557450d642eccee8`. This successor adds one public favicon fix and its checks to the existing consolidated history. No backend/image/configuration/feature-flag change, SDK adoption, migration, rebuild or deployment is included.

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

The two focused tests invoke the real favicon handler with native Request/Response, check 308/same-origin asset destination/empty body/no cookie and verify the existing SVG source. Five existing auth browser cases pass. Workspace types, full lint zero errors/81 existing warnings, changed formatting, 111 root controls and architecture zero blocking/boundary errors pass. The architecture guard initially required allocation of the new public route; its exact dependency-free path was added to the existing allocation map, with guard logic unchanged.

The consolidated base's 240 browser/2699 unit/build/standalone qualification remains preserved; it is not relabelled as execution against this favicon successor. **No production rebuild or standalone replay was run, as requested.** The existing production request gate now checks `/favicon.ico` 308 and follows to the SVG 200/MIME/body after the later authorized build. Production route discovery and actual built HTTP behavior therefore remain a deliberate next gate, not an asserted result here.

One focused code PR/source candidate carries the change; no evidence-only PR layer is needed. Before any later preview image is selected, run that build/request gate and complete the authorized native account check after Neo's manual sign-in. All 337 native rows remain open. Frozen PR25 is unchanged and no live/API-data/AWS/security/credentials/provider mutation occurred.
