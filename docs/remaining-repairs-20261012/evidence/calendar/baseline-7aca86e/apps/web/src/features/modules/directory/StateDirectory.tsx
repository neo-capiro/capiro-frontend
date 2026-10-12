"use client";
import { useMemo, useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import { DirectoryPagination } from "./DirectoryPagination";
import styles from "./directory.module.css";
export function StateDirectory({
  committees = false,
}: {
  committees?: boolean;
}) {
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [chamber, setChamber] = useState("");
  const [page, setPage] = useState(1);
  const facets = useCapiroQuery("directory.state-facets", {
    query: { states: state ? [state] : undefined },
  });
  const query = useCapiroQuery("directory.state-legislators", {
    query: {
      q,
      states: state ? [state] : undefined,
      chambers: chamber ? [chamber] : undefined,
      includeCommittees: true,
      page,
      pageSize: 100,
    },
  });
  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        chamber: string | null | undefined;
        state: string;
        members: string[];
      }
    >();
    for (const row of query.data?.rows || [])
      for (const c of row.committees || []) {
        const prior = map.get(c.id);
        if (prior) prior.members.push(row.name);
        else
          map.set(c.id, {
            id: c.id,
            name: c.name,
            chamber: c.chamber,
            state: row.state,
            members: [row.name],
          });
      }
    return [...map.values()];
  }, [query.data]);
  return (
    <>
      <div className={styles.toolbar}>
        <TextInput
          aria-label={
            committees ? "Search state committees" : "Search state legislators"
          }
          placeholder={
            committees
              ? "Search committees and members…"
              : "Name, state or district…"
          }
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          className={styles.select}
          aria-label="State"
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setPage(1);
          }}
        >
          <option value="">State · Any</option>
          {facets.data?.states.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          className={styles.select}
          aria-label="Chamber"
          value={chamber}
          onChange={(e) => {
            setChamber(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Chamber · Any</option>
          {facets.data?.chambers.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <ActionButton
          onClick={() => {
            setQ("");
            setState("");
            setChamber("");
            setPage(1);
          }}
        >
          Clear all
        </ActionButton>
      </div>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <Panel
          title={
            committees
              ? "State Committees"
              : `${query.data?.total ?? "—"} state legislators`
          }
          description={
            committees
              ? "Canonical committee memberships from the current legislator results page. Member counts represent this loaded page."
              : undefined
          }
        >
          {committees ? (
            <DataTable
              rows={groups}
              rowKey={(r) => r.id}
              caption="State committees and loaded members"
              columns={[
                { key: "name", label: "Committee", render: (r) => r.name },
                {
                  key: "chamber",
                  label: "Chamber",
                  render: (r) => r.chamber || "—",
                },
                { key: "state", label: "State", render: (r) => r.state },
                {
                  key: "members",
                  label: "Members shown",
                  render: (r) => r.members.length,
                },
                {
                  key: "people",
                  label: "Members",
                  render: (r) => r.members.join(", "),
                },
              ]}
            />
          ) : (
            <DataTable
              rows={query.data?.rows || []}
              rowKey={(r) => r.id}
              caption="State legislator directory"
              columns={[
                {
                  key: "name",
                  label: "Legislator",
                  render: (r) => (
                    <>
                      <strong>{r.name}</strong>
                      <div className={styles.muted}>
                        {r.party} · {r.state}-{r.district}
                      </div>
                    </>
                  ),
                },
                {
                  key: "chamber",
                  label: "Chamber",
                  render: (r) => r.chamber || "—",
                },
                {
                  key: "committees",
                  label: "Committees",
                  render: (r) =>
                    r.committees?.map((c) => c.name).join(", ") || "—",
                },
                {
                  key: "bills",
                  label: "Bills",
                  render: (r) => r.billCount ?? "Unknown",
                },
                {
                  key: "contact",
                  label: "Contact",
                  render: (r) =>
                    r.email ? (
                      <a href={`mailto:${r.email}`}>{r.email}</a>
                    ) : r.url && /^https?:\/\//.test(r.url) ? (
                      <a href={r.url} target="_blank" rel="noreferrer">
                        Official profile
                      </a>
                    ) : (
                      "Not provided"
                    ),
                },
              ]}
            />
          )}
          <DirectoryPagination
            page={page}
            total={query.data?.total || 0}
            pageSize={100}
            onPage={setPage}
          />
        </Panel>
      </StatusPanel>
    </>
  );
}
