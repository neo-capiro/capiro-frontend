import type { QueryClient } from "@tanstack/react-query";
import type { ActionAttempt, ActionAttemptJournal } from "./attempt-journal";
import type { ActionContext } from "./session-receipt";

const idle: ActionAttempt = Object.freeze({ status: "idle" });
/** Retained across view navigation, cleared by the canonical application scope. */
export function actionQueryJournal(
  client: QueryClient,
  context: ActionContext,
): ActionAttemptJournal {
  const key = [
    "meri",
    "action-attempt",
    context.tenantId,
    context.actorId,
    context.conversationId,
    context.runId,
    context.selectedClientId,
  ];
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
