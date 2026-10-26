import { z } from "zod";
import type { OperationResponse } from "@/shared/capiro/contracts";
import type { workspaceExportOperations } from "@/shared/capiro/operations/workspace-exports";
import { workspaceId } from "@/shared/capiro/operations/workspace-schemas";
import {
  RecoveryStorageError,
  type RecoveryContract,
} from "@/shared/session/recovery/journal";

export type HillDayExportScope = {
  tenantId: string;
  userId: string;
  actorId: string;
  documentId: string;
  clientId: string;
};
export type HillDayExportReceipt = OperationResponse<
  (typeof workspaceExportOperations)["workspace.hillday.export.status"]
>;
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const intentSchema = z
  .object({
    requestId: workspaceId,
    documentId: workspaceId,
    clientId: workspaceId,
    pageSize: z.enum(["letter", "a4"]),
    exportId: workspaceId.optional(),
    proof: z
      .object({ renderInputSha256: digest, contentSha256: digest })
      .strict()
      .optional(),
  })
  .strict();
export type HillDayExportIntent = z.infer<typeof intentSchema>;
export const hillDayExportContract: RecoveryContract<HillDayExportIntent> = {
  schema: intentSchema,
  requestId: (value) => value.requestId,
  validateUpdate(previous, next) {
    if (
      previous.requestId !== next.requestId ||
      previous.documentId !== next.documentId ||
      previous.clientId !== next.clientId ||
      previous.pageSize !== next.pageSize ||
      (previous.exportId && previous.exportId !== next.exportId) ||
      (previous.proof &&
        (previous.proof.contentSha256 !== next.proof?.contentSha256 ||
          previous.proof.renderInputSha256 !== next.proof?.renderInputSha256))
    )
      throw new RecoveryStorageError();
  },
};
export function hillDayExportScope(scope: HillDayExportScope) {
  return JSON.stringify([
    "hillday-export",
    scope.tenantId,
    scope.userId,
    scope.actorId,
    scope.documentId,
    scope.clientId,
  ]);
}
/** Receipt identity and hashes bind the original render, never today's edited view. */
export function bindHillDayExport(
  receipt: HillDayExportReceipt,
  intent: HillDayExportIntent,
) {
  if (
    receipt.requestId !== intent.requestId ||
    receipt.documentId !== intent.documentId ||
    receipt.pageSize !== intent.pageSize ||
    (intent.exportId && receipt.exportId !== intent.exportId) ||
    (receipt.status === "ready" &&
      (!receipt.renderInputSha256 || !receipt.contentSha256)) ||
    (intent.proof &&
      (receipt.status !== "ready" ||
        receipt.renderInputSha256 !== intent.proof.renderInputSha256 ||
        receipt.contentSha256 !== intent.proof.contentSha256))
  )
    throw new Error("The export result does not match the original request.");
  if (receipt.url !== null) exportDownloadInput(receipt);
  return receipt;
}
/** The existing binary operation owns downloading; never navigate to a received URL. */
export function exportDownloadInput(receipt: HillDayExportReceipt) {
  const match = receipt.url?.match(
    /^\/workspace-api\/hillday\/files\/([a-f0-9-]+)\/([a-f0-9-]+)\?exp=(\d{10,16})&sig=([a-f0-9]{64})$/i,
  );
  if (
    !match ||
    match[1] !== receipt.documentId ||
    match[2] !== receipt.exportId ||
    Number(match[3]) !== Date.parse(receipt.expiresAt ?? "")
  )
    throw new Error("The download link does not match this export.");
  return {
    params: { id: receipt.documentId, exportId: receipt.exportId },
    query: { exp: match[3]!, sig: match[4]! },
  };
}
