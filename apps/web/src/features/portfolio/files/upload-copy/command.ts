import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  prospectFileCopyAttemptSchema,
  prospectFileCopyCommandSchema,
  prospectFileCopyReceiptSchema,
  type ProspectFileCopyCommand,
  type ProspectFileCopyAttempt,
} from "./contracts";
import type { ProspectFileCopyReview } from "./review";
export const prospectFileCopyScope = (
  actor: ClientWriter,
  prospectId: string,
) =>
  JSON.stringify([
    "prospect-upload-copy",
    actor.tenantId,
    actor.userId,
    prospectId,
  ]);
export async function prospectFileCopyDigest(
  actor: ClientWriter,
  command: ProspectFileCopyCommand,
) {
  const canonical = prospectFileCopyCommandSchema.parse(command);
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify([
        "prospect-file-copy",
        1,
        actor.tenantId,
        actor.userId,
        canonical,
      ]),
    ),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export async function prepareProspectFileCopy(
  actor: ClientWriter,
  review: ProspectFileCopyReview,
  folder: string | null,
  requestId = crypto.randomUUID(),
) {
  const command = prospectFileCopyCommandSchema.parse({
    schemaVersion: 1,
    requestId,
    prospectId: review.prospect.id,
    clientId: review.client.id,
    expectedProspectUpdatedAt: review.prospect.updatedAt,
    sourceId: review.selection.sourceId,
    expectedRevision: review.selection.expectedRevision,
    checksumSha256: review.selection.checksumSha256,
    contentLength: review.selection.contentLength,
    folder,
  });
  return prospectFileCopyAttemptSchema.parse({
    tenantId: actor.tenantId,
    userId: actor.userId,
    command,
    payloadDigest: await prospectFileCopyDigest(actor, command),
    clientName: review.client.name,
    fileName: review.selection.fileName,
  });
}
export async function requestProspectFileCopy(
  api: ApiClient,
  actor: ClientWriter,
  attempt: ProspectFileCopyAttempt,
  send: boolean,
  signal: AbortSignal,
  guard: () => void,
) {
  guard();
  signal.throwIfAborted();
  const saved = prospectFileCopyAttemptSchema.parse(attempt);
  if (
    saved.tenantId !== actor.tenantId ||
    saved.userId !== actor.userId ||
    saved.payloadDigest !== (await prospectFileCopyDigest(actor, saved.command))
  )
    throw new Error(
      "The saved copy does not match this account or original command.",
    );
  guard();
  signal.throwIfAborted();
  const { command } = saved;
  const receipt = await api.request(
    "core",
    `engagement/attachments/prospect-copies${send ? "" : `/${command.requestId}`}`,
    prospectFileCopyReceiptSchema,
    {
      method: send ? "POST" : "GET",
      ...(send ? { body: command } : {}),
      signal,
    },
  );
  guard();
  signal.throwIfAborted();
  if (
    receipt.tenantId !== saved.tenantId ||
    receipt.actorUserId !== saved.userId ||
    receipt.requestId !== command.requestId ||
    receipt.prospectId !== command.prospectId ||
    receipt.clientId !== command.clientId ||
    receipt.sourceId !== command.sourceId ||
    receipt.expectedRevision !== command.expectedRevision ||
    receipt.payloadDigest !== saved.payloadDigest ||
    (receipt.result &&
      (receipt.result.fileName !== saved.fileName ||
        receipt.result.folder !== command.folder))
  )
    throw new ApiError(
      502,
      "The copy receipt does not match the reviewed upload. Keep the saved command for recovery.",
    );
  return receipt;
}
