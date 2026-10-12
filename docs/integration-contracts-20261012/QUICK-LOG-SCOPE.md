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
- Directory member notes separately show disabled unsupported log-type controls,
  including Commitment. They remain reachable product gap disclosure in a
  different workflow, with independent browser tests.
- Meeting preparation's commitments section is existing meeting content, not a
  Quick log commitment writer or direction model.
- Historical handovers and Git evidence retain the earlier proposed scope. This
  current scope document and PLAN.md supersede their open semantics question.

No excluded runtime feature was added. Later generic follow-up implementation
must continue using the ordinary activity enum and its own explicit task schedule;
backend support for additional kinds is not a reason to expose them here.
