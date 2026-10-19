# Desktop task body

Base: exact PR46 462e7b554200f9b4a96c1589d55b6df7ce4a7df5. Ownership: Planner TaskEditor presentation and membership state only; Strategy response repair excluded. Figma 3.1 New task819:146214 and drawer819:146478, stored exact reference under desktop-details-20261014/figma.

Expose the existing Type and Repeat controls in desktop body order: Name; Assignee/Status/Priority/Type; Schedule; Description; Projects; extra options. Reuse one implementation of each field. TaskForm retains canonical draft, version, membership state and pending identity above the presentation breakpoint. MatchMedia subscription has a cleanup and server snapshot. Preserve the existing small-viewport field composition; no mobile parity claim.

Project sections use canonical PlannerProject.sections and task membership sectionId. Selected memberships including unavailable projects/sections retain IDs and positions; explicit Unsectioned maps to null. Existing permission gates and all Select pending disables remain. No new endpoint, shared primitive, DTO, dependency or SDK version. Plain-string description remains plain text; no nonfunctional rich toolbar.

Required verification: screenshot/order at1440 light/dark, create/update payload and readback, stale section retention, access walls,1023↔1024 draft persistence without writes, held save prevents duplicate submits/closing/editing, independent Codex review, relevant browser regression plus check/build/credential-free standalone. Native337 acceptance remains open. Active Objective full-page bindings await approved operational legs/cycle/decisions mapping from backend owner; exact backend PR4 Objective draft/review/ready contract read without live calls.
