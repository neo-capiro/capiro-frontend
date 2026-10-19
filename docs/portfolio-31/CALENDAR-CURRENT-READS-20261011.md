# Calendar current-read correction — 11 October 2026

During the continuation review, the coordinator found that CalendarPage used
query data even after a refresh had failed. TanStack Query retains earlier data
when a refetch is denied. That could keep a meeting, task, public-event link or
client scope option visible beside the new error.

## Bounded implementation outline

CalendarPage owns which successful feed snapshots contribute to its agenda or
grid and which current client options appear in its scope control. The existing
queries, service adapters, record-detail readers, schemas and native permission
checks retain their ownership. This correction selects data only from a
successful current query result, preserves independently successful feeds and
restores a failed feed after an explicit successful retry. It does not change
date semantics, range filtering, pagination, Calendar privacy or meeting writes.

MeetingForm owns its selected client as controlled draft state. A failed client
refresh must remove stale client names while retaining the selected ID as an
unavailable choice. Saving is disabled until that choice is current again;
retry restores the selection. This avoids silently falling back to an unbound
meeting when a selected option disappears. Explicit profile-scoped forms keep
their existing fixed client association. Native mutation ownership is unchanged.

Five isolated browser cases first exercise the unchanged source: each of the
four feeds fails after displaying a record, and the client list fails after
displaying an option. They verify that old data remains in the query cache, so
the checks cover rendering after failure rather than initial empty errors.
All five cases failed against the unchanged Calendar source at `0f73691`, confirming the retained-data rendering issue. The baseline log, screenshots and traces are preserved; no baseline JSON result is claimed.

The final expanded cohort passed **8/8** on 11 October 2026 at 21:02 UTC, with no skips, flakes or unexpected results (37.0 seconds). It also verifies selected-client draft retention, a master Calendar `?clientId=...&new=meeting` after that client read fails, and suppression of a successful empty-state claim when every active feed is unavailable. An intermediate six-case cohort passed before those final two assertions were added.

Evidence: `outputs/evidence/portfolio-shared-integration-20261011/calendar-boundary-baseline.log`, `calendar-boundary-final-eight.log` and `calendar-boundary-final-eight.json`. The component harness deliberately retains the failed query cache data; the UI must remove it from the current projection. The final integration manifest binds these changes to the complete source checkpoint.

The affected audit scope is MCAL-001, MCAL-002, MCAL-003, MCAL-007, MCAL-008, MCAL-009, MCAL-010 and MCAL-013. Regulatory source limits and all native acceptance requirements remain open.

## Responsibility review

The independent Calendar reviewer reread the final exact function bodies. CalendarPage (299 nonblank function lines) remains the Calendar view composer; existing query/adapters and delegated surfaces retain their separate owners. MeetingForm (168 lines) remains one input boundary, including controlled client draft state and its directly related validation. The two exact source fingerprints and substantive review decisions are recorded in `scripts/architecture/reviewed-size-findings.json`. The master URL scope is explicitly validated by the caller and passed into the form; a failed client read cannot take the fixed-client shortcut.

These are synthetic component checks. Native signed-in authorization, live
calendar/provider behavior and final audit acceptance remain separate gates.
