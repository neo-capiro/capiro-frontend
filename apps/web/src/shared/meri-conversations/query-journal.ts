import type { QueryClient } from "@tanstack/react-query";
import type { ActionContext } from "../meri-actions/session-receipt";
export type ConversationIntent = Readonly<{
  submit?: {
    requestId: string;
    prompt: string;
    state: "pending" | "unknown" | "observed";
  };
  cancel?: "pending" | "unknown" | "observed";
}>;
/** Nonsecret command uncertainty follows this exact observed context in canonical scope memory. */
export function conversationIntentJournal(
  client: QueryClient,
  context: ActionContext,
) {
  const key = [
    "meri-conversation-intent",
    context.tenantId,
    context.actorId,
    context.conversationId,
    context.runId,
    context.selectedClientId,
  ];
  client.setQueryDefaults(key, { gcTime: Infinity });
  client.setQueryData<ConversationIntent>(key, (previous) => previous ?? {});
  const cache = client.getQueryCache(),
    owned = cache.find({ queryKey: key, exact: true });
  const current = () =>
    owned !== undefined && cache.find({ queryKey: key, exact: true }) === owned;
  return {
    read(): ConversationIntent {
      if (!current()) return {};
      const value = client.getQueryData<ConversationIntent>(key) ?? {};
      return {
        ...value,
        ...(value.submit?.state === "pending"
          ? { submit: { ...value.submit, state: "unknown" as const } }
          : {}),
        ...(value.cancel === "pending" ? { cancel: "unknown" as const } : {}),
      };
    },
    write(value: ConversationIntent) {
      if (current())
        client.setQueryData(
          key,
          Object.freeze({
            ...value,
            ...(value.submit
              ? { submit: Object.freeze({ ...value.submit }) }
              : {}),
          }),
        );
    },
  };
}

/** Reopening constrains issuance to the last observed run; a failed rebind never chooses another. */
export function conversationSelectionOwner(
  client: QueryClient,
  account: { tenantId: string; actorId: string },
  clientId: string,
) {
  const key = [
    "meri-conversation-selection",
    account.tenantId,
    account.actorId,
    clientId,
  ];
  client.setQueryDefaults(key, { gcTime: Infinity });
  client.setQueryData<{ conversationId?: string; runId?: string }>(
    key,
    (previous) => previous ?? {},
  );
  const cache = client.getQueryCache(),
    owned = cache.find({ queryKey: key, exact: true });
  const current = () =>
    owned !== undefined && cache.find({ queryKey: key, exact: true }) === owned;
  return {
    hints: {
      ...client.getQueryData<{ conversationId?: string; runId?: string }>(key),
      clientId,
    },
    record(context: ActionContext) {
      if (current())
        client.setQueryData(
          key,
          Object.freeze({
            conversationId: context.conversationId,
            runId: context.runId,
          }),
        );
    },
  };
}
