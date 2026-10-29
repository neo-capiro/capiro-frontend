"use client";
import { useCallback, useEffect, useState } from "react";
import { useCapiro } from "../capiro/CapiroBoundary";
import type { ImpersonationSession } from "../capiro/operations/settings-admin/impersonation";
import { impersonationEvent, notifyImpersonationChange } from "./context";
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
    const controller = new AbortController();
    void api
      .request(
        "settings.hq.impersonation.active",
        {},
        { signal: controller.signal },
      )
      .then(
        (result) => {
          if (controller.signal.aborted) return;
          setError(undefined);
          setSession(result.session);
          onScope(result.session?.sessionId ?? null);
        },
        (cause) => {
          if (!controller.signal.aborted) {
            setError(
              cause instanceof Error
                ? cause
                : Error("Support session verification failed."),
            );
            setSession(undefined);
          }
        },
      );
    return () => controller.abort();
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
