"use client";
import { Button } from "@capiro/ui/button";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useClient, useClients } from "@/features/portfolio/index/public";
import type { Destinations } from "@/shared/portfolio/config/config";
import { clientDrafts } from "./contracts";
import { useWorkspaceDrafts } from "./queries";
import { WorkspaceDocumentTable } from "./WorkspaceDocumentTable";
import styles from "./workspace-documents.module.css";
export function WorkspaceDocuments({
  clientId,
  destinations,
}: {
  clientId: string;
  destinations: Destinations;
}) {
  const query = useWorkspaceDrafts();
  const client = useClient(clientId);
  const clients = useClients();
  const currentClient =
    client.isSuccess && !client.error && client.data.id === clientId
      ? client.data
      : undefined;
  const catalog =
    clients.isSuccess && !clients.error ? clients.data : undefined;
  const drafts =
    query.isSuccess && !query.error ? query.data.drafts : undefined;
  const clientError =
    client.isSuccess && client.data.id !== clientId
      ? new Error(
          "The client response does not match the requested client. Retry the client details.",
        )
      : client.error;
  const complete =
    currentClient !== undefined &&
    catalog !== undefined &&
    drafts !== undefined;
  const rows = complete ? clientDrafts(drafts, currentClient, catalog) : [];
  const draftCount = rows.filter((row) => row.status === "draft").length;
  const ambiguous =
    currentClient &&
    catalog &&
    catalog.filter((candidate) => candidate.name === currentClient.name)
      .length > 1;
  return (
    <section className={styles.section} aria-label="Workspace documents">
      <header className={styles.header}>
        <div className={styles.heading}>
          <h2>Workspace documents</h2>
          {currentClient && (
            <p>
              {currentClient.name}
              {rows.length > 0 &&
                ` · ${draftCount} ${draftCount === 1 ? "draft" : "drafts"} · ${rows.length - draftCount} completed`}
            </p>
          )}
        </div>
        {destinations.workspace && (
          <Button
            asChild
            variant="ghost"
            className={`button ghost ${styles.action}`}
          >
            <a href={destinations.workspace}>Open Workspace</a>
          </Button>
        )}
      </header>
      <QueryState
        pending={query.isPending || client.isPending || clients.isPending}
        error={query.error ?? clientError ?? clients.error}
        retry={() => {
          void query.refetch();
          void client.refetch();
          void clients.refetch();
        }}
      />
      {complete && (
        <WorkspaceDocumentTable
          rows={rows}
          destination={destinations.existingApp}
        />
      )}
      <p className={styles.association}>
        Workspace associates legacy documents by client name. Renamed clients
        may have missing documents.
        {ambiguous &&
          " This name is shared by multiple clients; documents cannot be safely assigned here."}
      </p>
    </section>
  );
}
