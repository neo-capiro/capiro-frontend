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

const schema = z.strictObject({
  command: researchCommandSchema,
  confirmed: z.literal(true).optional(),
});
export type SavedResearch = z.infer<typeof schema>;
export const researchRecoveryContract = {
  schema,
  requestId: (saved: SavedResearch) => saved.command.requestId,
  validateUpdate(before: SavedResearch, after: SavedResearch) {
    if (
      JSON.stringify(before.command) !== JSON.stringify(after.command) ||
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
    async reserve(command: ResearchCommand) {
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
