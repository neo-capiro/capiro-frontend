"use client";
import { useCallback, useEffect, useState } from "react";
import { useCapiro } from "../capiro/CapiroBoundary";
import type { ImpersonationSession } from "../capiro/operations/settings-admin/impersonation";
import { impersonationEvent, notifyImpersonationChange } from "./context";

/**
 * Many components ask who is being impersonated. One session-wide read serves
 * them all: without this cache every mount, every focus change and every
 * five-second tick issued its own `settings.hq.impersonation.active` call.
 */
const ACTIVE_READ_TTL_MS = 15_000;
let activeRead:
  | { at: number; value: Promise<{ session: ImpersonationSession | null }> }
  | undefined;
export function dropImpersonationCache() {
  activeRead = undefined;
}
function readActiveSession(api: ReturnType<typeof useCapiro>) {
  const now = Date.now();
  if (activeRead && now - activeRead.at < ACTIVE_READ_TTL_MS)
    return activeRead.value;
  const value = api.request("settings.hq.impersonation.active", {});
  const entry = { at: now, value };
  activeRead = entry;
  // A failed read must not be served from cache for the whole TTL.
  void value.catch(() => {
    if (activeRead === entry) activeRead = undefined;
  });
  return value;
}
export function useImpersonationSession(onScope: (id: string | null) => void) {
  const api = useCapiro();
  const [session, setSession] = useState<ImpersonationSession | null>();
  const [error, setError] = useState<Error>();
  const [revision, setRevision] = useState(0);
  const [exiting, setExiting] = useState(false);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const channel = new BroadcastChannel(impersonationEvent);
    const invalidate = () => {
      dropImpersonationCache();
      setSession(undefined);
      refresh();
    };
    channel.onmessage = invalidate;
    window.addEventListener(impersonationEvent, invalidate);
    window.addEventListener("focus", invalidate);
    const timer = setInterval(refresh, 5000);
    return () => {
      channel.close();
      clearInterval(timer);
      window.removeEventListener(impersonationEvent, invalidate);
      window.removeEventListener("focus", invalidate);
    };
  }, [refresh]);
  useEffect(() => {
    let current = true;
    void readActiveSession(api).then(
      (result) => {
        if (!current) return;
        setError(undefined);
        setSession(result.session);
        onScope(result.session?.sessionId ?? null);
      },
      (cause) => {
        if (!current) return;
        setError(
          cause instanceof Error
            ? cause
            : Error("Support session verification failed."),
        );
        setSession(undefined);
      },
    );
    return () => {
      current = false;
    };
  }, [api, revision, onScope]);
  const exit = async () => {
    if (!session || exiting) return;
    setExiting(true);
    setError(undefined);
    try {
      const result = await api.request("settings.hq.impersonation.end", {
        body: { sessionId: session.sessionId },
      });
      if (result.sessionId !== session.sessionId || result.status !== "ended")
        throw Error("Exit could not be confirmed. Retry this session's exit.");
      dropImpersonationCache();
      notifyImpersonationChange();
      refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause
          : Error("Exit could not be confirmed. Retry exit."),
      );
    } finally {
      setExiting(false);
    }
  };
  return { session, error, exiting, refresh, exit };
}
