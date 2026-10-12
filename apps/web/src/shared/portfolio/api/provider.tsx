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
import Link from "next/link";
const ApiContext = createContext<ApiClient | null>(null);
export function DataProvider({
  children,
  api,
  onSessionExpired,
}: {
  children: ReactNode;
  api?: ApiClient;
  onSessionExpired?: () => void;
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
  const [expired, setExpired] = useState(false);
  const [defaultApi] = useState(() =>
    createApiClient(
      fetch,
      () => {
        scope.abort();
        client.clear();
        setExpired(true);
        onSessionExpired?.();
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
      <main className="centered">
        <h1>Your session expired</h1>
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
