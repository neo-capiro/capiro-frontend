# Independent proxy review

Root Codex reviewed the separate outreach_review implementation of the fixed conversation proxy, route, body admission and stream lifetime. Native route semantics come from the existing public @capiro/meri-contracts conversation-application metadata and receiver. SDK0.1.3 remains unchanged. Only submit/history/cancel/events and one exact UUID reconnect path are exposed, with route-specific method/body/header checks. No upstream destination comes from browser input. Normal Clerk capiro token gating and the existing opaque bearer bootstrap remain canonical; private runner/task/broker routes are absent.

Request and JSON-response byte limits use the canonical bounded reader. Stream forwarding preserves opaque bytes, with total-byte/deadline bounds and native abort/reader cleanup on cancellation; no second SSE parser, retry, authority store or provider loop was introduced. Upstream cookies and private headers cannot be forwarded. Redirect/content-encoding responses fail closed. Root strengthened absent/cacheable owner headers to no-store and filled absent nosniff. Native SDK response admission still owns successful conversation semantics.

Reviewed route containment remains compatible with the existing preview backend hold, which precedes auth. An opt-in flag is a source prerequisite and does not qualify a native runtime or permit activation. Default standalone requests cannot reach native services. Focused tests cover closed config, rejected auth, exact routes and DTOs, redirect/response/header bounds, streams, deadline/cancellation and route containment.

No blocking source issue found. These are local source and fixture checks, not live acceptance, deployment qualification or a provider execution claim.
