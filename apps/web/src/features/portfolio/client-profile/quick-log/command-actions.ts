import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { profileMemberOptionsSchema } from "../profile-receipts";
import type { ClientWriter } from "./authority";
import {
  activityCommandInputSchema,
  scopedCommandReceipt,
  type ActivityCommandInput,
  type ActivityCommandReceipt,
  type CommandIdentity,
} from "./command-contracts";

export type CommandContext = {
  clientId: string;
  actor: ClientWriter;
  input: ActivityCommandInput;
  known?: CommandIdentity;
};
export async function createActivityCommand(
  api: ApiClient,
  context: CommandContext,
  signal: AbortSignal,
  assert: () => void,
  dispatched: () => void,
) {
  const body = activityCommandInputSchema.parse(context.input);
  assert();
  signal.throwIfAborted();
  const members = await api.request(
    "core",
    "client-account-owners/options",
    profileMemberOptionsSchema,
    { signal },
  );
  assert();
  signal.throwIfAborted();
  if (
    !members.some(
      (member) => member.id.toLowerCase() === body.followUp.assigneeUserId,
    )
  )
    throw new ApiError(
      400,
      "The selected follow-up assignee is unavailable. Refresh members before saving.",
    );
  dispatched();
  const receipt = await api.request(
    "core",
    `clients/${encodeURIComponent(context.clientId)}/activity-commands`,
    scopedCommandReceipt(context.clientId, context.actor, body, context.known),
    { method: "POST", body, signal },
  );
  assert();
  signal.throwIfAborted();
  return receipt;
}
export async function readActivityCommand(
  api: ApiClient,
  context: CommandContext,
  signal: AbortSignal,
  assert: () => void,
) {
  assert();
  signal.throwIfAborted();
  const receipt = await api.request(
    "core",
    `clients/${encodeURIComponent(context.clientId)}/activity-commands/${encodeURIComponent(context.input.requestId)}`,
    scopedCommandReceipt(
      context.clientId,
      context.actor,
      context.input,
      context.known,
    ),
    { signal },
  );
  assert();
  signal.throwIfAborted();
  return receipt;
}
export async function resumeActivityCommand(
  api: ApiClient,
  context: CommandContext,
  current: ActivityCommandReceipt,
  signal: AbortSignal,
  assert: () => void,
  dispatched: () => void,
) {
  scopedCommandReceipt(
    context.clientId,
    context.actor,
    context.input,
    context.known,
  ).parse(current);
  if (
    !["pending", "needs_attention"].includes(current.status) ||
    current.followUp?.state === "completed"
  )
    throw new ApiError(
      409,
      "Read the current command and review its state before resuming.",
    );
  const expectedVersion = z
    .number()
    .int()
    .min(0)
    .max(2147483646)
    .parse(current.version);
  assert();
  signal.throwIfAborted();
  dispatched();
  const receipt = await api.request(
    "core",
    `clients/${encodeURIComponent(context.clientId)}/activity-commands/${encodeURIComponent(context.input.requestId)}/resume`,
    scopedCommandReceipt(context.clientId, context.actor, context.input, {
      ...context.known,
      version: current.version,
    }),
    { method: "POST", body: { expectedVersion }, signal },
  );
  assert();
  signal.throwIfAborted();
  return receipt;
}
