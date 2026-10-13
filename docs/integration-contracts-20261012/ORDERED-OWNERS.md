# Ordered owners implementation outline

Consume Core PR2399 `0783423aeaaa8b65f289d0927d605142816d8cfe` through the
existing Core client and profile authority/source guards. `ordered-owners.ts`
will own scoped read/replacement receipt validation and the versioned writer;
`useOrderedOwners` the editor lifetime, retained attempt and deliberate read-back;
`OrderedOwnerFields` the four ranked positions. The existing Account team dialog
will compose that editor and retain its independent roster controls.

Replace the scalar owner UI/writer and map its meaningful tests to complete-order
receipt, explicit Save and stale-version coverage. The index's Primary-only filter
and backend compatibility API are separate active contracts and remain. Ranked
team members cannot be removed through roster controls, including historical
unavailable owners. No automatic promotion, owner-to-wall grant, guessed version,
automatic retry or browser authorization is introduced.

The first edit captures the exact current owner version/source. A later read does
not silently rebase that draft. A pending/uncertain replacement is retained in the
existing actor/tenant/client-scoped query cache across dialog closure; identity or
client replacement clears that application cache. Read-back compares the entire
submitted order and observed version. Any further write requires a fresh deliberate
Save against a verified current source. Preserve existing roster roles and errors.

Verification: scoped receipt/order/version/membership/authority units, native-ID
browser fixtures, original team and lifetime cases, new four-rank, unavailable,
409, interrupted-write, no-autoresend and role-replacement cases, then the complete
exact-source qualification. Backend migrations, locking and RLS remain unrun.

## Implemented and checked

The scalar TeamOwnerField and owner branch of team-writer/profile-receipts were
replaced. The original nullable-person/owner identity and owner PUT assertions
map to ordered-owners.test.ts: empty replacement, exact member agreement, complete
order, exact expectedVersion and path, and wrong receipt/source refusal. Original
roster/delete/role assertions remain. The browser wrong-owner receipt case now
selects Primary and explicitly saves before checking the same uncertainty fence.
Synthetic profile IDs now use valid Core UUIDs; names and tested effects remain.

43 owner/profile unit tests passed, and the completed browser run passed 28/28.
Typecheck and focused lint passed. The three changed/new function size findings
have specific responsibility reviews in the existing registry, without changing
thresholds. Full architecture and combined qualification are still required on
the eventual final candidate, which also includes ongoing follow-up work.

Preserved browser history: discovery initially failed because the new test
imported a runtime module that pulled Next into Node; that import is now type-only,
with independent expected labels in the test. The next run passed the 22 original
cases and failed six new exact-label locators; accessible role/name selectors
corrected them. The subsequent run passed 27/28, including every new owner case,
but exposed the original facility test releasing its response after dispatching
unmount and before observing unmount. Trace events requested unmount/open about
9ms apart. The test now requires the visible closed view before releasing the
held response; the new owner interruption test uses the same observable boundary.
Original unknown-result, disabled-save and one-write assertions remain. No
facility implementation changed. Final 28/28 logs/JSON and all failed traces are
preserved under evidence/owners-*. The 390px screenshot was inspected: four ranks,
buttons, and keyboard focus fit the scrollable dialog without horizontal overflow.
This is synthetic visual/interaction evidence, not Figma/native acceptance.
