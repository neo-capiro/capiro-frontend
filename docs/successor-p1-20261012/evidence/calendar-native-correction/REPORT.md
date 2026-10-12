# Calendar native lifecycle correction

This bounded correction repairs actual native compatibility errors in the earlier Calendar receipt repair. Previous tests that made debrief creation return `draft` were synthetic green controls and did **not** establish native compatibility. The pinned backend creates debriefs as `generated` and notes as `draft`.

## Source changes

- `artifacts/contracts.ts` accepts the correct creation status for each artifact kind, keeps `edited` for update, and requires notes create/update approval stamps to be explicitly cleared. Debrief metadata has no approval stamps. Share/unshare still requires a decorated meeting and the exact selected artifact, meeting, client, lifecycle, confidentiality and sharing state. Idempotent share now accepts native nullable original-sharer attribution after user deletion without weakening the shared timestamp or visibility requirements.
- `MeetingArtifacts.tsx` lets the existing generation owner display its role/runtime-denied buttons disabled. Active or uncertain artifact writes still suppress generation entry points to prevent replacement drafts.
- `MeetingForm.tsx` sends `clientId:null` when an existing meeting is explicitly changed to No client. New unscoped creates still omit the field for backend inference. The existing matching receipt validator already rejects a response retaining the old association.
- Manual, transcript/library, voice and saved-note generation fixtures now return native debrief metadata and `generated`, with current synthetic actor `user-test`, the actual fixture meeting/client, cleared sharing stamps and timestamps. Original assertions are retained.

## Native evidence

Read-only source review uses backend `243248e726243c44bd4b9d24fd1ed220da18c56a`; current `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace` was also checked for the debrief status. `backend-contract-review.json` records exact service, schema and controller references. No backend execution, provider action, live writes, paid model calls or infrastructure edits were performed.

## Before controls

- Native-generated manual/library/voice copies: 3 failed with the editor frozen on valid native creation metadata. Preserved original assertions and artifacts: `/tmp/capiro-debrief-fixture-review/actual-native-results.json`, `actual-native-output/`.
- Unchanged portal role generation assertion: 1 failed because the entry disappeared rather than remaining disabled. `/tmp/capiro-debrief-fixture-review/portal-results.json`, `portal-output/`.
- New owner lifecycle unit controls: 5 failed / 2 passed before the parser changes (`native-unit-before.log`). Independent reviewer also preserved separate native parser red controls.
- Explicit client clearing: 2 failed / 1 passed before the form fix (`clear-before-results.json`, `clear-before-output/`). The request omitted clientId for both clearing cases; the unscoped-new-create control passed. Earlier selector-harness failures are separately labeled and are not defect evidence.

## Validation boundaries

Focused local requests are synthetic intercepted requests, not native execution or authorization proof. The existing receipt browser lifecycle scenario uses a deliberately labeled synthetic presentation bridge for debrief shared-list state; it only qualifies mutation receipt handling. Native `listMeetingDebriefs` currently omits `sharedAt`/`sharedByUserId` (service6190–6236) even though mutation metadata includes them. Complete native shared/unshare list presentation remains a backend read-contract limitation; no field, capability, endpoint or provider effect is invented here.

Root owns the clean integrated full browser, build and production qualification. This focused repair does not retroactively accept the failed49f source or its draft-only compatibility evidence.

## After controls

- Owner focused native parser/receipt suite: **59/59 passed** (`unit-after.log`).
- Owner affected browser suite: **62/62 passed**, one Chromium worker, retries disabled, synthetic worktree-local port5205 (`browser-results.json`, `browser-after.log`). Includes explicit-null clear success, stale-association refusal, new-create omission, generated metadata in all four source/save workflows, visible-disabled portal role, and pending/uncertain generation fences.
- TypeScript no-emit, changed-file ESLint, Prettier and git diff whitespace checks passed.
- Architecture boundary scan has **zero dependency errors**; exit1 reflects **three changed size-review fingerprints** in the existing ArtifactEditor/renderer and MeetingForm owners. Root owns registry updates after independent review. Raw `architecture.log` retained.

## Caption truth follow-up and final commit chain

The native debrief GET limitation initially still produced a false `Private` caption. That was a further concrete UI defect, corrected within the existing presentation owner: confidential content remains `Confidential`; omitted sharing metadata shows `Sharing status unavailable`; explicit null shows `Private`; a timestamp shows `Shared with client team`. Missing metadata never creates an Unshare affordance.

Independent native-shape caption controls failed 2/2 on the first correction commit; the owner four-state caption control failed 1/1 (`caption-before-results.json`, screenshot and trace in `caption-before-output/`). After the caption correction, all **17/17 artifact browser controls** passed (`caption-after-results.json`, `caption-after.log`), including the added four-state caption test. Final typecheck, changed-file ESLint, formatting and whitespace checks passed. These 17 include 16 previously passed controls plus one new control; the earlier **62/62** affected suite belongs to the first correction commit. This is exact evidence accounting, not a claim that all63 unique controls ran again after the presentation-only follow-up. Root will perform integrated qualification.

Cherry-pick in order from base `c305af13dd93cad2af18352b8a8b449e133a0fc2`:

1. `01cba25e85f1e82c731e65191c98b1de4e9d48de` — native lifecycle, portal role affordance and explicit client clearing.
2. `dee19b106d87859b812bfccc10ef9387f90ad4be` — truthful unknown sharing caption and regression.

`candidate-binding.json` binds final production hashes, final tree and evidence paths. Final architecture scan `caption-architecture.log` has zero dependency errors and three pending registry fingerprints; independent acceptance owns review, root owns registry integration. Source edits remain exactly three Calendar files. The final caption does not resolve the backend list omission or qualify full native debrief Unshare presentation; it accurately communicates the information that is available.

## Focused replay commands

From `/workspace/capiro-calendar-native-status/apps/web`:

```
node ../../node_modules/vitest/vitest.mjs run tests/calendar-native-lifecycle.test.ts tests/calendar-artifact-receipts.test.ts
```

With the saved synthetic wrapper `server.mjs` serving worktree port5205, from the worktree root:

```
node node_modules/@playwright/test/cli.js test --config=/tmp/capiro-calendar-native-status-evidence/browser.config.ts
node node_modules/@playwright/test/cli.js test --config=/tmp/capiro-calendar-native-status-evidence/caption-after.config.ts calendar-artifact-receipts.spec.ts
```

Both external configs use no webServer, one worker, zero retries, unique evidence output, installed Chromium. They never start or stop the root fixture server. Native contract evidence is read-only; intercepted browser requests are synthetic.

## Independent acceptance and cleanup

`/root/objectives_work_intel_review` accepted final `dee19b1`: **39/39 native-derived parser controls** and **8/8 native-shape browser controls** passed. Their caption baseline failed2/2 on `01cba25` and passed after the follow-up. Exact final source fingerprints, three architecture responsibilities and the cohesive407-line fixture/scenario test module were accepted. Independent evidence: `/tmp/capiro-calendar-correction-independent/`, including `architecture-review.json` and `test-structure-review.json`. Root remains responsible for registry updates and full integrated qualification.

Owned synthetic port5205 was terminated after reviewer release. Borrowed node_modules symlink removed. Owner browser screenshots preserved in `owner-browser-screenshots/`; frozen worktrees and root-owned5191 were not changed.
