import { z } from "zod";
import type { RunBinding } from "@capiro/meri-contracts";
import {
  receiveConversationRequest,
  type ConversationSubmitRequest,
} from "@capiro/meri-contracts/conversation-application";
import { receiveConversationHistoryRequest } from "@capiro/meri-contracts/conversation-history";
import {
  tabRecord,
  TabJournalUnavailable,
  type TabScope,
  type TabStorage,
} from "./tab-journal";

const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
function receiveTurn(value: unknown) {
  const local = z
    .strictObject({ source: z.unknown(), request: z.unknown() })
    .parse(value);
  return {
    source: receiveConversationHistoryRequest("nextTurn", bytes(local.source)),
    request: receiveConversationRequest("submit", bytes(local.request)),
  };
}

/** Persist requests, never reservation receipts. Explicit recovery must re-read the mapping. */
export function persistedTurn(scope: TabScope, storage?: TabStorage) {
  const record = tabRecord(
    scope,
    "turn",
    (value) => {
      const received = receiveTurn(value);
      if (received.source.conversationId !== scope.conversationId)
        throw new TabJournalUnavailable();
      return received;
    },
    "",
    storage ?? null,
  );
  return {
    current: record.current,
    read() {
      const value = record.read();
      return value
        ? {
            source: {
              tenantId: scope.tenantId,
              actorId: scope.actorId,
              conversationId: value.source.conversationId,
              runId: value.source.sourceRunId,
            },
            ...value.request,
            state: "unknown" as const,
          }
        : undefined;
    },
    write(
      intent: ConversationSubmitRequest & {
        source: Pick<
          RunBinding,
          "tenantId" | "actorId" | "conversationId" | "runId"
        >;
      },
    ) {
      if (!storage) return;
      if (
        intent.source.tenantId !== scope.tenantId ||
        intent.source.actorId !== scope.actorId
      )
        throw new TabJournalUnavailable();
      record.write(
        receiveTurn({
          source: {
            conversationId: intent.source.conversationId,
            sourceRunId: intent.source.runId,
          },
          request: { requestId: intent.requestId, prompt: intent.prompt },
        }),
      );
    },
  };
}

/** Corrupt or unavailable storage closes mutation recovery instead of inventing a fresh intent. */
export function recoverPersistedTurn(scope: TabScope, storage?: TabStorage) {
  try {
    const record = persistedTurn(scope, storage);
    return { record, intent: record.read(), blocked: false };
  } catch {
    return { record: undefined, intent: undefined, blocked: true };
  }
}
