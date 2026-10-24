import { z } from "zod";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  readRecovery,
  readRecoveryDisposition,
  reserveRecovery,
  updateRecovery,
  acknowledgeRecovery,
  retireFileBatchMoveRefusalRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import {
  commandSchema,
  batchMoveDigest,
  batchMoveReceiptSchema,
  batchMoveRefusalBodySchema,
  batchMoveRefusalSchema,
  type BatchMoveAttempt,
} from "./batch-move-contract";

const record = z
  .strictObject({
    command: commandSchema,
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    receipt: z.unknown().optional(),
    refusal: batchMoveRefusalBodySchema.optional(),
  })
  .refine(
    (value) =>
      value.receipt === undefined ||
      batchMoveReceiptSchema(value).safeParse(value.receipt).success,
    "The saved batch receipt does not match its original command.",
  )
  .refine(
    (value) =>
      value.refusal === undefined ||
      (value.receipt === undefined &&
        batchMoveRefusalSchema(value).safeParse(value.refusal).success),
    "The saved refusal does not match its original command.",
  );
const contract = {
  schema: record,
  requestId: (value: z.infer<typeof record>) => value.command.requestId,
  validateUpdate(
    previous: z.infer<typeof record>,
    next: z.infer<typeof record>,
  ) {
    if (
      JSON.stringify(previous.command) !== JSON.stringify(next.command) ||
      previous.digest !== next.digest ||
      (previous.receipt !== undefined &&
        JSON.stringify(previous.receipt) !== JSON.stringify(next.receipt)) ||
      (previous.refusal !== undefined &&
        JSON.stringify(previous.refusal) !== JSON.stringify(next.refusal))
    )
      throw new Error("The saved file move identity changed.");
  },
};
export function batchMoveRecovery(
  clientId: string,
  actor: ClientWriter,
  guard: () => void,
) {
  const scope = JSON.stringify([
    "file-batch-move-v1",
    actor.tenantId,
    actor.userId,
    clientId,
  ]);
  const durable = ({
    command,
    digest,
    receipt,
    refusal,
  }: BatchMoveAttempt) => ({
    command,
    digest,
    ...(receipt === undefined ? {} : { receipt }),
    ...(refusal === undefined ? {} : { refusal }),
  });
  async function load(): Promise<BatchMoveAttempt | null> {
    const value = await readRecovery(scope, contract, guard);
    guard();
    if (!value) return null;
    if (
      value.command.clientId !== clientId ||
      value.digest !== (await batchMoveDigest(value.command))
    )
      throw new Error(
        "Saved file move recovery does not match this client and command.",
      );
    guard();
    return { ...value, status: "unknown" };
  }
  return {
    load,
    async reserve(value: BatchMoveAttempt): Promise<BatchMoveAttempt> {
      const saved = await reserveRecovery(
        scope,
        value.command.requestId,
        durable(value),
        contract,
        guard,
      );
      return { ...saved, status: "unknown" };
    },
    received(value: BatchMoveAttempt) {
      // Storage-only preservation of an already validated response. updateRecovery enforces the original
      // pending request and immutable body; no authority, network call or UI adoption occurs here.
      return updateRecovery(
        scope,
        value.command.requestId,
        durable(value),
        contract,
        () => {},
      );
    },
    acknowledge: (requestId: string) =>
      acknowledgeRecovery(scope, requestId, guard),
    retireRefusal: (value: BatchMoveAttempt) =>
      retireFileBatchMoveRefusalRecovery(
        scope,
        value.command.requestId,
        batchMoveRefusalSchema(value).parse(value.refusal),
        guard,
      ),
    // Storage-only reconciliation of this original cache entry, never current authority or UI adoption.
    async settled(requestId: string) {
      const value = await readRecoveryDisposition(scope, requestId, () => {});
      return (
        value?.state === "acknowledged" ||
        (value?.state === "refused" && value.code === "FILE_BATCH_MOVE_REFUSED")
      );
    },
    lock: <T>(action: () => Promise<T>) =>
      withRecoveryCommandLock(scope, guard, action),
  };
}
