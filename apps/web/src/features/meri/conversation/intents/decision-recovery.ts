import { z } from "zod";
import {
  receiveIntentsRequest,
  type IntentsDecideRequest,
  type IntentsProposal,
} from "@capiro/meri-client/intents";
import type { IntentsAccess } from "@/shared/meri-intents/access";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";

export type IntentDecisionScope = Readonly<{
  tenantId: string;
  actorId: string;
  conversationId: string;
}>;
const contract = {
  schema: z.strictObject({ requestId: z.uuid(), request: z.unknown() }),
  requestId: (value: { requestId: string }) => value.requestId,
};

/** One exact decision per canonical proposal, using the existing encrypted command journal. */
export function intentDecisionRecovery(
  actor: IntentDecisionScope,
  proposalId: string,
  guard: () => void,
) {
  const scope = JSON.stringify([
    "meri-intent-decision-v1",
    actor.tenantId,
    actor.actorId,
    actor.conversationId,
    proposalId,
  ]);
  async function capture(value: unknown) {
    const request = await receiveIntentsRequest(
      "decide",
      JSON.stringify(value),
    );
    if (
      request.conversationId !== actor.conversationId ||
      request.proposalId !== proposalId
    )
      throw new Error(
        "The saved decision belongs to another conversation or proposal.",
      );
    guard();
    return request;
  }
  async function load() {
    const value = await readRecovery(scope, contract, guard);
    return value ? capture(value.request) : null;
  }
  function matches(
    request: IntentsDecideRequest,
    proposal: IntentsProposal,
    deliveryId: string,
  ) {
    if (
      proposal.proposalId !== proposalId ||
      request.commandSha256 !== proposal.commandSha256 ||
      request.deliveryId !== deliveryId ||
      proposal.command.binding.tenantId !== actor.tenantId ||
      proposal.command.binding.conversationId !== actor.conversationId ||
      proposal.requiredApprover.tenantId !== actor.tenantId ||
      proposal.requiredApprover.actorId !== actor.actorId
    )
      throw new Error(
        "The current proposal does not match this saved decision.",
      );
  }
  return {
    load,
    matches,
    /** A currently admitted durable list phase settles only its exact saved proposal. */
    async observed(proposal: IntentsProposal, deliveryId: string) {
      return withRecoveryCommandLock(scope, guard, async () => {
        const saved = await load();
        if (!saved) return;
        matches(saved, proposal, deliveryId);
        await acknowledgeRecovery(scope, proposalId, guard);
      });
    },
    async decide(
      access: IntentsAccess,
      request: IntentsDecideRequest,
      proposal: IntentsProposal,
      signal: AbortSignal,
    ) {
      return withRecoveryCommandLock(scope, guard, async () => {
        const input = await capture(request);
        matches(input, proposal, input.deliveryId);
        const stored = await reserveRecovery(
          scope,
          proposalId,
          { requestId: proposalId, request: input },
          contract,
          guard,
        );
        const exact = await capture(stored.request);
        if (JSON.stringify(exact) !== JSON.stringify(input))
          throw new Error(
            "A different decision is already saved. Refresh and recover that exact request.",
          );
        guard();
        signal.throwIfAborted();
        const reply = await access.decide(exact, proposal, signal);
        guard();
        if (reply.kind === "ok")
          await acknowledgeRecovery(scope, proposalId, guard);
        return reply;
      });
    },
  };
}
