import { z } from "zod";
import type { FillRun } from "./contracts";
export const retryCommandSchema = z.strictObject({
  requestId: z.uuid(),
  runId: z.uuid(),
  taskId: z.uuid(),
  expectedAttempt: z.number().int().min(0),
  expectedTaskType: z.string().regex(/^[a-z_]{1,80}$/),
});
export const retryResultSchema = retryCommandSchema
  .extend({
    status: z.enum(["queued", "refused"]),
    reason: z.string().nullable(),
  })
  .refine((value) =>
    value.status === "queued"
      ? value.reason === null
      : Boolean(value.reason?.trim()),
  );
export type RetryCommand = z.infer<typeof retryCommandSchema>;
export type RetryResult = z.infer<typeof retryResultSchema>;
export type RetrySelection = {
  runId: string;
  task: NonNullable<FillRun["tasks"]>[number];
};
export const matchesRetryResult = (
  command: RetryCommand,
  result: RetryResult,
) =>
  command.requestId === result.requestId &&
  command.runId === result.runId &&
  command.taskId === result.taskId &&
  command.expectedAttempt === result.expectedAttempt &&
  command.expectedTaskType === result.expectedTaskType;
export const retryResponse = (command: RetryCommand) =>
  z
    .object({
      ...retryCommandSchema.shape,
      status: z.enum(["queued", "refused"]),
      reason: z.string().nullable(),
      replayed: z.boolean(),
    })
    .transform(({ replayed, ...result }) => {
      // Transport metadata does not change the saved retry decision.
      void replayed;
      return result;
    })
    .pipe(retryResultSchema)
    .refine((result) => matchesRetryResult(command, result));
