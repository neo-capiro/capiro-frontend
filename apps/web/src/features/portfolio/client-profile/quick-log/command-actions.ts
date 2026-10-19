import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { profileMemberOptionsSchema } from "../profile-receipts";
import { activitySchema } from "../contracts";
import type { ClientWriter } from "./authority";
import { matchesQuickLogDetails, requestsQuickLogDetails } from "./contracts";
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
function sameInstant(left: string | null, right: string | null) {
  return left === null || right === null
    ? left === right
    : Date.parse(left) === Date.parse(right);
}
async function verifyRichActivity(
  api: ApiClient,
  context: CommandContext,
  receipt: ActivityCommandReceipt,
  signal: AbortSignal,
  assert: () => void,
) {
  const activity = context.input.activity;
  if (
    !receipt.activity.available ||
    !(
      requestsQuickLogDetails(activity) ||
      activity.kind === "commitment" ||
      activity.occurredAt ||
      activity.dueAt
    )
  )
    return;
  assert();
  signal.throwIfAborted();
  const rows = await api.request(
    "core",
    `clients/${encodeURIComponent(context.clientId)}/activity?limit=500`,
    z.array(activitySchema.extend({ personId: z.uuid().nullable() })).max(500),
    { signal },
  );
  assert();
  signal.throwIfAborted();
  const row = rows.find((item) => item.id === receipt.activity.id);
  const input = context.input.activity;
  if (
    !row ||
    row.origin !== "recorded" ||
    row.kind !== input.kind ||
    row.title !== input.title ||
    row.body !== (input.body || null) ||
    (row.personId?.toLowerCase() ?? null) !==
      (input.personId?.toLowerCase() ?? null) ||
    row.sourceType !== "activity_command" ||
    row.sourceId !== receipt.commandId ||
    !sameInstant(row.dueAt, input.dueAt ?? null) ||
    (input.occurredAt &&
      Date.parse(row.occurredAt) !== Date.parse(input.occurredAt)) ||
    !matchesQuickLogDetails(row, input)
  )
    throw new ApiError(
      502,
      "The command activity details are not confirmed in the client timeline. Read the original command and inspect the timeline before continuing.",
    );
}
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
  await verifyRichActivity(api, context, receipt, signal, assert);
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
  await verifyRichActivity(api, context, receipt, signal, assert);
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
  await verifyRichActivity(api, context, receipt, signal, assert);
  return receipt;
}
