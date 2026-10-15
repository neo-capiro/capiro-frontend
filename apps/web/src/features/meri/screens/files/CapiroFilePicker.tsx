"use client";
import { useState } from "react";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { FormField } from "../../ui/FormField";
import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import { AttachedFiles } from "./AttachedFiles";
import type { AttachedFile } from "./types";
import styles from "./files.module.css";

export type CapiroFileRow = {
  id: string;
  name: string;
  mediaType: string;
  location: string;
  version: string;
  updated: string;
  /** Searchable text the trusted index holds for this version, beyond its name and location. */
  indexed: string;
};

const columns: readonly DataColumn<CapiroFileRow>[] = [
  { key: "file", label: "File", width: 410, render: (row) => row.name },
  {
    key: "location",
    label: "Location",
    width: 260,
    render: (row) => row.location,
  },
  {
    key: "version",
    label: "Version",
    width: 100,
    render: (row) => <span className={styles.mono}>{row.version}</span>,
  },
  {
    key: "updated",
    label: "Updated",
    width: 142,
    render: (row) => row.updated,
  },
];

const toAttached = (row: CapiroFileRow): AttachedFile => ({
  id: row.id,
  name: `${row.name} · ${row.version}`,
  mediaType: row.mediaType,
  origin: "capiro",
});

/** Search the files this account may read and choose one exact version; attaching needs the trusted service. */
export function CapiroFilePicker({
  files,
  initialQuery,
  initialSelected,
  onCancel,
  unavailable,
}: {
  files: readonly CapiroFileRow[];
  initialQuery: string;
  initialSelected?: string | undefined;
  onCancel: () => void;
  unavailable: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState(initialSelected);
  const needle = query.trim().toLowerCase();
  const matches = files.filter((file) =>
    `${file.name} ${file.location} ${file.indexed}`
      .toLowerCase()
      .includes(needle),
  );
  const chosen = files.filter((file) => file.id === selected);
  return (
    <>
      <FormField
        label="Search"
        type="search"
        placeholder="Search by file name or location…"
        value={query}
        onChange={setQuery}
      />
      {matches.length ? (
        <DataTable
          caption="Capiro files available to your account"
          columns={columns}
          rows={matches}
          selectedId={selected}
          onSelect={setSelected}
        />
      ) : (
        <p className={styles.small} role="status">
          No authorized file matches “{query}”.
        </p>
      )}
      <div className={styles.selection} role="status">
        <StatusPill tone={chosen.length ? "success" : "neutral"}>
          {`${chosen.length} ${chosen.length === 1 ? "file" : "files"} selected`}
        </StatusPill>
        {chosen.length ? (
          <AttachedFiles
            label="Selected versions"
            files={chosen.map(toAttached)}
            onRemove={() => setSelected(undefined)}
          />
        ) : null}
      </div>
      <p className={styles.small}>
        The selected version is attached with its original source reference and
        permissions.
      </p>
      <div className={ui.row}>
        <button type="button" className={ui.outline} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={ui.primary}
          disabled
          title={unavailable}
        >
          Attach selected version
        </button>
      </div>
    </>
  );
}
