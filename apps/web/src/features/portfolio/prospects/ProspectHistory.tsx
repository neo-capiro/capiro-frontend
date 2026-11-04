"use client";
import { useState } from "react";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import {
  memberName,
  useMemberOptions,
} from "@/features/portfolio/index/public";
import { useProspectHistory } from "./queries";
import { stageLabel } from "./contracts";
import { prospectHistoryRows } from "./overview";
import styles from "./prospects.module.css";

export function ProspectHistory({
  id,
  full = false,
}: {
  id: string;
  full?: boolean;
}) {
  const history = useProspectHistory(id);
  const members = useMemberOptions();
  const [kind, setKind] = useState("");
  const [search, setSearch] = useState("");
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");
  const [limit, setLimit] = useState(10);
  const [collapsed, setCollapsed] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const data = history.isSuccess && !history.error ? history.data : undefined;
  const kinds = [...new Set(data?.map((item) => item.kind))];
  const rows = prospectHistoryRows(data ?? [], kind, search, after, before);
  return (
    <section
      className={`card ${styles.activityCard}`}
      aria-label="Prospect activity"
    >
      <header className="row between">
        <h2>Activity</h2>
        <button
          className={`button ${styles.compactButton}`}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? "Expand activity" : "Collapse activity"}
        </button>
        <button
          className={`button ${styles.compactButton}`}
          onClick={() => void history.refetch()}
          disabled={history.isFetching}
        >
          {history.isFetching ? "Refreshing…" : "Refresh activity"}
        </button>
      </header>
      {data && !collapsed && (
        <>
          <div
            className={styles.activityFilters}
            role="group"
            aria-label="Prospect activity type"
          >
            {["", ...kinds].map((value) => (
              <button
                key={value}
                className={styles.filterChip}
                aria-pressed={kind === value}
                onClick={() => {
                  setKind(value);
                  setLimit(10);
                }}
              >
                {value === "note" ? "Notes" : value ? stageLabel(value) : "All"}
              </button>
            ))}
          </div>
          <div className={styles.activityFilters}>
            <label>
              Search activity
              <input
                type="search"
                value={search}
                maxLength={200}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setLimit(10);
                }}
              />
            </label>
            <label>
              From
              <input
                type="date"
                value={after}
                max={before || undefined}
                onChange={(event) => {
                  setAfter(event.target.value);
                  setLimit(10);
                }}
              />
            </label>
            <label>
              Through
              <input
                type="date"
                value={before}
                min={after || undefined}
                onChange={(event) => {
                  setBefore(event.target.value);
                  setLimit(10);
                }}
              />
            </label>
          </div>
        </>
      )}
      <QueryState
        pending={history.isPending}
        error={history.error}
        retry={() => void history.refetch()}
      />
      {data &&
        !collapsed &&
        (rows.length ? (
          <ol className={styles.history}>
            {rows.slice(0, full ? rows.length : limit).map((item) => {
              const member =
                members.isSuccess && !members.error
                  ? members.data.find(
                      (member) => member.id === item.actorUserId,
                    )
                  : undefined;
              return (
                <li key={item.id}>
                  <span className={styles.activityKind}>
                    <img
                      src="/design/411-64863-note-dot.svg"
                      alt=""
                      width={5}
                      height={5}
                    />
                    {stageLabel(item.kind)}
                  </span>
                  <div className={styles.activityBody}>
                    <p>{item.body}</p>
                    {member && <small>{memberName(member)}</small>}
                  </div>
                  <time
                    dateTime={item.createdAt}
                    title={new Date(item.createdAt).toLocaleString()}
                  >
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="empty">
            {kind || search || after || before
              ? "No activity matches these filters."
              : "No activity yet."}
          </p>
        ))}
      {data && !collapsed && rows.length > 0 && (
        <footer className={`row between ${styles.activityFooter}`}>
          <small role="status">
            Showing {full ? rows.length : Math.min(limit, rows.length)} of{" "}
            {rows.length} events
          </small>
          {!full && limit < rows.length && (
            <button
              className={`button ${styles.compactButton}`}
              onClick={() => setLimit(limit + 10)}
            >
              Load more activity
            </button>
          )}
          {!full && (
            <button
              className={`button ${styles.compactButton}`}
              onClick={() => setShowFull(true)}
            >
              View full history
            </button>
          )}
          {!full && limit > 10 && (
            <button
              className={`button ${styles.compactButton}`}
              onClick={() => setLimit(10)}
            >
              Show newest 10
            </button>
          )}
        </footer>
      )}
      {showFull && !full && (
        <Dialog
          open
          wide
          title="Full prospect activity"
          description="Saved audit history, newest first. Search and date filters apply to this view."
          onOpenChange={setShowFull}
        >
          <ProspectHistory id={id} full />
        </Dialog>
      )}
    </section>
  );
}
