"use client";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { RequireSession } from "../session/SessionContext";
import { SelectedClientGate } from "../session/SelectedClient";
import type { CapiroPublicConfig } from "./config";
import { createCapiroApi, type CapiroApi } from "./http";
import { capiroOperations } from "./registry";
const ApiContext = createContext<CapiroApi<typeof capiroOperations> | null>(
  null,
);
export function CapiroDataProvider({
  children,
  onSessionExpired,
}: {
  children: ReactNode;
  onSessionExpired: () => void;
}) {
  const scope = useRef(new AbortController());
  const [api] = useState(() =>
    createCapiroApi(capiroOperations, {
      onSessionExpired: () => {
        scope.current.abort();
        onSessionExpired();
      },
      scopeSignal: () => scope.current.signal,
    }),
  );
  useLayoutEffect(() => {
    if (scope.current.signal.aborted) scope.current = new AbortController();
    const current = scope.current;
    return () => current.abort();
  }, []);
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}
/** The application owns Clerk and both transport lifetimes; this is a route gate. */
export function CapiroBoundary({
  config,
  children,
}: {
  config: CapiroPublicConfig;
  children: ReactNode;
}) {
  if (!config.configured)
    return (
      <section role="status">
        <h2>Connection setup required</h2>
        <p>
          Your Capiro administrator must connect the designated sign-in
          application and existing services to enable this workspace.
        </p>
      </section>
    );
  return (
    <RequireSession>
      <SelectedClientGate>{children}</SelectedClientGate>
    </RequireSession>
  );
}

export function useCapiro() {
  const api = useContext(ApiContext);
  const lifetime = useRef(new AbortController());
  useLayoutEffect(() => {
    if (lifetime.current.signal.aborted)
      lifetime.current = new AbortController();
    const current = lifetime.current;
    return () => current.abort();
  }, [api]);
  const scoped = useMemo(() => {
    if (!api) return null;
    const signal = (provided?: AbortSignal) =>
      provided
        ? AbortSignal.any([provided, lifetime.current.signal])
        : lifetime.current.signal;
    const result: CapiroApi<typeof capiroOperations> = {
      request: (key, input, options) =>
        api.request(key, input, { signal: signal(options?.signal) }),
      upload: (key, input, files, options) =>
        api.upload(key, input, files, { signal: signal(options?.signal) }),
      download: (key, input, options) =>
        api.download(key, input, { signal: signal(options?.signal) }),
    };
    return result;
  }, [api]);
  if (!scoped) throw new Error("A signed-in CapiroBoundary is required.");
  return scoped;
}
