# Portfolio 3.4 polish — current source review

Reviewed 2026-10-31. Read-only source review; no application, Figma or deployment edits by this reviewer.

- Repository: [neo-capiro/capiro-frontend](https://github.com/neo-capiro/capiro-frontend).
- Pinned main: [87d0dc8589c80a00ae0c2b4c7532a8a2a89ada6c](https://github.com/neo-capiro/capiro-frontend/commit/87d0dc8589c80a00ae0c2b4c7532a8a2a89ada6c).
- User-designated live preview: https://app.capiro.ai.
- Live evidence limitation: the web tool could not access the URL. All behavior below is source evidence, not a rendered browser verification.
- Inventory: 16 Portfolio feature areas, 772 source files, 292 TSX files, and 18 Portfolio route/layout files. See SOURCE-INVENTORY.json. This is a source inventory, not a claim that every TSX file is an independent screen.
- Read instructions: root AGENTS.md, apps/web/AGENTS.md, docs/IMPLEMENTATION-STANDARDS.md, docs/ARCHITECTURE.md and the referenced Meri standing requirements/Wave 2 handover. Integration and deployment stay with the jump-server root; this review makes no changes there.

## Priorities for the design pass

1. Make the normal application viewport have one scrolling region: the main content between fixed shell boundaries. The source currently uses sticky nav plus normal document scrolling.
2. Keep an always-discoverable sidebar toggle. Desktop collapse currently removes the sidebar entirely, and tablet widths hide the toggle.
3. Establish a consistent hierarchy: page title and contextual identity; primary action; section title and supporting context; records; source/period and feedback.
4. Preserve product-approved semantics and every existing recovery state. A more attractive screen must not make unknown values look like zero, stale data look current, or uncertain writes look safe to repeat.
5. Consolidate repetitive explanatory paragraphs into short context text with progressive disclosure, while keeping critical status and next action directly visible.
6. Distinguish current sources from proposed product definitions. Some current source metrics are older than the user's approved Figma definitions.

## Current routes and surfaces to preserve

| Area | Route or entry | Source composition and required dialogs/states |
| --- | --- | --- |
| Portfolio landing | / and /portfolio | FY/week heading; Portfolio Pulse; All/Clients/Prospects; search; owner/status/sector filters; saved/recent/name sort; card/list views; saved layout customization; attention panel; global Quick log; profile creation; global Objective client picker. Separate loading, error, no records and no filtered matches. |
| Profile creation | Add profile | Manual client intake, Search LDA/import, Add prospect. Role and capacity availability; company/registration/sector steps; logo; validation; saved/uncertain/conflict outcomes. Preserve separate firm import review and confirmation. |
| Client shell | /portfolio/[clientId] | Breadcrumb/view switcher; Quick add (new Objective, new Meeting, Log activity, account Notes); Meri actions; More actions. Canonical tab registry has nine tabs below. |
| Overview | /portfolio/[clientId] | Identity/logo/status, sector/location/site, focus tags, owner/account team, engagement summary, Objective summary, Government & federal entry, District Nexus map/list with add location, activity timeline, Client details, calendar entry. |
| Overview dialogs | Overview entries | Edit client intake, archive, export, Profile notes, Account team and ranked owners, Add focus tag, Quick log with follow-up/undo/recovery, activity update/remove/recovery, Meri handoff/research. |
| Government & federal | Overview modal | Identity & registration and Federal activity. Program funding context separate from client-attributable awards. Missing, denied, partial/stale, unmatched and zero remain distinct. |
| District Nexus | Overview map/list | Map controls; add/edit/remove facility; geocoding/address verification; location detail with ten context categories; evidence changes, units/periods/review/source states; maps and data provenance. |
| Objectives | /portfolio/[clientId]/objectives | Advocacy history at left/current Objectives at right; New matter/records/correction/edit matter; new blank Objective; edit, delete, review/readiness; generation; operational detail. |
| Objective operations | ?operational=... | Success criteria/limits; Strategies across cycles; Planner projects; decisions waiting; linked engagements; open questions; association selection/removal and direct/inherited links; requested/applied distinctions and unknown-save recovery. |
| Calendar | /portfolio/[clientId]/calendar | Client-scoped meetings; month/week/day/agenda; date/timezone/lifecycle/search; New meeting; sync. Keep master/global calendar accessed through top nav separate. |
| Meeting workspace | Calendar meeting detail | Meeting identity, attendance/consent/Send Meri, preparation settings/editor/progress, artifact review, meeting notes, debrief (including manual/voice source), sharing, assignments, transcript upload/library, saved documents/downloads. Draw loaded/read/write/error/access and pending recovery states without pretending integrations are available. |
| Relationships | /portfolio/[clientId]/relationships | Organization and Government relationships. Organization React Flow chart, search/list, placement review, hierarchy editor, contact drawer, contact fields/notes, email history, rich compose/reply, attachments/mailbox/signature, send uncertainty, remove/discard dialogs. |
| Government relationships | ?kind=government | Priority targets plus grouped government targets, Add target and committee picker, target drawer, tier/office/directory emails, Directory note, related context/recommendations, remove target. Keep member/staff/committee types distinct. |
| Work | /portfolio/[clientId]/work | Strategy totals, source status, Open/New Strategy destinations; client Workspace drafts/completed work redirecting to Workspace; current Strategies with steps, owners/status/date; upcoming work; risks/blockers; complete/partial/unavailable distinctions. No new Strategy Kanban. |
| Capabilities | /portfolio/[clientId]/capabilities | Capability areas/editor/fields and fit; registrations and codes; saved submissions/past performance; remove submission. Retain this full tab; user's earlier replace-capabilities direction concerned a specific shell/summary surface, not deleting current functionality. |
| Bill Tracker | /portfolio/[clientId]/bills | Tracked bills/results/filter/paging, Track bill, watchlist topics/editor, Bill drawer/hearings; alert preferences, delivery criteria/channels, phone verification, test alerts. Other intelligence tabs stay absent from client profile. |
| Opportunities | /portfolio/[clientId]/opportunities | Matched opportunities search/results, source-aware summary, relevant budget programs and links to module destinations. Relevance is not an award. |
| Files | /portfolio/[clientId]/files | Source/search/sort, list/cards/folders, storage usage, selection bar, upload, file access, original/download/extracted text, version history, move one/batch, delete, Meri artifact starter. Permission/lifecycle/extraction/scan/uncertain recovery distinct. |
| Prospects landing | /portfolio/prospects and Portfolio type=PROSPECT | Search/owner/stage/visibility filters; stage totals; list/cards/pipeline; Add prospect; distinct archived and no matches views. Current stage catalog: Identified, Initiated, Engaged, Proposal, Negotiation, Closed won, Closed lost. |
| Prospect detail | /portfolio/prospects/[prospectId] | Company identity/description/site/focus/owner/added/geography, pipeline stage, activity history, federal strategy brief, files, Workspace documents, proposal, next step/owner/due date, contacts, notes, watch, archive/restore. |
| Prospect forms | Detail actions | Company fields: name, website, domain, description, service hypothesis, geography. Next step plus due timezone and active-member owner. Stage selector. Contact editing/transfer. Brief generation/history/edit/refresh/source/view/Workspace copy/client copy. Proposal template catalog/preview. Convert/link client, capacity, duplicates, review, unknown/result. Explicitly preserve prospects' own documents and origin after conversion. |

## App shell source and proposed Figma behavior

Current canonical files:
- apps/web/src/shared/portfolio/shell/Shell.tsx
- apps/web/src/shared/portfolio/shell/PortfolioNavigation.tsx
- apps/web/src/shared/portfolio/shell/PortfolioHeaderActions.tsx
- apps/web/src/shared/portfolio/shell/WorkspaceSwitcher.tsx
- apps/web/src/shared/portfolio/shell/client-views.ts
- apps/web/src/shared/portfolio/shell/shell.module.css
- apps/web/src/shared/shell/HeaderFrame.tsx
- apps/web/src/shared/shell/header-frame.module.css

Observed implementation:
- Header height 65px; sticky top:0.
- Sidebar expanded width 232px, sticky top:65px, height calc(100dvh - 65px).
- Desktop expanded starts true; collapse sets sidebar display:none.
- Tablet 681–1000px shows a 72px icon rail and hides the sidebar toggle. Mobile <=680 uses a 108px two-row header and temporary nav.
- Body has min-height, not a fixed viewport height. Main has flex:1/min-width:0 and no owned vertical overflow; long page content scrolls the document.
- Top actions currently Quick log, Master calendar, Clerk avatar. Preserve existing icon-only design; disabled/available actions should match actual capability.
- Sidebar has global Overview/Clients/Prospects, selected client's nine destinations, Settings footer. Client name is truncated with a title.
- Account/tenant selection is not granted authority by visual client selection.

Figma contract to add:
- Expanded and collapsed states in the same 3.4 shell, with a visible PanelLeft toggle and click-through both ways.
- A fixed top bar and stationary left navigation; main viewport starts below top bar, fills remaining width, and owns vertical scrolling.
- Resizing the sidebar reflows the main area rather than placing it under the navigation.
- At 1440 and 1024 explicitly show long content below the fold, unchanged shell coordinates, active route, long client name, keyboard focus, and scroll restoration.
- At tablet, keep expansion possible instead of hiding the toggle. For compact overlay navigation, close/Escape and focus-return remain clear.
- Only normal main-page content scrolls. Large active modal/drawer may need its own body scroll with visible title/close and footer; avoid scrolling behind it.
- Motion should be subtle and reversible, with reduced-motion instant state change.
- Icons need accessible labels/tooltips even when visible words are removed.

## Source-grounded visual issues

These are code findings, not screenshot-confirmed defects:
- Shell scroll ownership contradicts the new request, as described above.
- Tablet hides the expand control.
- Prospect detail is a long stack of cards; history (max-height 560px) and notes (300px) introduce nested scroll areas that conflict with the requested single main scrolling region. Favor anchored sections or progressive disclosure while preserving all content.
- Overview engagement pulse CSS defines three equal columns while current source renders two count cards, leaving unnecessary rhythm/space imbalance.
- Large fixed min-heights (pulse 412px; deadlines 344px) can exaggerate sparse or unavailable states.
- Client subpage titles are globally reduced to 20px/500 and compete with repeated identity strips; distinguish page title, identity and section titles more deliberately.
- Many dense screens use the same small bordered card treatment for status, data, navigation and actions; use restrained surface tiers and purposeful spacing rather than more colored boxes.
- Modal content is a single overflow:auto grid. Long forms benefit from stable action/footer and inline validation visibility.
- Long client names, owner unavailable, missing contact details, partial results, permissions and stale data should be part of the polish QA, not polished away.

## Critical source/design divergence

Do not overwrite the user's approved metric definitions with the current source implementation.

Current PortfolioMetricDefinitions.tsx still describes draft/in-review/ready Objectives, overdue CRM, and Bill-watch coverage; OverviewSignals.tsx uses open/overdue requests and commitments and a health score unavailable placeholder. These are older implementation semantics.

The user's accepted Figma definitions are:
- Portfolio: non-archived client count excluding firms/prospects; active Objective count; explicitly Off track active Objectives; distinct active Strategies; distinct clients needing attention with reasons; objective-linked eligible open Planner-item percentage.
- Overview: qualifying completed external touches last 30 days; overdue Planner work; same qualifying touches over last eight calendar weeks with This week so far; latest recorded activity with actor/time; contact-cadence health with reason.
- Awaiting reply is excluded.
- Unknown is not zero; no eligible work says No open work.
- Same scope, filters and reporting snapshot in metric and drilldown; total is all matching records rather than loaded page.
- Preserve the original Timeline unknown-write/lookup/replay/draft/focus/access-change states from the October 26 design pass.

Treat this mismatch as implementation parity to coordinate later; it is not authorization to regress the designs.

## Existing upstream libraries

Verified apps/web/package.json:
- Geist 1.7.2; Newsreader 5.3.0.
- Lucide React 0.577.0; Radix UI 1.7.0.
- Schedule-X calendar/controls/theme 4.9.1 and React 4.1.0.
- React Flow (@xyflow/react) 12.12.0.
- d3-geo 3.1.1.
- Tiptap 3.31.4 for current rich editing.
- TanStack React Query 5.104.1.
- Vidstack 1.15.7 and Media Chrome 4.19.4 for module video; not a reason to add video surfaces to Portfolio.

Verified packages/ui/package.json:
- Existing adopted shadcn/Radix Button, Dialog, Tooltip, Input, Textarea, Select, DropdownMenu, Badge, Collapsible, Alert, Card, ScrollArea.
- Motion 14.6.0, Sonner 2.0.8, Base UI 1.9.0, TanStack Virtual 3.14.22, cmdk 1.1.1.
- AI Elements library is shared infrastructure; retain only Portfolio/shell-used dependencies in the Figma file.

Design direction: reuse the current Geist/local Figma component system, quiet neutral surfaces, the approved dark gradient, one restrained semantic accent, readable type/spacing hierarchy, and meaningful visualizations. Recharts, Kibo and Plate may be approved design references from earlier work, but they are not listed in these two current runtime package manifests; don't claim them installed. New library adoption is unnecessary for basic shell/card/form polish.

## Code Connect discovery

No *.figma.ts/tsx/js/jsx, code-connect or figma.config entries were found in:
- all 16 complete Portfolio feature subtrees;
- shared/portfolio and shared/shell;
- complete packages recursive tree (210 entries, truncated=false).

GitHub filename search returned zero with incomplete_results=true, so it does not independently prove a full repository-wide absence. The relevant-tree search is authoritative for the owned surfaces reviewed here. Use existing in-file components and product typography rather than importing a different remote design system.

## Verification boundaries

Source composed-view files were read at the pinned commit and source inventory was recorded. No build/test or deployment was run, no live interaction was qualified, and no frontend implementation was changed. The Figma owner should report its own exact edited-node inventory and screenshots separately.

