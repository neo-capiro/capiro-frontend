# Calendar P1 repair evidence

Final candidate: `d1f57b2cf9d05ce271ac8c73f280bbdd7746acab`. Cherry-pick chain: `42a7e0c0f7602a1fc01b23495178639a46360c13`, then `d1f57b2cf9d05ce271ac8c73f280bbdd7746acab`. Branch: `repair/capiro-p1-calendar-20261012`, based on `3562618f73d7a1f9d620d7b7b28c9e8c2c1ac83d`.

## Behavior repaired

- **CR-01:** Artifact create/edit/approve now validate the actual native metadata receipt. Receipt context binds meeting/client, selected artifact for existing records, author for newly created artifacts, confidentiality/save lifecycle, and note-only approval attribution. Debrief approval correctly requires no unsupported note approval stamps. Share/unshare validate the decorated meeting and the selected artifact's embedded metadata; idempotent sharing preserves the original sharer, and unsharing one artifact may leave the meeting shared.
- **CR-02:** A synchronous cache fence prevents multiple submit handlers dispatching a non-idempotent artifact creation. Current identity and parent meeting/client are checked before dispatch. Malformed 2xx, network loss, 5xx, and post-dispatch scope changes retain the submitted draft and uncertainty without a retry path. Explicit native refusals retain an editable draft and allow deliberate retry. Uncertainty survives tab/remount and client replacement within the app session, scoped by tenant/actor/meeting/client/kind. Read-only refresh inspects current records without clearing that fence. Late old-client receipts cannot close the new client's draft.
- **CR-04:** Meeting save receipts require the selected update ID, explicit client, and persisted submitted fields under native trimming/null/instant normalization. Unscoped creation still permits native automatic association. Foreign receipts retain the editor and mark unknown completion; synchronous repeat saves are fenced. Current actor/client/meeting lifetime is checked before dispatch and completion.
- **Adjacent in-flight draft loss:** Independent review reproduced an older valid meeting receipt discarding text typed after submission. Meeting fields now stay read-only (client selector disabled) while pending or uncertain. New browser controls attempt further typing in meeting, note and debrief editors before releasing a valid receipt, ensuring no accepted input is discarded. Baseline evidence: `/tmp/capiro-p1-calendar-files-review/independent-calendar-before.json` and `independent-calendar-before-output`.
- **CR-03 (same owner):** An emptied meeting location is explicitly submitted as the empty string, which the current backend normalizes to null instead of preserving the omitted old value.

These are presentation/receipt checks around native authorization. They do not establish server authority, add endpoints, send providers, or claim backend idempotency.

## Meaningful validation

- Original source: `failing-before.log/json` records all six artifact controls failing (notes/debriefs malformed-success draft loss, 503 repeat affordance, two synchronous POSTs).
- Original meeting owner: `meeting-failing-before.log/json` records three failures (foreign meeting ID, foreign explicit client, omitted empty location).
- Repaired behavior: final `final-browser-20.log` and `browser-results.json` record **20/20** passing using one Chromium worker and synthetic fixtures at port5193 (including the original17 controls).
- Subsequent bounded additions: `refresh-browser.log` **2/2** passing verifies saved-record refresh preserves the fence across remount; `operation-controls.log` **2/2** passing verifies native method/path/body semantics for edit/approve/share/unshare for both artifact types.
- `final-unit.log`: **52/52** native receipt/refusal/network/abort/normalization controls passed.
- `final-typecheck.log`, `final-lint.log`: focused worktree type/lint checks pass; `format.log`: Prettier pass; staged diff whitespace check passes.
- `final-architecture.json`: no dependency/boundary errors. Cohesive existing editor functions still require review: ArtifactEditor244 nonblank lines, its card map83, MeetingForm181. Native wire schemas/API and attempt state remain separate Calendar-owned modules. Root owns registry review/integration.

Focused replay: `node node_modules/@playwright/test/cli.js test --config /tmp/capiro-p1-calendar-evidence/review.playwright.ts`. This external config uses no managed webServer, one worker, `/usr/bin/chromium`, synthetic fixture server5193, and tmp output only. Unit: from `apps/web`, `node ../../node_modules/vitest/vitest.mjs run tests/calendar-artifact-receipts.test.ts`.

## Integration and remaining boundaries

- Root owns correction of the existing inaccurate native debrief receipt fixture at `apps/web/tests/browser/meeting-review.spec.ts:181` (id-only ack). This patch changes only Calendar source and newly named regression tests/harnesses.
- Artifact recovery is in-memory for the current DataProvider session, not durable hard-reload or cross-tab deduplication. The backend creates fresh records and supplies no creation idempotency contract. Unknown attempts are never programmatically replayed; read-only refresh does not claim to identify a lost creation conclusively. Meeting-save uncertainty is retained within its open review; durable meeting intent recovery is not added.
- No combined production build/full browser suite/live backend/provider qualification was run by this owner. Root owns clean integrated qualification. No live mutation, provider message, AWS action, or paid-model call occurred.
- Independent review completed under `/tmp/capiro-p1-calendar-files-review`: owner suite20/20, units52/52, independent contract probes10/10 (shared review includes Files), and the unchanged held-PUT red-before preservation control passed1/1 after repair. Reviewer reports no remaining source blocker in assigned Calendar scope and explicitly approved Calendar architecture fingerprints to root. Owned fixture server5193 was terminated after the review; the borrowed node_modules symlink was removed, leaving the repair worktree clean. Replaying this worktree requires restoring the authorized dependency symlink and starting the external fixture wrapper.
