# Meri Figma 3.4 audit — 15 October 2026

Source: Figma file `IXJzJUkXcUTkySHir5JNea` ("Capiro 3.4 Meri"), page "Prototype — Capiro 3.4", section "02 · Meri" (`1064:143194`). Frontend base: branch `fix/rich-document-boundary-keyboard` at `4e1421054df0d32c564f7c9bc75cbd5e5366b428`. This file supersedes the Figma 3.1 file `Zc2dEN5aLU47dVdsewDmiJ` that the earlier parity records pin.

Method: the full page metadata was read once (1.0 MB XML) and every Meri frame was matched to the existing code by name, component use and visible labels. Screenshots were reviewed inline. This is a structural audit. It is not a pixel comparison, and no frame has been accepted against the new file.

## Environment blocker

Figma asset downloads use `www.figma.com/api/mcp/asset/…`. The cloud environment's network policy denies that host with a 403, so exact SVG and image assets cannot be downloaded in this session. Inline screenshots work. The design-to-code rule says never to redraw assets, so any screen needing a new asset waits until `www.figma.com` is under Allowed domains. Icons already in the repository are reused.

## What exists

- Shared Capiro header, the Meri sidebar (nine destinations, recents, preferences) and Home with a synthetic fixture.
- Synthetic cited-answer fixture and run-activity fixture.
- Live adapters for conversations, documents (DOCX and XLSX) and recommendation actions. Their screens are plain diagnostic controls, not the Figma layouts.
- Only three AI Elements are adopted: conversation, message and prompt input.
- Sidebar entries Runs, Approvals, Memory, Routines and Data access are disabled with "no connected service".

## Frames and status

| Figma ID | Screen | Node | Frontend status | Backend contract |
| --- | --- | --- | --- | --- |
| 01.01 | Home | 1064:144075 | Partial: Home shell, scope chip and composer exist with a synthetic fixture; start tiles, workflow links, attach and scope menus are absent | Conversations HTTP exists. No search endpoint. Client list is external. |
| 02.01 | Research in progress | 1064:144151 | Partial: Plain run activity panel exists; progress, plan and specialist rows are absent | Lifecycle and run events exist. SDK subagents are not configured, so specialist activity has no data. |
| 01.02 | Cited answer | 1064:144239 | Partial: Synthetic cited answer exists; evidence drawer and answer actions beyond copy are absent | Conversations HTTP exists. No search endpoint. Client list is external. |
| 01.03 | Choose client and data scope | 1064:144332 | Absent | Conversations HTTP exists. No search endpoint. Client list is external. |
| 01.04 | Conversation history | 1064:144425 | Absent | Conversations HTTP exists. No search endpoint. Client list is external. |
| 01.05 | Search and command palette | 1064:144529 | Absent | Conversations HTTP exists. No search endpoint. Client list is external. |
| 02.02 | Parallel specialist activity | 1064:144601 | Absent | Lifecycle and run events exist. SDK subagents are not configured, so specialist activity has no data. |
| 02.03 | Run detail | 1064:144708 | Absent | Lifecycle and run events exist. SDK subagents are not configured, so specialist activity has no data. |
| 02.04 | Background runs | 1064:144817 | Absent | Lifecycle and run events exist. SDK subagents are not configured, so specialist activity has no data. |
| 02.05 | Steer and stop a run | 1064:144923 | Absent | Lifecycle and run events exist. SDK subagents are not configured, so specialist activity has no data. |
| 02.06 | Checkpoint and verified restore | 1064:144982 | Absent | Lifecycle and run events exist. SDK subagents are not configured, so specialist activity has no data. |
| 02.07 | Tool activity and receipts | 1064:145061 | Partial: Plain tool reference list exists; receipts and tool cards are absent | Lifecycle and run events exist. SDK subagents are not configured, so specialist activity has no data. |
| 02.08 | Interrupted run and fork | 1064:145144 | Absent | Lifecycle and run events exist. SDK subagents are not configured, so specialist activity has no data. |
| 03.01 | Workspace files | 1064:145204 | Absent | DOCX and XLSX create/revise/inspect/download exist. PPTX, PDF, HTML and code previews, PDF.js and signed links do not. |
| 03.02 | Word document workspace | 1064:145316 | Partial: Document editor and version panel exist as plain controls; Figma workspace layout absent | DOCX and XLSX create/revise/inspect/download exist. PPTX, PDF, HTML and code previews, PDF.js and signed links do not. |
| 03.03 | PDF and multi-page preview | 1064:145426 | Absent | DOCX and XLSX create/revise/inspect/download exist. PPTX, PDF, HTML and code previews, PDF.js and signed links do not. |
| 03.04 | Spreadsheet preview | 1064:145539 | Partial: Workbook editor exists as plain controls; preview layout absent | DOCX and XLSX create/revise/inspect/download exist. PPTX, PDF, HTML and code previews, PDF.js and signed links do not. |
| 03.05 | Presentation preview | 1064:145690 | Absent | DOCX and XLSX create/revise/inspect/download exist. PPTX, PDF, HTML and code previews, PDF.js and signed links do not. |
| 03.06 | Generated web preview | 1064:145787 | Absent | DOCX and XLSX create/revise/inspect/download exist. PPTX, PDF, HTML and code previews, PDF.js and signed links do not. |
| 03.07 | Code and execution activity | 1064:145886 | Absent | DOCX and XLSX create/revise/inspect/download exist. PPTX, PDF, HTML and code previews, PDF.js and signed links do not. |
| 03.08 | Analysis outputs | 1064:145939 | Absent | DOCX and XLSX create/revise/inspect/download exist. PPTX, PDF, HTML and code previews, PDF.js and signed links do not. |
| 03.09 | Versions and comparison | 1064:146038 | Partial: Version metadata panel exists; comparison view absent | DOCX and XLSX create/revise/inspect/download exist. PPTX, PDF, HTML and code previews, PDF.js and signed links do not. |
| 03.10 | Revise an artifact | 1064:146126 | Absent | DOCX and XLSX create/revise/inspect/download exist. PPTX, PDF, HTML and code previews, PDF.js and signed links do not. |
| 04.01 | Upload and attachment menu | 1064:146204 | Absent | Artifact filing command and download exist. No upload or extraction API found. |
| 04.02 | Attach an authorized Capiro file | 1064:146271 | Absent | Artifact filing command and download exist. No upload or extraction API found. |
| 04.03 | Upload and extraction progress | 1064:146356 | Absent | Artifact filing command and download exist. No upload or extraction API found. |
| 04.04 | File artifact to client | 1064:146428 | Absent | Artifact filing command and download exist. No upload or extraction API found. |
| 04.05 | Download exact artifact version | 1064:146498 | Absent | Artifact filing command and download exist. No upload or extraction API found. |
| 04.06 | Revision progress and verification | 1064:146561 | Absent | Artifact filing command and download exist. No upload or extraction API found. |
| 04.07 | Filing and download receipts | 1064:146629 | Absent | Artifact filing command and download exist. No upload or extraction API found. |
| 05.01 | Evidence and citations | 1064:146715 | Absent | Retrieval contracts exist with zero bound handlers. Memory read is partial. Memory update is absent. |
| 05.02 | Data coverage and capabilities | 1064:146817 | Absent | Retrieval contracts exist with zero bound handlers. Memory read is partial. Memory update is absent. |
| 05.03 | Freshness, partial and historical results | 1064:146948 | Absent | Retrieval contracts exist with zero bound handlers. Memory read is partial. Memory update is absent. |
| 05.04 | Institutional Memory recall | 1064:147042 | Absent | Retrieval contracts exist with zero bound handlers. Memory read is partial. Memory update is absent. |
| 05.05 | Memory detail and provenance | 1064:147112 | Absent | Retrieval contracts exist with zero bound handlers. Memory read is partial. Memory update is absent. |
| 05.06 | Memory update proposal | 1064:147204 | Absent | Retrieval contracts exist with zero bound handlers. Memory read is partial. Memory update is absent. |
| 05.07 | Access changed and clean recovery | 1064:147272 | Absent | Retrieval contracts exist with zero bound handlers. Memory read is partial. Memory update is absent. |
| 05.08 | Approved memory outcome | 1064:147320 | Absent | Retrieval contracts exist with zero bound handlers. Memory read is partial. Memory update is absent. |
| 06.01 | Approval center | 1064:147397 | Absent | Approval metadata and commands exist. No list endpoint for an approval center found. |
| 06.02 | Memory approval review | 1064:147483 | Absent | Approval metadata and commands exist. No list endpoint for an approval center found. |
| 06.03 | Draft a client task | 1064:147566 | Partial: Task draft panel exists as plain controls | Approval metadata and commands exist. No list endpoint for an approval center found. |
| 06.04 | Review exact task action | 1064:147638 | Partial: Immutable proposal panel exists as plain controls | Approval metadata and commands exist. No list endpoint for an approval center found. |
| 06.05 | Review artifact filing | 1064:147729 | Absent | Approval metadata and commands exist. No list endpoint for an approval center found. |
| 06.06 | Approved action receipts | 1064:147820 | Partial: Execution receipt panel exists as plain controls | Approval metadata and commands exist. No list endpoint for an approval center found. |
| 06.07 | Reject or request changes | 1064:147899 | Absent | Approval metadata and commands exist. No list endpoint for an approval center found. |
| 07.01 | Public browser activity | 1064:147956 | Absent | No browser product integration. No qualified browser host. |
| 07.02 | Site connection and sign-in | 1064:148036 | Absent | No browser product integration. No qualified browser host. |
| 07.03 | Browser files and receipts | 1064:148104 | Absent | No browser product integration. No qualified browser host. |
| 07.04 | Browser connection states | 1064:148185 | Absent | No browser product integration. No qualified browser host. |
| 08.01 | Routines | 1064:148241 | Absent | Schedule owner, create/update/cancel and history exist as source. |
| 08.02 | Create or edit routine | 1064:148347 | Absent | Schedule owner, create/update/cancel and history exist as source. |
| 08.03 | Routine detail | 1064:148440 | Absent | Schedule owner, create/update/cancel and history exist as source. |
| 08.04 | Routine history and authority changes | 1064:148534 | Absent | Schedule owner, create/update/cancel and history exist as source. |
| 09.08 | Conversation management and branches | 1064:148633 | Absent | Only 09.08 has a design. Preferences, connectors, usage, notifications, retention UI and help have no backend contract. |
| 10.01 | Dark workspace | 1064:148697 | Absent | Composite of the above. |
| 10.02 | Tablet conversation | 1064:148772 | Absent | Composite of the above. |
| 10.03 | Tablet artifact drawer | 1064:148841 | Absent | Composite of the above. |
| 10.04 | Mobile home | 1064:148902 | Absent | Composite of the above. |
| 10.05 | Mobile conversation | 1064:148941 | Absent | Composite of the above. |
| 10.06 | Mobile artifact | 1064:148985 | Absent | Composite of the above. |
| 10.07 | Mobile task approval | 1064:149028 | Absent | Composite of the above. |
| 10.08 | Mobile navigation | 1064:149061 | Partial: Mobile navigation disclosure exists for the shared shell | Composite of the above. |
| 10.17 | Mobile filing receipt | 1064:149090 | Absent | Composite of the above. |
| 10.18 | Mobile revision progress | 1064:149120 | Absent | Composite of the above. |
| 10.09 | Mobile sources | 1064:149158 | Absent | Composite of the above. |
| 10.10 | Mobile artifact actions | 1064:149191 | Absent | Composite of the above. |
| 10.11 | Mobile artifact revision | 1064:149225 | Absent | Composite of the above. |
| 10.12 | Mobile versions | 1064:149254 | Absent | Composite of the above. |
| 10.13 | Mobile filing review | 1064:149286 | Absent | Composite of the above. |
| 10.14 | Mobile scope picker | 1064:149316 | Absent | Composite of the above. |
| 10.15 | Mobile upload | 1064:149346 | Absent | Composite of the above. |
| 10.16 | Mobile research progress | 1064:149375 | Absent | Composite of the above. |
| 11.01 | Run and recovery state board | 1064:149425 | Absent | Composite of the above. |
| 11.02 | File and artifact error state board | 1064:149528 | Absent | Composite of the above. |
| 11.03 | Approval and permission state board | 1064:149631 | Absent | Composite of the above. |
| 11.04 | Conversation and memory lifecycle states | 1064:149734 | Absent | Composite of the above. |
| 11.05 | Empty, search and success states | 1064:149837 | Absent | Composite of the above. |
| Overlay · Copied |  | 1064:149940 | Absent | Follows parent flow |
| Overlay · Saved |  | 1064:149944 | Absent | Follows parent flow |
| Overlay · Download ready |  | 1064:149948 | Absent | Follows parent flow |
| Overlay · Conversation deleted |  | 1064:149952 | Absent | Follows parent flow |
| Overlay · Routine paused |  | 1064:149956 | Absent | Follows parent flow |
| Overlay · Cancel future runs? |  | 1064:149962 | Absent | Follows parent flow |
| Overlay · Research account connected |  | 1064:149967 | Absent | Follows parent flow |
| Overlay · Stop remaining work? |  | 1064:149972 | Absent | Follows parent flow |
| Overlay · Task created |  | 1064:149977 | Absent | Follows parent flow |
| Overlay · Artifact filed |  | 1064:149982 | Absent | Follows parent flow |
| 05.09 | Funding evidence detail | 1064:149987 | Absent | Retrieval contracts exist with zero bound handlers. Memory read is partial. Memory update is absent. |
| Overlay · Run cancelled |  | 1064:150073 | Absent | Follows parent flow |
| Overlay · Revise funding analysis |  | 1064:150079 | Absent | Follows parent flow |
| Overlay · File funding analysis |  | 1064:150093 | Absent | Follows parent flow |
| Overlay · Revising funding analysis |  | 1064:150134 | Absent | Follows parent flow |
| Overlay · Funding analysis filed |  | 1064:150145 | Absent | Follows parent flow |
| Overlay · Revise client update |  | 1064:150152 | Absent | Follows parent flow |
| Overlay · File client update |  | 1064:150166 | Absent | Follows parent flow |
| Overlay · Revising client update |  | 1064:150207 | Absent | Follows parent flow |
| Overlay · Client update filed |  | 1064:150218 | Absent | Follows parent flow |
| Overlay · Revise signal summary |  | 1064:150225 | Absent | Follows parent flow |
| Overlay · File signal summary |  | 1064:150239 | Absent | Follows parent flow |
| Overlay · Revising signal summary |  | 1064:150280 | Absent | Follows parent flow |
| Overlay · Signal summary filed |  | 1064:150291 | Absent | Follows parent flow |
| Overlay · Download Funding analysis |  | 1064:150298 | Absent | Follows parent flow |
| Overlay · Download ready sheet |  | 1064:150304 | Absent | Follows parent flow |
| Overlay · Download Client update |  | 1064:150308 | Absent | Follows parent flow |
| Overlay · Download ready slides |  | 1064:150315 | Absent | Follows parent flow |
| Overlay · Download Signal summary |  | 1064:150319 | Absent | Follows parent flow |
| Overlay · Download ready html |  | 1064:150325 | Absent | Follows parent flow |
| Document overlay · blocks |  | 1064:150601 | Absent | Follows parent flow |
| Document overlay · revision |  | 1064:150603 | Absent | Follows parent flow |
| Document overlay · mobileRevision |  | 1064:150605 | Absent | Follows parent flow |
| Document overlay · comments |  | 1064:150607 | Absent | Follows parent flow |
| Document overlay · Editing mode |  | 1064:150609 | Absent | Follows parent flow |

## Missing from the design (needs your mock-ups)

1. **09.01 to 09.07 have no screens.** Layout anchors exist in the review map, but there is no frame behind them: personal preferences, connector accounts and permissions, usage and workspace limits, skills and artifact templates, notifications and account menu, privacy and deletion, help shortcuts and feedback. The frontend already implements these seven pages from the earlier design in `apps/web/src/features/settings/MeriPreferences.tsx` and `preferences/PreferencePages.tsx`, so the new frames should match that content. The design handoff is [FIGMA-MOCKUP-HANDOFF.md](FIGMA-MOCKUP-HANDOFF.md).
2. **Numbering conflicts in the tooling-coverage section.** 12.07, 12.08 and 12.15 are each used twice. 12.09, 12.12 and 12.18 are not used. 12.19 is a table frame, not a screen. Confirm whether these are renumbering slips or missing screens.
3. **Retention and deletion states.** Only "Conversation deleted" and "Object deleted" exist. There is no design for a conversation or artifact that is unavailable because of retention suppression, no export screen, and no deletion-in-progress or legal-hold state.
4. **Session and availability states.** No signed-out, session-expired, feature-disabled or service-unavailable screen. The frontend needs these because the conversation service is off by default.
5. **Artifact sharing scope.** The plan requires an artifact's sharing to respect its contributing source scopes. No screen shows the combined scope or explains a restricted share.
6. **Tenant budget exhaustion.** "Budget reached" appears as a run state only. There is no screen showing a tenant or user budget, and 09.03 is missing.
7. **Tablet and dark coverage.** Tablet exists for the conversation, the artifact drawer and the workflow library. Dark exists for the workspace and the workflow library. Every other screen has neither.
8. **Phone coverage.** Phone frames exist for 15 flows. Routines, approvals center, memory, browser, history and run detail have no phone frame.

## Not designed because the plan defers it

Live browser takeover, in-browser Office editing, a device bridge and authenticated browser integrations are deferred by the plan and are correctly absent.

## Implementation gaps by section

| Section | Needed in the frontend | Blocked by |
| --- | --- | --- |
| Shell | Router for nine destinations, history list, search palette, scope picker | Search endpoint |
| 02 Runs | Specialist rows, run detail, background runs, steer and stop, checkpoint view, fork | SDK subagents in the runtime |
| 03 Artifacts | Seven preview types, version comparison, revise sheet, analysis outputs | PDF.js, PPTX/HTML preview, isolated origin |
| 04 Files | Attachment menu, authorized-file picker, extraction progress, filing and download receipts | Upload and extraction API |
| 05 Sources and memory | Evidence, coverage, freshness, memory recall, provenance, update proposal | Bound source handlers, memory update |
| 06 Approvals | Approval center, memory review, task review, filing review, rejection | Approval list endpoint |
| 07 Browser | Activity, connection, files and receipts | Browser product integration and host |
| 08 Routines | Create, edit, detail, history | Frontend adapter for the schedule owner |
| 10 Responsive | Dark theme, tablet and 15 phone screens | Shell and tokens |
| 11 States | Five state boards as real component states | Per-flow wiring |
| 12 Tooling | Workflow library, 14 setups, commitments, coverage, matrix views | Runtime-qualified workflows |
| AI Elements | Tool, Artifact, Attachment, Confirmation, Plan, Sources, Queue, Checkpoint, Context, File Tree, Inline Citation, Code Block, Terminal, Web Preview | Upstream adoption with provenance |

## Tooling coverage, workflow setups and document drafting frames

These frames sit beside the standalone mock-up in sections `1064:150752` (tooling coverage), `1064:150329` (document drafting) and `1064:150613` (client context). The tooling numbering conflicts listed above are kept as authored; the node ID is the unique key.

| Figma ID | Screen | Node | Frontend status | Group |
| --- | --- | --- | --- | --- |
| 12.01 | Workflow library | 1064:151092 | Absent | desktop |
| 12.02 | Commitments & Deliverables | 1064:151177 | Absent | desktop |
| 12.03 | Sources & coverage | 1064:151246 | Absent | desktop |
| 12.04 | Source access & operations | 1064:151332 | Absent | desktop |
| 12.05 | Artifact formats | 1064:151397 | Absent | desktop |
| 12.06 | Code & reproducible analysis | 1064:151469 | Absent | desktop |
| 12.07 | Workflow request & context | 1064:151540 | Absent | desktop |
| 12.08 | Workflow run & recovery | 1064:151605 | Absent | desktop |
| 12.07 | Funding & federal market | 1064:151682 | Absent | desktop |
| 12.08 | Budget lines & exact comparison | 1064:151762 | Absent | desktop |
| 12.10 | Relationship & mail history | 1064:151858 | Absent | desktop |
| 12.11 | Client & portfolio changes | 1064:151930 | Absent | desktop |
| 12.13 | Government watch | 1064:152002 | Absent | desktop |
| 12.14 | Memory conflict & lifecycle | 1064:152069 | Absent | desktop |
| 12.15 | Clarify subject & context | 1064:152144 | Absent | desktop |
| 12.16 | Exact file extraction coverage | 1064:152220 | Absent | desktop |
| 12.17 | Browser permissions & qualification | 1064:152281 | Absent | desktop |
| 12.20 | Company research & capture roadmap | 1064:152370 | Absent | desktop |
| 12.21 | Portfolio overlap matrix | 1064:152468 | Absent | desktop |
| 12.15 | Artifact verification | 1064:152575 | Absent | desktop |
| 12.22 | Exact source record | 1064:152635 | Absent | desktop |
| Setup · Research a Company |  | 1064:152953 | Absent | setup |
| Setup · Relationship Brief |  | 1064:152955 | Absent | setup |
| Setup · Client Changes |  | 1064:152957 | Absent | setup |
| Setup · Portfolio Changes |  | 1064:152959 | Absent | setup |
| Setup · Portfolio Overlap |  | 1064:152961 | Absent | setup |
| Setup · Mail History |  | 1064:152963 | Absent | setup |
| Setup · Meeting Prep Brief |  | 1064:152965 | Absent | setup |
| Setup · Commitments & Deliverables |  | 1064:152967 | Absent | setup |
| Setup · Funding Opportunity Match |  | 1064:152969 | Absent | setup |
| Setup · PE Deep Dive |  | 1064:152971 | Absent | setup |
| Setup · Bill Watch |  | 1064:152973 | Absent | setup |
| Setup · Hearing Watch |  | 1064:152975 | Absent | setup |
| Setup · Representation Lookup |  | 1064:152977 | Absent | setup |
| Setup · Regulatory Docket Brief |  | 1064:152979 | Absent | setup |
| Task · Draft from commitment |  | 1064:152981 | Absent | setup |
| Task · Review exact source action |  | 1064:153002 | Absent | setup |
| Task · Source creation receipt |  | 1064:153038 | Absent | setup |
| Task · Canonical source record |  | 1064:153081 | Absent | setup |
| Meri · Workflow library · Phone |  | 1064:152692 | Absent | responsive |
| Meri · Commitments & Deliverables · Phone |  | 1064:152717 | Absent | responsive |
| Meri · Sources & coverage · Phone |  | 1064:152737 | Absent | responsive |
| Meri · Review workflow request · Phone |  | 1064:152758 | Absent | responsive |
| Meri · Workflow library · Tablet |  | 1064:152783 | Absent | responsive |
| Meri · Workflow library · Dark |  | 1064:152868 | Absent | responsive |
| Phone setup · Research a Company |  | 1064:153319 | Absent | phone setup |
| Phone setup · Relationship Brief |  | 1064:153321 | Absent | phone setup |
| Phone setup · Client Changes |  | 1064:153323 | Absent | phone setup |
| Phone setup · Portfolio Changes |  | 1064:153325 | Absent | phone setup |
| Phone setup · Portfolio Overlap |  | 1064:153327 | Absent | phone setup |
| Phone setup · Mail History |  | 1064:153329 | Absent | phone setup |
| Phone setup · Meeting Prep Brief |  | 1064:153331 | Absent | phone setup |
| Phone setup · Commitments & Deliverables |  | 1064:153333 | Absent | phone setup |
| Phone setup · Funding Opportunity Match |  | 1064:153335 | Absent | phone setup |
| Phone setup · PE Deep Dive |  | 1064:153337 | Absent | phone setup |
| Phone setup · Bill Watch |  | 1064:153339 | Absent | phone setup |
| Phone setup · Hearing Watch |  | 1064:153341 | Absent | phone setup |
| Phone setup · Representation Lookup |  | 1064:153343 | Absent | phone setup |
| Phone setup · Regulatory Docket Brief |  | 1064:153345 | Absent | phone setup |
| Meri · Document working draft · Desktop |  | 1064:150330 | Absent | drafting |
| Meri · Document working draft · Tablet |  | 1064:150459 | Absent | drafting |
| Meri · Document working draft · Phone |  | 1064:150539 | Absent | drafting |
| Meri · Anduril meeting workspace entry |  | 1064:150614 | Absent | client context |
