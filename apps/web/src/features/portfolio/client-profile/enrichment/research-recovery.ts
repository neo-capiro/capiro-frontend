import { z } from "zod";
import {
  readRecovery,
  reserveRecovery,
  updateRecovery,
  acknowledgeRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import {
  researchCommandSchema,
  type ResearchCommand,
} from "./research-contracts";
import type { ReviewActor } from "./actions";
import {
  retryCommandSchema,
  retryResultSchema,
  matchesRetryResult,
  type RetryCommand,
  type RetryResult,
} from "./retry-contracts";

const commandSchema = z.union([researchCommandSchema, retryCommandSchema]);
const schema = z
  .strictObject({
    command: commandSchema,
    confirmed: z.literal(true).optional(),
    retry: retryResultSchema.optional(),
  })
  .refine((value) =>
    "input" in value.command
      ? value.retry === undefined
      : value.confirmed
        ? Boolean(value.retry && matchesRetryResult(value.command, value.retry))
        : value.retry === undefined,
  );
export type SavedResearch = z.infer<typeof schema>;
export const researchRecoveryContract = {
  schema,
  requestId: (saved: SavedResearch) => saved.command.requestId,
  validateUpdate(before: SavedResearch, after: SavedResearch) {
    if (
      JSON.stringify(before.command) !== JSON.stringify(after.command) ||
      (before.retry !== undefined &&
        JSON.stringify(before.retry) !== JSON.stringify(after.retry)) ||
      (before.confirmed && !after.confirmed)
    )
      throw new Error("The original research request cannot change.");
  },
};
export const researchScope = (clientId: string, actor: ReviewActor) =>
  JSON.stringify([
    "client-enrichment-start-v1",
    actor.tenantId,
    actor.userId,
    clientId,
  ]);
export function researchRecovery(
  clientId: string,
  actor: ReviewActor,
  guard: () => void,
) {
  const scope = researchScope(clientId, actor),
    contract = researchRecoveryContract;
  return {
    load: () => readRecovery(scope, contract, guard),
    async reserve(command: ResearchCommand | RetryCommand) {
      command = commandSchema.parse(command);
      const saved = await reserveRecovery(
        scope,
        command.requestId,
        { command },
        contract,
        guard,
      );
      if (JSON.stringify(saved.command) !== JSON.stringify(command))
        throw new Error(
          "Recover the saved research request before starting another.",
        );
      return saved;
    },
    received: (command: ResearchCommand) =>
      updateRecovery(
        scope,
        command.requestId,
        { command, confirmed: true },
        contract,
        () => {},
      ),
    receivedRetry: (command: RetryCommand, retry: RetryResult) =>
      updateRecovery(
        scope,
        command.requestId,
        { command, retry, confirmed: true },
        contract,
        () => {},
      ),
    async acknowledge(requestId: string) {
      const saved = await readRecovery(scope, contract, guard);
      if (!saved?.confirmed || saved.command.requestId !== requestId)
        throw new Error(
          "Recover the exact saved run before acknowledging research.",
        );
      await acknowledgeRecovery(scope, requestId, guard);
    },
    lock: <T>(work: () => Promise<T>) =>
      withRecoveryCommandLock(scope, guard, work),
  };
}
