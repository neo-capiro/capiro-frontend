import { isWatchProposal } from "./watch-view";
import { isBrowserProposal } from "./browser-view";
import { isBizdevProposal } from "./bizdev-view";
import { isLegislativeDocumentProposal } from "./legislative-document-view";
import { isClientRecordProposal } from "./client-record-view";
import { isLegiwatchProposal } from "./legiwatch-view";
import { z } from "zod";
import {
  receiveIntentsRequest,
  type IntentsDecideRequest,
  type IntentsProposal,
  type IntentsDecideResponse,
} from "@capiro/meri-client/intents";
import type { IntentsAccess } from "@/shared/meri-intents/access";
import {
  isResearchShareProposal,
  intentDecisionSettled,
} from "./research-share-view";
import { isResearchActionProposal } from "./research-action-view";
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
    const sharing =
      isWatchProposal(proposal) ||
      isBizdevProposal(proposal) ||
      isResearchShareProposal(proposal) ||
      isResearchActionProposal(proposal) ||
      isLegiwatchProposal(proposal) ||
      isClientRecordProposal(proposal) ||
      isLegislativeDocumentProposal(proposal);
    if (isBrowserProposal(proposal)) {
      // A browser decision is bound to the retained subject, its own binding and the intended approver.
      if (
        proposal.proposalId !== proposalId ||
        !("subjectSha256" in request) ||
        request.subjectSha256 !== proposal.subjectSha256 ||
        request.deliveryId !== deliveryId ||
        proposal.binding.tenantId !== actor.tenantId ||
        proposal.binding.actorId !== actor.actorId ||
        proposal.binding.conversationId !== actor.conversationId ||
        proposal.requiredApprover.tenantId !== actor.tenantId ||
        proposal.requiredApprover.actorId !== actor.actorId
      )
        throw new Error(
          "The current proposal does not match this saved decision.",
        );
      return;
    }
    const binding = sharing ? proposal.binding : proposal.command.binding;
    const approver = sharing ? proposal.binding : proposal.requiredApprover;
    const digestMatches =
      "commandSha256" in request && request.commandSha256 === proposal.commandSha256;
    if (
      proposal.proposalId !== proposalId ||
      !digestMatches ||
      request.deliveryId !== deliveryId ||
      binding.tenantId !== actor.tenantId ||
      binding.conversationId !== actor.conversationId ||
      approver.tenantId !== actor.tenantId ||
      approver.actorId !== actor.actorId
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
      onAccepted?: (reply: IntentsDecideResponse) => void,
    ) {
      return withRecoveryCommandLock(scope, guard, async () => {
        const input = await capture(request);
        matches(input, proposal, input.deliveryId);
        // A browser decision is written at most once. An already saved decision is read back through the
        // owner, never re-posted: reload and Check stay status-only for the SAME proposal.
        if (isBrowserProposal(proposal) && (await load()))
          throw new Error(
            "This browser decision is already saved. Reload or check its status; it is not sent again.",
          );
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
        // Preserve an admitted one-time result even if acknowledging local recovery fails.
        if (reply.kind === "ok") onAccepted?.(reply.value);
        if (reply.kind === "ok" && intentDecisionSettled(reply.value))
          await acknowledgeRecovery(scope, proposalId, guard);
        return reply;
      });
    },
  };
}
