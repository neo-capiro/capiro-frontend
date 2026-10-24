import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { activitySchema } from "../contracts";
import { matchesQuickLogDetails, quickLogReceiptSchema } from "./contracts";
import {
  scopedCommandReceipt,
  type ActivityCommandReceipt,
} from "./command-contracts";
import type { CommandContext } from "./command-actions";
import type { ClientWriter } from "./authority";

const revisionSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/);
export const commandUndoSnapshotSchema = quickLogReceiptSchema.extend({
  commandId: z.uuid(),
  creationRequestId: z.uuid(),
  revision: revisionSchema,
});
export type CommandUndoSnapshot = z.infer<typeof commandUndoSnapshotSchema>;
export const undoAttemptSchema = z
  .object({
    snapshot: commandUndoSnapshotSchema.pick({
      id: true,
      clientId: true,
      tenantId: true,
      actorUserId: true,
      commandId: true,
      creationRequestId: true,
      revision: true,
    }),
    input: z
      .object({
        schemaVersion: z.literal(1),
        requestId: z.uuid(),
        activityId: z.uuid(),
        expectedRevision: revisionSchema,
      })
      .strict(),
  })
  .strict()
  .refine(
    (value) =>
      value.input.activityId === value.snapshot.id &&
      value.input.expectedRevision === value.snapshot.revision,
  );
export type UndoAttempt = z.infer<typeof undoAttemptSchema>;
export const undoRecoveryContract = {
  schema: undoAttemptSchema,
  requestId: (value: UndoAttempt) => value.input.requestId,
  validateUpdate: (previous: UndoAttempt, next: UndoAttempt) => {
    if (JSON.stringify(previous) !== JSON.stringify(next))
      throw new Error("The original Undo cannot change.");
  },
};
export const undoRecoveryScope = (actor: ClientWriter, clientId: string) =>
  JSON.stringify([
    "quick-log-undo",
    z.uuid().parse(actor.tenantId),
    z.uuid().parse(actor.userId),
    z.uuid().parse(clientId),
  ]);
type UndoIdentity = Pick<
  CommandUndoSnapshot,
  | "commandId"
  | "creationRequestId"
  | "id"
  | "tenantId"
  | "clientId"
  | "actorUserId"
>;
export const undoPath = (identity: UndoIdentity) =>
  `clients/${encodeURIComponent(identity.clientId)}/activity-commands/${encodeURIComponent(identity.creationRequestId)}/undo`;
function undoIdentitySchema(identity: UndoIdentity, actor: ClientWriter) {
  if (
    identity.tenantId !== actor.tenantId ||
    identity.actorUserId !== actor.userId
  )
    throw new ApiError(
      403,
      "Undo belongs to the session that created this activity.",
    );
  return z.object({
    schemaVersion: z.literal(1),
    commandId: z.literal(identity.commandId),
    creationRequestId: z.literal(identity.creationRequestId),
    tenantId: z.literal(actor.tenantId),
    clientId: z.literal(identity.clientId),
    actorUserId: z.literal(actor.userId),
    activityId: z.literal(identity.id),
  });
}
export function undoRefusalSchema(identity: UndoIdentity, actor: ClientWriter) {
  return undoIdentitySchema(identity, actor)
    .extend({
      code: z.literal("ACTIVITY_UNDO_REFUSED"),
      requestId: z.uuid(),
      payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
      status: z.literal(409),
      message: z.string().min(1).max(500),
    })
    .strict();
}
export function undoStatusSchema(identity: UndoIdentity, actor: ClientWriter) {
  const base = undoIdentitySchema(identity, actor);
  return z.discriminatedUnion("status", [
    base
      .extend({
        status: z.literal("available"),
        revision: revisionSchema,
        activity: activitySchema.extend({
          id: z.literal(identity.id),
          personId: z.uuid().nullable(),
        }),
      })
      .strict(),
    base.extend({ status: z.literal("unavailable") }).strict(),
    base
      .extend({
        status: z.literal("removed"),
        undo: z
          .object({
            requestId: z.uuid(),
            payloadDigest: z.string().regex(/^[0-9a-f]{64}$/),
            removedAt: z.iso.datetime(),
          })
          .strict(),
      })
      .strict(),
  ]);
}
export async function readUndoStatus(
  api: ApiClient,
  identity: UndoIdentity,
  actor: ClientWriter,
  signal: AbortSignal,
  guard: () => void,
) {
  guard();
  signal.throwIfAborted();
  const result = await api.request(
    "core",
    undoPath(identity),
    undoStatusSchema(identity, actor),
    { signal },
  );
  guard();
  signal.throwIfAborted();
  return result;
}

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
  const identity = {
    commandId: receipt.commandId,
    creationRequestId: receipt.requestId,
    id: receipt.activity.id,
    clientId: context.clientId,
    tenantId: receipt.tenantId,
    actorUserId: receipt.actorUserId,
  };
  const current = await readUndoStatus(
    api,
    identity,
    context.actor,
    signal,
    guard,
  );
  if (current.status !== "available") return undefined;
  guard();
  signal.throwIfAborted();
  const row = current.activity;
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
  return commandUndoSnapshotSchema.parse({
    ...row,
    clientId: context.clientId,
    tenantId: receipt.tenantId,
    actorUserId: receipt.actorUserId,
    createdByUserId: receipt.actorUserId,
    commandId: receipt.commandId,
    creationRequestId: receipt.requestId,
    revision: current.revision,
  });
}
