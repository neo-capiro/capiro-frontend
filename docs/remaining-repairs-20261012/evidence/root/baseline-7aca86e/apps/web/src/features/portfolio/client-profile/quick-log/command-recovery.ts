import { z } from "zod";
import type { ApiClient } from "@/shared/portfolio/api/http";
import { verifyCoreWriter } from "@/shared/portfolio/auth/verify-writer";
import type { ClientWriter } from "./authority";
import { activityCommandInputSchema } from "./command-contracts";

export const retainedCommandSchema = z
  .object({
    input: activityCommandInputSchema,
    known: z
      .object({
        commandId: z.uuid().optional(),
        activityId: z.uuid().optional(),
        taskId: z.string().min(1).max(200).optional(),
        version: z.number().int().min(0).max(2147483647).optional(),
      })
      .strict(),
  })
  .strict();
export type RetainedCommand = z.infer<typeof retainedCommandSchema>;
export function validateCommandRecoveryUpdate(
  previous: RetainedCommand,
  next: RetainedCommand,
) {
  if (JSON.stringify(previous.input) !== JSON.stringify(next.input))
    throw new Error("The original command body cannot change.");
  for (const key of ["commandId", "activityId", "taskId"] as const)
    if (previous.known[key] && previous.known[key] !== next.known[key])
      throw new Error("Known command lineage cannot change.");
  if (
    previous.known.version !== undefined &&
    (next.known.version === undefined ||
      next.known.version < previous.known.version)
  )
    throw new Error("Known command version cannot move backwards.");
}
export const retainedCommandContract = {
  validateUpdate: validateCommandRecoveryUpdate,
  schema: retainedCommandSchema,
  requestId: (record: RetainedCommand) => record.input.requestId,
};
export function recoveryScope(actor: ClientWriter, clientId: string) {
  return JSON.stringify([
    "quick-log-follow-up",
    z.uuid().parse(actor.tenantId).toLowerCase(),
    z.uuid().parse(actor.userId).toLowerCase(),
    z.uuid().parse(clientId).toLowerCase(),
  ]);
}
export async function verifyCommandAuthority(
  api: ApiClient,
  actor: ClientWriter,
  clientId: string,
  signal: AbortSignal,
  assert: () => void,
) {
  const guard = () => {
    signal.throwIfAborted();
    assert();
  };
  guard();
  await verifyCoreWriter(api, actor, signal, guard);
  await api.request(
    "core",
    `clients/${encodeURIComponent(clientId)}`,
    z
      .object({ id: z.uuid() })
      .refine((value) => value.id.toLowerCase() === clientId.toLowerCase()),
    { signal },
  );
  guard();
}
