# Meri 3.4 — input safety and meeting context completion

Completed 16 October 2026. This resolves the four **design presentation** requests D01–D04 in [DESIGN-GAPS.md](DESIGN-GAPS.md) at source 3930e36593960966edaa39f8f7f25faa14f9654a. It does not qualify live services or close unrelated implementation/backend gaps.

[Open the linked review flow](https://www.figma.com/proto/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?page-id=1064%3A140864&node-id=3089-40132&starting-point-node-id=3089%3A40132) · [Design section](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3085-36751)

## D01: first message

14.01–14.07 cover ready, allocation, admission, submission, delivery uncertainty, same-request retry and confirmed Accepted/Queued. The immutable original is separate from an editable next draft. Unresolved delivery blocks Send. Retry same request preserves the retained exact input, workflow, target and identity; it must never submit the edited next draft.

14.22 is a separate **read-only** delivery check. Check status does not resend. Accepted/Queued requires positive trusted evidence; it is distinct from Running and Completed. Prototype timers do not manufacture acceptance.

## D02: refresh recovery

14.08–14.12 distinguish unavailable original input, recovery in progress, unavailable history, absent history/reserved turn unresolved, and positive stored-input recovery. Authorized history, read controls and reconnect remain available. History 404, 503 and RESERVED do not prove that nothing was sent. No Start clean/replacement-send path is offered for the unresolved target.

14.12 explicitly says the service confirmed both acceptance and queued status before Continue accepted request routes to 14.07. Finding stored input alone must not grant that transition. Recovery does not automatically send the separate draft.

## D03: partial history

14.13–14.16 cover Load more, loading, read failure/Retry and loaded earlier turns. The current admitted prompt remains distinct and visible while native history lineage is loading or unavailable. Failure is never displayed as an empty successful transcript.

The loaded fixture preserves the already-loaded funding question/answer and prepends an additional older turn with the same text as the current prompt. These have different canonical lineage; do not deduplicate by text.

## D04: meeting context and shell decision

14.17–14.21 show the selected meeting in the current Conversations/Files/Runs shell, including access-check/loading, available, no accessible meeting, access removed and read failure/Retry. Protected details are absent in unresolved/denied/removed states.

**The older Workspaces/Recent shell is superseded visually.** Existing reference1064:150614 is retained and renamed Superseded shell reference. Its meeting-entry behavior remains required in the current shell.

Open meeting navigates across files into the existing [Portfolio Meeting workspace · Prep](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=1064-177692). This is the same canonical meeting workspace used by Calendar and Engagement; no second meeting workspace was created. MTG-1042/OUT-0184 and the 12 October date are explicitly example records. Production routing must use a current authorized admitted record, never these fixture IDs.

## Native screen catalog

| Screen | Figma node |
| --- | --- |
| 14.00 · Review index · Delivery and meeting context | [3089:40132](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3089-40132) |
| 14.01 · First message · ready | [3086:36702](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-36702) |
| 14.02 · Allocation pending | [3086:36889](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-36889) |
| 14.03 · Admission pending | [3086:37078](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-37078) |
| 14.04 · Submission pending | [3086:37264](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-37264) |
| 14.05 · Delivery uncertain | [3086:37450](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-37450) |
| 14.06 · Same-request retry pending | [3086:37656](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-37656) |
| 14.07 · Accepted transcript · queued | [3086:37842](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-37842) |
| 14.08 · Refresh recovery · original unavailable | [3086:38035](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-38035) |
| 14.09 · Refresh recovery · checking | [3086:38250](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-38250) |
| 14.10 · Refresh recovery · history unavailable | [3086:38436](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-38436) |
| 14.11 · Refresh recovery · reserved turn unresolved | [3086:38647](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-38647) |
| 14.12 · Refresh recovery · stored input recovered | [3086:38858](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-38858) |
| 14.13 · Partial history · load more | [3086:39057](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-39057) |
| 14.14 · Partial history · loading | [3086:39258](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-39258) |
| 14.15 · Partial history · retry | [3086:39452](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-39452) |
| 14.16 · Partial history · loaded | [3086:39659](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-39659) |
| 14.17 · Meeting context · loading | [3086:39853](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-39853) |
| 14.18 · Meeting context · available | [3086:40039](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-40039) |
| 14.19 · Meeting context · no accessible meeting | [3086:40237](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-40237) |
| 14.20 · Meeting context · access removed | [3086:40436](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-40436) |
| 14.21 · Meeting context · read error | [3086:40635](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-40635) |
| 14.22 · Delivery status check · read only | [3089:39930](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3089-39930) |

## Validation and implementation boundaries

- 23 native desktop frames, 1440×1040: 22 product states plus review index. Native text and linked component instances remain editable.
- Three scoped component families reuse existing Geist styles, semantic variables, native buttons and AI Elements PromptInput anatomy: Message receipt, Status notice and Next draft. No complete-UI screenshot is embedded.
- All 23 frames pass text bounds, clipping and Geist-family checks. 584 observed prototype edges have no missing destinations; the new review starting point is registered.
- Representative composition screenshots reviewed, with focused post-fix validation of recovery and compact history. Independent read-only semantic review found two issues; both were corrected and re-reviewed successfully.
- Mobile remains deferred per the supplied audit scope. No live authentication, backend admission, durability, authorization or transport qualification is implied.
- No application code, shared contracts, backend, configuration or deployment changed. This handoff is documentation-only on an isolated branch based on the supplied source commit.
