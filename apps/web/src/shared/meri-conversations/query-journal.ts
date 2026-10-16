import type { QueryClient } from "@tanstack/react-query";
import {
  receiveConversationRequest,
  type ConversationStoredRequest,
  type ConversationSubmitRequest,
} from "@capiro/meri-contracts/conversation-application";
import type { ActionContext } from "../meri-actions/session-receipt";
export type ConversationIntent = Readonly<{
  submit?: Readonly<
    ConversationSubmitRequest & {
      state: "pending" | "unknown" | "observed";
    }
  >;
  cancel?: "pending" | "unknown" | "observed";
}>;

/** Recover the original requested window and skill selection, never the normalized execution window. */
export function storedSubmission(
  stored: ConversationStoredRequest,
): ConversationSubmitRequest {
  return receiveConversationRequest(
    "submit",
    new TextEncoder().encode(
      JSON.stringify({
        requestId: stored.requestId,
        prompt: stored.prompt,
        ...(stored.windowRequest
          ? { windowRequest: stored.windowRequest }
          : {}),
        ...(stored.skill
          ? {
              skill: {
                skillId: stored.skill.skillId,
                skillVersion: stored.skill.skillVersion,
              },
            }
          : {}),
      }),
    ),
  );
}

export const submissionIdentity = (input: ConversationSubmitRequest) =>
  JSON.stringify(input, (_, value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(
          Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
        )
      : value,
  );

function snapshotSubmit(submit: NonNullable<ConversationIntent["submit"]>) {
  const copy = structuredClone(submit);
  if (copy.windowRequest) Object.freeze(copy.windowRequest);
  if (copy.skill) Object.freeze(copy.skill);
  return Object.freeze(copy);
}
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
    current,
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
      if (current()) {
        client.setQueryData(
          key,
          Object.freeze({
            ...value,
            ...(value.submit ? { submit: snapshotSubmit(value.submit) } : {}),
          }),
        );
        return true;
      }
      return false;
    },
  };
}

/** Reopening constrains issuance to the last observed run; a failed rebind never chooses another. */
export function conversationSelectionOwner(
  client: QueryClient,
  account: { tenantId: string; actorId: string },
  clientId: string,
  conversationId?: string,
) {
  const key = [
    "meri-conversation-selection",
    account.tenantId,
    account.actorId,
    clientId,
    ...(conversationId ? [conversationId] : []),
  ];
  client.setQueryDefaults(key, { gcTime: Infinity });
  client.setQueryData<{ conversationId?: string; runId?: string }>(
    key,
    (previous) => previous ?? (conversationId ? { conversationId } : {}),
  );
  const cache = client.getQueryCache(),
    owned = cache.find({ queryKey: key, exact: true });
  const current = () =>
    owned !== undefined && cache.find({ queryKey: key, exact: true }) === owned;
  const remembered =
    client.getQueryData<{ conversationId?: string; runId?: string }>(key) ?? {};
  return {
    hints: { ...remembered, clientId },
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
