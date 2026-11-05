# Meri 3.4 — Governance and legacy removal audit

This read-only local audit identifies **66 exact roots** supported for removal within this lane, including the 44 existing archive roots and three before-chat-first snapshots. Root owns the final deletion and incoming-link rewiring. The machine-readable list is `GOVERNANCE-REMOVAL-AUDIT.json`; every candidate includes its exact ID, reason and replacement URL where applicable.

| Candidate family | Count |
| --- | ---: |
| Already archived/superseded | 44 |
| Before-chat-first duplicate | 3 |
| Former global approval inbox | 4 |
| Unsupported personal-memory workflow | 5 |
| Redundant qualified lifecycle example | 1 |
| Exact responsive duplicate | 1 |
| Mapped old delivery/history duplicate | 8 |

The 44 already archived roots have **zero active-register intersection** and **zero target edges in the saved 318-wire Governance ledger**. The complete Figma graph is root-owned, so that local result does not replace the final incoming-edge inspection.

## High-priority semantic removals

| Remove | Keep / replacement | Reason |
| --- | --- | --- |
| [3019:29371](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3019-29371) · Memory proposal — changes requested | [3019:29174](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3019-29174), [1064:147204](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=1064-147204) | Personal owner-review UI offers approve/reject; it does not expose a request-changes decision. A later correction is a new owner draft. |
| [3019:29568](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3019-29568) · Memory proposal — revised draft | [1064:147204](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=1064-147204) | Duplicate correction composer reached through the unsupported changes-requested workflow. Keep the current owner correction draft. |
| [3036:38962](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3036-38962) · Request memory proposal changes | [3219:51433](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3219-51433), [1064:147483](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=1064-147483) | No request-changes branch in current MemoryOwnerInbox; correction rejection requires its existing reason flow. |
| [3027:28352](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3027-28352) · Authorized memory reviewer perspective | [1064:147483](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=1064-147483) | Current ordinary review is for the signed-in owner's own pending personal submissions, not reviewing other people's memory. |
| [3063:35688](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3063-35688) · Memory proposal approved by another reviewer | [3019:30750](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3019-30750), [3019:30356](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3019-30356) | Do not imply a second-reviewer operation in the owner-only route. Preserve current-version conflict and uncertain-decision recovery instead. |
| [3219:52951](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3219-52951) · 05.27 · No retained evidence / purge not asserted | [3219:52618](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3219-52618), [1064:147272](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=1064-147272) | The source cannot distinguish purge/expiry/restriction causes. This stand-alone frame duplicates the unavailable-evidence boundary. Preserve the no-proven-purge qualification in the handoff, rather than a separate product state. |
| [1064:149028](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=1064-149028) · 10.07 · Phone · Exact task review | [3032:30415](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3032-30415) | Normalized spec is identical to phone contextual action review after excluding id/key/name, and both received the same final spacing repair. Retain checked 3243:78175 and submitting 3246:78899. |
| [3086:36702](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-36702) · 14.01 · First message ready | [1064:144075](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=1064-144075) | Current chat-first home replaces the old ready shell. |
| [3086:37264](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-37264) · 14.04 · Submission pending | [3219:59173](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3219-59173) | Current Sending state keeps pending message separate from new draft. |
| [3086:37450](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-37450) · 14.05 · Delivery uncertain | [3219:59582](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3219-59582) | Current uncertain-send state retains the original message and checks it before another send. |
| [3086:37842](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-37842) · 14.07 · Accepted transcript queued | [3219:59380](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3219-59380) | Current accepted state expressly does not claim that an assistant response exists. |
| [3086:38250](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-38250) · 14.09 · Refresh recovery checking | [3219:59791](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3219-59791) | Current original-message lookup preserves draft and waits for the result. |
| [3089:39930](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3089-39930) · 14.22 · Read-only delivery status check | [3219:59791](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3219-59791) | Same read-only original-message lookup; not a same-request write retry. |
| [3086:39258](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-39258) · 14.14 · Partial history loading | [3219:60206](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3219-60206) | Current loading-earlier-messages state keeps current prompt/response visible. |
| [3086:39452](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3086-39452) · 14.15 · Partial history retry | [3219:60417](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3219-60417) | Current failed older-page state has Retry older messages and Load more. |

## States that must remain

Current personal-review submitting, inbox loading/error, submission failure and review denial are not replaced by current-memory list loading/error. Preserve `3019:28780`, `3019:29765`, `3019:29962`, `3019:30159` and `3019:30553`. Preserve actual Routine creation/editing and the source-backed TaskDraftPanel, even where the compact register omitted their roots.

For old delivery/history, preserve the distinctions at `3086:37656` (same-request write retry), `3086:38436` (history unavailable during refresh), `3086:38647` (unresolved reserved turn), `3086:38858` (stored input recovered), `3086:39057` (normal partial history / Load more), and `3086:39659` (older page loaded). The new lookup/loading/error pair does not cover these different outcomes. Allocation/admission/original-unavailable states also remain until an exact equivalent is established.

Keep all 32 newly added `24.xx` detail/continuation variants. The removed `1064:149028` is a proven duplicate of `3032:30415`; checked review `3243:78175` and submitting `3246:78899` remain distinct.

Root's broader source audit confirmed real contextual Pause/Steer/Resume/Fork and A2 browser takeover owners. Preserve those controls and label them contextually. A conditional label or absence from the compact frame register does not by itself prove a screen unused.

## Register cleanup

Prune removed nodes from active frame/group/matrix indexes and recompute counts after the Figma mutation. The two removals from my newly produced coverage are `3219:52951` and `1064:149028`. Keep historical mutation receipts as historical evidence, not active-screen launchers. Retain the no-proven-purge qualification as a source note. Replace the active archive launcher list with the deletion manifest once its nodes are gone.

The local audit performed no Figma/Git mutations and did not inspect incoming edges itself. Root's final graph audit controls the actual rewiring and deletion plan.


