import { useCallback } from "react";
import { beginNewChatIntent, type FirstChatScope } from "./first-chat-intent";

type Scope = FirstChatScope;

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
        clientId === null
          ? { tenantId, actorId, clientId, scopeKind: "general" }
          : { tenantId, actorId, clientId },
        window.sessionStorage,
      );
      restart();
    } catch {
      fail();
    }
  }, [tenantId, actorId, clientId, restart, fail]);
}
