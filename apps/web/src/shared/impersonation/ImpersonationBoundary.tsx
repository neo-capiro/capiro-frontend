"use client";
import type { ReactNode } from "react";
import { useCapiroQuery } from "../capiro/queries";
import { ActionButton, StatusPanel } from "../module-ui";
import { ImpersonationContext } from "./context";
import { useImpersonationSession } from "./useImpersonationSession";
import { SupportWorkspace } from "./SupportWorkspace";
import { useImpersonationStart } from "./useImpersonationStart";

function HqBoundary({
  children,
  identity,
  onScope,
}: {
  children: ReactNode;
  identity: string;
  onScope: (id: string | null) => void;
}) {
  const entry = useImpersonationStart(identity);
  const { session, error, exiting, refresh, exit } =
    useImpersonationSession(onScope);
  return (
    <ImpersonationContext.Provider value={entry}>
      {entry.error && (
        <section role="alert">
          <p>{entry.error}</p>
          <ActionButton onClick={entry.retryRecovery}>
            Reload saved support request
          </ActionButton>
        </section>
      )}
      {entry.pending && (
        <section role="alert">
          <p>
            An earlier support-session start needs its original result
            recovered.
          </p>
          <ActionButton
            disabled={entry.busy}
            onClick={() =>
              void entry.start(entry.pending!.tenantId, entry.pending!.reason)
            }
          >
            Recover original start
          </ActionButton>
        </section>
      )}
      {error && (
        <section role="alert">
          <p>{error.message}</p>
          <ActionButton onClick={refresh}>Verify support session</ActionButton>
        </section>
      )}
      {session ? (
        <SupportWorkspace
          key={session.sessionId}
          session={session}
          busy={exiting}
          unavailable={Boolean(error)}
          exit={() => void exit()}
        />
      ) : session === null && !error ? (
        children
      ) : (
        <p role="status">Verifying support session…</p>
      )}
    </ImpersonationContext.Provider>
  );
}
export function ImpersonationBoundary({
  children,
  identity,
  onScope,
}: {
  children: ReactNode;
  identity: string;
  onScope: (id: string | null) => void;
}) {
  const me = useCapiroQuery("me.read", {});
  return (
    <StatusPanel loading={me.loading} error={me.error} onRetry={me.reload}>
      {me.data &&
        (me.data.role === "capiro_admin" ? (
          <HqBoundary identity={identity} onScope={onScope}>
            {children}
          </HqBoundary>
        ) : (
          children
        ))}
    </StatusPanel>
  );
}
