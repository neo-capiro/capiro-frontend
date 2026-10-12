# Master calendar

Responsibilities: Calendar owns range/view/scope selection and source composition. Shared Schedule-X owns Month and Week rendering. Existing Engagement operations own caller-visible meetings; `shared/meetings` owns the reused meeting detail and creation workflows. Planner, public-hearing and Federal Register operations retain their original backend permissions and pagination.

Figma targets: Master Month `411:47345`, Week `411:63168`, Agenda `460:90798`. High-fidelity contexts and screenshots were captured before implementation. Exact Calendar control SVGs were exported read-only from the supplied Figma nodes; source IDs, geometry and hashes are recorded in `public/design/modules/calendar/manifest.json`. The shared header/navigation assets remain owned by ModuleShell.

The workbook Master Calendar addendum MCAL-001–015 governs integration. Master Month/Week and client Agenda show caller-accessible meetings only. Master Agenda composes meetings, paged public hearings, all relevant Planner task pages and Federal Register comment deadlines. Government effective dates and forecasts have no verified dated-item contract and stay visibly unavailable. Source counts are derived from loaded authorized rows, never Figma examples.

Meetings use end-exclusive timestamp ranges in America/New_York. Hearing feeds use inclusive official calendar days. Planner dates remain date-only with their source timezone/time metadata retained. Federal Register's existing endpoint covers the next 30 days and at most 50 records; its limitation is disclosed. A bounded pagination guard detects repeated cursors and reports incomplete sources rather than implying a complete calendar.

Verification covers civil dates and DST transitions, Monday-based Month/Week ranges, end exclusivity, source identity, deduplication and paged reads; interactive Month/Week/Agenda, scope changes, date navigation, filters and meeting dialogs belong in the explicit local browser harness. Live session/provider checks and browser visual acceptance remain separate gates.
