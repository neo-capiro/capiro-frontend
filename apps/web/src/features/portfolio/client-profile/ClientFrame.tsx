"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { Destinations } from "@/shared/portfolio/config/config";
import { Shell } from "@/shared/portfolio/shell/Shell";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useClient } from "@/features/portfolio/index/public";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { ClientHeader } from "./ClientHeader";
import styles from "./client-header.module.css";
export function ClientFrame({
  clientId,
  destinations,
  children,
}: {
  clientId: string;
  destinations: Destinations;
  children: ReactNode;
}) {
  // The client read is actor-admitted, and the current actor is OBSERVED from the
  // ['identity'] cache rather than loaded by it. On a fresh route nothing had loaded that
  // entry, so the frame sat pending-with-idle and withheld every child — including the
  // pages that would have called useIdentity. Starting the canonical identity read here,
  // before the dependent read, removes that cycle.
  const identity = useIdentity();
  const client = useClient(clientId);
  const current = client.isSuccess && !client.error ? client.data : undefined;
  // Only a FAILED identity is surfaced as an error: an ordinary same-actor revalidation
  // keeps the frame and its children mounted, so no child editor state is discarded.
  const identityError = identity.error;
  const path = usePathname();
  const calendar = path === `/portfolio/${clientId}/calendar`;
  return (
    <Shell
      destinations={destinations}
      client={{ id: clientId, name: current?.name ?? "Client" }}
    >
      {identityError ? (
        <div className="page">
          <QueryState
            pending={false}
            error={identityError}
            retry={() => void identity.refetch()}
          />
        </div>
      ) : client.isPending || client.error ? (
        <div className="page">
          <QueryState
            pending={client.isPending}
            error={client.error}
            retry={() => void client.refetch()}
          />
        </div>
      ) : (
        current && (
          <>
            {!calendar && <ClientHeader client={current} />}
            <div className={calendar ? undefined : styles.content}>
              {children}
            </div>
          </>
        )
      )}
    </Shell>
  );
}
