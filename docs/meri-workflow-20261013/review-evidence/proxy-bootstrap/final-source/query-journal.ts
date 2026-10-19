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
  return {
    read: () => client.getQueryData<ActionAttempt>(key) ?? idle,
    write: (attempt) => {
      client.setQueryData(key, Object.freeze({ ...attempt }));
    },
  };
}
