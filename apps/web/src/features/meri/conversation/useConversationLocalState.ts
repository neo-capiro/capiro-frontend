"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ConversationSubmitRequest } from "@capiro/meri-contracts/conversation-application";
import type { ActionContext } from "../../../shared/meri-actions/session-receipt";
import type { TurnView } from "./conversation-view";
import { createInitialDraftOwner } from "./initial-draft";

/** Unpersisted input and rendered turns share the selected conversation's access lifetime. */
export function useConversationLocalState(
  context: ActionContext | undefined,
  accessLost: boolean,
) {
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<readonly TurnView[]>([]);
  const [initialDraft] = useState(createInitialDraftOwner);
  const reservedDraft = useRef<{ text: string; revision: number } | null>(null);
  const [wasAccessLost, setWasAccessLost] = useState(accessLost);
  if (accessLost !== wasAccessLost) {
    setWasAccessLost(accessLost);
    if (accessLost) {
      setDraft("");
      setTurns([]);
    }
  }
  useEffect(() => {
    if (context) initialDraft.select(context);
  }, [context, initialDraft]);
  useEffect(() => {
    if (accessLost) {
      initialDraft.reset();
      reservedDraft.current = null;
    }
  }, [accessLost, initialDraft]);
  const edit = useCallback(
    (value: string) => {
      if (accessLost) return;
      initialDraft.edit();
      setDraft(value);
    },
    [initialDraft, accessLost],
  );
  const bindNext = useCallback(
    (target: ActionContext, request: ConversationSubmitRequest) => {
      const captured = reservedDraft.current;
      if (!captured) return;
      initialDraft.begin(target, request, captured.text, captured.revision);
      reservedDraft.current = null;
    },
    [initialDraft],
  );
  return {
    draft: accessLost ? "" : draft,
    turns: accessLost ? [] : turns,
    setDraft: edit,
    initialDraft,
    bindNext,
    retainNext(finished: TurnView) {
      setTurns((previous) => [
        ...previous.filter((turn) => turn.runId !== finished.runId),
        finished,
      ]);
      // Reservation is not message acceptance; the matching observed ACK consumes this capture.
      reservedDraft.current = {
        text: draft,
        revision: initialDraft.revision(),
      };
    },
  };
}
