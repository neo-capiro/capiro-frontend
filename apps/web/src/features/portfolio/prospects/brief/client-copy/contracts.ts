import { z } from "zod";
import { clientBriefCopyCommandSchema } from "@/shared/capiro/operations/workspace-client-brief-copy";
import { briefCopyIdSchema } from "@/shared/capiro/operations/workspace-brief-copy";

export const clientBriefCopyAttemptSchema = z
  .object({
    tenantId: briefCopyIdSchema,
    userId: briefCopyIdSchema,
    actorId: z.string().min(1).max(200),
    command: clientBriefCopyCommandSchema,
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
    clientName: z.string().min(1),
    sourceTitle: z.string().min(1),
  })
  .strict();
export type ClientBriefCopyAttempt = z.infer<
  typeof clientBriefCopyAttemptSchema
>;
export const clientBriefCopyRecoveryContract = {
  schema: clientBriefCopyAttemptSchema,
  requestId: (value: ClientBriefCopyAttempt) => value.command.requestId,
};
