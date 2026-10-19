import type { QueryClient } from "@tanstack/react-query";
import type { ActionContext } from "../meri-actions/session-receipt";
import {
  idleDocumentAttempt,
  type DocumentAttempt,
  type DocumentAttemptJournal,
} from "./attempt-journal";

/** The canonical cache lifetime owns these fences, including across navigation. */
export function documentQueryJournal(
  client: QueryClient,
  context: ActionContext,
): DocumentAttemptJournal {
  const key = [
    "meri",
    "document-attempt",
    context.tenantId,
    context.actorId,
    context.conversationId,
    context.runId,
    context.selectedClientId,
  ];
  client.setQueryDefaults(key, { gcTime: Infinity, structuralSharing: false });
  client.setQueryData<DocumentAttempt>(
    key,
    (previous) => previous ?? idleDocumentAttempt,
  );
  const cache = client.getQueryCache();
  const owned = cache.find({ queryKey: key, exact: true });
  const current = () =>
    owned !== undefined && cache.find({ queryKey: key, exact: true }) === owned;
  return {
    read: () =>
      current()
        ? (client.getQueryData<DocumentAttempt>(key) ?? idleDocumentAttempt)
        : { status: "unresolved", problem: "access-lost", fingerprints: [] },
    write: (attempt) => {
      if (current())
        client.setQueryData(
          key,
          Object.freeze({
            ...attempt,
            fingerprints: Object.freeze([...attempt.fingerprints]),
          }),
        );
    },
  };
}
