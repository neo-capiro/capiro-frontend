import { z } from "zod";
import {
  readRecovery,
  reserveRecovery,
  updateRecovery,
  acknowledgeRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import type { ReviewActor } from "./actions";
import {
  applicationAttemptSchema,
  applicationResultSchema,
  applicationResponse,
  type ApplicationAttempt,
  type ApplicationResult,
} from "./review-contracts";

const schema = z
  .strictObject({
    attempt: applicationAttemptSchema,
    outcome: applicationResultSchema.optional(),
  })
  .refine(
    (value) =>
      value.outcome === undefined ||
      applicationResponse(value.attempt).safeParse(value.outcome).success,
  );
export type SavedApplication = z.infer<typeof schema>;
const contract = {
  schema,
  requestId: (value: SavedApplication) => value.attempt.command.requestId,
  validateUpdate(previous: SavedApplication, next: SavedApplication) {
    if (
      JSON.stringify(previous.attempt) !== JSON.stringify(next.attempt) ||
      (previous.outcome !== undefined &&
        JSON.stringify(previous.outcome) !== JSON.stringify(next.outcome))
    )
      throw new Error(
        "The original reviewed application and result cannot change.",
      );
  },
};
export function reviewRecovery(
  clientId: string,
  actor: ReviewActor,
  guard: () => void,
) {
  const scope = JSON.stringify([
    "client-enrichment-review-v1",
    actor.tenantId,
    actor.userId,
    clientId,
  ]);
  return {
    load: () => readRecovery(scope, contract, guard),
    async reserve(attempt: ApplicationAttempt) {
      const saved = await reserveRecovery(
        scope,
        attempt.command.requestId,
        { attempt },
        contract,
        guard,
      );
      if (JSON.stringify(saved.attempt) !== JSON.stringify(attempt))
        throw new Error(
          "Recover the saved application before applying other findings.",
        );
      return saved;
    },
    received: (attempt: ApplicationAttempt, outcome: ApplicationResult) =>
      updateRecovery(
        scope,
        attempt.command.requestId,
        { attempt, outcome },
        contract,
        () => {},
      ),
    async acknowledge(requestId: string) {
      const saved = await readRecovery(scope, contract, guard);
      if (!saved?.outcome || saved.attempt.command.requestId !== requestId)
        throw new Error(
          "Recover the exact application result before acknowledging it.",
        );
      await acknowledgeRecovery(scope, requestId, guard);
    },
    lock: <T>(action: () => Promise<T>) =>
      withRecoveryCommandLock(scope, guard, action),
  };
}
