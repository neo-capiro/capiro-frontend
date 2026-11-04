"use client";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { AuthenticationProvider } from "../portfolio/auth/AuthenticationProvider";
import { DataProvider } from "../portfolio/api/provider";
import { CapiroDataProvider } from "../capiro/CapiroBoundary";
import {
  MeriTabSessionGate,
  useMeriTabSession,
} from "../meri-conversations/MeriTabSession";
import { SessionContext } from "./SessionContext";
import { SelectedClientProvider } from "./SelectedClient";
import { routeClientId } from "./client-route";
import type { AuthFailureClass } from "./auth-failure";
import { isOnboardPath, isPublicOnboardPath } from "./onboard-route";
import { ImpersonationBoundary } from "../impersonation/ImpersonationBoundary";

const noSignedInSession = () => {};

/** Reuse the canonical query/request owner for signed-out onboarding too. */
function PublicSessionData({
  children,
  state = "signed-out",
}: {
  children: ReactNode;
  state?: "signed-out" | "loading" | "unconfigured";
}) {
  return (
    <SessionContext.Provider value={state}>
      <DataProvider>
        <CapiroDataProvider onSessionExpired={noSignedInSession}>
          {children}
        </CapiroDataProvider>
      </DataProvider>
    </SessionContext.Provider>
  );
}

function SessionData({
  children,
  authenticatedContent,
  clientId,
  identity,
  onSessionExpired,
}: {
  children: ReactNode;
  authenticatedContent?: ReactNode;
  clientId?: string;
  identity: string;
  onSessionExpired: () => void;
}) {
  // The admitted class of the 401 that ended this identity's session. The first
  // one wins: it is the stimulus, and later reports cannot re-describe it.
  const [expired, setExpired] = useState<AuthFailureClass | null>(null);
  const [actingScope, setActingScope] = useState<string | null>(null);
  const onScope = useCallback((id: string | null) => setActingScope(id), []);
  const expire = useCallback(
    (failure: AuthFailureClass) => {
      onSessionExpired();
      setExpired((previous) => previous ?? failure);
    },
    [onSessionExpired],
  );
  if (expired)
    return (
      <SessionContext.Provider value="expired">
        {/* The class is the fixed diagnostic vocabulary; the copy claims no cause. */}
        <section role="alert" data-auth-class={expired}>
          <h2>We couldn&apos;t verify your session</h2>
          <p>Sign in again to continue.</p>
          {/* A fresh document must discard the expired session before reauthentication. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/sign-in">Sign in</a>
        </section>
      </SessionContext.Provider>
    );
  return (
    <SessionContext.Provider value="signed-in">
      <DataProvider
        key={JSON.stringify([clientId, actingScope])}
        onSessionExpired={expire}
      >
        <CapiroDataProvider onSessionExpired={expire}>
          <ImpersonationBoundary identity={identity} onScope={onScope}>
            <SelectedClientProvider requestedId={clientId}>
              {authenticatedContent}
              {children}
            </SelectedClientProvider>
          </ImpersonationBoundary>
        </CapiroDataProvider>
      </DataProvider>
    </SessionContext.Provider>
  );
}
function CurrentSession({
  children,
  authenticatedContent,
}: {
  children: ReactNode;
  authenticatedContent?: ReactNode;
}) {
  const { isLoaded, userId, sessionId, orgId } = useAuth();
  const pathname = usePathname();
  const search = useSearchParams();
  const clientId = routeClientId(pathname, search);
  const identity = !isLoaded
    ? undefined
    : userId
      ? JSON.stringify([userId, sessionId, orgId])
      : null;
  const tabSession = useMeriTabSession(identity);
  const content = (
    <MeriTabSessionGate
      pathname={pathname}
      identity={identity}
      status={tabSession.status}
    >
      {children}
    </MeriTabSessionGate>
  );
  if (!isLoaded && isOnboardPath(pathname))
    return (
      <PublicSessionData key="loading-onboard" state="loading">
        {content}
      </PublicSessionData>
    );
  if (!isLoaded)
    return (
      <SessionContext.Provider value="loading">
        {content}
      </SessionContext.Provider>
    );
  if (!userId && isOnboardPath(pathname))
    return (
      <PublicSessionData key="signed-out-onboard">{content}</PublicSessionData>
    );
  if (!userId)
    return (
      <SessionContext.Provider key="signed-out" value="signed-out">
        {content}
      </SessionContext.Provider>
    );
  // Identity AND client replacement dispose queries, drafts, pending writes and selection.
  return (
    <SessionData
      key={JSON.stringify([userId, sessionId, orgId])}
      clientId={clientId}
      identity={JSON.stringify([userId, sessionId, orgId])}
      onSessionExpired={tabSession.expire}
      authenticatedContent={authenticatedContent}
    >
      {content}
    </SessionData>
  );
}
export function ApplicationBoundary({
  publishableKey,
  children,
  authenticatedContent,
}: {
  publishableKey?: string;
  children: ReactNode;
  authenticatedContent?: ReactNode;
}) {
  const pathname = usePathname();
  // Client share links have independent public contracts
  // (link token, plus the portfolio PIN for research).
  if (pathname.startsWith("/share/")) return children;
  // IT tokens, including invalid/expired ones, do not depend on Clerk startup.
  // Replacing that capability discards its private cache and pending observation.
  if (isPublicOnboardPath(pathname))
    return <PublicSessionData key={pathname}>{children}</PublicSessionData>;
  if (!publishableKey && isOnboardPath(pathname))
    return (
      <PublicSessionData state="unconfigured">{children}</PublicSessionData>
    );
  if (!publishableKey)
    return (
      <SessionContext.Provider value="unconfigured">
        {children}
      </SessionContext.Provider>
    );
  return (
    <AuthenticationProvider publishableKey={publishableKey}>
      <CurrentSession authenticatedContent={authenticatedContent}>
        {children}
      </CurrentSession>
    </AuthenticationProvider>
  );
}
