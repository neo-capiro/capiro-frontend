# Meri document adapter outline

This separate feature worktree consumes only the published `@capiro/meri-contracts` 0.1.2 document exports from Meri PR54 `70516e5c9681917ce493bbc50e3023494f2e1209`. It does not establish native activation or alter the frozen 83 source.

## Ownership and interface

- `workflow-port.ts` defines the presentation interface: explicit create, full-replacement revise, inspect a known handle or supplied immutable version ID, verified download, write snapshot and disposal. Views contain display metadata, inspection and opaque handles; receiver-branded objects and credentials stay private.
- `workflow-adapter.ts` owns immutable request capture, current session/client correlation, known-artifact consistency, private handle ownership and write dispositions. The host supplies exactly one server-configured operation, `create_word` (DOCX/TXT) or `create_excel` (XLSX); the browser cannot choose mixed-family authority. This incorporates the parent's subsequent PR56 workbook steering.
- `workflow-transport.ts` owns the four fixed document routes, opaque bearer forwarding, bounded JSON and public binary receiving. It reuses root's bounded byte/deadline helpers and cancels unconsumed or late bodies.
- `attempt-journal.ts` defines non-secret write uncertainty. `query-journal.ts` binds it to the canonical QueryClient generation and tenant/actor/conversation/run/client scope. Clearing or replacing that cache invalidates old owners without cleanup repopulation.
- Root owns bootstrap/session expiry, configuration, proxy routes, navigation and host composition. Feature presentation owns local text, selection and object URL disposal. The backend owns access, immutable generation, scopes and durable effects.

## Lifetime and failures

Create/revise acquire a synchronous shared pending fence before hashing or dispatch. The journal retains only intent fingerprints and disposition metadata, never private draft text, receipt objects or credentials. An unresolved dispatched write blocks further writes across view replacement. Identical attempted writes do not allocate another delivery. Explicit reads are independent of write fences and cannot resolve uncertain writes. Known handles are local to one workflow lifetime; supplied IDs require a newly validated current-context/client receipt. Old producer attempt/worker/fence values remain valid provenance and are not equated with current executor identity.

Native response receivers remain the sole wire schema/brand owners. Browser checks add current-context/client and immutable known-artifact correlation. Delivery failure, timeout, malformed success or lost publication authority after dispatch conservatively leaves uncertainty. Revocation clears local handles; post-await checks withhold late data. Binary bytes are released only after the public receiver verifies headers, exact count and SHA256 and the adapter rechecks its lifetime.

## Verification

Pure one-worker Vitest tests use synthetic fixtures admitted by the real public receiver and real Response streams. Cover fixed routes/headers, malformed/oversize/late body cleanup, binary hash/header failure, foreign and cloned handles, context/client and known-artifact mismatch, historical producers, interrupted/repeated writes across navigation, cache clear/replacement, no secret/draft cache persistence and late completion after disposal. The parent extended ownership to new `apps/web/tests/meri-document-*` tests/fixtures so the inherited combined test gate discovers them. An external config was used only for the first draft before this correction. No install, browser, build or native calls occur in this lane. Source size signals receive exact independent review before integration.
