# Prospect Files and Workspace: contract review

**Status:** CONTRACT GAP, not implemented or accepted. Reviewed 2026-10-11 against backend `fd8765ec01d292013758606204f2c9d886cd31c1`, frontend `de0b8f09a20df7113fff8c60199993752c7d185c`, and current Figma nodes [Prospect Files](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-65071) and [Prospect Workspace](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-65188).

This confirms and narrows the packet baseline's partial-support assessment for `PROS-019`, `PROS-020`, and `PROS-021`. The Figma views are prospect-specific. The Files screen lists research and uploaded documents for one prospect, with search, upload, and open actions. Workspace shows that prospect's saved brief and proposals and opens those drafts.

## Verified current contracts

| Surface | Current source | Consequence |
| --- | --- | --- |
| Attachment upload/confirm | `apps/api/src/engagement/engagement.controller.ts`, `AttachmentUploadDto` and `ConfirmAttachmentDto`, routes near 2857 | Parent identifiers are `clientId`, `meetingId`, and `mailMessageId`; there is no `prospectId`. The service validates supplied parents at presign and confirm. |
| Attachment list | Same controller, `GET /api/engagement/attachments`; `engagement.service.ts` `listAttachments` | Requires one of those parents or explicit `unlinked=true`. Tenant-wide unlinked files cannot be presented as one prospect's files. Read ACL, supersession, scan readiness, and signed preview/download are already enforced. |
| Attachment persistence | `apps/api/prisma/schema.prisma`, `EngagementAttachment` | No prospect association or tenant+prospect index. The row already has tenant, uploader, viewer ACL, scan lifecycle, version, and S3 provenance. |
| BD prospect | `apps/api/prisma/schema.prisma`, `BusinessDevelopmentProspect` | BD prospect UUID and legacy Client UUID are separate identities. A prospect may later link to a Client; it is not a Client before that link. |
| Workspace drafts | `apps/workspace/prisma/schema.prisma`, `WsDraft`; `apps/workspace/src/drafts/dto/draft.dto.ts` | Drafts carry tenant/owner and a free-text `client`, with no authoritative `prospectId` association or prospect-filtered list. Free-text matching cannot safely establish ownership. |
| Portfolio frontend | `apps/portfolio-web/src/features/prospects/ProspectDetail.tsx` | Brief and proposals are shown, but no prospect Files or Workspace collection is composed. Existing generic draft endpoints would not establish prospect scope. |

## Contract decision needed before implementation

1. Choose the owner of prospect file association. The narrow route is to add a tenant-safe optional prospect parent to `EngagementAttachment` and the existing presign, confirm, list, preview, and lifecycle paths. It needs a composite tenant/prospect FK, index, RLS and grant review, and a rule for whether `clientId` and `prospectId` may coexist after conversion. A separate prospect-file resource is viable only if it retains the same scan/readiness, ACL, version, and signed URL protections.
2. Choose a persistent prospect-to-Workspace draft binding. It must use the prospect UUID and tenant identity, not `WsDraft.client` free text. Saved briefs and proposals also need a canonical draft/version link or explicit native-editor handoff. The current generic `GET /workspace-api/drafts` response is not a prospect collection.
3. Define conversion carry-over: whether files and drafts retain prospect association, gain client association, or are copied, and how duplicate visibility, ACL, and audit history behave. Do not silently recast a prospect UUID as a client UUID.

## Acceptance checks for the owner contract

- A user can list/search/open only accessible files for the requested prospect. A same-tenant different prospect, another tenant, and a removed or restricted file do not leak metadata or signed URLs.
- Presign and confirm validate the same tenant/prospect, including a prospect removed or converted between those calls. Confirm replay cannot relabel an S3 object to a different prospect. Quarantined, blocked, superseded, or unapproved content follows the existing readiness rules.
- The Workspace list contains only drafts explicitly bound to that prospect, opens the exact native draft/version, and displays truthful status and author. Generic tenant drafts do not appear by name coincidence.
- Conversion preserves the chosen association and history without broadening visibility. Native PostgreSQL migration, RLS, permission, retry, and cross-tenant tests pass before any row is accepted.
- The final UI is checked against both cited Figma screens on the integrated build. Signed-in browser, failure/recovery, and production-like storage/scan checks are still required.

**Current verdict:** `PROS-019`, `PROS-020`, `PROS-021` remain **BLOCKED on contract/owner decision** for implementation and **NOT RUN** for integrated acceptance. No shared backend worktree, migration, upload, or external write was made in this review.
