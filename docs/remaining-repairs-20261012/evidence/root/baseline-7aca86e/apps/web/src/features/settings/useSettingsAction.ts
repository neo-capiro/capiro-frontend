"use client";

import { useEffect, useRef, useState } from "react";

/** Local form state only; request validation and authentication remain in Capiro transport. */
export function useSettingsAction(scopeKey?: object) {
  const active = useRef(true);
  const inFlight = useRef<AbortController | null>(null);
  const scope = useRef(new AbortController());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [previousScope, setPreviousScope] = useState(() => scopeKey);
  if (previousScope !== scopeKey) {
    setPreviousScope(() => scopeKey);
    setBusy(false);
    setError(undefined);
    setMessage(undefined);
  }
  useEffect(() => {
    active.current = true;
    scope.current = new AbortController();
    inFlight.current = null;
    return () => {
      active.current = false;
      scope.current.abort();
    };
  }, [scopeKey]);
  async function run<T>(
    action: (signal: AbortSignal) => Promise<T>,
    success: string | ((data: T) => string),
    after?: (data: T) => void,
  ) {
    if (inFlight.current) return;
    const requestScope = scope.current;
    inFlight.current = requestScope;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const data = await action(requestScope.signal);
      if (active.current && !requestScope.signal.aborted) {
        after?.(data);
        setMessage(typeof success === "function" ? success(data) : success);
      }
    } catch (cause) {
      if (active.current && !requestScope.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "The request failed. Please retry.",
        );
    } finally {
      if (inFlight.current === requestScope) inFlight.current = null;
      if (active.current && !requestScope.signal.aborted) setBusy(false);
    }
  }
  return {
    busy,
    error,
    message,
    run,
    clear: () => {
      setError(undefined);
      setMessage(undefined);
    },
  };
}
