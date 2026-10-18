"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ConversationAccount } from "../../../shared/meri-conversations/host-controller";
import { useConversationHistory } from "../../../shared/meri-conversations/history-queries";
import { useConversationConnection } from "./useConversationConnection";
import { useConversationTurn } from "./useConversationTurn";
import { sessionHistoryState } from "./saved-turns";
import type { TurnView } from "./conversation-view";
import { createInitialDraftOwner } from "./initial-draft";

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
  const history = useConversationHistory(account, clientId, selectedId);
  const ready = history.denied ? undefined : boundReady;
  useEffect(() => {
    if (history.denied && boundReady) connection.revoke();
  }, [history.denied, boundReady, connection.revoke]);
  const [draft, setDraft] = useState("");
  const [initialDraft] = useState(createInitialDraftOwner);
  useEffect(() => {
    if (boundReady) initialDraft.select(boundReady.port.context);
  }, [boundReady, initialDraft]);
  const updateDraft = useCallback(
    (value: string) => {
      initialDraft.edit();
      setDraft(value);
    },
    [initialDraft],
  );
  const [localTurns, setLocalTurns] = useState<readonly TurnView[]>([]);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const openTarget = useCallback(
    (target: { conversationId: string; runId: string; pending: string }) => {
      connection.reopen({ target, pending: target.pending });
    },
    [connection.reopen],
  );
  const continuation = useConversationTurn(
    account,
    clientId,
    selectedId,
    openTarget,
  );
  const view = sessionHistoryState(
    history,
    ready?.port.context.runId,
    localTurns,
    continuation.intent,
    continuation.busy,
  );
  const startNext = (prompt: string, finished: TurnView) => {
    if (!view.source || view.nextBlocked || !prompt) return;
    setLocalTurns((turns) => [
      ...turns.filter((turn) => turn.runId !== finished.runId),
      finished,
    ]);
    setDraft("");
    void continuation.start(view.source, prompt);
  };
  return {
    connection,
    ready,
    history,
    continuation,
    draft,
    setDraft: updateDraft,
    initialDraft,
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
