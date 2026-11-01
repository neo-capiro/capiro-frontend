import type { QueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  updateRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import {
  plannerConsentRetained,
  type RetainedPlannerConsent,
} from "@/shared/capiro/operations/objective-planner-consent";
import type { SavedStrategySelection } from "@/shared/capiro/operations/objective-saved-review";
import { objectiveSourceAuthority } from "./objective-source-authority";
import type { PlannerConsentRecovery } from "./objective-planner-consent-session";

export function createPlannerConsentRecovery(
  api: ApiClient,
  cache: QueryClient,
  actor: ClientWriter,
  selection: SavedStrategySelection,
): PlannerConsentRecovery {
  const q = selection.query;
  const authority = objectiveSourceAuthority(api, cache, actor, {
    clientId: q.clientId,
    id: q.objectiveId,
    version: q.objectiveVersion,
  });
  const scope = JSON.stringify([
    "objective-planner-consent-v1",
    actor.tenantId,
    actor.userId,
    q.clientId,
    q.objectiveId,
    q.objectiveVersion,
  ]);
  const contract = {
    schema: plannerConsentRetained,
    requestId: (value: RetainedPlannerConsent) => value.request.body.requestId,
    validateUpdate(
      previous: RetainedPlannerConsent,
      next: RetainedPlannerConsent,
    ) {
      if (
        JSON.stringify(previous.request) !== JSON.stringify(next.request) ||
        JSON.stringify(previous.origin) !== JSON.stringify(next.origin) ||
        (previous.receipt &&
          JSON.stringify(previous.receipt) !== JSON.stringify(next.receipt))
      )
        throw new Error("The original Planner consent changed.");
    },
  };
  const check = (value: RetainedPlannerConsent | null) => {
    if (
      value &&
      (value.request.params.clientId !== q.clientId ||
        value.request.params.objectiveId !== q.objectiveId ||
        value.request.body.expectedObjectiveVersion !== q.objectiveVersion)
    )
      throw new Error("Planner recovery belongs to another Objective.");
    return value;
  };
  return {
    guard: authority.guard,
    authorize: authority.authorize,
    load: async () =>
      check(await readRecovery(scope, contract, authority.guard)),
    reserve: async (value) =>
      check(
        await reserveRecovery(
          scope,
          value.request.body.requestId,
          value,
          contract,
          authority.guard,
        ),
      )!,
    save: (value) =>
      updateRecovery(
        scope,
        value.request.body.requestId,
        value,
        contract,
        authority.guard,
      ),
    acknowledge: async (value) => {
      if (!value.receipt)
        throw new Error("Original Planner consent is unconfirmed.");
      const current = check(
        await readRecovery(scope, contract, authority.guard),
      );
      if (
        !current?.receipt ||
        JSON.stringify(current) !== JSON.stringify(value)
      )
        throw new Error("Original Planner consent changed.");
      await acknowledgeRecovery(
        scope,
        value.request.body.requestId,
        authority.guard,
      );
    },
    lock: (action) => withRecoveryCommandLock(scope, authority.guard, action),
  };
}
