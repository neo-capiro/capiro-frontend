# Calendar native-acceptance reconciliation

Frozen application `90ccdd47de7a989e822590d616d69baa15a37d5d`, published by documentation-only `5875e240c7b266a0e63903c4d0ed9b30c08d4d9a`. This read-only review maps all **66 assigned rows**. **All66 remain OPEN_FINAL_ACCEPTANCE; native accepted:0.**

| Primary category | Rows |
|---|---:|
| existing_behavior_missing_evidence |38|
| authentic_backend_provider_dependency |24|
| actual_missing_implementation |4|
| selected_figma31_mismatch |0|

The four implementation rows are `ENG-notes_list`, `ENG-debrief_list`, `ENG-calendar_navigation` and `MCAL-010`. The Day row requires scope reconciliation first; no view expansion is proposed in the immediate batch. Zero confirmed Figma mismatches means no fresh final comparison was performed, not that visual parity passed.

## Current facts that replace historical gaps

- Lifecycle triage/material columns, lifecycle initial tabs and persistent meeting identity exist. Same-scope refresh retains mounted hidden drafts. Historical CR05/06 are no longer wholly missing.
- Existing artifact mutation owners now validate actual note/debrief lifecycle metadata, preserve drafts and fence uncertain/non-idempotent attempts in the session cache. All-four-kind selection share/unshare and the separate current-only client-shared metadata feed exist; historical CR01/02/04/08/09 are not carried as current missing implementations.
- Existing-edit `clientId:null` and new-unscoped omission differ correctly. Empty location is sent explicitly; historical clear-location/foreign-receipt failures were repaired.
- `MCAL-012` now consumes publisher Federal Register effective dates through the canonical762aea contract. Estimated markup/floor windows still require an owner-defined source/confidence/time contract. It is incorrect to label the entire row noendpoint.
- Public event Calendar reads one `detail-v2` composition, independently projects follow/capture/relevance and uses canonical hearing identity. Historical standalone follow-config/attendance routes are retained as history, not asserted as current calls.
- Calendar sync remains explicitly calendar-only (`mail=0`), using the legacy adapter and a session fence. It is not wired to disabled/unregistered2386 durable recovery; historical calendar-and-mail wording is an explicit unresolved scope facet.

## Immediate source candidate and bounded next batch

**CAL-MAP-01** is the highest-value source candidate, affecting both artifact list rows. `MeetingArtifacts.tsx:112` shows query errors and then maps retained `query.data`; `queries.ts:74` uses a normal retained TanStack query. The separate meeting/identity wrapper does not gate this artifact read. `contracts.ts:164` drops available native meeting/client IDs rather than verifying them. This is source-confirmed; **new browser failing-before reproduction is NOT_RUN**. No cross-identity leakage or server ACL bypass is claimed.

Root's next finite batch should establish unchanged failing controls for cached success→held/403/503 list refresh and foreign-parent list responses, independently for notes and debriefs, then correct that same owner while retaining pending/unknown draft semantics. The saved-note source picker already demonstrates a stronger parent/current-read pattern. No new endpoint is needed: exact retained native list serializers6134/6190 include meetingId/clientId. Native debrief GET omits sharing stamps; retain its truthful unavailable state and the separate decorated-meeting sharing flow.

The other implementation candidates stay separate: **CAL-MAP-02 / MCAL-010** lacks SAM/SBIR feed composition although canonical funding search has deadline/source/page inputs and detail precision facts; regulatory30day/50 completeness still needs an owner contract. **CAL-MAP-03 / ENG-calendar_navigation** has no literal Day mode, while retained Master criteria specify Month/Week/Agenda. Resolve selected3.1 intent before adding behavior. Neither belongs in the immediate artifact-read repair batch.

## Ranked unblocked acceptance work

`unblocked_now=true` on52 rows means an **offline subcriterion** can progress; it never means whole-row native acceptance. Every recommended next step is non-native. The other14 rows need owner contract/runtime/provider evidence for their next meaningful closure; preparation can continue read-only.

1. **Current artifact read/receipt group:** establish CAL-MAP-01 red/green first, then retain existing note/debrief action-specific receipt, same-actor/client replacement, pending field, uncertain/remount and all-four-kind sharing controls. Relevant existing definitions: `calendar-artifact-receipts.spec.ts:95/111/138/242/325`, `calendar-sharing.spec.ts:122/192/247`. The last preflight test observes the original request and original attempt reaching refused before zero-write assertion; preserve that barrier. Native encryption/authorization/read-back and full-reload unknown recovery remain open.
2. **Calendar current reads/lifecycle/scope group:** `ENG-calendar_list`, `ENG-meeting_details`, `ENG-meeting_filters`, `ENG-meeting_attendees`, `MCAL-001–006`, `MCAL-008/009/013/014/015`. Run the bounded current-read/identity/date/paging/occurrence tests and selected desktop/phone captures, including an actual top-nav click/history control rather than only direct page.goto. Existing names/lines and source blobs are in each row. Native two-identity ownership/privacy and real source completeness remain open.
3. **Shared metadata/archive group:** `ENG-meeting_library`, `ENG-meeting_shared_feed` and share/unshare local review. Replay actual page/filter/current-read and metadata-only restrictions without inventing body/download access. Historical47-meeting/62archive reads are not current native privacy proof.
4. **Local export and sender selection:** `ENG-prep_export`, `ENG-debrief_export`, `ENG-prep_sender_select`. Inspect a real local print-to-PDF artifact after existing safe serializer/current-body controls, and exercise exact mailbox selection/refusal without sending. Legacy stored Email PDF fidelity/revision/idempotency limitations remain separate.
5. **Publisher effective-date subcriterion:** `MCAL-012` has meaningful offline paging/civil-date/provenance/stale-source controls in `effective-dates.spec.ts`. Qualify that facet independently of unavailable forecasts. Do not label mixed Calendar complete while SAM/SBIR and forecasts remain unresolved.

No new runtime check was executed by this mapping; listed controls are current exact-source definitions, not claimed new passes. Root owns the next coherent source/runtime batch.

## Native dependencies and limits

P3/P7 still require an approved Clerk/backend identity pairing and signed-in real-service/sandbox evidence: two-user private/caller/client sharing, roles/expiry, native mutations/read-back, all pages and date/time boundaries, actual provider state and durable unknown/reload recovery. No credentials, native calls, storage/model/bot/provider effects, tests, builds or servers were used here.

Specific owner gaps remain: atomic file approval viewer/current-version/readiness; assignment/prep revision serialization; optional prep job/Monday mapping activation and real source permissions; bot/transcription/model execution; stored PDF fidelity/reviewed revision/idempotency; shared calendar cursor writer fence and activated2386 recovery; exact note↔notetaker-session provenance; LegiWatch per-user relevance/time/capture guarantees; arbitrary regulatory deadline ranges and defined Government estimates.

Retained native source243248e and earlier4be13b0b are exact available pins, not claims about latest deployed services. Four sharing function ranges were independently byte-identical between those pins; no whole-service equivalence is inferred. The newer effective-date pin is recorded from its public operation declaration. Latest native owners must confirm activation/compatibility before live qualification.

Preserved original3.1 frame references remain unchanged. No fresh Figma tooling or final pixel comparison occurred. No microphone recording acceptance follows from audio-file upload. No native Office/PDF/provider acceptance follows from synthetic bytes or intercepted calls. All exclusions remain outside337. Historical initial failures stay preserved; draft retention's captured before-state was already corrected, so its3/3 is green-only and failing-before is NOT_RUN.
