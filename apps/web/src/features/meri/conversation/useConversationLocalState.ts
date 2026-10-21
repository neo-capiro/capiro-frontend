"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ConversationSubmitRequest } from "@capiro/meri-contracts/conversation-application";
import type { ActionContext } from "../../../shared/meri-actions/session-receipt";
import {
  requireMeriTabStorage,
  type TabScope,
} from "../../../shared/meri-conversations/tab-journal";
import type { TurnView } from "./conversation-view";
import { createInitialDraftOwner } from "./initial-draft";

function draftOwner(scope: TabScope | undefined, accessLost: boolean) {
  if (accessLost) {
    const owner = createInitialDraftOwner();
    owner.fail();
    return owner;
  }
  try {
    return createInitialDraftOwner(scope, requireMeriTabStorage());
  } catch {
    const owner = createInitialDraftOwner();
    owner.fail();
    return owner;
  }
}
/** Draft persistence owns text and revision; React subscribes only to this mounted view's changes. */
function useDraftState(
  context: ActionContext | undefined,
  accessLost: boolean,
  scope?: TabScope,
) {
  const owner = useMemo(
    () => draftOwner(scope, accessLost),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      scope?.tenantId,
      scope?.actorId,
      scope?.clientId,
      scope?.conversationId,
      accessLost,
    ],
  );
  const previous = useRef({ owner, scoped: !!scope });
  useSyncExternalStore(owner.subscribe, owner.snapshot, owner.snapshot);
  useEffect(() => {
    const prior = previous.current;
    if (prior.owner === owner) return;
    if (!prior.scoped && prior.owner.draft()) {
      try {
        owner.edit(prior.owner.draft());
      } catch {
        /* Text stays mounted; commands fail closed. */
      }
    }
    previous.current = { owner, scoped: !!scope };
  }, [owner, scope]);
  useEffect(() => {
    if (accessLost) owner.reset();
    else if (context) {
      try {
        owner.select(context);
      } catch {
        owner.fail();
      }
    }
  }, [context, accessLost, owner]);
  const edit = useCallback(
    (value: string) => {
      if (accessLost) return;
      try {
        owner.edit(value);
      } catch {
        /* owner preserves raw text and reports the storage failure. */
      }
    },
    [owner, accessLost],
  );
  return { owner, edit };
}

/** Raw text and rendered turns share the exact selected conversation's access lifetime. */
export function useConversationLocalState(
  context: ActionContext | undefined,
  accessLost: boolean,
  scope?: TabScope,
) {
  const { owner, edit } = useDraftState(context, accessLost, scope);
  const [turns, setTurns] = useState<readonly TurnView[]>([]);
  const [wasAccessLost, setWasAccessLost] = useState(accessLost);
  if (accessLost !== wasAccessLost) {
    setWasAccessLost(accessLost);
    if (accessLost) setTurns([]);
  }
  const bindNext = useCallback(
    (target: ActionContext, request: ConversationSubmitRequest) => {
      owner.bindNext(target, request);
    },
    [owner],
  );
  return {
    draft: accessLost ? "" : owner.draft(),
    turns: accessLost ? [] : turns,
    setDraft: edit,
    initialDraft: owner,
    storageError: owner.error(),
    bindNext,
    retainNext(finished: TurnView, request: ConversationSubmitRequest) {
      owner.reserve(owner.draft(), request);
      setTurns((previous) => [
        ...previous.filter((turn) => turn.runId !== finished.runId),
        finished,
      ]);
    },
  };
}
