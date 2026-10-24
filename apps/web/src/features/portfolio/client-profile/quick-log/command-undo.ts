import { z } from "zod";
import type { ApiClient } from "@/shared/portfolio/api/http";
import { activitySchema } from "../contracts";
import { matchesQuickLogDetails, quickLogReceiptSchema } from "./contracts";
import {
  scopedCommandReceipt,
  type ActivityCommandReceipt,
} from "./command-contracts";
import type { CommandContext } from "./command-actions";

/** Current snapshot for a future explicit Undo, never historical command proof.
 * The original command receipt is verified independently before acknowledgment. */
export async function readCommandUndoSnapshot(
  api: ApiClient,
  context: CommandContext,
  receipt: ActivityCommandReceipt,
  signal: AbortSignal,
  guard: () => void,
) {
  scopedCommandReceipt(
    context.clientId,
    context.actor,
    context.input,
    context.known,
  ).parse(receipt);
  if (
    context.input.followUp ||
    receipt.status !== "completed" ||
    !receipt.activity.available
  )
    return undefined;
  guard();
  signal.throwIfAborted();
  const rows = await api.request(
    "core",
    `clients/${encodeURIComponent(context.clientId)}/activity?limit=500`,
    z
      .array(activitySchema.extend({ personId: z.uuid().nullable() }))
      .max(500)
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
      ),
    { signal },
  );
  guard();
  signal.throwIfAborted();
  const row = rows.find((item) => item.id === receipt.activity.id);
  const input = context.input.activity;
  if (
    !row ||
    row.origin !== "recorded" ||
    row.sourceType !== "activity_command" ||
    row.sourceId !== receipt.commandId ||
    row.kind !== input.kind ||
    row.title !== input.title ||
    row.body !== (input.body || null) ||
    (row.personId?.toLowerCase() ?? null) !==
      (input.personId?.toLowerCase() ?? null) ||
    row.pinned ||
    row.settledAt !== null ||
    (input.dueAt
      ? !row.dueAt || Date.parse(row.dueAt) !== Date.parse(input.dueAt)
      : row.dueAt !== null) ||
    (input.occurredAt &&
      Date.parse(row.occurredAt) !== Date.parse(input.occurredAt)) ||
    !matchesQuickLogDetails(row, input)
  )
    return undefined;
  return quickLogReceiptSchema.parse({
    ...row,
    clientId: context.clientId,
    tenantId: receipt.tenantId,
    actorUserId: receipt.actorUserId,
    createdByUserId: receipt.actorUserId,
  });
}
