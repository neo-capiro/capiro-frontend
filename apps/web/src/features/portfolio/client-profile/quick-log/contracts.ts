import { z } from "zod";
export const quickLogObjectiveSchema = z.object({
  objectiveId: z.uuid(),
  objectiveVersion: z.number().int().min(1).max(2147483647),
  objectiveRevisionId: z.uuid(),
  availability: z.enum(["current", "changed", "unavailable"]),
});
export const quickLogDetailFields = {
  direction: z.enum(["we_owe", "they_owe"]).optional(),
  counterparty: z.string().trim().min(1).max(300).optional(),
  objectiveId: z.uuid().optional(),
  objectiveVersion: z.number().int().min(1).max(2147483647).optional(),
};
export const quickLogDetailReceiptFields = {
  // Older Core responses omit these fields. A requested detail is verified
  // against all three fields before a save is confirmed.
  direction: z.enum(["we_owe", "they_owe"]).nullable().optional(),
  counterparty: z.string().nullable().optional(),
  objective: quickLogObjectiveSchema.nullable().optional(),
};
export const quickLogInputBaseSchema = z.object({
  kind: z.enum(["note", "call", "email", "decision", "request", "commitment"]),
  title: z.string().trim().min(1, "Enter an activity title.").max(300),
  body: z.string().trim().max(5000),
  personId: z.uuid().optional(),
  occurredAt: z.iso.datetime({ offset: true }).optional(),
  dueAt: z.iso.datetime({ offset: true }).optional(),
  ...quickLogDetailFields,
});
export function validQuickLogDetails(input: {
  kind: string;
  direction?: string;
  objectiveId?: string;
  objectiveVersion?: number;
}) {
  return (
    (!input.direction ||
      input.kind === "commitment" ||
      input.kind === "request") &&
    Boolean(input.objectiveId) === (input.objectiveVersion !== undefined)
  );
}
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
    if (!validQuickLogDetails(input))
      context.addIssue({
        code: "custom",
        path:
          input.direction && !["commitment", "request"].includes(input.kind)
            ? ["direction"]
            : ["objectiveId"],
        message:
          "Select a current Objective and version together, and set direction only for a commitment or request.",
      });
  },
);
export type QuickLogInput = z.infer<typeof quickLogInputSchema>;
export function requestsQuickLogDetails(input: QuickLogInput) {
  return Boolean(input.direction || input.counterparty || input.objectiveId);
}
export function matchesQuickLogDetails(
  row: Pick<QuickLogReceipt, "direction" | "counterparty" | "objective">,
  input: QuickLogInput,
) {
  if (!requestsQuickLogDetails(input)) return true;
  return (
    row.direction === (input.direction ?? null) &&
    row.counterparty === (input.counterparty ?? null) &&
    (input.objectiveId
      ? row.objective?.objectiveId.toLowerCase() ===
          input.objectiveId.toLowerCase() &&
        row.objective.objectiveVersion === input.objectiveVersion
      : row.objective === null)
  );
}
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
  ...quickLogDetailReceiptFields,
});
export type QuickLogReceipt = z.infer<typeof quickLogReceiptSchema>;
