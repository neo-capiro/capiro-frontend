# Ordinary document collaboration

`WorkspaceCollaboratorsPanel({ draftId })` renders the People with access entry
and dialog for an existing saved draft. It resolves `me.read` and the canonical
Workspace people list; a host prop never establishes authority. WorkspaceDraft
mounts it once for ordinary saved drafts using the current saved draft ID.
`WorkspaceInvitationEntry` is mounted in WorkspaceScreen and opens the independent
`WorkspaceInvitationInbox`, so a pending invitee needs no draft read to accept.

The current Workspace collaborators/notifications controllers remain the owners.
The new fixed operations pin Core PR152 head
`1bef95ea1504ffa1bef7149a59fb0cde0a69cb38`. A member choice uses the existing
`settings.tenantMembers` Clerk identity. Internal invitations are pending; owner
is a synthetic immutable list row. External recipient provisioning, source
context, locks, comments and newsletter review workflows are outside this slice.

Email is a separate explicit action on the saved invitation. Opening a panel,
creating an invitation, accepting it or refreshing never requests mail. The
provider's accepted receipt is not delivery. Unknown outcomes have no resend
control. A lost invitation acknowledgement is reconciled only against an actual
saved member row, without inventing an id or replaying the creation request.
Source rejection clears old people/actions, and the existing application scope
plus keyed document/current identity boundaries dispose replaced views.

Figma Modules file `zGvvF6V6hh7yweoplCdpdE`: owner `3153:116308`, actionable inbox
`3153:116352`, email status `3153:116473`. The actual design context/screenshots
were read with the design-to-code skill. Existing Modal, Select, Field and Button
components are reused, with local responsive card geometry. No static assets.

Focused fixed-operation tests are in
`apps/web/tests/workspace-collaboration.test.ts`; mounted fixtures are
in `apps/web/test/browser/workspace-collaboration/`. They mount the real components,
CapiroDataProvider and fixed-operation HTTP client; only loopback HTTP responses/session changes are synthetic. The
WorkspaceScreen case verifies invitation access without requesting a draft.
Owner, role/remove, pending recipient, lost acknowledgements, status/cancel,
revocation, late result disposal and narrow keyboard behavior are covered.
Root's `W3-WS08-ML24-CONSUMER-HANDOFF.md` records runnable local tooling, exact
public package resources, results and screenshots. Production build, backend
PostgreSQL, live authorization/provider effects and deployment are separate gates.
