import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { activitySchema } from "../contracts";
import { quickLogReceiptSchema, type QuickLogReceipt } from "./contracts";
import type { ClientWriter } from "./authority";
function sameInstant(left: string | null, right: string | null) {
  return left === null || right === null
    ? left === right
    : Date.parse(left) === Date.parse(right);
}
export async function undoQuickLog(
  api: ApiClient,
  receipt: QuickLogReceipt,
  actor: ClientWriter,
  guard: () => void,
  signal: AbortSignal,
  dispatched: () => void,
) {
  quickLogReceiptSchema.parse(receipt);
  if (
    receipt.tenantId !== actor.tenantId ||
    receipt.actorUserId !== actor.userId ||
    receipt.createdByUserId !== actor.userId
  )
    throw new ApiError(
      403,
      "Undo belongs to the session that created this activity.",
    );
  guard();
  const rows = await api.request(
    "core",
    `clients/${encodeURIComponent(receipt.clientId)}/activity?limit=500`,
    z
      .array(activitySchema.extend({ personId: z.uuid().nullable() }))
      .max(500)
      .refine(
        (rows) => new Set(rows.map((row) => row.id)).size === rows.length,
      ),
    { signal },
  );
  guard();
  signal.throwIfAborted();
  const current = rows.find(
    (row) => row.id === receipt.id && row.origin === "recorded",
  );
  if (
    !current ||
    current.kind !== receipt.kind ||
    current.title !== receipt.title ||
    current.body !== receipt.body ||
    Date.parse(current.occurredAt) !== Date.parse(receipt.occurredAt) ||
    current.personId !== receipt.personId ||
    current.pinned !== receipt.pinned ||
    !sameInstant(current.dueAt, receipt.dueAt) ||
    current.settledAt !== receipt.settledAt ||
    current.sourceType !== receipt.sourceType ||
    current.sourceId !== receipt.sourceId ||
    (receipt.direction !== undefined &&
      current.direction !== receipt.direction) ||
    (receipt.counterparty !== undefined &&
      current.counterparty !== receipt.counterparty) ||
    (receipt.objective !== undefined &&
      (current.objective === undefined ||
        current.objective?.objectiveId !== receipt.objective?.objectiveId ||
        current.objective?.objectiveVersion !==
          receipt.objective?.objectiveVersion ||
        current.objective?.objectiveRevisionId !==
          receipt.objective?.objectiveRevisionId))
  )
    throw new ApiError(
      409,
      "This entry changed or is not visible in the latest 500 timeline items. Open the timeline to review it; Undo was not sent.",
    );
  dispatched();
  await api.request(
    "core",
    `clients/${encodeURIComponent(receipt.clientId)}/activity/${encodeURIComponent(receipt.id)}`,
    z.object({ ok: z.literal(true) }),
    { method: "DELETE", signal },
  );
  guard();
}
