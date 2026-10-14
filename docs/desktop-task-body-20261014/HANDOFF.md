# Desktop task editor body and project sections

Base: exact frozen PR46 `462e7b554200f9b4a96c1589d55b6df7ce4a7df5`. Qualified code/test/review source `8660283cb246774921823d5a96df7a37129fef58` (implementation a5baebff0fd8cc4eb638fe4d07fa061fdd7ea576). Dedicated branch repair/capiro-desktop-content-20261014. Evidence successor changes no production/test bytes.

New and Edit task desktop forms expose existing type and recurrence without opening advanced options, in Figma3.1 body order: name; assignee/status/priority/type; bordered Schedule dates/times/timezone/repeat; description; project memberships; extra options. Each control has one implementation. TaskEditor remains one mounted draft/versioned mutation controller; a cleaned, server-safe matchMedia subscription switches only presentation. Unsubmitted draft survives1023↔1024↔1440; no resize write.

Desktop project sections now bind canonical PlannerProject.sections to existing membership.sectionId. Existing section IDs/positions persist, including unavailable records and other project memberships. Explicit Unsectioned maps to null. Choices come only from that project. New section edits require its current admin/editor access and nonarchived state; backend remains authority. Legacy viewport assembly receives no new section/archived-row UI. Existing fieldset plus explicit Select pending disables, synchronous duplicate-submit guard, owner-token cleanup and dismissal fence remain, including resizing while a save is held.

## Source review and local qualification

Independent Codex outreach_review accepted corrected source after desktop-only and project-wall findings. Two required function reviews accepted with exact fingerprints; current explicit size records replace old function records, preserving prior proof. No Strategy, shared primitive, API, schema, package, lock or SDK delta.

Final87desktop/shared browser cases passed with0failures/skips/flaky. Eight new controls cover light/dark order and draft persistence, unavailable saved section preservation/explicit clear, viewer/archived walls, successful canonical update/readback, held update across breakpoints and native resubmission. Existing nested task/subtask/focus/contrast/axe, wrong-task/client/denial/stale-scope, Engagement and shared-home controls passed. Production build and standard36credential-free standalone observations/default-product root passed,0pageErrors. Standard script includes existing phone probes; these confer no mobile parity acceptance.

Repository npmcheck passed, recorded with the sealed check log. Required checks include public dependency boundaries, workspace types,113root/84transport/2367web/451Capiro/385newsletter+8declaration tests, lint/format and architecture. Historical lint warnings remain; no new task-field warning. Diagnostics retained: pre-review30passed browser log; pre-review architecture2blocking findings; first npmcheck duplicate review metadata rejection (same accepted records entered via both legacy and explicit mechanisms), corrected to one current explicit record per function without production changes. Final architecture has0errors/0blocking,19unchanged inherited unreviewed transfer findings.

Exact browser command:

`CAPIRO_QA_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:browser:modules --workspace @capiro/web -- desktop-task-body desktop-task-drawer desktop-engagement-coverage next-modules-task-links next-modules-scope planner-engagement meeting-detail-current settings-scenes shared-home-accessibility shared-home-accessibility-interaction modules-home-design --grep-invert '390|360|320|phone|Phone|mobile|Mobile' --workers=2`

## Design state and remaining owner gates

Reference fullpage819:146214 and exact drawer819:146478 are preserved in ../desktop-details-20261014/figma. Rendered1440light/dark screenshots are sealed here. Body field order/functional bindings are qualified; full pixel parity is not claimed. Canonical native date/time widgets, plain-string description and project-row geometry still differ. No fake rich-description toolbar, unverified timezone/DST policy or new Commitment UI added. Read-only full TaskDetail content remains open. Engagement overview411:93988 and selected meeting are separate intents from PR46; no admitted full Modules selected-meeting reference identified.

Active Objective fullpage411:61442 requires backend owner's approved operational legs/cycle/status/decision binding map. Requested through parent; still pending. Exact backendPR4 read-only source confirms existing draft/in_review/ready Objective contract; no absent-family claim. Current ready-record route remains Edit objective drawer. See BINDING-BLOCKERS.md for exact source links, completed reads and pending action.

All337native rows remain OPEN_FINAL_ACCEPTANCE; RECONCILED-337 unchanged, append-only local batch in POST-BATCH-DELTA. Mobile explicitly deferred; PR43 not integrated. SDK0.1.3/lock/pins remain unchanged,0.1.5 not automatically adopted. Parent graph audit retains7low/0critical-high-moderate findings; no clean-audit claim. No AWS/deployment/security/credential/database/data-changing live test. Preview/new-image identity is not verified.

## Review and later release sequence

This focused draft stacks on PR46, which stacks on PR45 and includes exact PR44 pending guard with both histories preserved. Keep shipping PR25 and later frozen PR42/PR45/PR46 sources and outputs unchanged. Parent release owner may choose this exact successor after evidence and native/release gates. Merge lower bases before descendants or preserve the equivalent tested combined tree; no merge/deployment is performed here. Separate Strategy response compatibility owner must integrate its focused changes with an independently qualified combined source; no shared files were edited in this task.
