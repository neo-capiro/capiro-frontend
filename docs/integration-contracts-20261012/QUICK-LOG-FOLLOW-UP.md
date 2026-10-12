# Generic durable Quick log follow-up outline

Consume the exact frontend handoff `797e3a59158cff56b017ab7d01ee445bf624fced`
for PR2396 head `e2c2c110edd986e799d47d43b0db50b24fab0201` (reviewed runtime
`961cbe0204d762ddfcb96ec054a907665720380e`). Both Core and Planner changes in
PR2396 are required; PR2395 alone is not sufficient. Backend migrations and native
checks are unrun and no bridge origin or service connection is being provisioned.

Keep the existing five ordinary activity kinds and legacy ordinary logging/Undo.
Add an optional generic follow-up to the existing Quick log form, reusing current
Core member options and the current client-writer guard. The follow-up path uses
only the durable Core activity-command owner; it never first writes legacy
activity or creates a task directly in Planner. No Commitment, direction,
counterparty, invented association or commitment-specific date field is added.

Feature-local modules will own command receipt/input validation, guarded Core
operations, scoped pending command lifetime, and follow-up fields/recovery status.
The original browser UUID and exact submitted body are retained in the current
tenant/Core-actor/client query cache before dispatch and across dialog closure.
Application identity/client replacement clears that cache. Pending commands fence
ordinary logging and replacement-key creation until resolved. GET uses the same
request ID; 404 is not absence. Resume is explicit, uses a freshly returned server
version and never guesses an increment. Uncertainty discards stale success/task
display, retains the command and does not automatically resend. A completed
receipt requires exact context, server-key lineage and actual task ID agreement.

Show activity saved and task pending as separate outcomes. The generic Planner
task has fixed name and no copied client/activity/person text. Optional scheduling
requires an explicit IANA zone with a date; no implicit date-only timezone or
midnight assumption. Source contract errors remain unavailable/recovery states,
never paid-plan prompts. Current authority is checked before and after operations.

Test exact-key/body retention, context/receipt/lineage validation, partial outcome,
explicit versioned recovery, nondisclosing misses, pending-dialog reopening,
replacement identities/clients, ordinary flow preservation and mobile/keyboard
behavior before the final complete candidate qualification.

## Implementation evidence

Implemented in the existing QuickLog form with command-contracts/actions,
useFollowUpCommand, FollowUpFields and FollowUpStatus as feature-local owners.
42 command and original ordinary-logging/Undo unit tests passed; 23 command,
ordinary-removal and meeting browser cases passed. Typecheck and focused lint
passed. Browser checks cover pending versus saved outcomes, fresh-version resume,
same-key exact-body recovery after 503 plus nondisclosing 404, interrupted create
across reopening, actor replacement during preflight, wrong-context success,
stale resume, hidden tasks and explicit-zone scheduling. The five original kinds
and absence of Commitment/direction/counterparty controls remain asserted.

The phone screenshot was inspected: fields, explicit zone, focus indicator and
recovery form fit the scrollable dialog without page overflow. No task deep link
is invented; only the current verified task ID is displayed. Ordinary logging
retains its existing Undo. The durable activity/task pair has no compensating
browser Undo, since deleting one side would not undo the other.

At the failed 6b7abd/eabc8bf/b5028cf milestones, pending input lived in the scoped in-memory application cache and
survives dialog closure. It is cleared on application identity/client replacement;
full document/browser restart persistence was not implemented or qualified. The independent reload control demonstrated a duplicate-write defect; this historical limitation is not an accepted substitute for repair. The
visible request ID and backend command remain durable, but this candidate must not
be described as browser-restart recovery. Native Core/Planner/RLS/migration,
real session recovery, exact final combined build/browser and Figma acceptance
remain unrun. All 337 Portfolio rows remain unaccepted.

The source repair is specified in [COMMAND-RESTART-RECOVERY.md](COMMAND-RESTART-RECOVERY.md). It adds a guarded durable original-intent journal before dispatch. Historical focused passes above do not qualify that new source or the final application.
