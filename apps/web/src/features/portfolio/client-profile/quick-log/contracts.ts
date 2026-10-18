import { z } from "zod";
export const quickLogInputBaseSchema = z.object({
  kind: z.enum(["note", "call", "email", "decision", "request", "commitment"]),
  title: z.string().trim().min(1, "Enter an activity title.").max(300),
  body: z.string().trim().max(5000),
  personId: z.uuid().optional(),
  occurredAt: z.iso.datetime({ offset: true }).optional(),
  dueAt: z.iso.datetime({ offset: true }).optional(),
});
export const quickLogInputSchema = quickLogInputBaseSchema.superRefine(
  (input, context) => {
    if (input.occurredAt && Date.parse(input.occurredAt) > Date.now())
      context.addIssue({
        code: "custom",
        path: ["occurredAt"],
        message: "Activity must have already occurred.",
      });
    if (input.dueAt && input.kind !== "commitment" && input.kind !== "request")
      context.addIssue({
        code: "custom",
        path: ["dueAt"],
        message: "Only commitments and requests carry a due date.",
      });
  },
);
export type QuickLogInput = z.infer<typeof quickLogInputSchema>;
export const quickLogReceiptSchema = z.object({
  id: z.uuid(),
  clientId: z.uuid(),
  tenantId: z.uuid(),
  actorUserId: z.uuid(),
  createdByUserId: z.uuid(),
  kind: quickLogInputBaseSchema.shape.kind,
  title: z.string(),
  body: z.string().nullable(),
  personId: z.uuid().nullable(),
  pinned: z.boolean(),
  dueAt: z.iso.datetime({ offset: true }).nullable(),
  settledAt: z.string().nullable(),
  sourceType: z.string().nullable(),
  sourceId: z.string().nullable(),
  occurredAt: z.iso.datetime({ offset: true }),
});
export type QuickLogReceipt = z.infer<typeof quickLogReceiptSchema>;
