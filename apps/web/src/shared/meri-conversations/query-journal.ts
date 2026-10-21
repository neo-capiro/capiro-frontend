import type { QueryClient } from "@tanstack/react-query";
import {
  receiveConversationRequest,
  type ConversationStoredRequest,
  type ConversationSubmitRequest,
} from "@capiro/meri-contracts/conversation-application";
import {
  actionUuid,
  type ActionContext,
} from "../meri-actions/session-receipt";
import { z } from "zod";
import {
  tabRecord,
  TabJournalUnavailable,
  type TabStorage,
} from "./tab-journal";
export type ConversationIntent = Readonly<{
  submit?: Readonly<
    ConversationSubmitRequest & {
      state: "pending" | "unknown" | "observed";
      /** Local recovery route only; omitted from canonical request bytes. */
      workflow?: "initial";
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
/** Only canonical request fields and local uncertainty survive reload; no receipt grants authority. */
function receiveIntent(value: unknown): ConversationIntent {
  const raw = z
    .strictObject({
      submit: z.unknown().optional(),
      cancel: z.enum(["pending", "unknown", "observed"]).optional(),
    })
    .parse(value);
  if (raw.submit === undefined) return raw as ConversationIntent;
  const { state, workflow, ...input } = raw.submit as Record<string, unknown>;
  z.enum(["pending", "unknown", "observed"]).parse(state);
  z.literal("initial").optional().parse(workflow);
  const request = receiveConversationRequest(
    "submit",
    new TextEncoder().encode(JSON.stringify(input)),
  );
  return {
    ...raw,
    submit: {
      ...request,
      state: "unknown",
      ...(workflow ? { workflow: "initial" } : {}),
    },
  };
}

/** Nonsecret command uncertainty follows this exact observed context in same-tab recovery. */
export function conversationIntentJournal(
  client: QueryClient,
  context: ActionContext,
  storage?: TabStorage,
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
  let persistence: ReturnType<typeof tabRecord<ConversationIntent>> | undefined;
  let recoveryBlocked = false;
  let recovered: ConversationIntent = {};
  try {
    persistence = tabRecord(
      { ...context, clientId: context.selectedClientId },
      "request",
      receiveIntent,
      context.runId,
      storage ?? null,
    );
    recovered = persistence.read() ?? {};
    if (recovered.cancel) recovered = { ...recovered, cancel: "unknown" };
  } catch {
    recoveryBlocked = true;
  }
  client.setQueryData<ConversationIntent>(
    key,
    (previous) => previous ?? recovered,
  );
  const cache = client.getQueryCache(),
    owned = cache.find({ queryKey: key, exact: true });
  const current = () =>
    !recoveryBlocked &&
    (persistence?.current() ?? true) &&
    owned !== undefined &&
    cache.find({ queryKey: key, exact: true }) === owned;
  return {
    current,
    recoveryBlocked,
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
      if (recoveryBlocked || (persistence && !persistence.current()))
        throw new TabJournalUnavailable();
      if (current()) {
        persistence?.write(value);
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
  storage?: TabStorage,
) {
  const key = [
    "meri-conversation-selection",
    account.tenantId,
    account.actorId,
    clientId,
    ...(conversationId ? [conversationId] : []),
  ];
  client.setQueryDefaults(key, { gcTime: Infinity });
  const persistence = tabRecord(
    { ...account, clientId, conversationId: conversationId ?? "" },
    "selection",
    (value) => {
      const selected = z
        .strictObject({ conversationId: actionUuid, runId: actionUuid })
        .parse(value);
      if (conversationId && selected.conversationId !== conversationId)
        throw new TabJournalUnavailable();
      return selected;
    },
    "",
    storage ?? null,
  );
  const recovered = persistence.read();
  client.setQueryData<{ conversationId?: string; runId?: string }>(
    key,
    (previous) =>
      previous ?? recovered ?? (conversationId ? { conversationId } : {}),
  );
  const cache = client.getQueryCache(),
    owned = cache.find({ queryKey: key, exact: true });
  const current = () =>
    persistence.current() &&
    owned !== undefined &&
    cache.find({ queryKey: key, exact: true }) === owned;
  const remembered =
    client.getQueryData<{ conversationId?: string; runId?: string }>(key) ?? {};
  return {
    hints: { ...remembered, clientId },
    record(context: ActionContext) {
      if (
        context.tenantId !== account.tenantId ||
        context.actorId !== account.actorId ||
        context.selectedClientId !== clientId ||
        (conversationId && context.conversationId !== conversationId)
      )
        throw new TabJournalUnavailable();
      if (current()) {
        persistence.write({
          conversationId: context.conversationId,
          runId: context.runId,
        });
        client.setQueryData(
          key,
          Object.freeze({
            conversationId: context.conversationId,
            runId: context.runId,
          }),
        );
      }
    },
  };
}
