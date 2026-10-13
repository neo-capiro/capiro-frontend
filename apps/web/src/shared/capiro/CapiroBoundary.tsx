"use client";
import { createRequestLifetime } from "../session/request-lifetime";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { RequireSession } from "../session/SessionContext";
import { SelectedClientGate } from "../session/SelectedClient";
import type { CapiroPublicConfig } from "./config";
import { createCapiroApi, type CapiroApi } from "./http";
import { capiroOperations } from "./registry";
import type { OperationRegistry } from "./contracts";
import { publicOnboardOperations } from "./operations/onboard-public";
const ApiContext = createContext<CapiroApi<typeof capiroOperations> | null>(
  null,
);
const PublicOnboardContext = createContext<CapiroApi<
  typeof publicOnboardOperations
> | null>(null);
export function CapiroDataProvider({
  children,
  onSessionExpired,
}: {
  children: ReactNode;
  onSessionExpired: () => void;
}) {
  const [scope] = useState(createRequestLifetime);
  const [api] = useState(() =>
    createCapiroApi(capiroOperations, {
      onSessionExpired: () => {
        scope.abort();
        onSessionExpired();
      },
      scopeSignal: scope.signal,
    }),
  );
  const [publicOnboard] = useState(() =>
    createCapiroApi(publicOnboardOperations, {
      credentials: "omit",
      scopeSignal: scope.signal,
    }),
  );
  useLayoutEffect(() => {
    return scope.mount();
  }, [scope]);
  return (
    <ApiContext.Provider value={api}>
      <PublicOnboardContext.Provider value={publicOnboard}>
        {children}
      </PublicOnboardContext.Provider>
    </ApiContext.Provider>
  );
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

function useScopedCapiro<Registry extends OperationRegistry>(
  api: CapiroApi<Registry> | null,
) {
  const [lifetime] = useState(createRequestLifetime);
  useLayoutEffect(() => {
    return lifetime.mount();
  }, [api, lifetime]);
  const scoped = useMemo(() => {
    if (!api) return null;
    const signal = (provided?: AbortSignal) =>
      provided
        ? AbortSignal.any([provided, lifetime.signal()])
        : lifetime.signal();
    const result: CapiroApi<Registry> = {
      request: (key, input, options) =>
        api.request(key, input, { signal: signal(options?.signal) }),
      upload: (key, input, files, options) =>
        api.upload(key, input, files, { signal: signal(options?.signal) }),
      download: (key, input, options) =>
        api.download(key, input, { signal: signal(options?.signal) }),
    };
    return result;
  }, [api, lifetime]);
  if (!scoped) throw new Error("A signed-in CapiroBoundary is required.");
  return scoped;
}

export function useCapiro() {
  return useScopedCapiro(useContext(ApiContext));
}

/** Public IT/config uses the same disposable scope, with credentials omitted. */
export function usePublicOnboard() {
  return useScopedCapiro(useContext(PublicOnboardContext));
}
