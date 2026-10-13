"use client";
import type { RefObject } from "react";
import Link from "next/link";
import type { Client } from "./contracts";
import type { PortfolioIndexState } from "./filter";
import { IndexFilters } from "./IndexFilters";
import styles from "./portfolio.module.css";

export function IndexNavigation({
  records,
  state,
  permitted,
  objectiveTrigger,
  onObjective,
  set,
  clear,
}: {
  records?: Client[];
  state: PortfolioIndexState;
  permitted: boolean;
  objectiveTrigger: RefObject<HTMLButtonElement | null>;
  onObjective: () => void;
  set: (key: string, value: string) => void;
  clear: () => void;
}) {
  return (
    <nav className={styles.tabs} aria-label="Profile type">
      {[
        ["All", ""],
        ["Clients", "CLIENT"],
      ].map(([label, value]) => (
        <button
          key={label}
          className={`button ${state.type === value ? "primary" : ""}`}
          aria-pressed={state.type === value}
          onClick={() => set("type", value ?? "")}
        >
          {label}{" "}
          <small>
            {value
              ? records?.filter((c) => c.profileType === value).length
              : (records?.length ?? "—")}
          </small>
        </button>
      ))}
      <Link className="button" href="/portfolio/prospects">
        Prospects
      </Link>
      <Link className="button" href="/portfolio/prospects?pipeline=1">
        Pipeline
      </Link>
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
