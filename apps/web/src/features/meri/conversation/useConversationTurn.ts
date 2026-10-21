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
import type { ConversationAccount } from "../../../shared/meri-conversations/host-controller";
import {
  ConversationHistoryUnavailable,
  reserveConversationTurn,
} from "../../../shared/meri-conversations/history-client";
import { conversationIntentJournal } from "../../../shared/meri-conversations/query-journal";
import {
  conversationTurnJournal,
  reserveTurnWhenSettled,
  type TurnIntent,
} from "../../../shared/meri-conversations/turn-journal";
import { useCommandGate } from "./useCommandGate";

export type ConversationTurnTarget = {
  conversationId: string;
  runId: string;
  pending: string;
  requestId: string;
};

/** Seed the existing canonical command journal before exact target session issuance. */
function prepareTarget(
  cache: ReturnType<typeof useQueryClient>,
  clientId: string,
  retained: TurnIntent,
): ConversationTurnTarget {
  const binding = retained.receipt!.targetBinding;
  const commands = conversationIntentJournal(cache, {
    tenantId: binding.tenantId,
    actorId: binding.actorId,
    conversationId: binding.conversationId,
    runId: binding.runId,
    selectedClientId: clientId,
  });
  const previous = commands.read();
  if (
    previous.submit &&
    (previous.submit.requestId !== retained.requestId ||
      previous.submit.prompt !== retained.prompt)
  )
    throw new Error("Target request identity changed");
  if (!previous.submit)
    commands.write({
      ...previous,
      submit: {
        requestId: retained.requestId,
        prompt: retained.prompt,
        state: "unknown",
      },
    });
  return {
    conversationId: binding.conversationId,
    runId: binding.runId,
    pending: retained.prompt,
    requestId: retained.requestId,
  };
}

/** Owns reservation/recovery only; canonical session issuance and SDK submit retain their owners. */
export function useConversationTurn(
  account: ConversationAccount,
  clientId: string,
  conversationId: string | undefined,
  open: (target: ConversationTurnTarget) => void,
) {
  const cache = useQueryClient();
  const journal = useMemo(
    () =>
      conversationId
        ? conversationTurnJournal(cache, account, clientId, conversationId)
        : undefined,
    // Identity values, rather than the presentation object's allocation, define this lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cache, account.tenantId, account.actorId, clientId, conversationId],
  );
  const intent = useSyncExternalStore(
    (notify) => cache.getQueryCache().subscribe(notify),
    () => journal?.read(),
    () => undefined,
  );
  const active = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const gate = useCommandGate(alive, () => undefined);
  const [notReady, setNotReady] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      active.current?.abort();
      active.current = null;
    };
  }, [journal]);
  const perform = (source?: RunBinding, prompt?: string, readOnly = false) =>
    gate.perform(async () => {
      if (!journal?.current()) throw new Error("Conversation scope changed");
      const controller = new AbortController();
      active.current = controller;
      setNotReady(false);
      try {
        if (readOnly && source) {
          // Mapping recovery without a known submit identity never opens an input-capable target.
          await reserveConversationTurn(
            {
              conversationId: source.conversationId,
              sourceRunId: source.runId,
            },
            controller.signal,
          );
        } else {
          if (source && prompt)
            journal.start(source, prompt, crypto.randomUUID());
          const retained = await reserveTurnWhenSettled(
            journal,
            (input) => reserveConversationTurn(input, controller.signal),
            controller.signal,
          );
          controller.signal.throwIfAborted();
          if (!journal.current()) throw new Error("Conversation scope changed");
          open(prepareTarget(cache, clientId, retained));
        }
      } catch (cause) {
        if (
          alive.current &&
          cause instanceof ConversationHistoryUnavailable &&
          cause.status === 409 &&
          cause.code === "CONVERSATION_TURN_CONFLICT" &&
          cause.outcome === "NOT_DISPATCHED"
        )
          setNotReady(true);
        throw cause;
      } finally {
        if (active.current === controller) active.current = null;
      }
    });
  return {
    intent,
    busy: gate.busy,
    failed: !!gate.error,
    notReady,
    start: (source: RunBinding, prompt: string) => perform(source, prompt),
    retry: () => perform(),
    readMapping: (source: RunBinding) => perform(source, undefined, true),
  };
}
