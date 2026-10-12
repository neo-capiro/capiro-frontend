"use client";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { AuthenticationProvider } from "../portfolio/auth/AuthenticationProvider";
import { DataProvider } from "../portfolio/api/provider";
import { CapiroDataProvider } from "../capiro/CapiroBoundary";
import { SessionContext } from "./SessionContext";
import { SelectedClientProvider } from "./SelectedClient";
import { routeClientId } from "./client-route";

function SessionData({
  children,
  clientId,
}: {
  children: ReactNode;
  clientId?: string;
}) {
  const [expired, setExpired] = useState(false);
  const expire = useCallback(() => setExpired(true), []);
  if (expired)
    return (
      <SessionContext.Provider value="expired">
        <section role="alert">
          <h2>Your session expired</h2>
          <p>Sign in again to continue.</p>
          {/* A fresh document must discard the expired session before reauthentication. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/sign-in">Sign in</a>
        </section>
      </SessionContext.Provider>
    );
  return (
    <SessionContext.Provider value="signed-in">
      <DataProvider key={clientId ?? "no-selection"} onSessionExpired={expire}>
        <CapiroDataProvider onSessionExpired={expire}>
          <SelectedClientProvider requestedId={clientId}>
            {children}
          </SelectedClientProvider>
        </CapiroDataProvider>
      </DataProvider>
    </SessionContext.Provider>
  );
}
function CurrentSession({ children }: { children: ReactNode }) {
  const { isLoaded, userId, sessionId, orgId } = useAuth();
  const pathname = usePathname();
  const search = useSearchParams();
  const clientId = routeClientId(pathname, search);
  if (!isLoaded)
    return (
      <SessionContext.Provider value="loading">
        {children}
      </SessionContext.Provider>
    );
  if (!userId)
    return (
      <SessionContext.Provider key="signed-out" value="signed-out">
        {children}
      </SessionContext.Provider>
    );
  // Identity AND client replacement dispose queries, drafts, pending writes and selection.
  return (
    <SessionData
      key={JSON.stringify([userId, sessionId, orgId])}
      clientId={clientId}
    >
      {children}
    </SessionData>
  );
}
export function ApplicationBoundary({
  publishableKey,
  children,
}: {
  publishableKey?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  // Revocable Planner capability forms have an independent public contract.
  if (pathname.startsWith("/forms/")) return children;
  if (!publishableKey)
    return (
      <SessionContext.Provider value="unconfigured">
        {children}
      </SessionContext.Provider>
    );
  return (
    <AuthenticationProvider publishableKey={publishableKey}>
      <CurrentSession>{children}</CurrentSession>
    </AuthenticationProvider>
  );
}
