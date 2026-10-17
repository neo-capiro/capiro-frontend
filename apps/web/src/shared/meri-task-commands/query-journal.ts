import type { QueryClient } from "@tanstack/react-query";
import type {
  ActionAttempt,
  ActionAttemptJournal,
} from "../meri-actions/attempt-journal";
import type { ActionContext } from "../meri-actions/session-receipt";

/** Task uncertainty survives navigation within the canonical application scope. */
export function taskCommandJournal(
  client: QueryClient,
  context: ActionContext,
): ActionAttemptJournal {
  const key = [
    "meri",
    "task-command-attempt",
    context.tenantId,
    context.actorId,
    context.conversationId,
    context.runId,
    context.selectedClientId,
  ];
  const idle: ActionAttempt = Object.freeze({ status: "idle" });
  client.setQueryDefaults(key, { gcTime: Infinity });
  client.setQueryData<ActionAttempt>(key, (previous) => previous ?? idle);
  const cache = client.getQueryCache();
  const owned = cache.find({ queryKey: key, exact: true });
  const current = () =>
    owned !== undefined && cache.find({ queryKey: key, exact: true }) === owned;
  return {
    read: () =>
      current()
        ? (client.getQueryData<ActionAttempt>(key) ?? idle)
        : { status: "unresolved", problem: "access-lost" },
    write: (attempt) => {
      if (current()) client.setQueryData(key, Object.freeze({ ...attempt }));
    },
  };
}
