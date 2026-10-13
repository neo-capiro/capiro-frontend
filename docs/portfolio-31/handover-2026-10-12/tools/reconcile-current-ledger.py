import copy
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import subprocess
import sys

root = Path.cwd()
ledger_path = Path('docs/portfolio-31/handover-2026-10-11/Portfolio-345-Row-Reconciliation-2026-10-11.json')
base_sha = '02c02d95bdf3949662b9123f425271c6491ffdab'
baseline_bytes = subprocess.check_output(['git', 'show', f'{base_sha}:{ledger_path.as_posix()}'])
baseline = json.loads(baseline_bytes)
ledger = json.loads(ledger_path.read_text())
session_id = 'portfolio-shared-application-20261011'
source_head = subprocess.check_output(['git', 'rev-parse', sys.argv[1] if len(sys.argv) > 1 else 'HEAD'], text=True).strip()
feature_root = 'apps/web/src/features/portfolio/'
reports = 'docs/portfolio-31/'

groups = [
    {
        'id': 'objective-readiness-and-intake',
        'audit_ids': ['OBJ-12', 'OBJ-13', 'OBJ-17', 'OBJ-19', 'OBJ-28', 'OBJ-30'],
        'source_commits': ['911cd7629cc342df986f443836ed2970298c4f5e', 'd3e90e4'],
        'paths': ['objectives/', 'objectives/NewObjectivePage.tsx', 'objectives/global-create/', 'index/PortfolioIndex.tsx'],
        'implementation': 'Four-field readiness uses outcome, government problem, ask type and minimum win. The native Objective mutation validates its association and captured actor/view. New objective now uses the full-page blank/filled Figma form and readiness rail; a visible global header action opens the existing authorized-client picker. Editing remains a separate existing drawer.',
        'remaining_gate': 'Signed-in read/write, native readiness and persistence, full Figma acceptance, outcome rewording, autosave and Request review remain subject to their exact native contracts and final row criteria. No Objective Strategy/Planner activation or cross-navigation contract is implied.',
        'evidence': ['OBJECTIVE-INTAKE-CONTINUATION-2026-10-11.md', 'OBJECTIVE-INTAKE-SIZE-REVIEW-2026-10-11.json'],
        'figma_nodes': ['411:60728', '411:64465', '411:62481', '973:186855', '973:186879'],
    },
    {
        'id': 'planner-calendar-occurrences',
        'audit_ids': ['MCAL-009', 'MCAL-013'],
        'source_commits': ['911cd7629cc342df986f443836ed2970298c4f5e'],
        'paths': ['calendar/planner-feed.ts', 'calendar/contracts.ts', 'calendar/feeds.ts'],
        'implementation': 'Master Agenda composes scheduled starts and due dates independently, keeps distinct occurrences when they differ, combines identical values without inventing times, validates civil dates/timezones and preserves source permissions and pagination.',
        'remaining_gate': 'Native Planner and mixed-feed signed-in acceptance, privacy and complete-source behavior remain open; client and Month/Week views retain their existing meeting-only composition.',
        'evidence': ['P3-CALENDAR-RELATIONSHIPS-CONTINUATION-20261011.md'],
        'figma_nodes': [],
    },
    {
        'id': 'calendar-current-reads',
        'audit_ids': ['MCAL-001', 'MCAL-002', 'MCAL-003', 'MCAL-007', 'MCAL-008', 'MCAL-009', 'MCAL-010', 'MCAL-013'],
        'source_commits': ['ac69724'],
        'paths': ['calendar/CalendarPage.tsx', 'calendar/MeetingForm.tsx'],
        'implementation': 'Each active feed displays only its successful current records. Failed reads hide retained rows and limitations while independent feeds remain available. A failed Master client read cannot be bypassed by a URL client scope; meeting Save disables while retaining the draft association and recovery uses a successful retry. Unavailable feeds do not produce a successful-empty claim.',
        'remaining_gate': 'Signed-in scopes, native authorization, source completeness, exact deadline/effective-date semantics and meeting persistence remain open. Local response guards do not widen source permissions.',
        'evidence': ['CALENDAR-CURRENT-READS-20261011.md'],
        'figma_nodes': [],
    },
    {
        'id': 'committee-selector',
        'audit_ids': ['ENG-target_committee_source', 'ENG-target_committee_staff'],
        'source_commits': ['911cd7629cc342df986f443836ed2970298c4f5e'],
        'paths': ['relationships/committee/', 'relationships/directory-contracts.ts'],
        'implementation': 'The Figma committee cascader uses existing Directory taxonomy and exact-committee staff reads. Branch expansion is separate from selection, parents are selectable, search shows ancestry, and staged Done/Clear/Cancel plus keyboard behavior preserve the exact selected committee.',
        'remaining_gate': 'Current/former staff and source permissions require signed-in acceptance. Source hierarchy completeness and native taxonomy remain authoritative.',
        'evidence': ['P3-CALENDAR-RELATIONSHIPS-CONTINUATION-20261011.md'],
        'figma_nodes': ['570:124980', '570:125014', '570:125218'],
    },
    {
        'id': 'portfolio-email-rewrite-context',
        'audit_ids': ['ENG-email_rewrite'],
        'source_commits': ['911cd7629cc342df986f443836ed2970298c4f5e'],
        'paths': ['relationships/email/'],
        'implementation': 'The existing Portfolio email rewrite operation validates its current writer and captured composer context; late output cannot replace a changed recipient/client/view. The native rewrite contract and existing composer remain the owners.',
        'remaining_gate': 'No paid generation or provider send was exercised. Native authorization, actual rewrite quality, sender selection, outbound policy and signed-in acceptance remain open. This is Portfolio composer work, not a Meri feature implementation.',
        'evidence': ['P3-CALENDAR-RELATIONSHIPS-CONTINUATION-20261011.md'],
        'figma_nodes': [],
    },
    {
        'id': 'prospect-overview-and-receipts',
        'audit_ids': ['PROS-004', 'PROS-005', 'PROS-010', 'PROS-011', 'PROS-012', 'PROS-013', 'PROS-014', 'PROS-015', 'PROS-037'],
        'source_commits': ['911cd7629cc342df986f443836ed2970298c4f5e'],
        'paths': ['prospects/'],
        'implementation': 'Prospect basic reads and edit/owner/stage/next-step/archive receipts require the requested prospect. The Figma overview, stage markers and responsive stage tracker are implemented without mapping legacy stages by guesswork. Notes and chronological activity use the shared native history; failed authorization refreshes hide retained history.',
        'remaining_gate': 'Notes remain firm-scoped; this does not implement private notes. Rich prospect fields, new-stage activation/mapping, arbitrary activity, Files/Workspace identity, proposals and paid conversion retain their exact native gates. Signed-in mutation and full Figma acceptance remain open.',
        'evidence': ['P4-PROSPECT-FILES-CONTINUATION.md'],
        'figma_nodes': [],
    },
    {
        'id': 'files-current-selection-and-receipts',
        'audit_ids': ['CORE-052', 'CORE-053', 'CORE-056', 'CORE-057', 'CORE-058', 'CORE-061', 'CORE-062', 'CORE-063', 'CORE-118'],
        'source_commits': ['911cd7629cc342df986f443836ed2970298c4f5e'],
        'paths': ['files/'],
        'implementation': 'Lists validate client parent and unique file IDs; access and move operations validate the selected attachment receipt. Failed member reads cannot enable access submission. Open previews and actions resolve the latest successful record, and removal/readiness/authorization changes discard stale extracted text and signed links, including EntityDocuments callers.',
        'remaining_gate': 'Native ACL, scanning, URL expiry/revocation, concurrency, persistence and signed-in acceptance remain open. Removing a browser reference does not revoke a previously issued URL.',
        'evidence': ['P4-PROSPECT-FILES-CONTINUATION.md'],
        'figma_nodes': [],
    },
    {
        'id': 'quick-log-calendar-handoff',
        'audit_ids': ['CORE-102'],
        'source_commits': ['6801fd4'],
        'paths': ['client-profile/QuickLog.tsx', 'client-profile/quick-log/'],
        'implementation': 'Record a meeting opens the existing current-client Calendar with new=meeting. The authored Figma desktop/phone action retains required start/end entry in Calendar and respects current writer, pending and uncertain-result state. Navigation performs no write and includes no meeting content or guessed duration.',
        'remaining_gate': 'Signed-in navigation and actual meeting persistence remain open. Quick log commitment/task atomicity and objective lineage remain separate native dependencies.',
        'evidence': ['QUICK-LOG-MEETING-HANDOFF-2026-10-11.md'],
        'figma_nodes': ['985:187911', '985:187921'],
    },
    {
        'id': 'tracker-current-reads-and-alert-preferences',
        'audit_ids': ['BILL-01', 'BILL-03', 'BILL-07', 'BILL-11', 'BILL-12'],
        'source_commits': ['f0fb28809a090d6f3f65090c689deaba522151b6', 'd4ca4fe'],
        'paths': ['bill-tracker/'],
        'implementation': 'Board and detail selection use successful current reads scoped to the validated identity. Intel personal alert preferences use the existing 11-field full PUT projection and exact client/actual Clerk-user association. Current read, actor and view lifetime guard writes and cache effects; failed/unknown results require explicit recovery. Desktop and phone forms were added to Figma before implementation.',
        'remaining_gate': 'Native GET defaults do not establish client existence, and the existing PUT has no version/CAS guarantee. Signed-in settings, backend authorization and provider delivery remain unverified. No phone verification or test-alert workflow is invented, and no Modules feature is implemented.',
        'evidence': ['P6-TRACKER-PREFERENCES-20261011.md'],
        'figma_nodes': ['971:187129', '975:187289'],
    },
    {
        'id': 'capability-registration-and-opportunity-current-reads',
        'audit_ids': ['CAP-01', 'CAP-02', 'CAP-03', 'CAP-04', 'CAP-08', 'CAP-09', 'CAP-10', 'CAP-11', 'OPP-01', 'OPP-02', 'OPP-03', 'OPP-06'],
        'source_commits': ['916b65b0fdd5a60163654e77e8b6024e104320af', '0beb51c3593ca801f88fdc4c8b972d209a929760'],
        'paths': ['capabilities/', 'opportunities/OpportunitiesPage.tsx'],
        'implementation': 'Capability/fit cards, counts, editors and links require successful current reads. Capability and registration writes use a captured current actor/client/view, one operation owner and exact native receipt identity. The five-field administrator registration PUT preserves legacy codes and omits profile/intake data. Failed/replaced/pending reads prevent obsolete effects. Independent opportunity/program feeds gate their own rows, page-scoped summaries, links and paging. Type/Sector fields use the existing two-column Figma geometry and stack on phone.',
        'remaining_gate': 'Full capability editor visual acceptance, CAP-05/06/07, signed-in authorization/revocation, native durability and final row acceptance remain open. Browser query revisions are not native CAS. No opportunity workflow metric or client/revision echo was invented.',
        'evidence': ['P6-CAPABILITY-OPPORTUNITY-CURRENT-READS.md', 'ARCHITECTURE-REVIEW-P6-CURRENT-READS.json'],
        'figma_nodes': ['411:55155', '411:55341', '411:55825'],
    },
    {'id': 'work-current-reads-and-exact-associations', 'audit_ids': ['WORK-01', 'WORK-02', 'WORK-03', 'WORK-04', 'WORK-08'], 'source_commits': ['7653b934bdb3d4cddd5ac149c6df0abca687b91c'], 'paths': ['work/WorkPage.tsx', 'work/WorkspaceDocuments.tsx', 'work/contracts.ts', 'work/queries.ts'], 'implementation': 'Strategy details validate their exact requested native IDs. Current successful client and Strategy/Workspace reads gate their own rows, links and page-scoped summaries. A failed feed hides retained data without hiding independently healthy sources. Legacy Workspace client names require a unique exact current-client match in a successful catalog; no client identity is invented.', 'remaining_gate': 'Native authorization/revocation, complete-source semantics, configured Workspace destinations, signed-in navigation and full Work acceptance remain open. This does not activate Strategy/Planner lifecycle or invent native workflow metrics.', 'evidence': ['P7-WORK-CURRENT-READS-20261011.md', 'P7-WORK-CURRENT-READS-20261011-SIZE-REVIEW.json'], 'figma_nodes': ['411:52106', '411:52437', '411:86349']},
    {'id': 'profile-current-reads-and-crud-lifetimes', 'audit_ids': ['CORE-028', 'CORE-029', 'CORE-030', 'CORE-031', 'CORE-032', 'CORE-033', 'CORE-034', 'CORE-035', 'CORE-036', 'CORE-045', 'CORE-046'], 'source_commits': ['5e8a338', '3fed90a'], 'paths': ['client-profile/FacilitiesCard.tsx', 'client-profile/FacilityDialog.tsx', 'client-profile/FacilityDetailDialog.tsx', 'client-profile/NotesDialog.tsx', 'client-profile/TeamDialog.tsx', 'client-profile/profile-read-queries.ts', 'client-profile/profile-receipts.ts', 'client-profile/profile-source.ts', 'client-profile/notes-writer.ts', 'client-profile/team-writer.ts', 'client-profile/facility-writer.ts', 'client-profile/facility-attempt.ts'], 'implementation': 'Profile notes, team/options and facilities expose only successful current actor/client reads. Focused form controllers capture their source and writer, preserve drafts through refusal or source changes, validate actual native response shapes and requested effects, and suppress obsolete local/cache effects. Facility CRUD uncertainty survives close/reopen within the session cache and requires explicit saved-state review. Existing roster schemas are re-exported from their canonical index contract owner.', 'remaining_gate': 'Native authorization, persistence/concurrency, provider effects and signed-in acceptance remain open. The owner remains the existing nullable single owner, not an invented ordered owner list. Local request abort and session-cache fences do not prove server cancellation, durable idempotency or cross-device recovery.', 'evidence': ['CORE-PROFILE-CURRENT-STATE-20261011.md', 'CORE-PROFILE-CURRENT-STATE-SIZE-REVIEWS-20261011.json'], 'figma_nodes': ['411:51801', '411:58269', '411:58764', '411:47010']},
    {'id': 'capability-editor-figma-presentation', 'audit_ids': ['CAP-02', 'CAP-03'], 'source_commits': ['1a9fa55', 'f96ca45'], 'paths': ['capabilities/CapabilityEditor.tsx', 'capabilities/CapabilityForm.tsx', 'capabilities/CapabilityFields.tsx', 'capabilities/capability-editor.module.css'], 'implementation': 'The capability editor now follows Figma create/saved geometry, Profile/Documents tabs, badges, readiness controls and inline token fields. Missing Details and explicit Save/Cancel footer variants were authored in Figma before coding. One form preserves all existing eleven native fields, drafts across tabs, connected-opener focus, and visible/focused required-field validation inside collapsed Details. The existing guarded operation owner remains unchanged; canonical TokenInput adds opt-in inline presentation while preserving its stacked callers.', 'remaining_gate': 'Signed-in native CRUD/Files behavior and full responsive/visual row acceptance remain open. Local presentation qualification does not establish document ACLs, file persistence or native operation durability.', 'evidence': ['CAPABILITY-PRESENTATION-CONTINUATION.md', 'ARCHITECTURE-REVIEW-CAPABILITY-PRESENTATION.json'], 'figma_nodes': ['411:55155', '411:55341', '411:55548', '999:51328', '999:51300', '999:51327']},
    {
        'id': 'work-figma-responsive-presentation',
        'audit_ids': ['WORK-01', 'WORK-02', 'WORK-03', 'WORK-04', 'WORK-08'],
        'source_commits': ['6ed283359f68fa131690518bbc9b8ae09ce75032'],
        'paths': ['work/WorkPage.tsx', 'work/WorkStrategyState.tsx', 'work/WorkspaceDocuments.tsx', 'work/WorkspaceDocumentTable.tsx', 'work/work-strategy-state.module.css', 'work/workspace-documents.module.css'],
        'implementation': 'Work uses the existing compact Strategy unavailable band and Retry card, preserving healthy independent sources and truthful current-query retry feedback. Workspace documents retain the desktop semantic table and exact existing icon and become stacked cards with visible canonical actions on phones. Invalid native updated dates are explicitly unavailable. The prior current-read, requested-ID and unique current client-name association checks remain unchanged.',
        'remaining_gate': 'Native owner display data and stable Workspace client-ID association remain absent. Signed-in navigation, service authorization and complete responsive/visual row acceptance remain open; no whole-page pixel match is claimed.',
        'evidence': ['P7-WORK-PRESENTATION-20261011.md', 'P7-WORK-PRESENTATION-20261011-SIZE-REVIEW.json'],
        'figma_nodes': ['411:52106', '411:52437', '411:86349'],
    },
    {
        'id': 'facility-address-action-lifetimes',
        'audit_ids': ['CORE-033', 'CORE-034', 'CORE-035', 'CORE-036', 'CORE-037', 'CORE-038', 'CORE-039'],
        'source_commits': ['3eeaeb785bf131d41f7bcdc28170d5bfa587cd0a'],
        'paths': ['client-profile/facility-action-writer.ts', 'client-profile/facility-action-attempt.ts', 'client-profile/facility-map-mutations.ts', 'client-profile/FacilityGeocoding.tsx', 'client-profile/FacilityActionStatus.tsx', 'client-profile/facility-map.module.css'],
        'implementation': 'Existing address-resolution operations require the current source, facility and actor, retain unknown dispatched outcomes in the session cache, reject mismatched native facility/client/optional-tenant receipts and suppress obsolete completion effects. Another deliberate action after uncertainty requires an explicit current GET review. Geocode success truthfully acknowledges a request instead of claiming provider completion. Phone metric cards stack without overflow; all original route/body/refusal assertions remain.',
        'remaining_gate': 'Published geocode/resolve routes retain their actual contracts. Reviewed candidate selection remains conditional on open draft capirov2 PR2373 at 6e5774a14c73ea04f0a77650a5bbd33173bcc9b3 and API/worker activation; missing returned revision disables selection and unsupported responses do not fall back. Browser abort and current GET review do not prove provider cancellation. Durable or cross-device recovery, provider outcomes and signed-in acceptance remain open.',
        'evidence': ['CORE-FACILITY-ACTIONS-20261011.md', 'CORE-FACILITY-ACTIONS-SIZE-REVIEWS-20261011.json'],
        'figma_nodes': ['411:58269', '411:58764'],
    },
    {
        'id': 'index-overview-and-activity-current-projections',
        'audit_ids': ['CORE-001', 'CORE-002', 'CORE-007', 'CORE-013', 'CORE-048', 'CORE-103'],
        'source_commits': ['666dd6db47fb9bc04f8a8aca3a1f07c9016b8751'],
        'paths': ['index/PortfolioIndex.tsx', 'index/IndexFilters.tsx', 'client-profile/ActivityTimeline.tsx', 'client-profile/ClientOverview.tsx', 'client-profile/ClientFrame.tsx'],
        'implementation': 'Current successful Client and catalog projections supply frame names, cards, title/pulse counts and status/sector choices. Failed current reads cannot expose retained records as current. Selected URL filter values persist with unavailable labels instead of a false absence claim. Activity rows, kinds, latest-500 caption and overview count use that feed\'s successful current result; failed activity does not hide healthy client/facility sections. Existing search, date, clear and Retry behavior is preserved without new state or API owners.',
        'remaining_gate': 'Signed-in native authorization, live history, complete-source semantics, service-defined metrics and final Figma/row acceptance remain open. This does not widen access, introduce pagination or change write contracts.',
        'evidence': ['CURRENT-PROJECTIONS-CONTINUATION-20261011.md', 'CURRENT-PROJECTIONS-SIZE-REVIEWS-20261011.json'],
        'figma_nodes': ['411:41421', '411:49451'],
    },
    {
        'id': 'capability-documents-and-current-file-operations',
        'audit_ids': ['CAP-05', 'CAP-06', 'CAP-07', 'CORE-052', 'CORE-061', 'CORE-062', 'CORE-118'],
        'source_commits': ['1c80792868b2348b1d4e0150553123d387b0d853'],
        'paths': ['files/EntityDocuments.tsx', 'files/DocumentState.tsx', 'files/entity-documents.module.css', 'files/UploadDialog.tsx', 'files/upload.ts', 'files/file-reader.ts', 'files/file-scope.ts', 'files/queries.ts', 'files/navigation.ts', 'files/extraction.ts', 'files/FilePreview.tsx', 'files/FilesPage.tsx', 'capabilities/CapabilityEditor.tsx'],
        'implementation': 'Capability documents use the exact source-filtered current authorized Files collection and authored Figma status variants. The canonical uploader binds one actor/client/source/view attempt to the native ticket key and exact confirmation receipt, preserving confirmation-only retry after uncertainty. Explicit preview/download navigation refreshes the authorized list and verifies selected identity/source/readiness without guessing URL expiry. Reader-specific query children and reader-scoped local selection prevent replacement identities from inheriting filenames, extracted text, open dialogs or checked IDs. Extraction verifies the actual attachment receipt and suppresses obsolete text/cache effects. Existing shared Files invalidation prefixes and upload callers remain compatible.',
        'remaining_gate': 'Signed-in native ACLs, stored bytes, scan/readiness, signed-URL behavior, extraction/provider effects, durability and final Figma/row acceptance remain open. Native attachment reads require standard_user; the synthetic client_portal_user case does not establish native access. The existing move/delete/access dispatch lifetimes and multi-file/empty-folder semantics are unchanged. Current browser source revisions and aborts do not establish native CAS, provider cancellation or cross-device idempotency.',
        'evidence': ['CAPABILITY-DOCUMENTS-CONTINUATION.md'],
        'figma_nodes': ['411:55548', '411:55667', '1011:51339', '1011:51353'],
    },
    {
        'id': 'advocacy-timeline-filters-and-outcome-review',
        'audit_ids': ['OBJ-02', 'OBJ-03', 'OBJ-06'],
        'source_commits': ['f4731d2ec613e6541379ec43e8942ab9be874c1b'],
        'paths': ['advocacy/AdvocacyHistory.tsx', 'advocacy/AdvocacyBrowser.tsx', 'advocacy/AdvocacyFilters.tsx', 'advocacy/AdvocacyTimeline.tsx', 'advocacy/AdvocacyReadState.tsx', 'advocacy/history-model.ts', 'advocacy/history.module.css', 'advocacy/read-state.ts', 'advocacy/queries.ts', 'advocacy/EditMatterDialog.tsx', 'advocacy/MatterEditFields.tsx', 'advocacy/matter-edit.ts', 'advocacy/matter-edit-scope.ts', 'advocacy/matter-edit-request.ts', 'advocacy/matter-edit-attempt.ts', 'advocacy/useMatterEdit.ts'],
        'implementation': 'The current native timeline supplies actual dated and undated events, associations and evidence without invented timestamps. Local search and exact status filters use only current loaded matter data while an independent healthy timeline remains available. A separate update-only editor supplies native lifecycle choices and explicit human confirmation for a new final outcome unless the actual outcome link is present. Captured actor/client/matter/view and current preflight guard dispatch, strict void acknowledgment and scoped GET comparison guard completion, and an interrupted authority lifetime cannot be revived by same-callback restoration. Drafts and uncertain attempts use explicit current-result review. Exact exported Figma icons, authored controls and local responsive/dark styling retain canonical presentation owners.',
        'remaining_gate': 'Native timeline remains capped at 500 combined entries with no total/cursor and omits undated links. The existing PATCH has no version/CAS or operation receipt; scoped readback cannot prove original-request causality or cross-device atomicity. Existing create/add-record writers remain unchanged. Final dark cases require the combined browser gate, and signed-in data/permissions/persistence and final Figma/row acceptance remain open.',
        'evidence': ['ADVOCACY-FILTERS-OUTCOMES-CONTINUATION.md'],
        'figma_nodes': ['411:60560', '415:80045', '411:59639', '411:59659', '1018:187915', '1019:187976', '1019:188028'],
    },
    {
        'id': 'saved-submissions-current-entry-and-removal',
        'audit_ids': ['CORE-128'],
        'source_commits': ['75409a96d6c58a53c7d44eb6053cc291995caf80'],
        'paths': ['capabilities/CapabilitiesPage.tsx', 'client-profile/past-performance/PastPerformance.tsx', 'client-profile/past-performance/RemoveSubmission.tsx', 'client-profile/past-performance/past-performance.module.css', 'client-profile/past-performance/queries.ts', 'client-profile/past-performance/submission-view.ts', 'client-profile/past-performance/useSubmissionRemoval.ts'],
        'implementation': 'Capabilities composes the existing PastPerformance public entry as the authored Saved submissions section, preserving the separate Advocacy history destination. Current successful client/history reads supply native fields, loaded count, outcome and notes without displaying raw capability UUIDs. The selected removal review captures actor/client/history and uses the unchanged native exact-row preflight, versionless DELETE and literal deleted acknowledgement. Synchronous source/authority interruption and mounted-lifetime checks suppress stale dispatch and cache effects; uncertain dispatched removal remains fenced across close/reopen and same-QueryClient remount. Canonical buttons and confirmation retain authored desktop/phone geometry and connected-opener focus.',
        'remaining_gate': 'Native history is capped at 200 records with native fiscal-year ordering. Versionless DELETE cannot eliminate concurrent change between fresh GET and DELETE; the uncertainty fence is local to one QueryClient rather than durable or cross-device. Native authorization, saved data, actual removal and final signed-in/Figma/row acceptance remain open.',
        'evidence': ['CORE-128-SAVED-SUBMISSIONS-CONTINUATION-20261011.md', 'CORE-128-SAVED-SUBMISSIONS-SIZE-REVIEWS-20261011.json'],
        'figma_nodes': ['411:54982', '411:58348', '411:58549', '1017:187915', '1019:187928', '1019:187952'],
    },
]

def canonical_path(value):
    if value.startswith('apps/portfolio-web/src/features/portfolio/'):
        return value.replace('apps/portfolio-web/src/features/portfolio/', feature_root + 'index/', 1)
    if value.startswith('apps/portfolio-web/src/features/'):
        return value.replace('apps/portfolio-web/src/features/', feature_root, 1)
    if value.startswith('apps/portfolio-web/src/shared/'):
        return value.replace('apps/portfolio-web/src/shared/', 'apps/web/src/shared/portfolio/', 1)
    raise AssertionError('Unmapped historical path: ' + value)

old_rows = {row['audit_id']: row for row in baseline['rows']}
current_rows = {row['audit_id']: row for row in ledger['rows']}
assert len(old_rows) == len(current_rows) == len(ledger['rows']) == 345
assert set(old_rows) == set(current_rows)
assert [row['audit_id'] for row in ledger['rows']] == [row['audit_id'] for row in baseline['rows']]
for audit_id, old in old_rows.items():
    for key, value in old.items():
        assert current_rows[audit_id][key] == value, (audit_id, 'historical field changed', key)
for group in groups:
    for commit in group['source_commits']:
        subprocess.run(['git', 'merge-base', '--is-ancestor', commit, source_head], check=True)
    for path in group['paths']:
        assert (root / (feature_root + path)).exists(), path
        subprocess.run(['git', 'cat-file', '-e', f'{source_head}:{feature_root + path.rstrip("/")}'], check=True)
    for report in group['evidence']:
        assert (root / (reports + report)).exists(), report
        subprocess.run(['git', 'cat-file', '-e', f'{source_head}:{reports + report}'], check=True)
    assert set(group['audit_ids']) <= set(current_rows)

for row in ledger['rows']:
    historical = json.loads(row['packet_implementation_row'].get('frontend_routes_files') or '[]')
    mapped = [canonical_path(path) for path in historical]
    assert all((root / path).exists() for path in mapped), row['audit_id']
    row['canonical_frontend_paths'] = mapped
    deltas = [delta for delta in row.get('continuation_deltas', []) if delta.get('session_id') != session_id]
    for group in groups:
        if row['audit_id'] not in group['audit_ids']:
            continue
        delta = {key: copy.deepcopy(value) for key, value in group.items() if key not in ('audit_ids', 'paths')}
        delta.update({'session_id': session_id, 'kind': 'local_frontend_implementation', 'source_checkpoint': source_head, 'acceptance': 'OPEN_FINAL_ACCEPTANCE', 'frontend_paths': [feature_root + path for path in group['paths']], 'evidence': [reports + report for report in group['evidence']], 'validation_scope': 'Source review and synthetic local qualification only; individual report cohorts overlap and are not additive. Integrated source verification is recorded separately from signed-in/live acceptance.'})
        deltas.append(delta)
    row['continuation_deltas'] = deltas
    row['current_validation_scope'] = ('See additive continuation_deltas for bounded implementation evidence. Original packet and earlier continuation fields are unchanged; final acceptance remains open.' if deltas else 'Canonical path mapping only in this continuation; historical packet and earlier delta remain the row evidence. No fresh row acceptance is claimed.')

assert ledger['authority'] == baseline['authority']
assert ledger['counts'] == baseline['counts']
assert sum(bool(row['continuation_delta']) for row in ledger['rows']) == 12
disposition = Counter(row['reconciliation_state'] for row in ledger['rows'])
assert dict(disposition) == baseline['counts']['reconciliation_state']
changed_rows = [row['audit_id'] for row in ledger['rows'] if any(delta.get('session_id') == session_id for delta in row['continuation_deltas'])]
timestamp = datetime.now(timezone.utc).isoformat()
ledger['current_continuation'] = {
    'session_id': session_id,
    'as_of_utc': timestamp,
    'frontend_repository': 'neo-capiro/capiro-frontend',
    'frontend_branch': 'codex/portfolio-continuation-20261011',
    'frontend_base': base_sha,
    'source_checkpoint': source_head,
    'native_reference': 'neo-capiro/capirov2@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace',
    'user_scope': 'Portfolio only; existing capirov2 services; capiro-agent-ops prerequisite waived by the owner; missing Portfolio Figma components may be authored before coding; organized feature ownership; no Modules/Meri feature work.',
    'historical_provenance': 'All original authority, counts, packet rows, continuation_delta and fresh_validation_scope fields are retained. Historical local paths/SHAs remain evidence provenance, not current restart instructions.',
    'baseline_ledger_sha256': hashlib.sha256(baseline_bytes).hexdigest(),
    'source_map': 'docs/portfolio-31/CONSOLIDATION-SOURCE-MAP-20261011.json',
    'continuation_report': 'docs/portfolio-31/CONTINUATION-2026-10-11.md',
    'rows_with_additive_implementation_evidence': len(changed_rows),
    'evidence_groups': len(groups),
    'evidence_groups_are_not_acceptance_counts': True,
    'accepted_complete': 0,
    'reconciliation_state': dict(disposition),
    'additional_frontend_work': 'Capability documents, Advocacy timeline/filter/outcome review, and Saved submissions are integrated at their named exact source commits. The final phase mapping identified supported Tracker shared-targeting current-state/lifetime work and published alert verification/test routes for a bounded frontend follow-on. These follow-ons are not yet included in this source checkpoint. Combined source qualification, native dependencies and final signed-in acceptance remain open.',
    'publication': 'Local branch only at this checkpoint; GitHub authentication is pending. No branch push, PR, AWS mutation, deployment or signed-in acceptance is claimed.',
}
ledger_path.write_text(json.dumps(ledger, indent=2, ensure_ascii=False) + '\n')
receipt = {'as_of_utc': timestamp, 'source_checkpoint': source_head, 'baseline_ledger_sha256': hashlib.sha256(baseline_bytes).hexdigest(), 'all_ids': 345, 'historical_fields_preserved': True, 'historical_deltas_preserved': 12, 'canonical_paths_exist': True, 'additive_rows': len(changed_rows), 'evidence_groups': len(groups), 'reconciliation_state': dict(disposition), 'accepted_complete': 0}
receipt.update({
    'canonical_ledger_path': ledger_path.as_posix(),
    'canonical_ledger_sha256': hashlib.sha256(ledger_path.read_bytes()).hexdigest(),
    'reconciler_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'artifact_selection_sha256': hashlib.sha256((root / 'outputs/evidence/portfolio-shared-integration-20261011/portable-evidence-selection.json').read_bytes()).hexdigest(),
    'canonical_id_order_preserved': True,
    'group_paths_present_in_source_commit': True,
})
output = root / 'outputs/evidence/portfolio-shared-integration-20261011/ledger-reconciliation.json'
output.write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt))
