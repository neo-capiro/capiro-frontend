"use client";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { UserPreferencesOwner } from "@capiro/meri-client/user-preferences";
import { useApi } from "../portfolio/api/provider";
import { clientSchema } from "../session/client-contract";
import { userPreferencesTransport } from "../meri-user-preferences/transport";
import { readDefaultConversationClient } from "../meri-user-preferences/default-client";

function useDefaultConversationStart(
  owner: UserPreferencesOwner,
  start: (clientId: string) => void,
) {
  const api = useApi();
  const active = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useLayoutEffect(
    () => () => {
      active.current?.abort();
    },
    [api, owner.tenantId, owner.actorId],
  );
  async function open() {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setMessage("Checking your saved default and current client access…");
    try {
      const client = await readDefaultConversationClient({
        preferences: userPreferencesTransport(
          owner,
          () => !controller.signal.aborted,
        ),
        readClient: (id, signal) =>
          api.request(
            "core",
            `clients/${encodeURIComponent(id)}`,
            clientSchema,
            { signal },
          ),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!client)
        setMessage(
          "Choose General or a permitted client above. You can save a default client in Personal preferences.",
        );
      else {
        setMessage("");
        start(client.id);
      }
    } catch {
      if (!controller.signal.aborted)
        setMessage(
          "Your default client could not be verified. Choose General or a permitted client above, or try again.",
        );
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }
  return { busy, message, open };
}

/** Mounted only when no explicit scope is selected. Every click reads current authority. */
export function DefaultConversationStart({
  owner,
  start,
  children,
}: {
  owner: UserPreferencesOwner;
  start: (clientId: string) => void;
  children: (control: {
    disabled: boolean;
    onClick: () => void;
    title: string;
  }) => ReactNode;
}) {
  const { busy, message, open } = useDefaultConversationStart(owner, start);
  return (
    <>
      {children({
        disabled: busy,
        onClick: () => {
          void open();
        },
        title: "Use your saved default client when no scope is selected.",
      })}
      {message && <p role="status">{message}</p>}
    </>
  );
}
