# Independent Calendar native-contract correction review

Accepted for bounded frontend repair: final commit `dee19b106d87859b812bfccc10ef9387f90ad4be`, following `01cba25e85f1e82c731e65191c98b1de4e9d48de` from `c305af13dd93cad2af18352b8a8b449e133a0fc2`. The final source tree is `bc279628fc582a0b730a6375b5c31e607be4e729`.

47 independent controls pass: 39 native-derived parser cases and 8 browser cases on final source. Parser controls first reproduced six real failures (33/39): generated debrief rejection, impossible draft debrief acceptance, stale note creation/edit approval stamps, and rejected nullable original-share attribution for both kinds. The same native-compatible controls pass 39/39 after correction. Two further native debrief GET controls reproduced false “Private” captions on 01cba25; final browser replay passes 8/8 with no skips or flakes and verifies “Sharing status unavailable” instead.

Read-only pinned backend `243248e726243c44bd4b9d24fd1ed220da18c56a` establishes these distinctions:

| Operation | Notes | Debriefs |
| --- | --- | --- |
| Create | draft; current author; null approval/share stamps | generated; current author; null share stamps; no approval columns |
| Edit | edited; approval/share stamps cleared; author preserved | edited; share stamps cleared; author preserved |
| Approve | approved with current actor/time, including reapproval | approved status only |
| Share | Decorated meeting; approved selected artifact; original attribution preserved and nullable after user deletion | Same action-specific metadata semantics |
| Unshare | Selected share stamps null; meeting may stay shared for other artifacts | Same semantics |

The parser keeps exact meeting/client/artifact binding. It does not demand metadata fields the backend does not return, raw plaintext equality, or a current author on admin edits. The form now sends explicit `clientId:null` for an existing No client edit. Independent browser controls verify both successful clearing and refusal of an old-association receipt. New unscoped creation still omits clientId and accepts backend inference. Portal generation entries remain visible disabled without action dispatch.

Native GET /debriefs omits sharing stamps. That unfinished read contract remains explicit: missing metadata renders “Sharing status unavailable,” and no Unshare action is fabricated. The native share endpoint remains available as an explicit action. Earlier receipt scenario fixtures that bridge debrief shared-list state are labeled synthetic and do not qualify this native read gap.

`final-source-pin.json` and `reviewed-final.patch` bind all final changed files. `backend-contract-review.json` gives exact pinned source references; raw source is under `backend/`. `review-summary.json` maps every raw result and explains the preserved exploratory/parser and initial action-plumbing runs. Owner results are reported separately and are not added to the 47 independent count.

Exact size reviews are accepted in `architecture-review.json`: ArtifactEditor 248 lines, fingerprint `135be5833c25496b9f9202ff0d8743f7121644a1c559fbfa43f1b1a4ad8c99c8`; its saved-card renderer 85 lines, `484085a8fe816be1488594d9b8f225fe3eccb69ccc11867afda41001d28333b5`; MeetingForm 181 lines, `c15bf22c62730c9bfb3f3332b50b858f2d3b9a2b52c47c074f7153965a466543`. The 407-line cohesive artifact regression module is reviewed in `test-structure-review.json`. Independent architecture scan finds no boundary errors. Root owns registry recording and integrated qualification.

All browser requests are synthetic intercepted fixtures. No native/backend writes, provider calls, paid-model calls, AWS actions, deployment, application edits or shared registry edits were performed by this reviewer. These results do not establish live authority, durability or native execution, and do not retroactively accept the failed 49f source.
