import { z } from "zod";
import type { ProspectUpload } from "./prospect-upload";
import { MAX_BYTES } from "./contracts";
export const retainedUploadSchema = z
  .object({
    requestId: z.uuid(),
    prospectId: z.uuid(),
    actor: z.object({ tenantId: z.uuid(), userId: z.uuid() }).strict(),
    metadata: z
      .object({
        name: z.string().min(1),
        type: z.string().min(1),
        size: z.number().int().min(1).max(MAX_BYTES),
      })
      .strict(),
    checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
    s3Key: z.string().min(1).optional(),
    bytesStarted: z.boolean().optional(),
  })
  .strict()
  .refine((value) => !value.bytesStarted || Boolean(value.s3Key));
export const uploadRecoveryContract = {
  validateUpdate: (
    previous: z.infer<typeof retainedUploadSchema>,
    next: z.infer<typeof retainedUploadSchema>,
  ) => {
    if (
      previous.bytesStarted ||
      (previous.s3Key && previous.s3Key !== next.s3Key) ||
      JSON.stringify({
        ...previous,
        s3Key: undefined,
        bytesStarted: undefined,
      }) !==
        JSON.stringify({ ...next, s3Key: undefined, bytesStarted: undefined })
    )
      throw new Error(
        "The original upload has advanced in another view. Read its original confirmation; bytes cannot be repeated.",
      );
  },
  schema: retainedUploadSchema,
  requestId: (value: z.infer<typeof retainedUploadSchema>) => value.requestId,
};
export function retainedUpload(attempt: ProspectUpload) {
  return retainedUploadSchema.parse({
    requestId: attempt.requestId,
    prospectId: attempt.prospectId,
    actor: attempt.actor,
    metadata: attempt.metadata,
    checksumSha256: attempt.checksumSha256,
    ...(attempt.s3Key ? { s3Key: attempt.s3Key } : {}),
    ...(attempt.bytesStarted ? { bytesStarted: true } : {}),
  });
}
