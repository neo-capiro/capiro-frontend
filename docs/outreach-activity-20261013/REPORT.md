# CORE-109 bounded handoff

Activity overview and history now expose the existing Outreach destination using the supplied Classic OutreachRecord ID and client scope. The destination refuses a current response belonging to another, absent or null client before opening its editor. Meeting/file/mail source behavior and all original test files are preserved.

## Native lineage

Read-only inspection of mounted capirov2 `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace` confirms ClientActivityService derives `sourceType=outreach` and `sourceId=OutreachRecord.id`. Existing GET `/engagement/outreach/:id` enforces tenant/current author, excludes internal V3 records and deleted records, and supplies the client relation. The existing frontend operation/schema owns that read. No endpoint, DTO, client authority, create or send behavior was added.

The Activity contract supplies no immutable version identifier. This link opens the current Classic record; it does not reconstruct an OutreachDraftArtifact, historical OutreachDraftVersion or V3 session. A deleted/stale Activity entry remains subject to the current record read and its existing error/retry behavior.

## Evidence and pending checks

Raw packet: `/workspace/capiro-outreach-activity-evidence-20261013`.

- Unchanged production: 20 focused rendered controls, 15 passed / 5 failed. The failures reproduce missing links in overview/history and acceptance of another/null/absent client. No fixture-loading failure.
- Same exact 20 test bytes after the production change: 20 passed. Both receipts and raw JSON/logs are preserved.
- Final formatting and a test-only literal tuple typing annotation: 20 new plus 5 original Activity controls passed (25/25), with borrowed dependencies and Vitest cache disabled.
- Targeted formatting and ESLint passed; one inherited type-only import warning remains. `git diff --check` passed. No full typecheck, architecture gate, build or installation was run.
- Fourteen additive browser cases are **UNRUN**. Root owns the combined runtime: desktop/mobile keyboard source navigation and history; record/client/null/absent mismatch; 403/404/503 plus exact retry; held record/client replacement; held actor/org/session replacement. All require no automatic writes and preserve actual request completion/cancellation checks.

The pure rendered tests exercise actual ActivityFeed and OutreachView presentation/admission with bounded mocked read snapshots. They do not establish real provider lifetime or browser cancellation. Existing canonical ApplicationBoundary, useCapiroQuery and EngagementScreen replacement behavior remains unchanged and requires the pending browser checks.

Two changed function-size signals are proposed in `STRUCTURE-REVIEW-PROPOSAL.json`: ActivityRow 107 lines and OutreachView 130 lines. No changed module exceeds 400 nonblank lines. OutreachForm's 88-line signal is inherited and unchanged; shared review registries were not edited.

All 337 native acceptance rows remain open. This bounded repair does not qualify live native authorization/revocation, deployed interoperability, historical-version semantics, full selected-design comparison, assistive technology or production send/provider behavior. No browser/server, native/provider, deployment or database action occurred in this lane.
