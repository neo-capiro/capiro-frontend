import { useCallback } from "react";
import { beginNewChatIntent } from "./first-chat-intent";

type Scope = { tenantId: string; actorId: string; clientId: string };

/** Rotate this tab's first-chat intent; `restart` re-runs the Core bootstrap, `fail` reports a storage failure. */
export function useBeginNewChat(
  scope: Scope,
  restart: () => void,
  fail: () => void,
) {
  const { tenantId, actorId, clientId } = scope;
  return useCallback(() => {
    try {
      beginNewChatIntent(
        { tenantId, actorId, clientId },
        window.sessionStorage,
      );
      restart();
    } catch {
      fail();
    }
  }, [tenantId, actorId, clientId, restart, fail]);
}
