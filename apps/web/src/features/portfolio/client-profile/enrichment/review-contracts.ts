import { z } from "zod";
import { findingSchema, type FillRun } from "./contracts";
import { applicationResultSchema } from "./application-result";
export {
  applicationResultSchema,
  type ApplicationResult,
} from "./application-result";
const revision = z.string().regex(/^[a-f0-9]{64}$/);
export const reviewSnapshotSchema = z
  .object({
    clientId: z.uuid(),
    runId: z.uuid(),
    clientRevision: revision,
    findings: z.array(findingSchema.extend({ revision })),
  })
  .refine(
    (value) =>
      new Set(value.findings.map((f) => f.id)).size === value.findings.length &&
      value.findings.every(
        (f) => f.clientId === value.clientId && f.runId === value.runId,
      ),
  );
const commandSchema = z
  .strictObject({
    requestId: z.uuid(),
    expectedClientRevision: revision,
    findings: z
      .array(z.strictObject({ id: z.uuid(), revision }))
      .min(1)
      .max(200),
  })
  .refine(
    (value) =>
      new Set(value.findings.map((f) => f.id)).size === value.findings.length,
  );
const targetSchema = z.union([
  z.strictObject({ matterId: z.uuid() }),
  z.strictObject({
    newMatter: z.strictObject({ title: z.string().trim().min(1).max(300) }),
  }),
]);
export const applicationAttemptSchema = z
  .discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("apply"),
      runId: z.uuid(),
      command: commandSchema,
    }),
    z.strictObject({
      kind: z.literal("assign"),
      runId: z.uuid(),
      command: commandSchema,
      findingId: z.uuid(),
      target: targetSchema,
    }),
  ])
  .refine(
    (value) =>
      value.kind === "apply" ||
      (value.command.findings.length === 1 &&
        value.command.findings[0]?.id === value.findingId),
  );
export type ApplicationAttempt = z.infer<typeof applicationAttemptSchema>;
export function applicationResponse(attempt: ApplicationAttempt) {
  return applicationResultSchema.refine((result) => {
    const ids = [
      ...result.applied,
      ...result.alreadyApplied,
      ...result.errors.map((e) => e.findingId),
    ];
    const expected = attempt.command.findings.map((f) => f.id);
    const status = result.errors.length
      ? result.applied.length || result.alreadyApplied.length
        ? "partial"
        : "refused"
      : "completed";
    return (
      result.requestId === attempt.command.requestId &&
      result.status === status &&
      new Set(ids).size === ids.length &&
      ids.length === expected.length &&
      ids.every((id) => expected.includes(id))
    );
  });
}
export function applicationCommand(review: FillRun, ids: string[]) {
  return commandSchema.parse({
    requestId: crypto.randomUUID(),
    expectedClientRevision: review.clientRevision,
    findings: ids.map((id) => ({
      id,
      revision: review.findings.find((f) => f.id === id)?.revision,
    })),
  });
}
