import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { identitySchema } from "@/shared/portfolio/auth/identity";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import { clientSchema } from "@/shared/session/client-contract";
import { clientFilesSchema, type Attachment } from "./contracts";
import { fileDeletionCommandSchema } from "./deletion-contract";
export class FileDeletionAccessError extends Error {}
export type FileDeletionReview = Pick<
  Attachment,
  "id" | "clientId" | "fileName" | "metadataRevision"
>;
/** Receipt access survives removal of the target row; Core remains the current authority owner. */
export async function verifyFileDeletionAccess(
  api: ApiClient,
  actor: ClientWriter,
  clientId: string,
  signal: AbortSignal,
  guard: () => void,
) {
  try {
    guard();
    signal.throwIfAborted();
    const me = await api.request("core", "me", identitySchema, { signal });
    if (
      me.tenant?.id !== actor.tenantId ||
      me.user.id !== actor.userId ||
      !["standard_user", "user_admin", "capiro_admin"].includes(me.role ?? "")
    )
      throw new ApiError(403, "Restore the original member account.");
    await api.request(
      "core",
      `clients/${clientId}`,
      clientSchema.refine(
        (row) => row.id === clientId && row.status !== "archived",
      ),
      { signal },
    );
    guard();
    signal.throwIfAborted();
  } catch (cause) {
    throw new FileDeletionAccessError(
      "Current client access could not be verified. The original deletion remains held.",
      { cause },
    );
  }
}
export async function reviewFileDeletion(
  api: ApiClient,
  actor: ClientWriter,
  clientId: string,
  review: FileDeletionReview,
  signal: AbortSignal,
  guard: () => void,
) {
  guard();
  signal.throwIfAborted();
  if (review.clientId !== clientId)
    throw new Error("Review a file from the current client.");
  const rows = await api.request(
    "core",
    `engagement/attachments?${new URLSearchParams({ clientId })}`,
    clientFilesSchema(clientId),
    { signal },
  );
  guard();
  signal.throwIfAborted();
  const current = rows.find((row) => row.id === review.id);
  if (
    !current ||
    current.fileName !== review.fileName ||
    current.metadataRevision !== review.metadataRevision ||
    ["delete_pending", "delete_failed"].includes(current.lifecycleStatus)
  )
    throw new Error(
      "The reviewed file changed or is unavailable. Refresh files before a new deletion.",
    );
  return fileDeletionCommandSchema.parse({
    schemaVersion: 1,
    requestId: crypto.randomUUID(),
    clientId,
    expectedRevision: review.metadataRevision,
    attachmentId: review.id,
  });
}
