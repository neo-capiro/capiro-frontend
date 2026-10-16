# Current Figma3.4 shared components audit

Read-only audit against PR56 source `3ef15d9a8ae6a27a9c2f39ccd923b5e2e07797cd`, tree `fe91d99ea53e982f73fd346c0dcff0f7225597cd`. Deployed9da remains a distinct baseline. No application edits, tests, compiler, browser, install, Figma writes, cloud action or deployment were performed by this lane.

## Actual design scope

- [Portfolio Components2:107](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=2-107)
- [Modules/Settings Components2:107](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=2-107)

Both actual metadata responses have identical XML:61,801 characters and620 nodes:1 canvas,112 frames,418 symbols,30 text nodes,59 instances.78 top-level children become101 family rows when the two component sheets are grouped by their direct family frames:69 non-Meri families/348 symbols,32 Meri families/70 symbols. The two files are duplicate appearances, not836 unique definitions. Metadata does not prove published-library membership or live implementation coverage.

45 high-fidelity design-context calls returned code, descriptions and screenshots; all45 screenshots were inspected. Complete raw responses are retained in [audit-evidence/figma34/shared](../../../audit-evidence/figma34/shared). No sparse-context response or access denial occurred. Installed Figma design-to-code16.0.0 guidance was read and `skillNames=figma-design-to-code` supplied on every context call. No `use_figma` call was needed.

[COMPONENT-INVENTORY.json](COMPONENT-INVENTORY.json) retains every symbol ID/name/dimension, both file URLs, family/source owner, paths and acceptance direction. [CHECKLIST.md](CHECKLIST.md) has69 non-Meri rows. [DESIGN-GAPS.md](DESIGN-GAPS.md) separates proposed missing mockups from implementation gaps. Prototype-page1064:140864 screens belong to other audit lanes.

The source manifest pins51 canonical files;50 working files normalized equal3ef at readback. Only ContactMail.tsx changed concurrently after the initial audit read; SH-IMP-03 remains explicitly a3ef finding until the other owner's successor is reviewed. Engagement edits from other owners were left untouched.

## Concrete implementation gaps

| ID | Actual design evidence | Existing source at3ef | Gap/owner | Acceptance direction, UNRUN here |
| --- | --- | --- | --- | --- |
| SH-IMP-01 | v2/Button12:369/12:388 specifies36px height,14px side padding,10px radius, Primary/Outline/Ghost | module-ui.module.css .button is36px/14px but radius8 | Shared module-ui owner via root: use existing wrapper/token seam; do not edit adopted shadcn source. | Three exact variants, keyboard focus, disabled/pending, named icon controls; targeted caller screenshot. |
| SH-IMP-02 | v2/Chip12:389/12:408 specifies22px capsule,12px medium, status dot and6 tones | module-ui Badge is11px,3px8px padding,radius6,4 semantic tones | Reuse limitation. Confirm intended-chip callers before extending wrapper; not proof every Badge caller is wrong. | Compare intended Planner priority/status callers; keep text and existing backend enum mapping. |
| SH-IMP-03 | Contact message history431:41501 Ready includes subject,snippet,last-message date | ContactMail list has subject+snippet only; dates render inside opened thread. email.ts retains messages[].sentAt/receivedAt/createdAt. | Relationships owner: add honest latest-visible-message date without inventing thread completeness/new endpoint. Working file concurrently changed. | Ready date/no invalid timestamp; Empty/Loading/Error/No-email; current client/mailbox fences and50-thread disclosure preserved. |
| SH-IMP-04 | Shared header469:92041/profile469:41439 explicitly says replace neutral prototype portrait with signed-in user image | Portfolio Shell uses Clerk UserButton; ModuleHeader uses static ModuleAsset profile32px imgCapiro31ProfilePicture.svg | Shared shell owner must coordinate real account image/authorized fallback. Meri header is other owner. | Account image/fallback, accessible label, current scope and Settings navigation, no sample identity. |
| SH-IMP-05 | Plate toolbar526:43330 has Wide/Compact/Mobile surface density x Editing/Suggesting/Viewing; floating selection526:43331, block menu526:43373, comment thread526:43441 | Existing Tiptap DocumentToolbar has undo/redo,marks,link,lists,table,quote/divider,Preview. No Suggesting/Viewing selector,Comments/Reply/Resolve,citation/callout insertion or Meri revision workflow. | Workspace/Meri/backend owners: preserve current engine/payload behavior. Some workflows need authoritative contracts; no fake persistence or engine rewrite. | Container-width toolbar/read-only affordance; source/save/preview parity and undo grouping; new persistence needs real contract tests. |

## Reuse and state findings

- Reuse adopted packages/ui shadcn primitives with their provenance/licenses; use existing wrapper presentation seams. Root globals define foreground/card/muted/border/input and radius10; Portfolio route tokens add dark surfaces, danger/success and shadow. Avoid new parallel token sets.
- module-ui owns ActionButton/Field/Badge/StatusPanel/UnavailableAction/Modal/Tabs/DataTable. Portfolio QueryState already distinguishes401 sign-in and403 permission text. Existing loading/error/retry need design-specific composition, not a replacement state framework.
- HeaderFrame/ModuleHeader/ModuleNavigation and Portfolio Shell/PortfolioNavigation already provide named modes, current-item semantics, client-aware routes, bottom Settings and232px/72px rails. Portfolio/Modules compact thresholds differ1000px/1100px; component designs specify dimensions but do not select one shared transition threshold.
- Existing CommitteePicker/Panel is scalar value:string. It separates drill from commit, preserves full paths, supports search/arrows/Home/End/Escape, unavailable current IDs and empty results. Designed Multi does not authorize broadening this caller or unrelated flat selects. Loading/error are caller-owned reads, so the designed panel composition needs actual caller review.
- CapabilityFields/Form/Editor already retain local inputs in native disclosure, keep Type/Sector free text and save explicitly. EntityDocuments/DocumentState cover Loading/Empty/Error/Unavailable/Checking with current access checks. Preserve readiness/scan/cancellation distinctions.
- Calendars already use Schedule-X; OrganizationChart uses React Flow; ActivityTimeline/AdvocacyTimeline own source-specific semantics. Kibo shapes map to TaskViews, not a new task model.

## Desktop and interaction boundaries

Device=Phone/Breakpoint=Mobile and old Bottom nav are deferred/unqualified. Density=Mobile in document-toolbar/Kibo list means narrow component surface and remains relevant inside a desktop editor. Meri's32 families remain inventory-only under its owner.

Only explicit descriptions justify interaction requirements: cascader drill!=select and errors retain selection; source toggles hide events; capability save is explicit; FY selects the Objective FY; map marker opens detail. Appearance does not establish backend commands, authorization, autosave, recommendation, execution or approval. Sample names/dates/counts are not runtime facts.

The page retains old Component sheet/v2 navigation-calendar patterns and newer Capiro3.1/Schedule-X families together. No superseded source was removed. Deletion requires actual instance references, source imports/callers, replacement assertions and current screen coverage; names alone do not establish deprecation.

## Remaining qualification

All acceptance directions are proposed or existing test locations, not executed evidence. Schedule focused shared/screen browser parity, asset-slot geometry and responsive/keyboard states through Qualification. Parent must be notified when Playwright visual parity actually begins; none began here. Figma screenshots do not qualify Clerk/auth,RLS,receipt atomicity,unknown delivery,image/runtime or deployment.

