import { z } from "zod";
import { quickLogInputSchema } from "./contracts";
import type { ClientWriter } from "./authority";

const uuid = z.uuid().transform((value) => value.toLowerCase());
const timeZone = z
  .string()
  .min(1)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Enter a valid IANA time zone, such as America/New_York.");
export const followUpInputSchema = z
  .object({
    assigneeUserId: uuid,
    dueOn: z.iso.date().optional(),
    dueTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    timeZone: timeZone.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.dueOn ? Boolean(value.timeZone) : !value.dueTime && !value.timeZone,
    "A due date requires an explicit IANA time zone. Time and zone require a date.",
  );
export type FollowUpInput = z.infer<typeof followUpInputSchema>;
export const activityCommandInputSchema = z
  .object({
    requestId: uuid,
    activity: quickLogInputSchema.strict(),
    followUp: followUpInputSchema,
  })
  .strict();
export type ActivityCommandInput = z.infer<typeof activityCommandInputSchema>;
const commandReasonSchema = z.enum([
  "activity_removed",
  "person_unavailable",
  "assignee_unavailable",
  "planner_unavailable",
  "planner_access_denied",
  "planner_rejected",
  "planner_receipt_invalid",
  "planner_receipt_unavailable",
]);
export const activityCommandReceiptSchema = z
  .object({
    receiptVersion: z.literal(1),
    commandId: uuid,
    requestId: uuid,
    version: z.number().int().min(0).max(2147483647),
    tenantId: uuid,
    clientId: uuid,
    actorUserId: uuid,
    status: z.enum(["completed", "pending", "in_progress", "needs_attention"]),
    reason: commandReasonSchema.nullable(),
    activity: z.object({
      id: uuid,
      personId: uuid.nullable(),
      available: z.boolean(),
    }),
    followUp: z
      .object({
        owner: z.literal("planner"),
        requestId: uuid,
        assigneeUserId: uuid,
        state: z.enum(["pending", "completed", "unavailable"]),
        taskId: z.string().min(1).max(200).nullable(),
      })
      .nullable(),
  })
  .refine(
    (receipt) =>
      Boolean(receipt.reason) === (receipt.status === "needs_attention") &&
      receipt.activity.available === (receipt.reason !== "activity_removed") &&
      (!receipt.followUp ||
        (receipt.followUp.requestId === receipt.commandId &&
          (receipt.followUp.state === "completed") ===
            Boolean(receipt.followUp.taskId))) &&
      (receipt.status !== "completed" ||
        (receipt.activity.available &&
          (!receipt.followUp || receipt.followUp.state === "completed"))),
  );
export type ActivityCommandReceipt = z.infer<
  typeof activityCommandReceiptSchema
>;
export type CommandIdentity = {
  commandId?: string;
  activityId?: string;
  taskId?: string;
  version?: number;
};
export function scopedCommandReceipt(
  clientId: string,
  actor: ClientWriter,
  input: ActivityCommandInput,
  known: CommandIdentity = {},
) {
  return activityCommandReceiptSchema.refine(
    (receipt) =>
      receipt.clientId === clientId.toLowerCase() &&
      receipt.tenantId === actor.tenantId.toLowerCase() &&
      receipt.actorUserId === actor.userId.toLowerCase() &&
      receipt.requestId === input.requestId &&
      receipt.activity.personId ===
        (input.activity.personId?.toLowerCase() ?? null) &&
      receipt.followUp?.assigneeUserId === input.followUp.assigneeUserId &&
      (!known.commandId || receipt.commandId === known.commandId) &&
      (!known.activityId || receipt.activity.id === known.activityId) &&
      (!known.taskId ||
        !receipt.followUp?.taskId ||
        receipt.followUp.taskId === known.taskId) &&
      (known.version === undefined || receipt.version >= known.version),
  );
}
