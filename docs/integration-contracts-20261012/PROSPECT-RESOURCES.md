# Prospect resource integration and qualification

Consume PR2400 head `6c26ac2dad3756a61b6733329dea7ce3c9138ece`, reviewed runtime
`9c2765224fc38d111df0fe184ca50229c6128373`, through the existing approved Core
and Workspace boundaries. CONTRACT/DEPENDENCIES/INTEGRATION/cleanup were read;
specific wire projections/controllers are inspected without copying backend code.

Portfolio Files remains the attachment UI owner. A prospect-specific adapter and
upload lifecycle extend that area through its public entry, reusing file type/size
checks, attachment projections and HTTPS capability validation. Stable request ID,
SHA-256 bytes and exact metadata bind the upload intent. Confirmation reuses the
original key and never substitutes a new intent after uncertainty. Current scoped
list reads own preview/download availability; backend membership, converted-client
wall and viewer checks remain authoritative. No legacy client/meeting/mail parents,
extraction, client KB import, sharing or outbound sends are enabled for these files.

Modules Workspace remains the manual document editor. Portfolio links by exact
prospect UUID to a prospect-filtered Workspace view; it does not embed a second
editor or infer an association from company name. Extend the fixed-operation
registry with reviewed prospect list/create shapes and immutable origin projection.
Creation retains its request UUID and exact seed for explicit recovery. Existing
manual editing, saved-version history and export are reused with exact draft/origin
checks; unsupported generation, invitations, shares and sends remain unavailable.
Prospect draft origins must also be excluded from legacy client-name matching.

Keep routes thin, new controllers feature-local and common transports/session
reset canonical. Test exact prospect/context/metadata receipts, stale/foreign
resources, checksum and retry behavior, current-view clearing, absence of excluded
requests, manual edits/history/export, mobile/keyboard and cross-mode links. Then
run the entire combined qualification on one frozen final source. Core/Workspace
migrations, RLS/concurrency, provider uploads and native acceptance remain unrun.


## Implemented source behavior

Prospect Files uses the same file validation and attachment projection as client
Files, with mandatory exact tenant/prospect lineage and null legacy parents. Byte
SHA-256 is computed before preparing the durable intent. Returned request ID,
storage key, content type and checksum fields are checked; signed form fields are
submitted unchanged. Once storage dispatch starts, recovery only confirms the
original key. No second byte upload or new key is automatic. Lost or mismatched
confirmation stays visible; list readiness owns Preview/Download. Delete requires
explicit confirmation and a fresh scoped list, and uncertainty requires refresh.

Prospect Workspace adds only two fixed operations (list and create). Existing
by-ID read/update/version/export operations remain canonical. Current tenant and
origin are checked before opening, saving or exporting; a prospect Newsletter
cannot enter the Newsletter sending workflow. Blank manual drafts get one Body
section using existing config.sections/sectionContent, without model generation
or rewriting document block metadata. Save reads current updatedAt, verifies the
edited receipt, then records a separate version. Unknown/changed writes retain
local input across view navigation and require current read-back plus a deliberate
save; the current saved content is shown beside retained edits. History checks
parent draft IDs and export reads current origin again. General Portfolio Work
never matches a prospect-origin draft by client display name.

## Focused evidence and limits

35 unit tests pass across prospect Files/Workspace and original Work contracts.
The first Workspace browser pass was 7/8: read-back state existed but its saved
content disclosure was missing from the rendered editor. That source defect was
fixed, with the failing trace/log retained. Final Workspace plus original Modules
route run: 18/18, including interrupted preflight, session expiry, original-key
creation recovery, origin mismatches, manual content/history/PDF and mobile focus.
Files' first run was 4/5: the new test incorrectly supplied prospect status
`archived`; Core prospect status is active/dismissed (archival belongs to the
converted client). The fixture was corrected to dismissed without broadening the
schema. Final Files plus existing prospect overview/brief/conversion: 24/24.
The 390px Workspace screenshot was inspected for field focus and overflow.

At the failed b5028cf candidate, retained upload File objects/create seeds/manual
save attempts were scoped in memory. View-close recovery passed, but browser restart
was not implemented. New failing reload baselines demonstrated all three missing
recovery paths; the restart repair below supersedes that source limitation. Interrupted/expired storage can remain unavailable:
there is no unsafe replacement key or speculative cleanup action. Existing signed
URLs are short-lived bearer capabilities, not immediately revocable browser grants.
The backend has no atomic PATCH-plus-version/CAS contract: current reads reduce
staleness but do not establish database concurrency safety. Native service release,
Core/Workspace migrations, RLS/conversion races, real storage and live Clerk remain
unrun. Source tests and manual mobile inspection do not accept any of the 337 rows.

Final focused typecheck, format and lint pass (0 lint errors; 76 existing warnings).
Architecture reports 400 visible size signals, 375 specifically reviewed and 25
inherited unreviewed, with zero boundary errors or blocking findings. Eight changed
or new functions have exact responsibility reviews; no guard rule was weakened.
Initial lint/format failures are retained beside corrected terminal logs.

## Restart repair design, 07:10 UTC

Extend the same original-intent storage primitive to the three newly added prospect
writers. Promote its ownership to shared session recovery now that both Portfolio
and Modules use it. Keep transport and schema ownership separate: Files uses Core
attachments; Workspace uses only registered fixed operations. Fresh Core actor,
tenant and prospect/document reads precede restoring retained input; lifecycle
cancellation remains in each existing boundary.

Draft creation retains its exact original seed/request ID before POST. Upload
retains metadata/digest, original ticket/key and whether bytes may have started;
never persist the File or signed URL/fields. Recovery after bytes-start dispatches
only original confirmation. Before bytes start, require reselecting identical
name/type/length/digest bytes and refresh only the original upload intent. The
browser cannot invent a replacement key after expiry or a nondisclosing response.

Manual save retains reviewed input and unknown state before PATCH; on restart it
must require fresh read-back again. PATCH and version remain separate backend
operations with no invented CAS/idempotency contract. Current content is shown
beside retained edits before any deliberate repeat. Journal acknowledgements follow
only validated final receipts. Storage refusal/corruption blocks new writes rather
than treating missing recovery as a new operation. Native/backend limits remain.


The restart repair now uses shared/session/recovery as its sole storage owner.
Encryption retains no upload File bytes or signed URL/fields. Current Core actor
and resource reads precede restored input; browser selection never authorizes a
write. A pending upload may claim bytes-started only once under the journal lock;
later transitions cannot reset it or replace its storage key. Known Quicklog IDs,
input and accepted version likewise cannot move backwards. An acknowledged request
ID cannot be reserved again by a stale tab.

The manual editor is mounted only after recovery checks complete. Its state key is
the retained save ID, so restored edits replace cached initial fields. Uncertain
edits are persisted before the interruptible preflight. Every restart requires a
new explicit read-back; the user sees saved content beside retained edits. Existing
backend PATCH/version separation, absent atomic CAS and native checks remain limits.

Discovery evidence preserves the failed three reload baselines, an initially fuzzy
Document title locator (also matched New prospect document title), a preflight
fixture that held hydration instead of the user save, and duplicate alerts for one
failed file-list read. Locator matching is now exact; the preflight fixture arms on
Save after initial hydration. Original write-count, original-body/key, interrupted
zero-write and retained-edit assertions remain. Duplicate source alert presentation
was corrected instead of loosening the existing single-alert test.

Focused restart repair terminal results:22 command/Files browser,16 prospect Workspace browser and61 command/journal/prospect units passed. Types and full format passed. Lint0errors/76retainedwarnings. Architecture405signals/380reviewed/25inheritedunreviewed/0blocking. No final combined or native acceptance is transferred from these focused results.
