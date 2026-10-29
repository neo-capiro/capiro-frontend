"use client";
import type { RefObject } from "react";
import Link from "next/link";
import { isClientRecord } from "@/shared/portfolio/domain/profile-type";
import type { Client } from "./contracts";
import type { PortfolioIndexState } from "./filter";
import { IndexFilters } from "./IndexFilters";
import styles from "./portfolio.module.css";

export function IndexNavigation({
  records,
  prospectCount,
  allCount,
  customizing = false,
  state,
  permitted,
  objectiveTrigger,
  onObjective,
  set,
  clear,
}: {
  records?: Client[];
  prospectCount?: number;
  allCount?: number;
  customizing?: boolean;
  state: PortfolioIndexState;
  permitted: boolean;
  objectiveTrigger: RefObject<HTMLButtonElement | null>;
  onObjective: () => void;
  set: (key: string, value: string) => void;
  clear: () => void;
}) {
  return (
    <nav className={styles.tabs} aria-label="Profile type" inert={customizing}>
      {[
        { label: "All", value: "", count: allCount },
        {
          label: "Clients",
          value: "CLIENT",
          count: records?.filter((client) => isClientRecord(client.profileType))
            .length,
        },
        { label: "Prospects", value: "PROSPECT", count: prospectCount },
      ].map(({ label, value, count }) => (
        <button
          key={label}
          className={`button ${state.type === value ? "primary" : ""}`}
          aria-pressed={state.type === value}
          onClick={() => set("type", value)}
        >
          {label} <small>{count ?? "—"}</small>
        </button>
      ))}
      <Link className="button" href="/portfolio?type=PROSPECT&pipeline=1">
        Pipeline
      </Link>
      {state.type === "PROSPECT" && (
        <Link
          className="button"
          href="/portfolio/prospects"
          aria-label="Business Development list"
          title="Business Development list"
        >
          BD list
        </Link>
      )}
      <div className={styles.secondaryActions}>
        <button
          ref={objectiveTrigger}
          className="button"
          disabled={!permitted}
          onClick={onObjective}
        >
          New objective
        </button>
        <details
          className={styles.tools}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary className="button">Filters and view</summary>
          <div className={styles.toolsPanel}>
            <IndexFilters
              state={state}
              clients={records}
              set={set}
              clear={clear}
            />
          </div>
        </details>
      </div>
    </nav>
  );
}
