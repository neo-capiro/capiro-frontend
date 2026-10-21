"use client";
import { useCallback, useEffect, useRef } from "react";
import type { ConversationAccount } from "../../../shared/meri-conversations/host-controller";
import { useConversationHistory } from "../../../shared/meri-conversations/history-queries";
import { useConversationConnection } from "./useConversationConnection";
import {
  useConversationTurn,
  type ConversationTurnTarget,
} from "./useConversationTurn";
import { sessionHistoryState } from "./saved-turns";
import type { TurnView } from "./conversation-view";
import { useConversationLocalState } from "./useConversationLocalState";

/** Bind the captured input to the reserved target before opening its exact authorized session. */
function useTurnOpening(
  account: ConversationAccount,
  clientId: string,
  reopen: ReturnType<typeof useConversationConnection>["reopen"],
  bindNext: ReturnType<typeof useConversationLocalState>["bindNext"],
) {
  return useCallback(
    (target: ConversationTurnTarget) => {
      bindNext(
        {
          ...account,
          selectedClientId: clientId,
          conversationId: target.conversationId,
          runId: target.runId,
        },
        { requestId: target.requestId, prompt: target.pending },
      );
      reopen({
        target: { conversationId: target.conversationId, runId: target.runId },
        pending: target.pending,
      });
    },
    [reopen, bindNext, account, clientId],
  );
}

/** Screen lifetime composition: saved reads, exact session selection and retained next-turn intent. */
export function useConversationSession(
  account: ConversationAccount,
  clientId: string,
  conversationId?: string,
) {
  const connection = useConversationConnection(
    account,
    clientId,
    undefined,
    conversationId,
  );
  const boundReady =
    connection.state.status === "ready" ? connection.state : undefined;
  const selectedId =
    conversationId ??
    boundReady?.port.context.conversationId ??
    connection.conversationId;
  const history = useConversationHistory(
    account,
    clientId,
    selectedId,
    !connection.accessLost,
  );
  const accessLost = connection.accessLost || history.denied;
  const ready = accessLost ? undefined : boundReady;
  const { revoke, reopen } = connection;
  useEffect(() => {
    if (history.denied) revoke();
  }, [history.denied, revoke]);
  const local = useConversationLocalState(boundReady?.port.context, accessLost);
  const { bindNext } = local;
  const textarea = useRef<HTMLTextAreaElement>(null);
  const openTarget = useTurnOpening(account, clientId, reopen, bindNext);
  const continuation = useConversationTurn(
    account,
    clientId,
    accessLost ? undefined : selectedId,
    openTarget,
  );
  const view = sessionHistoryState(
    history,
    ready?.port.context.runId,
    local.turns,
    accessLost ? undefined : continuation.intent,
    continuation.busy,
  );
  const startNext = (prompt: string, finished: TurnView) => {
    if (!view.source || view.nextBlocked || !prompt) return;
    local.retainNext(finished);
    void continuation.start(view.source, prompt);
  };
  return {
    connection,
    accessLost,
    ready,
    history,
    continuation,
    draft: local.draft,
    setDraft: local.setDraft,
    initialDraft: local.initialDraft,
    textarea,
    ...view,
    startNext,
    refresh: history.refresh,
    openLatest: () => {
      if (view.latestTarget) connection.reopen({ target: view.latestTarget });
    },
    readReservation: async () => {
      if (view.reservation)
        await continuation.readMapping(view.reservation.sourceBinding);
      history.refresh();
    },
  };
}
