"use client";
import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Destinations } from "@/shared/portfolio/config/config";
import { Shell } from "@/shared/portfolio/shell/Shell";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useClient } from "@/features/portfolio/index/public";
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
  const client = useClient(clientId);
  const current = client.isSuccess && !client.error ? client.data : undefined;
  const path = usePathname();
  const params = useSearchParams();
  const library =
    path === `/portfolio/${clientId}/calendar` && params.get("library") === "1";
  return (
    <Shell
      destinations={destinations}
      client={{ id: clientId, name: current?.name ?? "Client" }}
    >
      {client.isPending || client.error ? (
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
            {!library && <ClientHeader client={current} />}
            <div className={library ? undefined : styles.content}>
              {children}
            </div>
          </>
        )
      )}
    </Shell>
  );
}
