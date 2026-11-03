import { z } from "zod";
import type { RunBinding } from "@capiro/meri-contracts";
import { receiveConversationRequest } from "@capiro/meri-contracts/conversation-application";
import { receiveConversationHistoryRequest } from "@capiro/meri-contracts/conversation-history";
import {
  skillSelectionFields,
  type ConversationDraftRequest,
} from "./query-journal";
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
    clear() {
      record.clear();
      if (record.read() !== undefined) throw new TabJournalUnavailable();
    },
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
    /** The retained draft is admitted by the public receiver here, never stored as a local shape. */
    write(
      intent: ConversationDraftRequest & {
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
          request: {
            requestId: intent.requestId,
            prompt: intent.prompt,
            ...skillSelectionFields(intent),
            ...(intent.uploads ? { uploads: intent.uploads } : {}),
            ...(intent.modelSelection
              ? { modelSelection: intent.modelSelection }
              : {}),
          },
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

/**
 * The next reservation control itself confirmed admitted no message, from this tab. The saved read
 * cannot settle it: one immutable target per source keeps the reservation row after the check, so
 * every later page still reports it. Only this tab's own answer is kept, and only for the exact
 * source and target Core bound.
 */
export function persistedOpenedReservation(
  scope: TabScope,
  storage?: TabStorage,
) {
  const record = tabRecord(
    scope,
    "turn-open",
    (value) => receiveOpenedReservation(scope, value),
    "",
    storage ?? null,
  );
  return {
    read() {
      const value = record.read();
      return value
        ? {
            sourceRunId: value.source.sourceRunId,
            targetRunId: value.targetRunId,
          }
        : undefined;
    },
    write(target: { sourceRunId: string; targetRunId: string }) {
      if (!storage) return;
      record.write({
        source: {
          conversationId: scope.conversationId,
          sourceRunId: target.sourceRunId,
        },
        targetRunId: target.targetRunId,
      });
    },
    clear() {
      record.clear();
    },
  };
}

/** The stored source is admitted by the public next-turn receiver, scoped to this conversation. */
function receiveOpenedReservation(scope: TabScope, value: unknown) {
  const local = z
    .strictObject({ source: z.unknown(), targetRunId: z.string().min(1) })
    .parse(value);
  const source = receiveConversationHistoryRequest(
    "nextTurn",
    bytes(local.source),
  );
  if (
    source.conversationId !== scope.conversationId ||
    source.sourceRunId === local.targetRunId
  )
    throw new TabJournalUnavailable();
  return {
    source: {
      conversationId: source.conversationId,
      sourceRunId: source.sourceRunId,
    },
    targetRunId: local.targetRunId,
  };
}

/**
 * The optional confirmation's own boundary. A record this page cannot read, save or retire only
 * means it asks control again; it must never fail the page, and a general journal refusal keeps its
 * own owner (`recoverPersistedTurn` still reports it as closed recovery).
 */
export function recoverOpenedReservation(
  scope: TabScope,
  storage?: TabStorage,
) {
  try {
    const record = persistedOpenedReservation(scope, storage);
    return {
      read() {
        try {
          return record.read();
        } catch {
          return undefined;
        }
      },
      write(target: { sourceRunId: string; targetRunId: string }) {
        try {
          record.write(target);
        } catch {
          /* Nothing durable was kept: the next page asks again. */
        }
      },
      retire() {
        try {
          record.clear();
        } catch {
          /* Nothing stale can be read back either. */
        }
      },
    };
  } catch {
    return undefined;
  }
}
