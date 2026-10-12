"use client";
import { useState } from "react";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import {
  memberName,
  useMemberOptions,
} from "@/features/portfolio/index/public";
import { useProspectHistory } from "./queries";
import { stageLabel } from "./contracts";
import { prospectHistoryRows } from "./overview";
import styles from "./prospects.module.css";

export function ProspectHistory({ id }: { id: string }) {
  const history = useProspectHistory(id);
  const members = useMemberOptions();
  const [kind, setKind] = useState("");
  const data = history.isSuccess && !history.error ? history.data : undefined;
  const kinds = [...new Set(data?.map((item) => item.kind))];
  const rows = prospectHistoryRows(data ?? [], kind);
  return (
    <section
      className={`card ${styles.activityCard}`}
      aria-label="Prospect activity"
    >
      <header className="row between">
        <h2>Activity</h2>
        <button
          className={`button ${styles.compactButton}`}
          onClick={() => void history.refetch()}
          disabled={history.isFetching}
        >
          {history.isFetching ? "Refreshing…" : "Refresh activity"}
        </button>
      </header>
      {data && (
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
              onClick={() => setKind(value)}
            >
              {value === "note" ? "Notes" : value ? stageLabel(value) : "All"}
            </button>
          ))}
        </div>
      )}
      <QueryState
        pending={history.isPending}
        error={history.error}
        retry={() => void history.refetch()}
      />
      {data &&
        (rows.length ? (
          <ol className={styles.history}>
            {rows.map((item) => {
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
            {kind ? "No activity matches this filter." : "No activity yet."}
          </p>
        ))}
    </section>
  );
}
