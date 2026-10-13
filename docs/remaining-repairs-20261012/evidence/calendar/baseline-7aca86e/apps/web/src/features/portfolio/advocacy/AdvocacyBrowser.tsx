"use client";
import { useState } from "react";
import { AdvocacyReadState } from "./AdvocacyReadState";
import type { Matter } from "./contracts";
import { useAdvocacyTimeline, useMatters } from "./queries";
import { AdvocacyFilters } from "./AdvocacyFilters";
import { AdvocacyTimeline } from "./AdvocacyTimeline";
import { filterTimeline, matchesMatter, statusLabel } from "./history-model";
import styles from "./history.module.css";

function MatterList({
  matters,
  onSelect,
}: {
  matters: Matter[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className={styles.matters}>
      {matters.map((matter) => (
        <button
          className={styles.matter}
          key={matter.id}
          onClick={() => onSelect(matter.id)}
        >
          <span className="row between">
            <strong>{matter.title}</strong>
            <span className="chip">{statusLabel(matter.status)}</span>
          </span>
          <small>
            {matter.recordCount} records · {matter.outcomeCount} outcomes
          </small>
          {matter.summary && <p className="muted">{matter.summary}</p>}
        </button>
      ))}
      {matters.length === 0 && (
        <p className="empty">No matching advocacy matters.</p>
      )}
    </div>
  );
}
export function AdvocacyBrowser({
  clientId,
  onSelect,
}: {
  clientId: string;
  onSelect: (id: string) => void;
}) {
  const [view, setView] = useState<"timeline" | "matters">("timeline");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const matters = useMatters(clientId);
  const timeline = useAdvocacyTimeline(clientId, view === "timeline");
  const events = timeline.data
    ? filterTimeline(timeline.data, matters.data, search, status)
    : undefined;
  return (
    <div className={styles.browser}>
      <AdvocacyFilters
        view={view}
        onView={setView}
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        matters={matters.data}
      />
      <AdvocacyReadState
        label="matter list"
        current={matters.isCurrent}
        pending={matters.isPending || matters.isFetching}
        error={matters.error}
        retry={() => void matters.refetch()}
      />
      {view === "matters" ? (
        matters.data && (
          <MatterList
            matters={matters.data.filter((matter) =>
              matchesMatter(matter, search, status),
            )}
            onSelect={onSelect}
          />
        )
      ) : (
        <>
          <AdvocacyReadState
            label="timeline"
            current={timeline.isCurrent}
            pending={timeline.isPending || timeline.isFetching}
            error={timeline.error}
            retry={() => void timeline.refetch()}
          />
          {timeline.data && (
            <p className={styles.loaded}>
              {timeline.data.length} loaded events · Latest 500 at most; older
              history may be outside this view.
            </p>
          )}
          {events ? (
            <AdvocacyTimeline
              key={`${search}:${status}`}
              entries={events}
              onSelect={onSelect}
            />
          ) : (
            timeline.data && (
              <p className="status">
                The selected filters need a current matter list. Retry the list
                to review these results.
              </p>
            )
          )}
        </>
      )}
    </div>
  );
}
