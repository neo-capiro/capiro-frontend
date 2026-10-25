import { z } from "zod";

export const transferUuid = z
  .uuid()
  .refine((value) => value === value.toLowerCase());
export const transferTimestamp = z.iso
  .datetime()
  .refine((value) => new Date(value).toISOString() === value);
const source = {
  sourceId: transferUuid,
  expectedVersion: z.number().int().min(1).max(2147483647),
};
export const transferItemSchema = z.discriminatedUnion("action", [
  z
    .object({
      ...source,
      action: z.literal("create"),
      createRequestId: transferUuid,
    })
    .strict(),
  z
    .object({
      ...source,
      action: z.literal("link"),
      personId: transferUuid,
      expectedUpdatedAt: transferTimestamp,
    })
    .strict(),
  z.object({ ...source, action: z.literal("skip") }).strict(),
]);
export const transferCommandSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: transferUuid,
    prospectId: transferUuid,
    clientId: transferUuid,
    expectedProspectUpdatedAt: transferTimestamp,
    items: z.array(transferItemSchema).min(1).max(50),
  })
  .strict()
  .refine((command) => {
    const creates = command.items.filter((item) => item.action === "create");
    return (
      new Set(command.items.map((item) => item.sourceId)).size ===
        command.items.length &&
      new Set(creates.map((item) => item.createRequestId)).size ===
        creates.length &&
      command.items.every(
        (item, index) =>
          index === 0 ||
          command.items[index - 1]!.sourceId.localeCompare(item.sourceId) < 0,
      )
    );
  });
export type TransferCommand = z.infer<typeof transferCommandSchema>;
export const transferAttemptSchema = z
  .object({
    tenantId: transferUuid,
    actorUserId: transferUuid,
    command: transferCommandSchema,
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
    clientName: z.string().min(1),
    summary: z
      .array(
        z
          .object({
            sourceId: transferUuid,
            name: z.string().min(1),
            targetName: z.string().nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict()
  .refine(
    (attempt) =>
      attempt.summary.length === attempt.command.items.length &&
      attempt.summary.every(
        (row, index) => row.sourceId === attempt.command.items[index]!.sourceId,
      ),
  );
export type TransferAttempt = z.infer<typeof transferAttemptSchema>;
export const transferRecoveryContract = {
  schema: transferAttemptSchema,
  requestId: (attempt: TransferAttempt) => attempt.command.requestId,
};
const receiptBase = z.object({
  schemaVersion: z.literal(1),
  tenantId: transferUuid,
  actorUserId: transferUuid,
  requestId: transferUuid,
  prospectId: transferUuid,
  clientId: transferUuid,
  payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
  createdAt: transferTimestamp,
});
export const transferReceiptSchema = z.discriminatedUnion("status", [
  receiptBase
    .extend({
      status: z.literal("completed"),
      refusal: z.null(),
      result: z
        .object({
          items: z
            .array(
              z
                .object({
                  sourceId: transferUuid,
                  sourceVersion: z.number().int().positive(),
                  action: z.enum(["create", "link", "skip"]),
                  personId: transferUuid.nullable(),
                })
                .strict(),
            )
            .min(1)
            .max(50),
        })
        .strict(),
    })
    .strict(),
  receiptBase
    .extend({
      status: z.literal("refused"),
      result: z.null(),
      refusal: z
        .object({
          code: z.literal("PROSPECT_CONTACT_TRANSFER_REFUSED"),
          message: z.string().min(1).max(2000),
        })
        .strict(),
    })
    .strict(),
]);
export type TransferReceipt = z.infer<typeof transferReceiptSchema>;
