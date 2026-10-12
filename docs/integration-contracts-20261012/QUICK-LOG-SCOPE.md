# Quick log scope and dead-code audit

Neo's 04:41–04:42 UTC instruction excludes the Commitment option, “We owe /
They owe”, counterparty and commitment-specific due-date UI. Ordinary note,
call, logged email, decision and request activity, meeting handoff, and generic
follow-up tasks remain in scope. No firm/client commitment meaning is inferred.

Reference inspection of QuickLog.tsx and every file in client-profile/quick-log
found no Commitment component, branch, enum value, import, route, adapter, fixture
or active test dedicated to the excluded feature. Its existing input schema and
form already expose exactly the five ordinary kinds. There is no hidden feature
implementation to retain or delete. The browser helper now asserts the exact
five option labels and absence of the excluded direction/counterparty fields.

Retained live/shared uses are deliberate:

- Existing activity receipt dueAt/settledAt/source fields let create/Undo reject
  changed or unrelated saved entries; these are active integrity checks, not an
  unreachable commitment form.
- Global Quick log also reaches the Directory member note form. Its abandoned
  disabled Commitment option is removed following independent review; there is
  no exception for disabled UI. Call, Meeting and Email remain existing disabled
  disclosures, and the supported Note save flow and integrity tests are retained.
- Meeting preparation's commitments section is existing meeting content, not a
  Quick log commitment writer or direction model.
- Historical handovers and Git evidence retain the earlier proposed scope. This
  current scope document and PLAN.md supersede their open semantics question.

No excluded runtime feature was added. Later generic follow-up implementation
must continue using the ordinary activity enum and its own explicit task schedule;
backend support for additional kinds is not a reason to expose them here.

## Existing Modules task management is retained

CommitmentView.tsx is an independently active Modules Engagement task-management
view, byte-identical (Git blob 35c008c086d461e8ccf8575e07037e0956c0dc3a) in
the supplied Modules head 50155cbb and this candidate. EngagementScreen renders
it from the Commitments tab/query view; EngagementOverview has a live navigation
action. The fixed gateway GET engagement.tasks also serves Overview and TeamView
workload. POST engagement.task.create and PATCH engagement.task.update are used
by its create/edit/complete/reopen controls. These are not Quick log direction
fields or abandoned code; deleting them would remove an independently used
feature. Preserve these routes/types/adapters/tests without claiming native
acceptance. No new commitment party semantics are added by this disposition.

## Review correction

The first audit was too narrowly limited to the client QuickLog form. The member
path exposed one excluded disabled Commitment button. The updated member save
browser test failed with expected zero / actual one before the source correction.
The corrected candidate removes only that option and updates the expectation to
zero, while preserving the complete note dispatch/receipt and lifecycle tests.

Correction validation: 25/25 member-note unit tests and 26/26 member-note plus
ordinary Quick log browser tests passed (desktop, mobile dark, save receipt,
uncertain completion, actor/role replacement, expiry and interrupted preflight).
The red baseline is preserved in evidence/member-scope-baseline; green logs and
browser JSON are in evidence/member-scope-green. These are focused correction
checks, not acceptance of the later owners/follow-up/prospect or final combined
candidate. The prospect worktree edits were not included in this correction.
