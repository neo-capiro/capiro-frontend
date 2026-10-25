import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { identitySchema } from "@/shared/portfolio/auth/identity";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import { clientSchema } from "@/shared/session/client-contract";
import { prospectForIdSchema } from "@/features/portfolio/prospects/public";
import { readProspectFiles, type ProspectAttachment } from "../prospect-files";
import { prospectFileCopyCommandSchema } from "./contracts";

export class ProspectFileCopyAccessError extends Error {}
export function selectProspectUpload(file: ProspectAttachment) {
  if (
    file.source !== "manual" ||
    file.lifecycleStatus !== "ready" ||
    file.usable !== true ||
    file.calculatedSha256 !== file.checksumSha256
  )
    throw new Error("Choose a ready, verified prospect upload.");
  const selected = {
    sourceId: file.id,
    expectedRevision: file.metadataRevision,
    checksumSha256: file.calculatedSha256,
    contentLength: file.byteSize,
    fileName: file.fileName,
  };
  return {
    ...selected,
    ...prospectFileCopyCommandSchema
      .pick({
        sourceId: true,
        expectedRevision: true,
        checksumSha256: true,
        contentLength: true,
      })
      .parse({
        sourceId: selected.sourceId,
        expectedRevision: selected.expectedRevision,
        checksumSha256: selected.checksumSha256,
        contentLength: selected.contentLength,
      }),
  };
}
export type ProspectUploadSelection = ReturnType<typeof selectProspectUpload>;
/** Historical recovery checks current scope, never requires the old source or destination to still exist. */
export async function verifyProspectFileCopyAccess(
  api: ApiClient,
  actor: ClientWriter,
  prospectId: string,
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
      throw new ApiError(
        403,
        "Restore the original member account to continue.",
      );
    const [prospect, client] = await Promise.all([
      api.request(
        "core",
        `business-development/prospects/${prospectId}`,
        prospectForIdSchema(prospectId),
        { signal },
      ),
      api.request(
        "core",
        `clients/${clientId}`,
        clientSchema.refine(
          (row) => row.id === clientId && row.status !== "archived",
        ),
        { signal },
      ),
    ]);
    guard();
    signal.throwIfAborted();
    if (!prospect.convertedAt || prospect.linkedClientId !== clientId)
      throw new ApiError(
        409,
        "Restore the original converted prospect and linked client.",
      );
    return { prospect, client: { id: client.id, name: client.name } };
  } catch (cause) {
    throw new ProspectFileCopyAccessError(
      "Current prospect or client access could not be verified. Restore access to review the saved copy.",
      { cause },
    );
  }
}
export async function readProspectFileCopyReview(
  api: ApiClient,
  actor: ClientWriter,
  prospectId: string,
  clientId: string,
  selected: ProspectUploadSelection,
  signal: AbortSignal,
  guard: () => void,
) {
  const pinned = structuredClone(selected);
  const context = await verifyProspectFileCopyAccess(
    api,
    actor,
    prospectId,
    clientId,
    signal,
    guard,
  );
  const rows = await readProspectFiles(api, prospectId, actor, signal, guard);
  const source = rows.find((row) => row.id === pinned.sourceId);
  if (
    !source ||
    JSON.stringify(selectProspectUpload(source)) !== JSON.stringify(pinned)
  )
    throw new Error(
      "The selected upload changed. Refresh files and review it again.",
    );
  const current = await verifyProspectFileCopyAccess(
    api,
    actor,
    prospectId,
    clientId,
    signal,
    guard,
  );
  if (
    context.prospect.updatedAt !== current.prospect.updatedAt ||
    JSON.stringify(context.client) !== JSON.stringify(current.client)
  )
    throw new Error("The prospect or linked client changed during review.");
  return { ...current, selection: pinned };
}
export type ProspectFileCopyReview = Awaited<
  ReturnType<typeof readProspectFileCopyReview>
>;
export function assertProspectFileCopyReview(
  review: ProspectFileCopyReview,
  current: ProspectFileCopyReview,
) {
  if (
    review.prospect.id !== current.prospect.id ||
    review.prospect.updatedAt !== current.prospect.updatedAt ||
    JSON.stringify(review.client) !== JSON.stringify(current.client) ||
    JSON.stringify(review.selection) !== JSON.stringify(current.selection)
  )
    throw new Error(
      "The reviewed upload or destination changed. Refresh the review before copying.",
    );
}
