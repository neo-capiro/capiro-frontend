# Read-only deployed preview smoke, when access is approved

The coordinator reports frozen PR25 shipping source `5ca42049325881782bc9d2ac557450d642eccee8` deployed with the correct image digest and healthy ALB. Browser access is pending Neo's specific IP-ingress approval. This frontend owner has not connected to the live host or changed ingress. Execute only after shipping supplies access and the deployed digest/source binding; record actual pass/fail/unrun results rather than treating the report or local tests as native evidence.

Use the existing account/organization and one already accessible client. A focused first pass should take roughly five minutes:

| Step | Meaningful observation | Receipt to retain |
| --- | --- | --- |
| Existing login and root | Normal Clerk sign-in reaches Portfolio and the current native `/me` resolves the expected user/tenant/role | UTC, actual deployed digest/source, route/status and identity match; no tokens |
| Client catalog | Search an existing client, open it, refresh, Back then Forward; distinguish failed native reads from empty results | Selected existing client ID, route/status and expected visible identity at each transition |
| Shared navigation | Use actual header controls Portfolio → Meri → Modules → Settings → Portfolio; Meri's existing disconnected state is expected | Destination URLs, selected client retained, current page/errors; do not start a Meri workflow |
| Independent feature reads | Open existing Files, Objectives, Manage owners and calendar Month/Agenda; inspect one known accessible record only if offered | Each exact GET/status, current IDs, and source-specific errors; a 404 is unavailable action/record, not deletion or empty success |
| Client/session replacement | If a second client is already accessible, switch and confirm no old client editor/data persists; sign out, Back, then sign in to the same account | Scope/session transitions and concealed private views; no tenant switching or administrative expiry |

Repeat only header navigation and one existing client/error dialog at mobile width with keyboard focus/dismissal. Stop the affected flow on a route/scope/identity mismatch, record it, and continue independent effect-free observations. Current saved-layout service absence may show the existing unavailable explanation; it is not a login gate. Newsletter staging's actual process routing/disabled admission is backend-owner work and no staging action belongs in this smoke.

No writes, uploads, deletions, sharing, sends, AI/provider calls, enrichment, ingestion/sync, exports, billing, permissions or credentials/security changes are part of this slice. The older optional manual Newsletter write sequence is not exercised here. Do not capture token-bearing request headers, raw HAR or cookies. All 337 native rows remain open unless their separately approved criteria are fully evidenced. PR29 and this pending-save follow-up are later candidates; do not mistake their local behavior for behavior already deployed on frozen PR25.

An observation table can be filled directly as access arrives: `UTC | deployed source/digest | action | exact route + method/status | expected/observed scope | pass/fail/unrun | screenshot/evidence reference`. No live action was performed to prepare this checklist.
