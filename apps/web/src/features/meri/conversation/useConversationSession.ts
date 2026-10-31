"use client";
import type { ResearchSelection } from "../../../shared/meri-conversations/research-context";
import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
import { useModelCatalog } from "../model-selection/useModelCatalog";
import { selectionAvailable } from "../model-selection/model-selection";
import {
  skillSelectionFields,
  storedSubmission,
  conversationSelectionOwner,
} from "../../../shared/meri-conversations/query-journal";
import { requireMeriTabStorage } from "../../../shared/meri-conversations/tab-journal";
import { conversationHref } from "../../../shared/meri-conversations/conversation-navigation";
import type { LifecycleTarget } from "./lifecycle/useRunLifecycle";

/** Bind the captured input to the reserved target before opening its exact authorized session. */
function useTurnOpening(
  account: ConversationAccount,
  clientId: string | null,
  reopen: ReturnType<typeof useConversationConnection>["reopen"],
  bindNext: ReturnType<typeof useConversationLocalState>["bindNext"],
  research?: ResearchSelection,
) {
  return useCallback(
    (target: ConversationTurnTarget) => {
      bindNext(
        {
          ...account,
          selectedClientId: clientId,
          ...(research
            ? { scopeKind: research.scopeKind, scope: research.scope }
            : {}),
          conversationId: target.conversationId,
          runId: target.runId,
        },
        {
          requestId: target.requestId,
          prompt: target.pending,
          ...skillSelectionFields(target),
          ...(target.modelSelection
            ? { modelSelection: target.modelSelection }
            : {}),
        },
      );
      reopen({
        target: { conversationId: target.conversationId, runId: target.runId },
        pending: target.pending,
      });
    },
    [reopen, bindNext, account, clientId, research],
  );
}

/** Read exact selected history and revoke the same connection on membership denial. */
function useSelectedHistory(
  account: ConversationAccount,
  clientId: string | null,
  conversationId: string | undefined,
  connection: ReturnType<typeof useConversationConnection>,
  research?: ResearchSelection,
) {
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
    ...(research ? ([research] as const) : ([] as const)),
  );
  const accessLost = connection.accessLost || history.denied;
  const ready = accessLost ? undefined : boundReady;
  const { revoke } = connection;
  useEffect(() => {
    if (history.denied) revoke();
  }, [history.denied, revoke]);
  return { boundReady, selectedId, history, accessLost, ready };
}

/** Screen lifetime composition: saved reads, exact session selection and retained next-turn intent. */
export function useConversationSession(
  account: ConversationAccount,
  clientId: string | null,
  conversationId?: string,
  research?: ResearchSelection,
) {
  const cache = useQueryClient();
  const router = useRouter();
  const connection = useConversationConnection(
    account,
    clientId,
    undefined,
    conversationId,
    research,
  );
  const { boundReady, selectedId, history, accessLost, ready } =
    useSelectedHistory(account, clientId, conversationId, connection, research);
  const { reopen } = connection;
  const modelCatalog = useModelCatalog(account, !accessLost);
  const local = useConversationLocalState(
    boundReady?.port.context,
    accessLost,
    selectedId
      ? { ...account, clientId, conversationId: selectedId }
      : undefined,
  );
  const { bindNext } = local;
  const modelBlocked = selectionAvailable(
    modelCatalog.document?.modelCatalog,
    local.modelSelection ?? null,
  )
    ? undefined
    : "Selected model is unavailable. Reload model choices or use the default.";
  const textarea = useRef<HTMLTextAreaElement>(null);
  const openTarget = useTurnOpening(
    account,
    clientId,
    reopen,
    bindNext,
    research,
  );
  const continuation = useConversationTurn(
    account,
    clientId,
    accessLost ? undefined : selectedId,
    openTarget,
    ready?.port.context.runId === history.current?.latestRun.binding.runId
      ? history.current
      : undefined,
  );
  const view = sessionHistoryState(
    history,
    ready?.port.context.runId,
    local.turns,
    accessLost ? undefined : continuation.intent,
    continuation.busy,
  );
  const skillSelection =
    local.skillSelection ??
    (view.acceptedRequest
      ? skillSelectionFields(storedSubmission(view.acceptedRequest))
      : {});
  const startNext = (prompt: string, finished: TurnView) => {
    if (
      !view.source ||
      view.nextBlocked ||
      !prompt ||
      local.storageError ||
      modelBlocked
    )
      return;
    void continuation.start(
      view.source,
      prompt,
      (request) => local.retainNext(finished, request),
      local.modelSelection,
      skillSelection,
    );
  };
  const openLifecycleTarget = (target: LifecycleTarget, browser = false) => {
    if (
      (!browser && (!ready || accessLost)) ||
      history.denied ||
      local.storageError ||
      connection.storageError ||
      target.tenantId !== account.tenantId ||
      target.actorId !== account.actorId ||
      (research && target.conversationId !== research.conversationId)
    )
      throw Error("Conversation target unavailable");
    const storage = requireMeriTabStorage();
    if (!storage) throw Error("Conversation target cannot be retained");
    conversationSelectionOwner(
      cache,
      account,
      clientId,
      target.conversationId,
      storage,
      research,
    ).record({
      ...target,
      selectedClientId: clientId,
      ...(research
        ? { scopeKind: research.scopeKind, scope: research.scope }
        : {}),
    });
    if (target.conversationId === selectedId) reopen({ target });
    else
      router.push(
        conversationHref(
          research
            ? { scopeKind: research.scopeKind, clientId: null }
            : clientId,
          target.conversationId,
        ),
      );
  };
  return {
    account,
    clientId,
    connection,
    selectedId,
    accessLost,
    ready,
    history,
    continuation,
    draft: local.draft,
    setDraft: local.setDraft,
    skillSelection,
    setSkillSelection: local.setSkillSelection,
    modelCatalog,
    modelSelection: local.modelSelection,
    setModelSelection: local.setModelSelection,
    modelBlocked,
    initialDraft: local.initialDraft,
    storageError:
      local.storageError ??
      connection.storageError ??
      continuation.storageError,
    textarea,
    ...view,
    startNext,
    openLifecycleTarget,
    openBrowserTarget: (target: LifecycleTarget) =>
      openLifecycleTarget(target, true),
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
