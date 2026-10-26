"use client";
import { useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { createRichNewsletterAdapter } from "../../../../shared/capiro/rich-newsletter";
import { createRichDocumentController } from "./document-controller";
import { createRichWriteJournal } from "./write-journal";
import {
  createRichWriteRecovery,
  RichRecoveryScopeError,
} from "./write-recovery";
import { useSelectedClient } from "@/shared/session/SelectedClient";

/** Session/client replacement changes the API owner and disposes private state. */
export function useRichDocument() {
  const api = useCapiro();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const selected = useSelectedClient();
  const clientId =
    selected.state === "authorized-client" ? selected.client.id : null;
  const available =
    selected.state === "authorized-client" || selected.state === "no-selection";
  const owner = useMemo(() => {
    const adapter = createRichNewsletterAdapter(api);
    return createRichDocumentController(
      adapter,
      createRichWriteJournal(queryClient),
      createRichWriteRecovery(adapter, async ({ signal, assert }) => {
        if (!available || !userId) throw new RichRecoveryScopeError();
        const me = await api.request("me.read", {}, { signal });
        assert();
        if (me.user.clerkUserId !== userId) throw new RichRecoveryScopeError();
        return {
          tenantId: me.tenant.id,
          userId: me.user.id,
          actorId: userId,
          clientId,
        };
      }),
    );
  }, [api, queryClient, userId, clientId, available]);
  useLayoutEffect(() => owner.mount(), [owner]);
  const state = useSyncExternalStore(
    owner.subscribe,
    owner.getSnapshot,
    owner.getSnapshot,
  );
  return { owner, state };
}
