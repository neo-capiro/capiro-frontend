"use client";
import { LayoutGrid, List } from "lucide-react";
import { sectorLabel } from "@/shared/portfolio/domain/sector";
import { clientSectors, type Client } from "./contracts";
import { type PortfolioIndexState } from "./filter";
import styles from "./portfolio.module.css";

/** Option labels read as words; the stored value stays the raw enum. */
function humanStatus(status: string) {
  const words = status.replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function IndexFilters({
  state,
  clients,
  set,
  clear,
}: {
  state: PortfolioIndexState;
  clients?: Client[];
  set: (key: string, value: string) => void;
  clear: () => void;
}) {
  const statuses = [
    ...new Set((clients ?? []).map((c) => c.profileStatus)),
  ].sort();
  const sectors = [...new Set((clients ?? []).flatMap(clientSectors))].sort();
  const filtered = Boolean(
    state.search || state.status || state.sector || state.owner || state.type,
  );
  return (
    <div className={styles.filters} aria-label="Portfolio filters">
      <select
        aria-label="Profile status"
        value={state.status}
        onChange={(e) => set("status", e.target.value)}
      >
        <option value="">All statuses</option>
        {state.status && !statuses.includes(state.status) && (
          <option value={state.status}>
            {state.status} (
            {clients ? "not in current profiles" : "not available"})
          </option>
        )}
        {statuses.map((status) => (
          <option key={status} value={status}>
            {humanStatus(status)}
          </option>
        ))}
      </select>
      <select
        aria-label="Sector"
        value={state.sector}
        onChange={(e) => set("sector", e.target.value)}
      >
        <option value="">All sectors</option>
        {state.sector && !sectors.includes(state.sector) && (
          <option value={state.sector}>
            {state.sector} (
            {clients ? "not in current profiles" : "not available"})
          </option>
        )}
        {sectors.map((sector) => (
          <option key={sector} value={sector}>
            {sectorLabel(sector)}
          </option>
        ))}
      </select>
      <select
        aria-label="Sort profiles"
        value={state.sort}
        onChange={(e) => set("sort", e.target.value)}
      >
        <option value="saved">Saved order</option>
        <option value="recent">Recently added</option>
        <option value="name">Name A–Z</option>
      </select>
      {filtered && (
        <button className="button ghost" onClick={clear}>
          Clear filters
        </button>
      )}
      <div className={styles.viewSwitch} aria-label="Profile layout">
        <button
          className="button iconButton"
          aria-label="List view"
          aria-pressed={state.view === "list"}
          onClick={() => set("view", "list")}
        >
          <List size={16} />
        </button>
        <button
          className="button iconButton"
          aria-label="Card view"
          aria-pressed={state.view === "cards"}
          onClick={() => set("view", "cards")}
        >
          <LayoutGrid size={16} />
        </button>
      </div>
    </div>
  );
}
