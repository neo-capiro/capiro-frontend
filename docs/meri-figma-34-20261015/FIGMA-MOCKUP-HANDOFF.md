# Handoff: build the missing Meri mock-ups in Figma 3.4

You are a design agent with write access to Figma. Build the missing Meri frames in the existing Capiro 3.4 file so the design becomes the complete source of truth for the Meri frontend. Work only in Figma. Do not change application code.

## File and where things live

- File: **Capiro 3.4 Meri**, key `IXJzJUkXcUTkySHir5JNea`, page **🧭 Prototype — Capiro 3.4** (`1064:140864`).
- Meri section: **02 · Meri** (`1064:143194`). All new desktop screens go inside **Meri · Standalone agent — complete product mockup** (`1064:143240`).
- Review map: **Meri · Review map** (`1064:143241`). It holds one labelled "Layout anchor" per screen, grouped by section frames 00 to 13. Every new screen needs an anchor in the right section row, named `Layout anchor · <ID> · <Name>`, with a label text `<ID>  /  <Name>`.
- Screen frames are siblings of the review map, 1440 × 1040 for desktop. Position rule, relative to `1064:143240`: x = 120 + cell x, and y = 120 + section y + row y + 41. Cells are 1540 apart: 0, 1540, 3080, 4620.
- Shared masters: section **Design dependencies · Editable shared masters** (`3008:299952`) and the **Components** page (`2:107`).

## Read before you start

1. Screenshot and inspect these templates. Duplicate them and change only the content, so header, sidebar, spacing and components stay consistent:
   - **09.08 Conversation management** (`1064:148633`): page heading plus inline card and form pattern. Use it for settings-type pages.
   - **06.01 Approval center** (`1064:147397`) and **08.01 Routines** (`1064:148241`): heading, tabs, striped table, action row and toned notice.
   - **11.01 Run and recovery state board** (`1064:149425`): the state-card grid.
   - **10.01 Dark workspace** (`1064:148697`), **10.02 Tablet conversation** (`1064:148772`) and **10.04 Mobile home** (`1064:148902`): dark, tablet and phone shells.
2. Read the audit at `docs/meri-figma-34-20261015/AUDIT.md` in `neo-capiro/capiro-frontend` (branch `meri/figma-34-ui`). Its "Missing from the design" list is the source of this handoff.
3. Read the existing Meri preferences implementation in the same repository, since frames 09.01 to 09.07 must match it: `apps/web/src/features/settings/MeriPreferences.tsx` and `apps/web/src/features/settings/preferences/PreferencePages.tsx`. The sidebar "Preferences" item opens these pages.

## Conventions every new frame must follow

- **Components, not drawings.** Use instances of the shared masters: `Capiro · Shared header` (component set `469:92041`, desktop Meri variant `469:41447`), the Meri navigation sidebar copied from a template with the correct current destination, `v2/Button` (`12:388`), `Meri/Status` (`441:81475`), `Meri/Field` (`441:81484`), `Meri/Action interaction` (`456:90479`), the Meri wordmark (`773:149102`), `Info tip` (`411:40617`) and the toast pattern `Capiro 3.4 / Library patterns / Sonner` (`1106:287282`). Use the AI Elements masters where they apply: PromptInput `456:90586`, Tool `456:90811`, Artifact `456:90897`, Attachment `456:90974`, Confirmation `456:91042`, Plan `456:91137`, Sources `456:91195`, Queue `456:91216`, Checkpoint `456:91253`, Context `456:91287` and FileTree `456:91308`. Do not detach instances.
- **Variables and styles only.** Bind colours to the file variables: `--foreground`, `--muted-foreground`, `--card`, `--background`, `--muted`, `--border`, `--input`, `--success`, `--success-subtle`, `--warning-text`, `--warning-subtle`, `--destructive-text` and `--destructive-subtle`. Use the `v2/*` text styles (Display, Title L, Title S, Body medium, Lede, Small, Label, Caption, Eyebrow, Button) and the `v2/shadow-xs` and `v2/metal-shadow` effects. Add no new raw hex colours. Dark frames use the dark variable mode, as in 10.01.
- **Icons:** the Lucide-style `icon/*` components only.
- **Synthetic but realistic copy.** Keep the existing sample world: Jordan Clayton, client Anduril, General scope, and dates around 10 to 16 October. No lorem ipsum. Copy must follow the product rules:
  - Never claim complete coverage.
  - A zero-result search is not proof of absence.
  - Memory changes are proposals until approved.
  - Approvals cover only the exact displayed action.
  - Revoked access blocks reuse of old content.
  - Actions say when they are rechecked before execution.
- **Accessibility:** visible focus examples on interactive families, text contrast at least 4.5:1, and labels on every field.
- **Prototype wiring:** connect sidebar items, primary buttons and overlays to existing frames, as the current screens do. Every new overlay needs a trigger and a close target.
- **Do not change existing frames,** except: renaming in item 7, adding anchors to the review map, and adding the new screens to the sidebar or prototype links.

## Work items, in priority order

### 1. Preferences, connections, usage and help: 09.01 to 09.07 (desktop)

The anchors already exist in review-map section 09 (`1064:143490`). The screen frames behind them are missing. Place them at:

| ID | Name | Position (x, y) | Anchor |
| --- | --- | --- | --- |
| 09.01 | Personal preferences | 120, 17911 | `1064:143495` |
| 09.02 | Connector accounts and permissions | 1660, 17911 | `1064:143498` |
| 09.03 | Usage and workspace limits | 3200, 17911 | `1064:143501` |
| 09.04 | Skills and artifact templates | 4740, 17911 | `1064:143504` |
| 09.05 | Notifications and account menu | 120, 19028 | `1064:143508` |
| 09.06 | Privacy and deletion | 1660, 19028 | `1064:143511` |
| 09.07 | Help, shortcuts and feedback | 3200, 19028 | `1064:143514` |

Use the Meri shell with "Preferences" as the current item. Each page has a heading and a tab or segmented switch between the seven pages, in this order:
- Personal defaults
- Connections
- Usage and limits
- Skills and templates
- Workspace updates
- Privacy and retention
- Help and shortcuts

Content must match the implemented pages:

- **09.01 Personal defaults.**
  - "Writing and workspace defaults" card with three fields: Writing style ("Concise, direct and grounded in sources"), Default scope ("Ask me when starting a new conversation") and Artifact template ("Capiro client brief").
  - Appearance: Light, Dark or System, with a preview.
  - Accessibility and keyboard-shortcut links.
  - A "Clear personal defaults" control with a confirmation.
  - A saved-state toast.
- **09.02 Connections.**
  - "Meri authorized connections" table: connection, account and scope, granted scope, last refresh, and health status.
  - Reconnect selected, and a "Disconnect the research portal?" confirmation.
  - Copy stating that credentials are never entered into Meri and that connection sign-in happens with the provider.
  - Connection states: connected, expired, revoked, needs reconnect.
- **09.03 Usage and limits.**
  - Today's usage and available capacity.
  - Run usage table: run reference, attempts, cost or usage, outcome.
  - Run limits for budget, concurrency and deadline, labelled "enforced by workspace policy".
  - Near-limit warning, budget reached at workspace level, and concurrency reached with the run queued.
  - Copy that every attempt counts, including failed and cancelled ones.
- **09.04 Skills and templates.**
  - "Meri artifact templates" list: Research brief, Client update deck, Spreadsheet analysis, each with a "Use skill" action and supported outputs.
  - "Approved artifact templates" with "Attach a permitted template".
  - Empty and unavailable states ("Approved template data is unavailable.").
  - Skills are workspace-approved; users cannot add arbitrary instructions as permissions.
- **09.05 Workspace updates and account menu.**
  - Notification preferences for run outcomes, decisions and connection changes.
  - An "Account updates" panel.
  - The open header profile menu: name, current tenant, Settings, Sign out.
  - The open header Updates panel with grouped items and empty state.
- **09.06 Privacy and retention.**
  - What Meri stores: conversations, UI events, uploads, browser state, previews, artifacts.
  - Retention period per class, shown as workspace policy, read-only.
  - "Delete this conversation?" confirmation with the copy "Only delete if permitted by your workspace policy." and "Some records may be retained".
  - Export of permitted messages.
  - Legal-hold and deletion-in-progress states; see item 2.
- **09.07 Help and shortcuts.**
  - Supported work.
  - "Designed Meri shortcuts" table: Enter to send, Shift+Enter for a new line, Tab and Shift+Tab to move between controls, search workspace, select search result.
  - "Report a problem" form with "What happened?", "Describe the problem" and an "Include run reference" toggle.
  - A submitted state.

### 2. Retention and deletion states: new board 11.06 (desktop, 1440 × 1040)

Place it at (3200, 26743) and add an anchor in review-map section 11 (`1064:143579`). Use the 11.0x state-card grid with these cards:
- Conversation removed by retention: old messages and files unavailable, receipts retained.
- Artifact version deleted: download unavailable, lineage and receipt kept.
- Deletion in progress.
- Deletion blocked by legal hold.
- Restored backup cannot revive revoked or deleted access.
- Export ready: permitted messages only.
- Retention policy changed.
- Upload expired.
- Browser session data cleared.

### 3. Session and availability states: new board 11.07 (desktop)

Place it at (4740, 26743), with an anchor. Cards:
- Signed out.
- Session expired: unsent draft kept, sign in again.
- Meri not enabled for this workspace.
- Conversation service unavailable: no sample content substituted.
- Document or action service unavailable.
- Degraded or partial service.
- No authorized client selected.
- Client access removed mid-session.
- Maintenance or read-only mode.

### 4. Artifact sharing and source scopes: new screen 04.08 (desktop)

Place it at (4740, 9392), with an anchor in section 04 (`1064:143379`). Show:
- An artifact version's contributing source scopes as chips, for example Anduril client files, Mailbox J. Clayton and Federal awards.
- Who can open it.
- A share or "file to client" attempt that is narrowed or blocked because a contributing scope is more restricted than the destination.
- The explanation that filing cannot expand access or remove provenance.
- A request-access path that creates an approval.

Wire it from 04.04 "File artifact to client".

### 5. Responsive and dark coverage

Add tablet (1024 × 1100), phone (390 × 844) and dark (1440 × 1040) variants inside section 10 (`1064:143518`), each with an anchor. Continue the numbering after 10.18. Priority order:
1. Phone: routines list, approval center, memory recall, run detail, conversation history, browser activity.
2. Tablet: approval center, routines, workspace files.
3. Dark: one representative screen each for runs, approvals, files, memory and routines.
4. Phone and tablet for 09.01 Preferences and 04.08 Sharing.

Reuse 10.02, 10.04 and 10.01 as templates.

### 6. Missing overlays and states found while auditing

Add these to section 13 (`1064:143982`) as overlay frames with triggers:
- Preferences saved, the 09.01 toast.
- Connection disconnected.
- Problem report sent.
- Export ready.
- Deletion requested.
- Signed out.

### 7. Fix tooling-coverage numbering (rename only)

In **Meri · Tooling coverage** (`1064:150752`), three IDs are each used twice and 12.09, 12.12 and 12.18 are unused. Rename frames only; do not change node IDs:

| Frame (node) | Current name | Rename to |
| --- | --- | --- |
| `1064:151682` | 12.07 · Funding & federal market | 12.09 · Funding & federal market |
| `1064:151762` | 12.08 · Budget lines & exact comparison | 12.12 · Budget lines & exact comparison |
| `1064:152575` | 12.15 · Artifact verification | 12.18 · Artifact verification |

Record the mapping in a note frame next to the section. If you think a different numbering is intended, write it in the note instead of guessing.

### 8. Fix inconsistencies found while building the screens

The frontend build of the existing frames found these problems. Fix them in place; they change copy or add states, not structure.

- **Text overflow.** 05.06 fact cards are fixed at 27px text height, so the proposed text spills over the "Visibility" label. 05.08's heading is fixed at 39px and clips "appendix". 06.03 and 08.02 text areas overflow their 44px inputs.
- **05.01 sources.** The frame shows 3 of "6 sources"; define the other three.
- **05.04 filter.** The query "Anduril priorities" with the "Current" filter shows a personal memory and a historical one. Decide what the filter options mean and make the drawn results match.
- **02.01 step icons.** "Research developments" has a check but says "Working"; "Analyze client signals" has a clock but says "Complete".
- **References.** The task proposal is TP-2048 in 06.01 and 06.04, the receipt says TASK-2048 and the evidence cites TASK-2047. The sidebar says "Approvals · 2" while 06.01 lists three pending proposals. In 08.04, runs SR-1023 and SR-1040 both output "Meeting brief v1".
- **Routine state.** 08.03 shows the routine as Active, while 08.04 shows it as both "Paused" and "Automatically disabled". 08.04's inline "Cancel future runs?" card duplicates the overlay with different copy. 08.02 is titled "New routine" with "Create routine" although 08.03 "Edit routine" opens it: add an edit-mode variant. Its "Next runs" copy should follow the chosen frequency.
- **Browser receipts.** "Research account connected" belongs to the authenticated flow, but 07.03's receipt reads "Public source · Allowed". 07.02 has no connected-account state.
- **Targets with no frame.** Add destinations, or remove the controls, for: 06.03 entry point; "Request changes" on 06.02 and 06.05 (06.07 is drawn only for TP-2048); "Change scope" on sources screens; "View connector health"; "Start a clean conversation"; "View expanded code activity"; "Use Anduril" in the scope picker; the Versions and Sources tabs on document screens; Source data and References tabs on the spreadsheet; the Activity tab on the web preview; comment Reply and Resolve; "Try again" on a suggestion.
- **Missing states.** Delete confirmation for a conversation; scope picker and command palette closed and empty states; empty and filtered-out history; failed copy ("Copy unavailable"); keyboard shortcuts content; filter menu contents; submitted and rejected memory-proposal states; loading and error states for memory and sources; pages 2 to 4 of the brief and slides 2 to 6 of the deck.
- **Mismatched content.** 03.07's source code does not match the 03.06 preview it claims to generate. 03.10 draws its dialog inline; confirm whether it should be a modal.
- **Dark status colours.** No dark values exist for the success, warning and destructive variables. The frontend uses provisional values (success #93c4a5 on #1d2a22, warning #e2c48e on #2c2618, destructive #eba3a3 on #2e1d1d); define the real ones in the dark mode.
- **Overlay triggers.** "Task created", "Routine paused", "Research account connected" and "Conversation deleted" are results of actions that stay disabled until the services connect; each needs a defined trigger path in the prototype.

## What not to do

- Do not redesign existing approved frames.
- Do not change the shared header, Portfolio or Modules screens.
- Do not add Quick log commitment flows. "Commitment / We owe / They owe" is excluded.
- Do not design authenticated browser takeover, in-browser Office editing or a device bridge. These are deferred in the plan.
- Do not invent real client data, real names beyond the existing synthetic set, or credential entry fields inside Meri.

## Definition of done

- Every frame in items 1 to 6 exists at the stated position, with a review-map anchor and label, using component instances and variables only.
- Prototype links work from the sidebar and the triggering buttons.
- Dark and phone variants use the dark variable mode and phone shell from the templates.
- Item 7 renames are done, and the note frame records them.
- Every item in 8 is fixed or answered in a note frame.
- Return a list of every new or renamed frame with its node ID, a screenshot of each, and any open questions. The frontend audit table will be updated from that list.
