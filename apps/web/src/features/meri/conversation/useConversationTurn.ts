"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RunBinding } from "@capiro/meri-contracts";
import type { ConversationSubmitRequest } from "@capiro/meri-contracts/conversation-application";
import type { ConversationAccount } from "../../../shared/meri-conversations/host-controller";
import {
  reserveConversationTurn,
  type ConversationTranscriptPage,
} from "../../../shared/meri-conversations/history-client";
import {
  conversationIntentJournal,
  submissionIdentity,
  skillSelectionFields,
  type ConversationDraftRequest,
  type ConversationSkillSelection,
} from "../../../shared/meri-conversations/query-journal";
import {
  conversationTurnJournal,
  recoverConversationTurn,
  conversationTurnNotReady,
  type TurnIntent,
} from "../../../shared/meri-conversations/turn-journal";
import { useCommandGate } from "./useCommandGate";
import {
  requireMeriTabStorage,
  TabJournalUnavailable,
} from "../../../shared/meri-conversations/tab-journal";

export type ConversationTurnTarget = {
  conversationId: string;
  runId: string;
  pending: string;
  requestId: string;
  modelSelection?: ConversationSubmitRequest["modelSelection"];
  skill?: ConversationSubmitRequest["skill"];
  windowRequest?: ConversationSubmitRequest["windowRequest"];
  work?: ConversationSkillSelection["work"];
};

/** Seed the existing canonical command journal before exact target session issuance. */
function prepareTarget(
  cache: ReturnType<typeof useQueryClient>,
  clientId: string | null,
  retained: TurnIntent,
): ConversationTurnTarget {
  const binding = retained.receipt!.targetBinding;
  const commands = conversationIntentJournal(
    cache,
    {
      tenantId: binding.tenantId,
      actorId: binding.actorId,
      conversationId: binding.conversationId,
      runId: binding.runId,
      selectedClientId: clientId,
    },
    requireMeriTabStorage(),
  );
  const previous = commands.read();
  const request = {
    requestId: retained.requestId,
    prompt: retained.prompt,
    ...skillSelectionFields(retained),
    ...(retained.modelSelection
      ? { modelSelection: retained.modelSelection }
      : {}),
  };
  if (
    previous.submit &&
    (previous.submit.requestId !== retained.requestId ||
      previous.submit.prompt !== retained.prompt ||
      submissionIdentity({
        ...request,
        skill: previous.submit.skill,
        windowRequest: previous.submit.windowRequest,
        work: previous.submit.work,
        modelSelection: previous.submit.modelSelection,
      }) !== submissionIdentity(request))
  )
    throw new Error("Target request identity changed");
  if (!previous.submit)
    commands.write({
      ...previous,
      submit: {
        ...request,
        state: "unknown",
      },
    });
  return {
    conversationId: binding.conversationId,
    runId: binding.runId,
    pending: retained.prompt,
    requestId: retained.requestId,
    ...skillSelectionFields(retained),
    ...(retained.modelSelection
      ? { modelSelection: retained.modelSelection }
      : {}),
  };
}

/** Resolve one retained reservation before exposing its exact target to session issuance. */
async function requestTurn(
  journal: ReturnType<typeof conversationTurnJournal>,
  controller: AbortController,
  options: {
    source?: RunBinding | undefined;
    prompt?: string | undefined;
    readOnly: boolean;
    capture?: (request: ConversationDraftRequest) => void;
    modelSelection?: ConversationSubmitRequest["modelSelection"];
    selection?: ConversationSkillSelection;
  },
) {
  const { source, prompt, readOnly, capture, modelSelection, selection } =
    options;
  if (readOnly && source) {
    await reserveConversationTurn(
      { conversationId: source.conversationId, sourceRunId: source.runId },
      controller.signal,
    );
    return undefined;
  }
  if (source && prompt) {
    const request = Object.freeze({
      requestId: crypto.randomUUID(),
      prompt,
      ...skillSelectionFields(selection ?? {}),
      ...(modelSelection
        ? { modelSelection: Object.freeze({ ...modelSelection }) }
        : {}),
    });
    capture?.(request);
    journal.start(
      source,
      request.prompt,
      request.requestId,
      request.modelSelection,
      selection,
    );
  }
  const retained = await recoverConversationTurn(
    journal,
    (input) => reserveConversationTurn(input, controller.signal),
    controller.signal,
  );
  controller.signal.throwIfAborted();
  if (!journal.current()) throw new TabJournalUnavailable();
  return retained;
}

/** Restore hints without issuing a reservation or accepting a persisted target as authority. */
function useRetainedTurn(
  cache: ReturnType<typeof useQueryClient>,
  account: ConversationAccount,
  clientId: string | null,
  conversationId?: string,
) {
  const retention = useMemo(
    () => {
      try {
        return {
          journal: conversationId
            ? conversationTurnJournal(
                cache,
                account,
                clientId,
                conversationId,
                requireMeriTabStorage(),
              )
            : undefined,
          error: undefined,
        };
      } catch {
        return {
          journal: undefined,
          error: new TabJournalUnavailable().message,
        };
      }
    },
    // Identity values, rather than the presentation object's allocation, define this lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cache, account.tenantId, account.actorId, clientId, conversationId],
  );
  const journal = retention.journal;
  const intent = useSyncExternalStore(
    (notify) => cache.getQueryCache().subscribe(notify),
    () => journal?.read(),
    () => undefined,
  );
  return { journal, intent, error: retention.error };
}

/** Cancel only the current reservation when its exact journal owner leaves the screen. */
function useTurnLifetime(
  journal: ReturnType<typeof conversationTurnJournal> | undefined,
) {
  const active = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const gate = useCommandGate(alive, () => undefined);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      active.current?.abort();
      active.current = null;
    };
  }, [journal]);
  return { active, alive, gate };
}

/** Owns reservation recovery and completed-request acknowledgement; session issuance and submit stay separate. */
export function useConversationTurn(
  account: ConversationAccount,
  clientId: string | null,
  conversationId: string | undefined,
  open: (target: ConversationTurnTarget) => void,
  completedHistory?: ConversationTranscriptPage,
) {
  const cache = useQueryClient();
  const {
    journal,
    intent,
    error: retentionError,
  } = useRetainedTurn(cache, account, clientId, conversationId);
  const { active, alive, gate } = useTurnLifetime(journal);
  const [notReady, setNotReady] = useState(false);
  useEffect(() => {
    if (
      completedHistory &&
      !gate.busy &&
      !gate.error &&
      journal?.canAcknowledgeCompleted(completedHistory)
    )
      void gate.perform(async () => {
        journal.acknowledgeCompleted(completedHistory);
      });
    // Observe only fresh scoped history and the current immutable intent; this performs no network operation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedHistory, journal, intent, gate.busy, gate.error]);
  const perform = (
    source?: RunBinding,
    prompt?: string,
    readOnly = false,
    capture?: (request: ConversationDraftRequest) => void,
    modelSelection?: ConversationSubmitRequest["modelSelection"],
    selection?: ConversationSkillSelection,
  ) =>
    gate.perform(async () => {
      if (!journal?.current()) throw new TabJournalUnavailable();
      const controller = new AbortController();
      active.current = controller;
      setNotReady(false);
      try {
        const retained = await requestTurn(journal, controller, {
          source,
          prompt,
          readOnly,
          ...(capture ? { capture } : {}),
          ...(modelSelection ? { modelSelection } : {}),
          ...(selection ? { selection } : {}),
        });
        if (retained) open(prepareTarget(cache, clientId, retained));
      } catch (cause) {
        if (!readOnly && conversationTurnNotReady(cause)) {
          if (alive.current) setNotReady(true);
          return;
        }
        throw cause;
      } finally {
        if (active.current === controller) active.current = null;
      }
    });
  return {
    intent,
    busy: gate.busy,
    failed: !!gate.error,
    /** The last check could not reach control or was refused at the edge; nothing is known to be in flight. */
    failure: gate.failure,
    notReady,
    storageError:
      retentionError ??
      (journal?.recoveryBlocked ||
      gate.error === new TabJournalUnavailable().message
        ? new TabJournalUnavailable().message
        : undefined),
    start: (
      source: RunBinding,
      prompt: string,
      capture: (request: ConversationDraftRequest) => void,
      modelSelection?: ConversationSubmitRequest["modelSelection"],
      selection?: ConversationSkillSelection,
    ) => perform(source, prompt, false, capture, modelSelection, selection),
    retry: () => perform(),
    readMapping: (source: RunBinding) => perform(source, undefined, true),
  };
}
