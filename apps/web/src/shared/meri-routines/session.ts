import type { ApiClient } from "../portfolio/api/http";
import { identitySchema } from "../portfolio/auth/identity";
import { bootstrapConversationSession } from "../meri-conversations/session";
import { routineRecovery, type RoutineOwner } from "./recovery";
import {
  receiveRoutineManagementSessionRequest,
  receiveRoutineManagementSessionReceipt,
} from "@capiro/meri-contracts/routines-application";
import {
  boundedJsonText,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { ActionSessionUnavailable } from "../meri-actions/session-bootstrap";

/** Current identity and explicit scope only. This path never chooses or creates a conversation/run. */
export async function bootstrapRoutineManagementSession({
  api,
  owner,
  signal,
  fetcher = fetch,
  now = Date.now,
}: {
  api: ApiClient;
  owner: RoutineOwner;
  signal: AbortSignal;
  fetcher?: typeof fetch;
  now?: () => number;
}) {
  const identity = await api.request("core", "me", identitySchema, { signal });
  if (
    identity.tenant?.id !== owner.tenantId ||
    identity.user.id !== owner.actorId
  )
    throw new Error("Current routine account changed.");
  const body = JSON.stringify(
    receiveRoutineManagementSessionRequest(
      JSON.stringify({ clientId: owner.selectedClientId }),
    ),
  );
  return withActionDeadline([signal], async (signal) => {
    const response = await fetcher(
      "/api/action-followthrough/routine-session",
      {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal,
      },
    );
    const text = await boundedJsonText(response, signal, 4096);
    if (response.status !== 200)
      throw new ActionSessionUnavailable(response.status);
    const receipt = receiveRoutineManagementSessionReceipt(
      text,
      {
        tenantId: owner.tenantId,
        actorId: owner.actorId,
        selectedClientId: owner.selectedClientId,
      },
      now(),
    );
    signal.throwIfAborted();
    return receipt;
  });
}

/** Current Core identity first; recovery keeps the original conversation but permits canonical run renewal. */
export async function bootstrapRoutineSession({
  api,
  owner,
  signal,
  resolveConversation,
  fetcher = fetch,
  now = Date.now,
}: {
  api: ApiClient;
  owner: RoutineOwner;
  signal: AbortSignal;
  resolveConversation: (signal: AbortSignal) => Promise<string>;
  fetcher?: typeof fetch;
  now?: () => number;
}) {
  const identity = await api.request("core", "me", identitySchema, { signal });
  if (
    identity.tenant?.id !== owner.tenantId ||
    identity.user.id !== owner.actorId
  )
    throw new Error("Current routine account changed.");
  const saved = await routineRecovery(owner, () =>
    signal.throwIfAborted(),
  ).load();
  const conversationId =
    (saved && "conversationId" in saved.context
      ? saved.context.conversationId
      : undefined) ?? (await resolveConversation(signal));
  return bootstrapConversationSession(
    {
      clientId: owner.selectedClientId,
      conversationId,
    },
    { tenantId: owner.tenantId, actorId: owner.actorId },
    signal,
    fetcher,
    now,
  );
}
