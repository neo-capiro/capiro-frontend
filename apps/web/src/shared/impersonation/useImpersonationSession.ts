"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCapiro } from "../capiro/CapiroBoundary";
import type { ImpersonationSession } from "../capiro/operations/settings-admin/impersonation";
import { impersonationEvent, notifyImpersonationChange } from "./context";

/**
 * The active support session is read once per mounted authenticated scope.
 *
 * The throttle and the in-flight read belong to this hook owner, not to the
 * module: the request is issued through this owner's `useCapiro` wrapper, which
 * joins its request lifetime, so disposing the scope (identity replacement, an
 * acting-scope change or unmount) disposes the read with it. There is
 * deliberately no module-level cache — an answer produced for one authenticated
 * scope must never be readable by the next one, and one owner must never hand
 * its pending read to another owner.
 */
const ACTIVE_READ_TTL_MS = 15_000;
type ActiveRead = {
  api: ReturnType<typeof useCapiro>;
  at: number;
  value: Promise<{ session: ImpersonationSession | null }>;
};
export function useImpersonationSession(onScope: (id: string | null) => void) {
  const api = useCapiro();
  const [session, setSession] = useState<ImpersonationSession | null>();
  const [error, setError] = useState<Error>();
  const [revision, setRevision] = useState(0);
  const [exiting, setExiting] = useState(false);
  const read = useRef<ActiveRead | undefined>(undefined);
  const clearRead = useCallback(() => {
    read.current = undefined;
  }, []);
  const readActive = useCallback(() => {
    const now = Date.now();
    const cached = read.current;
    // The API object is per provider scope; a different one is a different owner.
    if (cached && cached.api === api && now - cached.at < ACTIVE_READ_TTL_MS)
      return cached.value;
    const value = api.request("settings.hq.impersonation.active", {});
    const entry: ActiveRead = { api, at: now, value };
    read.current = entry;
    // A failed read is not served from the throttle for the rest of its window.
    void value.catch(() => {
      if (read.current === entry) read.current = undefined;
    });
    return value;
  }, [api]);
  // Disposing this owner (or replacing its API) drops the answered read with it.
  useEffect(() => () => clearRead(), [api, clearRead]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const channel = new BroadcastChannel(impersonationEvent);
    const invalidate = () => {
      clearRead();
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
  }, [clearRead, refresh]);
  useEffect(() => {
    let current = true;
    void readActive().then(
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
  }, [readActive, revision, onScope]);
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
      clearRead();
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
