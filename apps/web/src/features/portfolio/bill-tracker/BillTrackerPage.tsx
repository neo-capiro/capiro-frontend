"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  TrackerBackend,
  Destinations,
} from "@/shared/portfolio/config/config";
import {
  ActionButton,
  Field,
  SelectInput,
  StatusPanel,
  TextInput,
} from "@/shared/module-ui";
import { useImpactTracker } from "./impact-queries";
import { BillResults, impactRowKey } from "./BillResults";
import { BillDrawer } from "./BillDrawer";
import { TrackBillDialog } from "./TrackBillDialog";
import { WatchlistDialog } from "./WatchlistDialog";
import { TrackerMetricCards } from "./TrackerMetricCards";
import { useBillBoard } from "./queries";
import { currentBoard } from "./current-data";
import { trackerRouteHref, trackerViewParameter } from "./tracker-route";
import styles from "./impact-tracker.module.css";

export function BillTrackerPage({
  clientId,
  backend,
  destinations,
  metricsVersion,
  embedded = false,
}: {
  clientId?: string;
  backend?: TrackerBackend;
  destinations: Destinations;
  metricsVersion?: 1;
  embedded?: boolean;
}) {
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const selectedClient = clientId ?? params.get("clientId") ?? undefined;
  const search = params.get("q") ?? "";
  const view =
    params.get(trackerViewParameter(pathname)) === "board" ? "board" : "table";
  const tracker = useImpactTracker(selectedClient, search);
  const [selection, setSelection] = useState<{ key: string; scope: string }>();
  const [dialog, setDialog] = useState<{
    kind: "track" | "configure";
    scope: string;
  }>();
  const viewScope = JSON.stringify([
    tracker.scope,
    selectedClient,
    tracker.backend,
  ]);
  const activeDialog = dialog?.scope === viewScope ? dialog.kind : undefined;
  if (dialog && !activeDialog) setDialog(undefined);
  const selected =
    selection?.scope === viewScope
      ? tracker.rows.find((row) => impactRowKey(row) === selection.key)
      : undefined;
  if (selection && !selected) setSelection(undefined);
  const set = (key: "q" | "view", value: string) =>
    router.replace(trackerRouteHref(pathname, params.toString(), key, value), {
      scroll: false,
    });
  const changeClient = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set("clientId", value);
    else next.delete("clientId");
    setSelection(undefined);
    setDialog(undefined);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  };
  return (
    <section
      className={`${styles.page} ${embedded ? styles.embedded : ""}`}
      aria-label="Bill Tracker"
    >
      {!embedded && <h1>Bill Tracker</h1>}
      <div className={styles.card}>
        <header className={styles.toolbar}>
          <div>
            <h2>Tracked bills</h2>
            <p className={styles.muted}>
              {selectedClient
                ? "Bills tracked for this client"
                : "Bills tracked across your clients"}
            </p>
          </div>
          <div className={styles.actions}>
            <ActionButton
              disabled={!selectedClient || !tracker.backend}
              onClick={() => setDialog({ kind: "configure", scope: viewScope })}
            >
              Configure
            </ActionButton>
            <ActionButton
              primary
              disabled={!selectedClient || !tracker.backend}
              onClick={() => setDialog({ kind: "track", scope: viewScope })}
            >
              Track bill
            </ActionButton>
          </div>
        </header>
        {!selectedClient && (
          <p className={styles.muted}>
            Choose a client to track a new bill or configure its watchlist.
          </p>
        )}
        <div className={styles.filters}>
          {!clientId && (
            <Field label="Client" htmlFor="tracker-client">
              <SelectInput
                id="tracker-client"
                value={selectedClient ?? ""}
                onValueChange={changeClient}
                options={[
                  { value: "", label: "All clients" },
                  ...tracker.clients.map((client) => ({
                    value: client.id,
                    label: client.name,
                  })),
                ]}
              />
            </Field>
          )}
          <Field label="Search tracked bills" htmlFor="tracker-search">
            <TextInput
              id="tracker-search"
              value={search}
              maxLength={160}
              placeholder="Bill number, title or client"
              onChange={(event) => set("q", event.target.value)}
            />
          </Field>
          <div className={styles.actions}>
            <ActionButton
              aria-pressed={view === "table"}
              onClick={() => set("view", "table")}
            >
              Table view
            </ActionButton>
            <ActionButton
              aria-pressed={view === "board"}
              onClick={() => set("view", "board")}
            >
              Board view
            </ActionButton>
            <ActionButton onClick={() => void tracker.refetch()}>
              Refresh
            </ActionButton>
          </div>
        </div>
        {selectedClient &&
          backend &&
          tracker.backend === backend &&
          metricsVersion === 1 && (
            <ClientMetrics
              clientId={selectedClient}
              backend={backend}
              version={metricsVersion}
            />
          )}
        <StatusPanel
          loading={tracker.isPending}
          error={tracker.error}
          onRetry={() => void tracker.refetch()}
        >
          <BillResults
            rows={tracker.rows}
            view={view}
            showClient={!clientId}
            onOpen={(row) =>
              setSelection({ key: impactRowKey(row), scope: viewScope })
            }
          />
          <footer className={styles.toolbar}>
            <p className={styles.muted}>
              Showing {tracker.rows.length} of {tracker.total ?? "—"} tracked
              entries.
            </p>
            {tracker.hasNextPage && (
              <ActionButton
                disabled={tracker.isFetchingNextPage}
                onClick={() => void tracker.fetchNextPage()}
              >
                {tracker.isFetchingNextPage ? "Loading…" : "Load more bills"}
              </ActionButton>
            )}
          </footer>
        </StatusPanel>
      </div>
      {selected && (
        <BillDrawer
          key={impactRowKey(selected)}
          bill={selected}
          destinations={destinations}
          onClose={() => setSelection(undefined)}
        />
      )}
      {selectedClient && tracker.backend && activeDialog === "track" && (
        <TrackBillDialog
          key={viewScope}
          clientId={selectedClient}
          backend={tracker.backend}
          onClose={() => setDialog(undefined)}
        />
      )}
      {selectedClient && tracker.backend && activeDialog === "configure" && (
        <WatchlistDialog
          key={viewScope}
          clientId={selectedClient}
          backend={tracker.backend}
          onClose={() => setDialog(undefined)}
        />
      )}
    </section>
  );
}
function ClientMetrics({
  clientId,
  backend,
  version,
}: {
  clientId: string;
  backend: TrackerBackend;
  version: 1;
}) {
  const board = useBillBoard(clientId, backend);
  return (
    <div className={styles.metrics}>
      <TrackerMetricCards
        clientId={clientId}
        backend={backend}
        version={version}
        boardScope={board.scope}
        boardReady={currentBoard(board).pages.length > 0 && !board.isFetching}
      />
    </div>
  );
}
