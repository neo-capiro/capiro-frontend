# PR #60 source-size review

<a id="current-source"></a>

The architecture scanner reports size as a review signal. This review inspects the current source at PR #60 plus its narrow preview-policy test correction. It does not change the size thresholds, transferred baseline, or preview access policy. Exact function fingerprints in `scripts/architecture/reviewed-size-findings.json` bind these conclusions to the inspected source.

| Source | Current responsibility and conclusion |
| --- | --- |
| `MeriConversationHost.CoreResolvedConversation` | One selected tenant, actor and client owns the Core create-or-reuse attempt. The effect aborts on scope change, the shared resolver persists the request identity and validates the Core receipt, and only a verified conversation ID mounts the Meri session owner. Retry and explicit New Chat remain local to that attempt. Retain this component boundary. |
| `useConversationConnection.useConversationConnection` | One selected account and client owns host attachment, exact-run reopening and bounded session renewal. The 84-line hook keeps the explicit next-turn target through retry while copying only `clientId`, `conversationId` and `runId` into strict session hints; the pending UI prompt remains separate. History, admission and transport have other owners. A small extraction would add indirection without simplifying this lifecycle. |
| `saved-turns.sessionHistoryState` | Purely projects admitted saved/current runs, retained intent and local turns into display and action-blocking state. Event conversion, history fetching and write admission have separate owners. Retain the single current-run projection while its guards must be evaluated together. |
| `EngagementScreen.OrdinaryEngagementScreen` | Composes one Engagement tab and client scope. The current header wording and missing-name fallback are presentation; Plan operations, authorization and uncertain receipt lifetimes remain delegated. No new second workflow warrants extraction. |
| `StrategyContext.StrategyContext` | Owns the Strategy context document list, filters and local upload presentation. Query, persistence and authorization remain in the shared Capiro owners. The no-client default scope and layout changes do not add another data owner. |
| `strategies.module.css` | Declarative styles for the Strategy feature family, imported within that family. Recent context-search and timeline-reference selectors do not encode policy or cross-feature behavior. At 503 nonblank lines, split by view if unrelated style edits begin to interact. |
| `StrategiesScreen.StrategiesScreen` | Owns URL view selection and current-client navigation. `StrategyViewSurface` now renders the admitted view; persistence and Strategy detail validation remain outside the screen. The extraction improves this boundary. |
| `StrategyTimeline.TimelineView` | Composes one admitted Strategy workspace with separate editors and current-step membership checks. Recent fiscal labels and control placement remain presentation, with mutation and authorization delegated. |
| `FacilityDetailDialog.FacilityDetailDialog` | Owns current-facility scope, section navigation and edit/remove modal lifetime. Pure location and representation children render facts; evidence queries have separate owners. Current header/footer changes preserve the wrong-client guard. |
| `objective-operational-semantics.rowWitnesses` | One pure pass checks cross-section resource, provenance, receipt and revision identity. It has no transport or side effects. Its function body is unchanged; a sibling validation change altered the whole-file review hash. |
| `Header.Header` | Declaratively assembles brand, mode links and actions into `HeaderFrame`. Route scoping and fixture overlay state live in separate components; no transport or policy is hidden here. |

These are source-cohesion decisions only. The focused first-chat and preview-denial tests, broader frontend checks, image build and live signed-in flow are separate qualification evidence.
