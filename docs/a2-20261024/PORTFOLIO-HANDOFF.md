# Visible Portfolio checkpoint — 24 October 2026

Root owns integration, independent review, shared gate scheduling and release. This is source and local test evidence, not deployed acceptance. PF16 remains D's file batch owner. No deployment, AWS, schema change, migration application, database/browser acceptance, dependency install or additional chat was started by this lane.

## Source and provenance

Frontend worktree: `C:/dev/wave2-visible-portfolio-frontend`, branch `codex/wave2-visible-portfolio-20261024`, base `5744f912d6ef83b3eb23983f6558b90be342229f`.

- `f8bd3b1ae7336c98a6bdd68f62ab2e93f3852d53`: PF14 Directory note command, encrypted reload recovery, exact receipt and typed rollback refusal retirement.
- `bf5aaff62766c4839a220d00348ae647cc25c236`: PF18 reviewed new-client conversion and exact receipt recovery.
- `796e4e5a`: PF07 prerequisites imported from `8d83623a3c92854f67d5e8908b4f3b9cfe0a0e78` with `-x` provenance.
- `0405df42cb578a2b9ed4662391d338d939b1833b`: PF07 mounted link review/recovery imported from `47740e4c7ce24f63f8c49aac8e69dabfd3243497` with `-x` provenance. The only conflict was the deleted old whole-A2 prerequisites document; its deletion was preserved.
- The commit containing this handoff also covers the exact shared registry census addition, five new-client browser cases and linked-client focus return after acknowledgment.

Core worktree: `C:/dev/wave2-visible-portfolio-core`, branch `codex/wave2-visible-portfolio-core-20261024`, fresh remote `backend-import` base `2262b5c2282e04dfd1a9bb7f54675769f45af71c`.

- `00397da05b77bd0ee7bc8501bd58eeb334839303`: canonical member-only note command/receipt and helper tests.
- `4ff3955f7`: no-store headers for the new note endpoints.
- `ce33d36db803af5e6e2dd8fd599f442ae0f4cfb2`: additive reviewed new-client conversion through the existing conversion receipt and canonical capacity owners; helper and PostgreSQL case source.
- `144552370d683628d84fdf1196403e1d16c32114`: five Directory PostgreSQL cases registered in the existing guarded admissions fixture.
- `516633834ac7319a47653cb7bf0c5fa60ce42dd4`: preserve canonical admission lock ordering before new-client authorization; add different-prospect last-slot, queued billing and fresh capacity policy PostgreSQL regressions.

## Behavior and retained owners

PF14 deliberately remains **note-only**, as permitted by the brief. The old direct Portfolio member-note POST was replaced; the generic Directory endpoint remains for other consumers. Call, Meeting, Email, staff/event and client/Objective/follow-up logging are explicitly unavailable. Core checks canonical member ID/name and current active membership. The existing immutable note row ID is the command request ID; note and audit commit in one transaction under a request advisory lock. Receipt lookup binds tenant, actor and member. Command identity/body remain immutable; author display metadata is current. A future note edit/delete writer must first add retained historical receipts.

The frontend retains the original note in the existing encrypted journal and cross-tab execution lock. Reload never writes. Receipt recovery uses the original GET; acknowledgment rereads the receipt under current authority. Only the exact typed `DIRECTORY_NOTE_REFUSED` envelope emitted after rollback permits explicit review/retirement. Unknown errors, absent receipts, role loss and generic HTTP statuses remain held. No migration was needed; reserved `20281024010000_directory_note_receipts` was not created or applied.

PF18 extends the existing `ProspectConversionReceipt` owner. At the base, durable commands accepted only `existing_client` even though ordinary conversion supported new creation. The additive `new_client` mode binds reviewed prospect version/name, website and description. Canonical client capacity and client/prospect/receipt writes remain in the existing transaction. A matching canonical existing client refuses the new-client command instead of silently linking it. Enrichment is scheduled only for first creation; replay does not schedule it again. No transfer fields are accepted and no data is copied implicitly.

Root identified a capacity/authority lock-order concern. Source review confirmed that authorization could hold tenant SHARE before requesting capacity, while ordinary create takes capacity first. A queued billing UPDATE could complete a three-way wait cycle. The fix extracts the existing canonical capacity lock into one reusable helper and acquires it after the prospect row lock but before authorization for an unlinked new-client command. Slot policy still runs only in `requireClientCapacity`; replay and existing-client linking do not depend on available slots. A deferred-lock helper test proves authorization does not start while capacity is blocked. A real queued-member/billing/admission SQL regression is authored but has not run, so no observed PostgreSQL deadlock reproduction or repair acceptance is claimed.

The new-client dialog reviews possible matches and current capacity, then rechecks authority, prospect version, duplicates and capacity immediately before reservation/POST. It retains the original command, requires its exact digest/outcome receipt, and rereads before acknowledgment. **Known-refusal editing remains open**: a generic refused POST stays unresolved because there is no allocated exact conversion rollback-envelope/retirement helper. No unsafe fresh retry was added.

PF07 reuses existing association contracts and owners for Strategy, Planner project/task, Outreach session and meeting links. It adds no generic file, Directory or calendar-occurrence kind. Root explicitly allocated its exact shared gateway/error/registry/calendar-export/recovery prerequisites. The imported shared registry operation is now included in the complete allowlist census test.

PF09 retains the canonical client-ID implementation: name-only rows stay held, foreign IDs cannot match by name, renames/duplicates preserve exact association, and prospect rows are excluded. No redundant implementation was added.

## Current validation and limitations

- Eleven affected frontend suites: **111/111 pass**, using retained Vitest 4.1.11, Node 24.22.1, one worker, runner config loader and no cache.
- Shared registry complete-allowlist suite: **5/5 pass**. It first failed 590 actual operations versus 589 declared; the exact imported association inventory group was missing from the test census. Coverage was added without relaxing the uniqueness/completeness assertions.
- Full frontend TypeScript: passes after the new conversion browser cases and focus-return edit. Exact changed-file ESLint and Prettier pass.
- Core helper suites: Directory **17/17**, conversion receipts **15/15**, canonical capacity **4/4** pass (**36 total**). These mock/helper cases do not establish database atomicity.
- Expanded focused Core TypeScript includes Directory/prospect helpers, transitive imports and both owned admission/Directory PG test files: passes. Full Core typecheck previously exhausted the default 4 GB heap; it is not recorded as a pass. Root schedules the full native gate.
- Five new-client browser cases cover lost committed response/reload/read-only recovery, mismatch/refusal hold, and changed duplicate/capacity/authority before dispatch. Updated Directory browser cases cover exact recovery and refusal retirement. **These browser cases are authored and typechecked, not executed.** Original PF07 browser evidence is historical only.
- PostgreSQL case source covers new-client concurrency/capacity/receipt rollback and Directory request-lock concurrency, one note/audit, actual audit INSERT rollback, membership-lock revocation, receipt tenant/actor/target isolation, and current author metadata. Actual Prisma/owner helpers and real historical migration are used in the existing guarded disposable admissions fixture; only the canonical Directory snapshot callback is synthetic. **PostgreSQL has not run on these heads.**
- Architecture reports zero boundary/cycle errors but existing and new function-size review obligations; exit 1 is retained. No exemptions were invented. Root must independently review the coherent note session/action and conversion session/action responsibilities and complete the design-size gate.
- Root source review of the two Directory source commits found no blocking issue so far; this is not the full independent/native qualification.

## Remaining scope and coordination

PF13 remains an owner-by-owner protocol census/repair. Plain Quick Log can reuse Core's existing optional-follow-up ActivityCommand, but its frontend still requires a follow-up and uses ordinary POST for plain activity. A repair must preserve explicit Undo/lineage behavior and avoid treating a current timeline observation as a historical command receipt. Calendar mutation/artifact/share/sync, contact creation and non-PF16 file flows still need their exact domain owners. Existing durable activity, upload and Objective protocols are preserved.

PF18 carry-over is a separate open stage: category-specific contacts/files/research custody, revisions, merge conflicts, ACL and rollback semantics need owner allocation. No implicit copy-all behavior or D-owned file changes were introduced. PF09 saved Workspace revisions/writers and deployed revocation acceptance also remain open.

No packages, locks or production config were changed. Dependencies are reused through task worktree junctions. Automatic review blocked removal of one redundant task-created frontend dependency junction; it remains, and no alternate deletion was attempted. Scratch `work/` is uncommitted. Source/check logs and the current lane status are under `C:/dev/wave2-visible-lanes/portfolio`.
