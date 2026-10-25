"use client";
import { useEffect, useMemo } from "react";
import type { IntentsScheduleReviewItem } from "@capiro/meri-contracts/intents-application";
import type { IntentsAccess } from "../../../shared/meri-intents/access";
import { RoutineWorkflow } from "../../../shared/meri-routines/workflow";
import type { SavedRoutine } from "../../../shared/meri-routines/recovery";
import { RoutineReview } from "./RoutineReview";

export function ConversationRoutine({
  item,
  connection,
}: {
  item: IntentsScheduleReviewItem;
  connection: NonNullable<IntentsAccess["routines"]>;
}) {
  const port = useMemo(() => {
    const seed: SavedRoutine = {
      requestId: item.proposal.proposalId,
      context: {
        tenantId: item.binding.tenantId,
        actorId: item.binding.actorId,
        conversationId: item.binding.conversationId,
        runId: item.binding.runId,
        selectedClientId: connection.context.selectedClientId,
      },
      prepare: {
        requestId: item.proposal.proposalId,
        operation: item.proposal.operation,
        request: item.request,
      } as SavedRoutine["prepare"],
      proposal: item.proposal,
      approving: false,
    };
    return new RoutineWorkflow({
      ...connection,
      seed,
      isCurrent: () => !connection.signal.aborted,
    });
  }, [item, connection]);
  useEffect(() => {
    const detach = port.attach();
    void port.load();
    return detach;
  }, [port]);
  return <RoutineReview port={port} />;
}
