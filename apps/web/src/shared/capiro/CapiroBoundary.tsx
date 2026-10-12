"use client";

import {
  ClerkFailed,
  ClerkLoaded,
  ClerkLoading,
  ClerkProvider,
  useAuth,
} from "@clerk/nextjs";
import Link from "next/link";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CapiroPublicConfig } from "./config";
import { createCapiroApi, type CapiroApi } from "./http";
import { capiroOperations } from "./registry";

const ApiContext = createContext<CapiroApi<typeof capiroOperations> | null>(
  null,
);

function SignedInData({ children }: { children: ReactNode }) {
  const scope = useRef(new AbortController());
  const [expired, setExpired] = useState(false);
  const [api] = useState(() =>
    createCapiroApi(capiroOperations, {
      onSessionExpired: () => {
        scope.current.abort();
        setExpired(true);
      },
      scopeSignal: () => scope.current.signal,
    }),
  );
  useLayoutEffect(() => {
    if (scope.current.signal.aborted) scope.current = new AbortController();
    const current = scope.current;
    return () => current.abort();
  }, []);
  if (expired)
    return (
      <section role="alert">
        <h2>Your session expired</h2>
        <p>Sign in again to continue.</p>
        <Link href="/sign-in">Sign in</Link>
      </section>
    );
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

function SessionScope({ children }: { children: ReactNode }) {
  const { isLoaded, userId, sessionId, orgId } = useAuth();
  if (!isLoaded) return <p role="status">Loading your session…</p>;
  if (!userId)
    return (
      <section>
        <h2>Sign in to Capiro</h2>
        <p>Use your firm account to access Modules and Settings.</p>
        <Link href="/sign-in">Sign in</Link>
      </section>
    );
  return (
    <SignedInData key={`${userId}:${sessionId}:${orgId ?? ""}`}>
      {children}
    </SignedInData>
  );
}

/** Public configuration contains no secret keys or backend URLs. */
export function CapiroBoundary({
  config,
  children,
}: {
  config: CapiroPublicConfig;
  children: ReactNode;
}) {
  if (!config.configured || !config.publishableKey)
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
    <ClerkProvider publishableKey={config.publishableKey} signInUrl="/sign-in">
      <ClerkLoading>
        <p role="status">Loading sign-in…</p>
      </ClerkLoading>
      <ClerkFailed>
        <section role="alert">
          <h2>Sign-in unavailable</h2>
          <p>Reload the page to try again.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </section>
      </ClerkFailed>
      <ClerkLoaded>
        <SessionScope>{children}</SessionScope>
      </ClerkLoaded>
    </ClerkProvider>
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
