"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "../../../shared/portfolio/api/provider";
import { clientSchema } from "../../../shared/session/client-contract";
import { productHref } from "../../../shared/session/client-route";
import { userPreferencesTransport } from "../../../shared/meri-user-preferences/transport";
import { readDefaultConversationClient } from "../../../shared/meri-user-preferences/default-client";
import type { ConversationAccount } from "../../../shared/meri-conversations/host-controller";

/**
 * A bare Meri entry has no scope yet. Open the member's saved default client, or General when none is
 * saved, so they can type at once. The preference is only a suggestion: the client is read again and
 * Core rechecks authority when the conversation connects. If the preference cannot be read the person
 * keeps the scope control and chooses; nothing is guessed.
 */
export function DefaultScopeOpening({
  account,
  scopeControl,
}: {
  account: ConversationAccount;
  scopeControl?: ReactNode;
}) {
  const api = useApi();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const { tenantId, actorId } = account;
  useEffect(() => {
    const controller = new AbortController();
    void readDefaultConversationClient({
      preferences: userPreferencesTransport(
        { tenantId, actorId },
        () => !controller.signal.aborted,
      ),
      readClient: (id, signal) =>
        api.request("core", `clients/${encodeURIComponent(id)}`, clientSchema, {
          signal,
        }),
      signal: controller.signal,
    })
      .then((client) => {
        if (!controller.signal.aborted)
          router.replace(productHref("meri", client?.id));
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [api, router, tenantId, actorId]);
  return (
    <section role="status">
      <h2>
        {failed
          ? "Conversation connection unavailable"
          : "Opening your conversation"}
      </h2>
      <p>
        {failed
          ? "Choose General or a permitted client above to start a conversation."
          : "Checking your saved default scope."}
      </p>
      {scopeControl}
    </section>
  );
}
