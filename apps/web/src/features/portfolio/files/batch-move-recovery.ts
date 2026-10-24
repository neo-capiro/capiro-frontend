import { z } from "zod";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  readRecovery,
  readRecoveryAcknowledgement,
  reserveRecovery,
  updateRecovery,
  acknowledgeRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import {
  commandSchema,
  batchMoveDigest,
  batchMoveReceiptSchema,
  type BatchMoveAttempt,
} from "./batch-move-contract";

const record = z
  .strictObject({
    command: commandSchema,
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    receipt: z.unknown().optional(),
  })
  .refine(
    (value) =>
      value.receipt === undefined ||
      batchMoveReceiptSchema(value).safeParse(value.receipt).success,
    "The saved batch receipt does not match its original command.",
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
        JSON.stringify(previous.receipt) !== JSON.stringify(next.receipt))
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
  const durable = ({ command, digest, receipt }: BatchMoveAttempt) => ({
    command,
    digest,
    ...(receipt === undefined ? {} : { receipt }),
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
    // Storage-only reconciliation of this original cache entry, never current authority or UI adoption.
    acknowledged: (requestId: string) =>
      readRecoveryAcknowledgement(scope, requestId, () => {}),
    lock: <T>(action: () => Promise<T>) =>
      withRecoveryCommandLock(scope, guard, action),
  };
}
