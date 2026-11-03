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
import type { ConversationContext } from "../../../shared/meri-conversations/session";
import {
  requireMeriTabStorage,
  type TabScope,
} from "../../../shared/meri-conversations/tab-journal";
import type { TurnView } from "./conversation-view";
import { createInitialDraftOwner } from "./initial-draft";
import type {
  ConversationDraftRequest,
  ConversationSkillSelection,
} from "../../../shared/meri-conversations/query-journal";
import { currentProcedureLabel } from "./procedure-presentation";

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
/** Whether a conversation context belongs to the draft owner's tab scope (an unscoped owner takes any). */
export const contextInScope = (
  context: ConversationContext,
  scope: TabScope | undefined,
) =>
  !scope ||
  (context.tenantId === scope.tenantId &&
    context.actorId === scope.actorId &&
    context.selectedClientId === scope.clientId &&
    context.conversationId === scope.conversationId);
/** Draft persistence owns text and revision; React subscribes only to this mounted view's changes. */
function useDraftState(
  context: ConversationContext | undefined,
  accessLost: boolean,
  scope?: TabScope,
  /** Advanced when the person discards a message this tab could not save or recover. */
  epoch = 0,
) {
  // Callers build the scope per render; the owner and the effects below key on its fields, never on
  // its identity, so a render can never re-run them by itself (an effect that resets the owner and
  // thereby re-renders would otherwise loop).
  const stableScope = useMemo(
    () => scope,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scope?.tenantId, scope?.actorId, scope?.clientId, scope?.conversationId],
  );
  const owner = useMemo(
    () => draftOwner(stableScope, accessLost),
    // The epoch replaces an owner whose record was discarded; it is not read by the factory.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stableScope, accessLost, epoch],
  );
  const previous = useRef({ owner, scoped: !!stableScope, epoch });
  useSyncExternalStore(owner.subscribe, owner.snapshot, owner.snapshot);
  useEffect(() => {
    const prior = previous.current;
    if (prior.owner === owner) return;
    // Unscoped text moves into the conversation; so does text typed while the discarded record was locked.
    if ((!prior.scoped || prior.epoch !== epoch) && prior.owner.draft()) {
      try {
        owner.edit(prior.owner.draft());
      } catch {
        /* Text stays mounted; commands fail closed. */
      }
    }
    previous.current = { owner, scoped: !!stableScope, epoch };
  }, [owner, stableScope, epoch]);
  useEffect(() => {
    if (accessLost) owner.reset();
    // A context of another scope (a client switch or a port still bound to the previous route) is
    // not a storage failure: this owner is replaced with the scope, so it must not lock itself.
    else if (context && contextInScope(context, stableScope)) {
      try {
        owner.select(context);
      } catch {
        owner.fail();
      }
    }
  }, [context, accessLost, owner, stableScope]);
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

/**
 * Presentation only, never part of the draft or the request: the name the current catalog reported
 * for one exact procedure selector. It belongs to the draft owner that was current when it was
 * reported, so a scope or lifetime change drops it, and it is only read while the applied selection
 * is still that same selector.
 */
function useProcedureName(
  owner: ReturnType<typeof createInitialDraftOwner>,
  accessLost: boolean,
  selection: ConversationSkillSelection | undefined,
) {
  const [reported, setReported] = useState<{
    owner: typeof owner;
    identity: string;
    text: string;
  }>();
  const rememberProcedureName = useCallback(
    (identity: string, text: string) => {
      if (accessLost) return;
      setReported((current) =>
        current?.owner === owner &&
        current.identity === identity &&
        current.text === text
          ? current
          : { owner, identity, text },
      );
    },
    [owner, accessLost],
  );
  return {
    procedureLabel:
      !accessLost &&
      reported?.owner === owner &&
      selection?.procedure !== undefined
        ? currentProcedureLabel(selection.procedure, reported)
        : undefined,
    rememberProcedureName,
  };
}

/** Raw text and rendered turns share the exact selected conversation's access lifetime. */
export function useConversationLocalState(
  context: ConversationContext | undefined,
  accessLost: boolean,
  scope?: TabScope,
  epoch = 0,
) {
  const { owner, edit } = useDraftState(context, accessLost, scope, epoch);
  const [modelDraft, setModelDraft] = useState<{
    owner: typeof owner;
    value: ConversationSubmitRequest["modelSelection"];
  }>({ owner, value: undefined });
  const [turns, setTurns] = useState<readonly TurnView[]>([]);
  const [wasAccessLost, setWasAccessLost] = useState(accessLost);
  if (accessLost !== wasAccessLost) {
    setWasAccessLost(accessLost);
    if (accessLost) setTurns([]);
  }
  const bindNext = useCallback(
    (target: ConversationContext, request: ConversationDraftRequest) => {
      owner.bindNext(target, request);
    },
    [owner],
  );
  const selection = accessLost ? undefined : owner.selection();
  const procedure = useProcedureName(owner, accessLost, selection);
  return {
    draft: accessLost ? "" : owner.draft(),
    turns: accessLost ? [] : turns,
    setDraft: edit,
    skillSelection: selection,
    /** The applied procedure's catalog name for this draft and lifetime. Presentation only. */
    procedureLabel: procedure.procedureLabel,
    rememberProcedureName: procedure.rememberProcedureName,
    setSkillSelection: (value: ConversationSkillSelection) => {
      if (accessLost) return;
      try {
        owner.selectSkill(value);
      } catch {
        owner.fail();
      }
    },
    modelSelection:
      !accessLost && modelDraft.owner === owner ? modelDraft.value : undefined,
    setModelSelection: (value: ConversationSubmitRequest["modelSelection"]) => {
      if (!accessLost) setModelDraft({ owner, value });
    },
    initialDraft: owner,
    storageError: owner.error(),
    bindNext,
    retainNext(finished: TurnView, request: ConversationDraftRequest) {
      owner.reserve(owner.draft(), request);
      setTurns((previous) => [
        ...previous.filter((turn) => turn.runId !== finished.runId),
        finished,
      ]);
    },
  };
}
