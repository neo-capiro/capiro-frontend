import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import { attachmentSchema } from "./contracts";

export const prospectAttachmentSchema = attachmentSchema.extend({
  tenantId: z.uuid(),
  prospectId: z.uuid(),
  clientId: z.null(),
  meetingId: z.null(),
  mailMessageId: z.null(),
  s3Key: z.string().min(1),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
  calculatedSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
});
export type ProspectAttachment = z.infer<typeof prospectAttachmentSchema>;
export const prospectFileListSchema = (prospectId: string, tenantId: string) =>
  z
    .array(prospectAttachmentSchema)
    .refine(
      (rows) =>
        rows.every(
          (row) => row.prospectId === prospectId && row.tenantId === tenantId,
        ) && new Set(rows.map((row) => row.id)).size === rows.length,
    );
export async function readProspectFiles(
  api: ApiClient,
  prospectId: string,
  actor: ClientWriter,
  signal: AbortSignal,
  assert: () => void,
) {
  assert();
  signal.throwIfAborted();
  const rows = await api.request(
    "core",
    `engagement/attachments?prospectId=${encodeURIComponent(prospectId)}`,
    prospectFileListSchema(prospectId, actor.tenantId),
    { signal },
  );
  assert();
  signal.throwIfAborted();
  return rows;
}
export async function deleteProspectFile(
  api: ApiClient,
  prospectId: string,
  actor: ClientWriter,
  id: string,
  signal: AbortSignal,
  assert: () => void,
) {
  const rows = await readProspectFiles(api, prospectId, actor, signal, assert);
  if (!rows.some((row) => row.id === id))
    throw new ApiError(
      404,
      "This file is no longer available in the current prospect list.",
    );
  assert();
  signal.throwIfAborted();
  await api.request(
    "core",
    `engagement/attachments/${encodeURIComponent(id)}`,
    z.object({ ok: z.literal(true) }),
    { method: "DELETE", signal },
  );
  assert();
  signal.throwIfAborted();
}
