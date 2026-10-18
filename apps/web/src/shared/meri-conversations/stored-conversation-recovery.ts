import { useCallback, useEffect, useRef } from "react";
import { beginNewChatIntent, readFirstChatIntent } from "./first-chat-intent";

export type StoredSessionStatus =
  | "idle"
  | "connecting"
  | "unavailable"
  | "expired"
  | "ready";

/**
 * A conversation replayed from browser storage can be refused by Meri after the service redeployed or the
 * original binding expired before any turn ran; Core still confirms it. Recover once by starting a new chat.
 * A conversation created in this page load is never rotated automatically: its refusal is reported as is.
 */
export function storedConversationNeedsNewChat(
  status: StoredSessionStatus,
  reused: boolean,
  recovered: boolean,
): boolean {
  return status === "unavailable" && reused && !recovered;
}

export function useStoredConversationRecovery(
  status: StoredSessionStatus,
  reused: boolean,
  beginNew: (() => void) | undefined,
) {
  const recovered = useRef(false);
  useEffect(() => {
    if (
      !beginNew ||
      !storedConversationNeedsNewChat(status, reused, recovered.current)
    )
      return;
    recovered.current = true;
    beginNew();
  }, [status, reused, beginNew]);
}

type Scope = { tenantId: string; actorId: string; clientId: string };

/** True when this page load replays a conversation confirmed earlier in this tab. */
export function storedConversationConfirmed(scope: Scope): boolean {
  try {
    return (
      readFirstChatIntent(scope, window.sessionStorage)?.state === "confirmed"
    );
  } catch {
    return false;
  }
}

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
