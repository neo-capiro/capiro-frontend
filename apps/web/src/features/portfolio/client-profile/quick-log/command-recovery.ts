import { z } from "zod";
import type { ApiClient } from "@/shared/portfolio/api/http";
import { ApiError } from "@/shared/portfolio/api/http";
import { identitySchema } from "@/shared/portfolio/auth/identity";
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
export const retainedCommandContract = {
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
  const identity = await api.request("core", "me", identitySchema, { signal });
  guard();
  if (
    identity.user.id.toLowerCase() !== actor.userId.toLowerCase() ||
    identity.tenant?.id.toLowerCase() !== actor.tenantId.toLowerCase() ||
    !["standard_user", "user_admin", "capiro_admin"].includes(
      identity.role ?? "",
    )
  )
    throw new ApiError(
      403,
      "The current Core session cannot recover this saved command.",
    );
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
