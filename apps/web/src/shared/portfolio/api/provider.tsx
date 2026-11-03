"use client";
import { createRequestLifetime } from "../../session/request-lifetime";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError, createApiClient, type ApiClient } from "./http";
import type { AuthFailureClass } from "../../session/auth-failure";
import Link from "next/link";
const ApiContext = createContext<ApiClient | null>(null);
export function DataProvider({
  children,
  api,
  onSessionExpired,
}: {
  children: ReactNode;
  api?: ApiClient;
  onSessionExpired?: (failure: AuthFailureClass) => void;
}) {
  const [scope] = useState(createRequestLifetime);
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (count, error) =>
              count < 1 &&
              (!(error instanceof ApiError) || error.status >= 500),
          },
          mutations: { retry: false },
        },
      }),
  );
  const [expired, setExpired] = useState<AuthFailureClass | null>(null);
  const [defaultApi] = useState(() =>
    createApiClient(
      fetch,
      (failure) => {
        scope.abort();
        client.clear();
        setExpired((previous) => previous ?? failure);
        onSessionExpired?.(failure);
      },
      scope.signal,
    ),
  );
  useLayoutEffect(() => {
    const dispose = scope.mount();
    return () => {
      dispose();
      void client.cancelQueries();
      client.clear();
    };
  }, [client, scope]);
  if (expired)
    return (
      <main className="centered" data-auth-class={expired}>
        <h1>We couldn&apos;t verify your session</h1>
        <p>Sign in again to continue.</p>
        <Link className="button primary" href="/sign-in">
          Sign in
        </Link>
      </main>
    );
  return (
    <ApiContext.Provider value={api ?? defaultApi}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ApiContext.Provider>
  );
}
export function useApi() {
  const api = useContext(ApiContext);
  if (!api) throw new Error("DataProvider is required");
  return api;
}
