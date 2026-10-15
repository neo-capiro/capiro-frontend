# Meri Figma 3.4 completion record — 15 October 2026

**Status: design updates and verification complete.** The final native canvas inventory contains **108 new frames and 3 renamed frames**, all indexed below with verified IDs and names. Desktop and responsive layout checks pass; the prototype audit found no missing or self-referencing destinations. Live backend behavior remains unqualified.

## Source and scope

- Frontend source: `neo-capiro/capiro-frontend`, branch `meri/figma-34-ui`, read snapshot `b6fd8b78b5ccee0b076d77982a51784df1ae8842`.
- Design: [Capiro 3.4 — Meri](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=1064-143240), page `1064:140864`, Meri section `1064:143194`, standalone product mockup `1064:143240`.
- Inputs: [handoff](FIGMA-MOCKUP-HANDOFF.md), [audit](AUDIT.md), `apps/web/src/features/settings/MeriPreferences.tsx`, and `preferences/PreferencePages.tsx`.
- Repository `AGENTS.md`, implementation standards and architecture were read. Meri contracts, runtime, authorization and infrastructure remain owned by `neo-capiro/meri-greenfield`.

Work is limited to Figma and these handoff documents. No application code, backend configuration, deployment, paid model operation or source connection was changed. Delivery changes only the two handoff Markdown files on this branch.

## Handoff items 1–8

| Item | Authored result | Current acceptance status |
| --- | --- | --- |
| 1. Preferences 09.01–09.07 | Seven desktop pages, seven-page navigation, writing defaults, appearance preview, connection health and granted scopes, usage/policy states, approved skills/templates, updates/account panels, retention/privacy, shortcuts and feedback. Native fields now fill wider instances; feedback has separate summary/description and an interactive optional run-reference toggle. | Desktop compositions and preference overlays visually reviewed after repair. Live persistence and service actions remain unqualified. |
| 2. Retention/deletion 11.06 | Nine cards cover retained conversation receipts, deleted artifact versions, deletion progress, legal hold, backup/revocation, permitted export, policy changes, expired uploads and cleared browser session data. | Authored, captured and structurally verified. |
| 3. Session/availability 11.07 | Signed out, expired session/draft recovery, feature disabled, unavailable conversation/document/action services, partial service, missing/removed client authorization and read-only mode. | Authored, captured and structurally verified. |
| 4. Artifact sharing 04.08 | Contributing source scopes, audience, narrowed/blocked filing, preserved provenance, request-access state and exact access review. | Authored, wired, captured and structurally verified. |
| 5. Responsive/dark | Eighteen variants 10.19–10.36: six priority phone flows, three priority tablet flows, five dark representatives, and phone/tablet Preferences and Sharing. | All 18 final variants pass text and container bounds, font and dark-mode checks. Dark primary CTA contrast is at least 14.26:1. Phone, tablet and dark compositions were visually reviewed after targeted repairs. |
| 6. Overlays | Six requested Sonner outcomes, preference confirmations, account/Updates panels and a separate history-deletion confirmation; triggers and close/replacement behavior defined. | Preference overlays visually reviewed. History returns to the three remaining conversations; memory/task/filing decisions return to their corresponding two-pending queues. All frame screenshots are captured and the prototype audit passes. |
| 7. Numbering | 12.07→12.09 Funding; 12.08→12.12 Budget lines; 12.15→12.18 Artifact verification. Existing node IDs preserved, with a note beside Tooling coverage. | Renames recorded below. |
| 8. Existing inconsistencies | Reflow repairs, three-source evidence count, Current/History semantics, research step icons, distinct source/proposal/task references, routine modes/states, browser receipt context, missing destinations, memory/source lifecycle states, artifact page/slide states, code-preview consistency, dark tokens, result triggers and comments are reconciled. | Repairs, decision/comment states, history return and design note authored. Representative compositions reviewed. Final prototype audit and screenshot evidence are complete. |

## The four lane findings

### Overflow on 05.06 and 05.08

The original [05.06 proposal](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=1064-147204) and [05.08 approved outcome](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=1064-147320) retain their native IDs. Fact cards and headings now grow with wrapped content. Related task/routine instruction areas have sufficient height. This layout behavior must survive frontend implementation.

### Three defined sources, no phantom evidence

[05.01 evidence and citations](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=1064-146715) now shows **3 sources**. The three unnamed source entries introduced by the lane should be retired, not treated as retrieved records. Counts and citations must reflect actual authorized evidence, with incomplete coverage and unavailable sources kept explicit.

### Current, History, scope and freshness

[05.04 Current memory](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=1064-147042) contains active eligible records in the authorized context. Personal memory is allowed when authorized. [History](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-23371) contains superseded provenance; it is not mixed into Current. Freshness is shown independently, and scope is a separate control. [Current after approval](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-23613) shows the replacement after an acknowledged approval. Its History control opens [05.08B Superseded briefing preference](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3050-34741), which preserves the old fact and points back to the replacement through Current. Supersession does not erase provenance.

These are design semantics for the new Meri contract owner. This work did not verify a live memory-search filter, endpoint or recalled dataset, and did not adopt old `capirov2` queue behavior as the new implementation contract.

### Eleven memory lifecycle states and independent review

Shared memory remains a proposal until an authorized independent reviewer approves the exact displayed change. [06.02A reviewer perspective](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3027-28352) represents another authorized account; the proposer does not approve their own change. Request-changes, rejection, permission changes and uncertain outcomes do not silently activate or replay a proposal.

| New state | Node |
| --- | --- |
| 05.10 Submitting | [3019:28780](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-28780) |
| 05.11 Submitted/pending | [3019:28977](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-28977) |
| 05.12 Rejected | [3019:29174](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-29174) |
| 05.13 Changes requested | [3019:29371](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-29371) |
| 05.14 Revised draft | [3019:29568](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-29568) |
| 05.15 Loading | [3019:29765](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-29765) |
| 05.16 Load error | [3019:29962](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-29962) |
| 05.17 Submission error | [3019:30159](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-30159) |
| 05.18 Decision uncertain | [3019:30356](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-30356) |
| 05.19 Access restricted | [3019:30553](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-30553) |
| 05.20 Changed while open | [3019:30750](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-30750) |

## Reference and lifecycle rules

- **TASK-2047** is the existing evidence/source record. **TP-2048** is the exact proposed task action. **TASK-2048** is the separate acknowledged newly created task. These identifiers must not be collapsed into one record or overwritten silently.
- Routine Active, Paused, Automatically disabled and Cancelled states are separate. Editing an existing routine uses Edit routine/Save changes. The weekly preview is explicitly as of 15 October 2026: 19 October, 26 October and 2 November 2026 at 09:00 America/New_York. The trusted service owns actual schedule calculation.
- Public browser receipts remain separate from provider-connected account states. Meri never collects provider credentials in its conversation UI. Authenticated browser takeover remains deferred.
- History deletion removes the selected conversation after a permitted acknowledged outcome. The final receipt returns to [**01.04H, with three remaining conversations**](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3043-38316). [01.04A Empty conversation history](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3034-32186) is a separate initial/empty state.
- The initial approval queue shows three pending proposals. Decision outcomes link to the corresponding queue with two pending proposals: [06.01A after task decision](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3036-33107), [06.01B after filing decision](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3036-38096) and [06.01C after memory decision](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3048-39000). The completed decision is removed from the pending list, with its outcome retained separately.
- Document comments have distinct [13.24 reply](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3045-34297), [13.25 reply added](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3045-34315) and [13.26 resolved](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3045-34333) states. The resolved panel has a working close control; these fixtures do not qualify a live comment service.
- Source scopes and provenance travel with an artifact version. Filing or sharing cannot widen source access; access is rechecked before reuse and execution.
- DOCX page navigation is fixed within the 1040px screen; the document body scrolls independently. Pages 1–4 have a 568px viewport and pager bottom at 996px. PDF pages and presentation slides have distinct states and navigation.

## Renamed frames and supporting components

| Before | After | Preserved node |
| --- | --- | --- |
| 12.07 Funding & federal market | 12.09 Funding & federal market | [1064:151682](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=1064-151682) |
| 12.08 Budget lines & exact comparison | 12.12 Budget lines & exact comparison | [1064:151762](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=1064-151762) |
| 12.15 Artifact verification | 12.18 Artifact verification | [1064:152575](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=1064-152575) |

The design decisions are recorded in [the native handoff decision note](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3043-34159). The numbering note is [3024:32500](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3024-32500). Native field definitions remain in the existing `Meri/Field` set (`441:81484`), with responsive inner layout. Existing v2 variables and component instances are reused. The local supporting families are:

| Family | Node |
| --- | --- |
| Meri/Memory proposal feedback | [3019:30960](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-30960) |
| Meri / Preferences / Include run reference | [3029:28396](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3029-28396) |
| Capiro/Wordmark Dark alpha mask | [3039:34149](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3039-34149) |

The optional feedback toggle has explicit Off/On labels, a corrected default and a legible dark On label. The dark wordmark uses an alpha mask with the foreground token. No instances were detached.

## Validation and remaining live qualification

The final native text-bound audit passes on **75 new 1440×1040 screens** with zero findings. All **18 responsive/dark variants** pass text, frame and control bounds, allowed fonts and dark-mode checks; dark primary CTA contrast is at least **14.26:1**. Intentional scroll areas remain scrollable. Representative compositions, preference screens, overlays, responsive views and below-fold phone cards were visually reviewed after targeted repairs. The prototype audit covers **108 new frames, 2,587 links and 153 unique destinations**, with **zero missing destinations and zero self-navigation links**. The **115 exported PNGs** cover every new or renamed frame plus the four original memory-gap screens; SHA-256 checksums and local image paths are recorded in the companion screenshot index. The screenshot package is delivered separately from the source repository. These checks qualify the design and prototype, not live backend operations.

Figma prototypes and fixture screenshots do not qualify these live behaviors:

- Preference persistence, notification settings, live usage/limits and workspace-approved skill/template data.
- Feedback submission and actual acknowledgements.
- Permitted-message export, deletion execution, retention enforcement and legal-hold handling.
- Provider authorization, reconnect/disconnect, credential lifecycle and live connector health.
- Source retrieval/coverage, memory search/proposal/review writes and approval authority.
- Authenticated browser operations, real routine scheduling, document/service availability, artifact sharing/filing and durable action outcomes.

Use deliberate public contracts from `neo-capiro/meri-greenfield` and verify trusted authorization, exact versions/actions, failure recovery and acknowledgements before enabling unavailable controls. No paid operation, backend deployment, shared routing change or live data mutation was performed for this Figma task.

## Native frame index

The final read of Standalone contains **111 indexed entries: 108 new frames and 3 renamed frames**. IDs are unique. Names and dimensions below come from `final-frame-manifest.json`, rather than provisional creation ledgers. The 108 new frames include 18 responsive/dark variants, desktop screens, overlays, the memory state catalog and the design decision note. The separate numbering note and supporting component families are linked above.

| Change | Final native name | Dimensions | Figma node |
| --- | --- | --- | --- |
| New | 05.04B · Institutional Memory history | 1440 × 1040 | [3019:23371](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-23371) |
| New | 05.08A · Current memory after approval | 1440 × 1040 | [3019:23613](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-23613) |
| New | 11.06 · Retention and deletion states | 1440 × 1040 | [3019:27976](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-27976) |
| New | 11.07 · Session and availability states | 1440 × 1040 | [3019:28267](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-28267) |
| New | 04.08 · Artifact sharing and source scopes | 1440 × 1040 | [3019:28559](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-28559) |
| New | 05.10 · Memory proposal — submitting | 1440 × 1040 | [3019:28780](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-28780) |
| New | 05.11 · Memory proposal — submitted and pending | 1440 × 1040 | [3019:28977](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-28977) |
| New | 05.12 · Memory proposal — rejected | 1440 × 1040 | [3019:29174](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-29174) |
| New | 05.13 · Memory proposal — changes requested | 1440 × 1040 | [3019:29371](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-29371) |
| New | 05.14 · Memory proposal — revised draft | 1440 × 1040 | [3019:29568](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-29568) |
| New | 05.15 · Memory proposals — loading | 1440 × 1040 | [3019:29765](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-29765) |
| New | 05.16 · Memory proposals — load error | 1440 × 1040 | [3019:29962](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-29962) |
| New | 05.17 · Memory proposal — submission error | 1440 × 1040 | [3019:30159](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-30159) |
| New | 05.18 · Memory review — decision status uncertain | 1440 × 1040 | [3019:30356](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-30356) |
| New | 05.19 · Memory review — access restricted | 1440 × 1040 | [3019:30553](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-30553) |
| New | 05.20 · Memory proposal — changed while open | 1440 × 1040 | [3019:30750](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3019-30750) |
| New | Design review · Memory proposal state catalog | 960 × 162 | [3020:29569](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3020-29569) |
| New | 09.01 · Personal preferences | 1440 × 1040 | [3022:29587](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-29587) |
| New | 09.02 · Connector accounts and permissions | 1440 × 1040 | [3022:30009](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-30009) |
| New | 09.03 · Usage and workspace limits | 1440 × 1040 | [3022:30398](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-30398) |
| New | 09.04 · Skills and artifact templates | 1440 × 1040 | [3022:30883](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-30883) |
| New | 09.05 · Notifications and account menu | 1440 × 1040 | [3022:31261](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-31261) |
| New | 09.06 · Privacy and deletion | 1440 × 1040 | [3022:31622](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-31622) |
| New | 09.07 · Help, shortcuts and feedback | 1440 × 1040 | [3022:31991](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-31991) |
| New | Overlay · Preferences saved | 420 × 116 | [3022:32395](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-32395) |
| New | Overlay · Connection disconnected | 420 × 134 | [3022:32411](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-32411) |
| New | Overlay · Problem report sent | 420 × 134 | [3022:32427](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-32427) |
| New | Overlay · Export ready | 420 × 134 | [3022:32443](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-32443) |
| New | Overlay · Deletion requested | 420 × 134 | [3022:32459](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-32459) |
| New | Overlay · Signed out | 420 × 116 | [3022:32475](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-32475) |
| New | Overlay · Clear personal defaults? | 500 × 227 | [3022:32491](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-32491) |
| New | Overlay · Disconnect the research portal? | 500 × 246 | [3022:32509](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-32509) |
| New | Overlay · Delete this conversation? | 500 × 246 | [3022:32527](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-32527) |
| New | Overlay · Account menu | 440 × 251 | [3022:32545](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-32545) |
| New | Overlay · Updates panel | 440 × 417 | [3022:32579](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3022-32579) |
| New | 04.08A · Source access review requested | 1440 × 1040 | [3024:26544](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3024-26544) |
| New | 06.08 · Source access approval review | 1440 × 1040 | [3024:26758](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3024-26758) |
| New | 08.02A · Edit routine | 1440 × 1040 | [3024:31132](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3024-31132) |
| New | 08.04A · Routine paused | 1440 × 1040 | [3024:31351](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3024-31351) |
| New | 08.04B · Routine automatically disabled | 1440 × 1040 | [3024:31580](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3024-31580) |
| New | 08.04C · Routine cancelled | 1440 × 1040 | [3024:31809](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3024-31809) |
| New | 07.03A · Public browser download receipt | 1440 × 1040 | [3024:32057](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3024-32057) |
| New | 07.02A · Research account connected | 1440 × 1040 | [3024:32269](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3024-32269) |
| New | 05.21 · Sources loading | 1440 × 1040 | [3026:27513](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3026-27513) |
| New | 05.22 · Sources unavailable | 1440 × 1040 | [3026:27760](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3026-27760) |
| New | 03.04A · Spreadsheet source data | 1440 × 1040 | [3026:32155](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3026-32155) |
| New | 03.04B · Spreadsheet references | 1440 × 1040 | [3026:32465](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3026-32465) |
| New | 03.07A · Generated web verification activity | 1440 × 1040 | [3026:32814](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3026-32814) |
| New | 06.02A · Authorized memory reviewer perspective | 1440 × 1040 | [3027:28352](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3027-28352) |
| New | 02.07A · Expanded tool activity | 1440 × 1040 | [3027:28579](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3027-28579) |
| New | 03.02A · DOCX brief page 2 | 1440 × 1040 | [3031:28357](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3031-28357) |
| New | 03.02B · DOCX brief page 3 | 1440 × 1040 | [3031:28703](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3031-28703) |
| New | 03.02C · DOCX brief page 4 | 1440 × 1040 | [3031:29048](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3031-29048) |
| New | 03.03A · PDF brief page 2 | 1440 × 1040 | [3031:33544](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3031-33544) |
| New | 03.03B · PDF brief page 3 | 1440 × 1040 | [3031:33809](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3031-33809) |
| New | 03.03C · PDF brief page 4 | 1440 × 1040 | [3031:34074](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3031-34074) |
| New | 03.05A · Presentation slide 2 | 1440 × 1040 | [3031:34357](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3031-34357) |
| New | 03.05B · Presentation slide 3 | 1440 × 1040 | [3031:34599](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3031-34599) |
| New | 03.05C · Presentation slide 4 | 1440 × 1040 | [3031:34846](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3031-34846) |
| New | 03.05D · Presentation slide 5 | 1440 × 1040 | [3031:35087](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3031-35087) |
| New | 03.05E · Presentation slide 6 | 1440 × 1040 | [3031:35328](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3031-35328) |
| New | 10.19 · Phone routines | 390 × 844 | [3032:30166](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3032-30166) |
| New | 10.20 · Phone approval center | 390 × 844 | [3032:30415](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3032-30415) |
| New | 10.21 · Phone memory recall | 390 × 844 | [3032:30630](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3032-30630) |
| New | 10.22 · Phone run detail | 390 × 844 | [3032:30828](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3032-30828) |
| New | 10.23 · Phone conversation history | 390 × 844 | [3032:31071](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3032-31071) |
| New | 10.24 · Phone browser activity | 390 × 844 | [3032:31325](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3032-31325) |
| New | 10.25 · Tablet approval center | 1024 × 1100 | [3032:31529](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3032-31529) |
| New | 10.26 · Tablet routines | 1024 × 1100 | [3032:31859](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3032-31859) |
| New | 10.27 · Tablet workspace files | 1024 × 1100 | [3032:32204](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3032-32204) |
| New | 10.28 · Dark run detail | 1440 × 1040 | [3032:32570](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3032-32570) |
| New | 10.29 · Dark approval center | 1440 × 1040 | [3032:33006](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3032-33006) |
| New | 10.30 · Dark workspace files | 1440 × 1040 | [3032:33402](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3032-33402) |
| New | 10.31 · Dark memory recall | 1440 × 1040 | [3033:31453](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3033-31453) |
| New | 10.32 · Dark routines | 1440 × 1040 | [3033:31843](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3033-31843) |
| New | 10.33 · Phone personal preferences | 390 × 844 | [3033:32256](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3033-32256) |
| New | 10.34 · Tablet personal preferences | 1024 × 1100 | [3033:32515](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3033-32515) |
| New | 10.35 · Phone artifact sharing | 390 × 844 | [3033:32900](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3033-32900) |
| New | 10.36 · Tablet artifact sharing | 1024 × 1100 | [3033:33089](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3033-33089) |
| New | 01.04A · Empty conversation history | 1440 × 1040 | [3034:32186](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3034-32186) |
| New | 01.04B · No matching conversations | 1440 × 1040 | [3034:32443](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3034-32443) |
| New | 01.04C · Completed conversation filter | 1440 × 1040 | [3034:36844](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3034-36844) |
| New | 01.04D · Anduril conversation filter | 1440 × 1040 | [3034:37090](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3034-37090) |
| New | 01.04E · General conversation filter | 1440 × 1040 | [3034:37336](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3034-37336) |
| New | 13.21 · Conversation client filter menu | 480 × 292 | [3034:37582](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3034-37582) |
| New | 13.22 · Conversation status filter menu | 480 × 340 | [3034:37596](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3034-37596) |
| New | 01.03A · Scope picker no matches | 1440 × 1040 | [3034:37692](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3034-37692) |
| New | 01.05A · Command palette no matches | 1440 × 1040 | [3034:37943](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3034-37943) |
| New | 13.23 · Copy unavailable | 440 × 134 | [3034:38179](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3034-38179) |
| New | Overlay · Delete conversation from history? | 500 × 246 | [3035:33134](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3035-33134) |
| New | 06.01A · Approvals after task decision | 1440 × 1040 | [3036:33107](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3036-33107) |
| New | 06.07C · Task proposal rejected | 1440 × 1040 | [3036:33325](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3036-33325) |
| New | 06.07D · Task changes requested | 1440 × 1040 | [3036:33519](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3036-33519) |
| New | 06.04A · Executed task proposal | 1440 × 1040 | [3036:33726](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3036-33726) |
| New | 06.01B · Approvals after filing decision | 1440 × 1040 | [3036:38096](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3036-38096) |
| New | 06.07B · Artifact filing changes requested | 1440 × 1040 | [3036:38314](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3036-38314) |
| New | 06.07A · Request artifact filing changes | 1440 × 1040 | [3036:38540](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3036-38540) |
| New | 06.05A · Artifact filing rejected | 1440 × 1040 | [3036:38733](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3036-38733) |
| New | 06.02B · Request memory proposal changes | 1440 × 1040 | [3036:38962](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3036-38962) |
| New | Design note · Meri 3.4 handoff decisions · 15 October 2026 | 1440 × 860 | [3043:34159](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3043-34159) |
| New | 01.04H · History after selected conversation deletion | 1440 × 1040 | [3043:38316](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3043-38316) |
| New | 13.24 · Reply to document comment | 360 × 401 | [3045:34297](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3045-34297) |
| New | 13.25 · Document comment reply added | 360 × 512 | [3045:34315](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3045-34315) |
| New | 13.26 · Document comment resolved | 360 × 301 | [3045:34333](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3045-34333) |
| New | 01.04F · Running conversation filter | 1440 × 1040 | [3048:34348](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3048-34348) |
| New | 01.04G · Archived conversation filter | 1440 × 1040 | [3048:34602](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3048-34602) |
| New | 06.01C · Approvals after memory decision | 1440 × 1040 | [3048:39000](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3048-39000) |
| New | 05.08B · Superseded briefing preference | 1440 × 1040 | [3050:34741](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=3050-34741) |
| Renamed | 12.09 · Funding & federal market | 1440 × 1040 | [1064:151682](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=1064-151682) |
| Renamed | 12.12 · Budget lines & exact comparison | 1440 × 1040 | [1064:151762](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=1064-151762) |
| Renamed | 12.18 · Artifact verification | 1440 × 1040 | [1064:152575](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?node-id=1064-152575) |
