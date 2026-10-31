"use client";
/* eslint-disable @next/next/no-img-element */
import { DropdownMenu } from "radix-ui";
import {
  type ActivityFilters as Filters,
  emptyActivityFilters,
} from "./activity-filters";
import { ActivityDateFilter } from "./ActivityDateFilter";
import styles from "./activity-filters.module.css";

const asset = (slot: string) => `/design/411-60532-${slot}.svg`;
// The menu lists the kinds the feed actually returned, which are lowercase
// transport values ("email", "meeting", "document"). Showing them raw next to the
// sentence-case "All activity" reads like a debug menu (C2).
const kindLabels: Record<string, string> = {
  email: "Email",
  meeting: "Meeting",
  document: "Document",
  note: "Note",
  call: "Call",
  task: "Task",
};
const kindLabel = (kind: string) =>
  kindLabels[kind] ??
  (kind ? `${kind[0]?.toUpperCase()}${kind.slice(1)}` : "All activity");
export function ActivityFilters({
  value,
  onChange,
  kinds,
  zone,
}: {
  value: Filters;
  onChange: (filters: Filters) => void;
  kinds: string[];
  zone: string;
}) {
  return (
    <div className={styles.filters} aria-label="Activity filters">
      <label className={styles.search}>
        <span className="srOnly">Search activity</span>
        <img src={asset("search")} alt="" />
        <input
          type="search"
          placeholder="Search activity…"
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
        />
      </label>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          className={`button ${styles.trigger}`}
          aria-label="Activity type"
        >
          <img src={asset("filter")} alt="" />
          {kindLabel(value.kind)}
          <img src={asset("chevron")} alt="" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className={styles.menu} align="end">
            <DropdownMenu.RadioGroup
              value={value.kind}
              onValueChange={(kind) => onChange({ ...value, kind })}
            >
              {["", ...kinds].map((kind) => (
                <DropdownMenu.RadioItem key={kind} value={kind}>
                  {kindLabel(kind)}
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <ActivityDateFilter
        range={value}
        zone={zone}
        onChange={(range) => onChange({ ...value, ...range })}
        onClear={() => onChange({ ...emptyActivityFilters })}
      />
    </div>
  );
}
