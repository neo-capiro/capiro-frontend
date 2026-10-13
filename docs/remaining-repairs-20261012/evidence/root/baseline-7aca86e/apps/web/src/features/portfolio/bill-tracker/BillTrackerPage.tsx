"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  TrackerBackend,
  Destinations,
} from "@/shared/portfolio/config/config";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useBillBoard } from "./queries";
import { BillResults } from "./BillResults";
import { BillDrawer } from "./BillDrawer";
import { TrackBillDialog } from "./TrackBillDialog";
import { WatchlistDialog } from "./WatchlistDialog";
import { currentBoard } from "./current-data";
import styles from "./bills.module.css";
export function BillTrackerPage({
  clientId,
  backend,
  destinations,
}: {
  clientId: string;
  backend?: TrackerBackend;
  destinations: Destinations;
}) {
  if (!backend)
    return (
      <div className={`page stack ${styles.page}`}>
        <h1>Bill Tracker</h1>
        <p className="status" role="status">
          Bill Tracker is not available in this environment.
        </p>
      </div>
    );
  return (
    <ConfiguredTracker
      key={`${clientId}:${backend}`}
      clientId={clientId}
      backend={backend}
      destinations={destinations}
    />
  );
}
function ConfiguredTracker({
  clientId,
  backend,
  destinations,
}: {
  clientId: string;
  backend: TrackerBackend;
  destinations: Destinations;
}) {
  const board = useBillBoard(clientId, backend);
  const params = useSearchParams();
  const router = useRouter();
  const [tracking, setTracking] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [selection, setSelection] = useState<{
    billId: string;
    scope: string;
  }>();
  const view = params.get("view") === "board" ? "board" : "table";
  const search = params.get("q") ?? "";
  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/portfolio/${clientId}/bills?${next}`, { scroll: false });
  }
  const { pages, bills: unique, columns } = currentBoard(board, search);
  const selected =
    selection?.scope === board.scope
      ? unique.find((bill) => bill.billId === selection.billId)
      : undefined;
  // A failed read/removal closes the selection permanently, even if it later returns.
  if (selection && !selected) setSelection(undefined);
  return (
    <div className={`page stack ${styles.page}`}>
      <h1>Bill Tracker</h1>
      <section className={`card stack ${styles.tracker}`}>
        <header className="row between">
          <h2>Tracked bills</h2>
          <span className="muted">{pages[0]?.total ?? "—"} tracked bills</span>
        </header>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="button" onClick={() => setConfiguring(true)}>
            Configure
          </button>
          <button className="button primary" onClick={() => setTracking(true)}>
            Track bill
          </button>
        </div>
        <div className={styles.summary}>
          <div>
            <strong>{pages[0]?.total ?? "—"}</strong>
            <small>Tracked bills</small>
          </div>
          <div>
            <strong>—</strong>
            <small>Material changes</small>
          </div>
          <div>
            <strong>—</strong>
            <small>Watchlist coverage</small>
          </div>
        </div>
        <section className={styles.results} aria-label="Tracked bill results">
          <header className={styles.resultsHeader}>
            <h3>Tracked bills</h3>
            <div className={styles.resultsControls}>
              <input
                aria-label="Filter loaded bills"
                value={search}
                maxLength={200}
                placeholder="Filter loaded bills"
                onChange={(event) => set("q", event.target.value)}
              />
              <button
                className="button"
                aria-pressed={view === "table"}
                onClick={() => set("view", "table")}
              >
                Table view
              </button>
              <button
                className="button"
                aria-pressed={view === "board"}
                onClick={() => set("view", "board")}
              >
                Board view
              </button>
            </div>
          </header>
          <QueryState
            pending={board.isPending}
            error={board.error}
            retry={() => void board.refetch()}
          />
          {board.isSuccess && !board.error && (
            <>
              <BillResults
                columns={columns}
                view={view}
                onOpen={(bill) =>
                  setSelection({ billId: bill.billId, scope: board.scope })
                }
              />
              {unique.length === 0 && (
                <p className="empty">
                  No tracked bills yet. Search for a bill to start tracking.
                </p>
              )}
              <p className={styles.resultsFooter}>
                Showing {unique.length} loaded bills of {pages[0]?.total}.
                Passage estimates come from the service.
              </p>
              {board.hasNextPage && (
                <button
                  className="button"
                  disabled={board.isFetchingNextPage}
                  onClick={() => void board.fetchNextPage()}
                >
                  {board.isFetchingNextPage ? "Loading…" : "Load more bills"}
                </button>
              )}
            </>
          )}
        </section>
      </section>
      {tracking && (
        <TrackBillDialog
          clientId={clientId}
          backend={backend}
          onClose={() => setTracking(false)}
        />
      )}
      {configuring && (
        <WatchlistDialog
          clientId={clientId}
          backend={backend}
          onClose={() => setConfiguring(false)}
        />
      )}
      {selected && (
        <BillDrawer
          key={selected.billId}
          bill={selected}
          clientId={clientId}
          backend={backend}
          destinations={destinations}
          onClose={() =>
            setSelection((current) =>
              current?.billId === selected.billId &&
              current.scope === board.scope
                ? undefined
                : current,
            )
          }
        />
      )}
    </div>
  );
}
