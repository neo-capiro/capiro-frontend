# Portfolio Overview source evidence — 2026-10-26

Read-only inspection of `neo-capiro/capiro-frontend` main at `393a2daeac0839ee6477600d09de9441137b8534`. This is source evidence, not browser/live qualification or authority to alter backend behavior.

## Missing surfaces

### Client details panel

Source: [ClientDetails.tsx](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/features/portfolio/client-profile/ClientDetails.tsx), [ProfileFacts.tsx](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/features/portfolio/client-profile/ProfileFacts.tsx).

Read-only card labeled **Client details**, placed below the activity timeline in Overview's supplemental grid. Exact rows:

- Primary POC at client
- Main company email
- Main company phone
- Engagement start date
- Small Business Classification
- Funding priorities
- Internal notes

Classification uses chips from accepted flags: Small Business (SB), WOSB, SDVOSB, HUBZone, 8(a), Large Business, Foreign-owned. Empty strings/empty arrays display **Not provided**, never zero. Values wrap anywhere and preserve newlines. Edits belong to the existing intake flow, not inline editing.

**Internal notes** in this card and **Profile notes** in the dialog use distinct fields; do not merge them.

### More actions overflow

Source: [ClientProfileActions.tsx](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/features/portfolio/client-profile/ClientProfileActions.tsx).

Ellipsis trigger accessible name: More actions for {client name}. End-aligned Radix DropdownMenu. Exact items:

1. Edit client profile
2. Export client profile JSON
3. Archive client

Edit permits `user_admin` and `capiro_admin`. Archive additionally permits `standard_user`. Export additionally requires current user and tenant identity, no identity fetch and no identity error. Disabled items stay visible. Item selection opens the existing matching dialog. Focus returns to the ellipsis when that dialog closes; successful archive navigates to /portfolio. There is no delete action in this menu.

### Profile notes dialog

Source: [NotesDialog.tsx](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/features/portfolio/client-profile/NotesDialog.tsx), [useProfileNotesEditor.ts](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/features/portfolio/client-profile/useProfileNotesEditor.ts), [notes-writer.ts](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/features/portfolio/client-profile/notes-writer.ts).

Entry: Notes icon in identity card, or Quick add > Account notes (`?notes=1`). Title: **Profile notes**. One **Notes** textarea (12 rows, max 20,000 characters), **Save notes** / **Saving…**, shared close icon.

- Current admin session required to edit. Non-admin text: Editing profile notes requires a current administrator session. Use Quick log to record new activity.
- Loading/read failure uses QueryState and read Retry.
- Current source required; loading/pending/read-only state prevents editing.
- Changed saved value shows a status requesting review before replacement.
- Unknown save is separate from definite failure; **Review saved notes** refetches, with **Current saved notes** disclosure.
- Draft remains while editor is mounted; review updates the baseline and unfreezes save only with current actor authorization.
- Save uses PUT `core/clients/{clientId}/profile-notes`, body `{notes}`, matching receipt; exact source and actor checks before write and on completion.
- No immutable original-request receipt/replay contract is present for this form.

**Close behavior limitation:** current generic Dialog supports X, Escape and scrim dismissal without an unsaved-close guard. Notes editor unmount loses its local draft. Do not label cross-close or cross-refresh draft preservation as shipped behavior. Any improved guard/persistence must be marked desired design/implementation follow-up.

### + Add focus tag dialog

Source: [FocusTags.tsx](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/features/portfolio/client-profile/tags/FocusTags.tsx), [actions.ts](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/features/portfolio/client-profile/tags/actions.ts).

Entry in Focus tag row: **+ Add** (accessible name + Add focus tag). Title: **Add focus tag**. Description: Add a focus area to this client profile. One **Focus tag** input (autocomplete off, max 100), **Close**, **Add tag** / **Saving…**.

- Requires current administrator role; no error/fetch in identity. Entry disabled while client is pending/failed.
- Trimmed input must contain 1–100 characters.
- Case-insensitive duplicate rejects with This focus tag is already saved.
- Unsupported saved tag format rejects without sending changes.
- Reads current client first, verifies client/tenant/not archived, then PUT `core/clients/{clientId}` with current intake data plus appended tags. Receipt must match exact tags.
- Displayed focus tags are de-duplicated union of existing portfolio/tags/sectors arrays; append writes tags only.
- Definite failure preserves typed input. Ambiguous post-dispatch result freezes input and Add tag and says current profile must be inspected; this editor does not resend.
- Same actor/client dialog close/reopen retains value and uncertainty because state is outside dialog. Actor/tenant/client replacement remounts session and does not carry the draft across that authority boundary.

## DG-12 source layout and focus evidence

Sources: [overview.module.css](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/features/portfolio/client-profile/overview.module.css), [profile-details.module.css](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/features/portfolio/client-profile/profile-details.module.css), [shell.module.css](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/shared/portfolio/shell/shell.module.css), [Dialog.tsx](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/shared/portfolio/ui/Dialog.tsx), [dialog-interaction.ts](https://github.com/neo-capiro/capiro-frontend/blob/393a2daeac0839ee6477600d09de9441137b8534/apps/web/src/shared/portfolio/ui/dialog-interaction.ts).

- Shell top header sticky at top0. Sidebar sticky top65px, viewport height minus65px. At1024 width, expanded sidebar remains232px; <=1000px uses72px icon rail.
- Overview and supplemental grids: two equal columns on desktop, one column <=1100px. Desktop horizontal padding64px; tablet32px.
- Client breadcrumb name ellipsizes at180px with title attribute. Do not claim title-only hover behavior is sufficient keyboard equivalent; explicit keyboard disclosure annotation is required by DG-12.
- Profile details values preserve newlines and wrap anywhere; tags wrap.
- Shared dialog width min(640px, viewport−32px), max-height90dvh and scrolls as a whole. Header currently not sticky. A persistent visible Close in long content is desired design, not verified existing implementation.
- Expanded timeline dialog has fixed header and independently scrolling body: up to880px width/height with viewport gutters.
- Dialog is aria-modal; Radix owns focus trap/portal semantics; controlled dialog close restores captured opener when still connected; nested Escape closes highest dialog only.
- Do not assert 1440/1024 browser interaction,200%zoom or phone acceptance from source inspection.

## Component discovery

No `*.figma.ts`, `*.figma.tsx`, `*.figma.js` or `*.figma.jsx` files exist in recursively inspected `apps/web/src` or `packages/ui` trees at the pinned main. Existing UI uses Radix/shadcn dialog and DropdownMenu, Lucide icons, common Portfolio fields and tokens. Figma component discovery must continue from existing native frames and libraries.

## Git handoff target

PR231 is open/unmerged at `5a9719b93a6f9b0b5140e438d868ced1cfd20fb6`, branch `docs/figma-34-audit-handoff-20261026`. Append an Overview addendum/new ledgers to the same PR and add a link from HANDOFF.md. Preserve earlier records as dated evidence. Do not merge; jump-server root owns integration.

No code, Figma, backend or deployment mutations made by this source audit. No tests or browser gates run.


