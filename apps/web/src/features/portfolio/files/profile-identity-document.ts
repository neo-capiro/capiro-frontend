import { z } from "zod";
import type { ApiClient } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import { attachmentSchema, type Attachment } from "./contracts";

export interface IdentityDocumentScope {
  assert: () => void;
  signal: AbortSignal;
}
export type IdentityDocumentTarget = {
  kind: "client" | "prospect";
  id: string;
};
const identityAttachmentSchema = attachmentSchema.extend({
  tenantId: z.uuid(),
  prospectId: z.uuid().nullable().optional(),
  meetingId: z.uuid().nullable().optional(),
  mailMessageId: z.uuid().nullable().optional(),
});
export const identityDocumentReady = (file: Attachment) =>
  file.usable === true &&
  ["ready", "legacy_ready"].includes(file.lifecycleStatus);

/** Reads readiness from the existing attachment owner; no extraction or profile is created. */
export async function readProfileIdentityDocument(
  api: ApiClient,
  attachmentId: string,
  actor: ClientWriter,
  scope: IdentityDocumentScope,
) {
  scope.assert();
  scope.signal.throwIfAborted();
  const rows = await api.request(
    "core",
    "engagement/attachments?unlinked=true",
    identityAttachmentSchema.array(),
    { signal: scope.signal },
  );
  scope.assert();
  scope.signal.throwIfAborted();
  const file = rows.find((row) => row.id === attachmentId);
  if (
    !file ||
    file.tenantId !== actor.tenantId ||
    file.uploadedByUserId !== actor.userId ||
    file.clientId ||
    file.prospectId ||
    file.meetingId ||
    file.mailMessageId ||
    file.source !== "profile_identity" ||
    file.viewerMode !== "restricted" ||
    file.viewerUserIds.length !== 1 ||
    file.viewerUserIds[0] !== actor.userId
  )
    throw new Error(
      "The original private identity document is no longer available.",
    );
  return file;
}

/** Links the same attachment, keeping it private unless profile sharing was explicitly selected. */
export async function linkProfileIdentityDocument(
  api: ApiClient,
  attachmentId: string,
  target: IdentityDocumentTarget,
  scope: IdentityDocumentScope,
  shareWithProfile = false,
) {
  z.uuid().parse(attachmentId);
  z.uuid().parse(target.id);
  scope.assert();
  scope.signal.throwIfAborted();
  const file = await api.request(
    "core",
    `engagement/attachments/${attachmentId}/profile-link`,
    identityAttachmentSchema.refine(
      (row) =>
        row.id === attachmentId &&
        row.source === "profile_identity" &&
        (target.kind === "client"
          ? row.clientId === target.id && !row.prospectId
          : row.prospectId === target.id && !row.clientId) &&
        !row.meetingId &&
        !row.mailMessageId &&
        (shareWithProfile
          ? row.viewerMode === "all"
          : row.viewerMode === "restricted" &&
            row.viewerUserIds.length === 1 &&
            row.viewerUserIds[0] === row.uploadedByUserId),
      "The document link did not preserve its original file and access.",
    ),
    {
      method: "POST",
      body: {
        [target.kind === "client" ? "clientId" : "prospectId"]: target.id,
        ...(shareWithProfile ? { shareWithProfile: true } : {}),
      },
      signal: scope.signal,
    },
  );
  scope.assert();
  scope.signal.throwIfAborted();
  return file;
}
