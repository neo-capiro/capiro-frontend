# Bounded ordinary-opening capture

Diagnostic source only; this does not fix or settle an unknown reservation. Capture is off unless a newly constructed ordinary authenticated conversation view receives both exact query parameters:

`meriOpeningCapture=1&meriCaptureCase=qa_<8 to 24 lowercase letters or digits>`

The case nonce must be synthetic and nonsecret. Duplicate parameters, malformed values and searches over 4096 characters disable capture. Research views and views without a selected conversation do not activate it. The flag is read once before initial host construction. It is not an authorization check or a request to retry. Only the initial host receives the observer; retries, renewals and target switches do not start another capture. React development effect cleanup may end that first lifetime immediately; missing records are not negative evidence.

Activation requires a separately allocated future ordinary opening, compatible reviewed serving source, a nonprotected context and the sole tester's custody. Never append the flag to a current or protected UNKNOWN context. This source unit authorizes no navigation, capture, model call or deployment.

The sole tester can retrieve already captured records through the documented browser API:

```js
await tab.dev.logs({
  filter: 'MERI_OPENING_CAPTURE',
  levels: ['info'],
  limit: 32,
});
```

Use the allocated tab and case nonce to distinguish this capture. The bundled Browser API documents `TabDevAPI.logs`, its substring `filter`, levels and result limit; `TabDevLogEntry` supplies the rendered message and capture timestamp. Documentation source: Browser plugin `26.1027.51404/docs/api.json`. No browser access was performed to establish this capability. If the deployed browser cannot retrieve these records, report that exact gap; do not add exports, endpoints or a second collection mechanism.

Each `console.info` call contains one JSON string, never a live object. `sequence` and `elapsedMs` order records within this capture; the browser log timestamp supplies collection UTC. Opening hints retain the distinction between absent and present run selectors. Admitted receipt records include conversation/run aliases and initial-rebind aliases; the canonical receipt has no request ID, which is explicitly recorded. History records project only naturally received, scope-admitted transcript metadata. Pending-turn metadata has source/target/state but no request ID; accepted-turn and retained-intent request aliases provide only the linkage actually present.

The committed UI effect captures the same render's `sessionHistoryState` inputs and result: selected hints, admitted run, current latest run/reservation, opened target, intent source/state/receipt, query update/fetch status, saved-turn sequence/request lineage and displayed saved-run/message-presence linkage. It does not read message bodies or replace the predicate. The history callback observes already existing query responses and does not start a read. Exact response-object correlation is labelled `received-this-capture`; structural sharing or preexisting cache can produce `cache-or-unobserved`, which is intentionally not claimed as definite cache origin. Query timestamps and earlier received records support ordering without inventing an unobserved read.

Conversation/run/request identifiers use capture-local equality aliases (`c`, `r`, `q`); raw identifiers, account/client IDs, tokens, credentials, draft/message/answer content and arbitrary fields are excluded. Alias equality has meaning only within one capture. Lists include at most their last four entries and explicitly report omitted counts. A displayed run outside those entries may require a new, separately allocated design decision; omitted records never prove absence or settlement.

Limits include the terminal marker: 32 records, 4096 UTF-8 bytes per record, 65536 total bytes, 256 retained aliases, 120 seconds and one host lifetime. A reserved terminal allowance records `stopped` with `incomplete: true` where the console still works. Disposal, currentness loss, deadline, budget or observer failure stops output and clears aliases/correlation state. Observer failure cannot escape into transport or recovery. No persistent/global store, telemetry endpoint, download/export or extra backend request is created. Once the local join is diagnosed, remove this temporary diagnostic through its owning change.
