"use client";
import { useState } from "react";
import type { DirectoryContact } from "../../../shared/capiro/operations/directory-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import { ContactPreview } from "./ContactPreview";
import { DirectoryPagination } from "./DirectoryPagination";
import { MemberProfile } from "./MemberProfile";
import styles from "./directory.module.css";
export function CongressionalContacts({
  favoritesOnly = false,
}: {
  favoritesOnly?: boolean;
}) {
  const [filters, setFilters] = useState({
    q: "",
    chamber: "",
    state: "",
    role: "",
    issue: "",
    committee: "",
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DirectoryContact>();
  const [profile, setProfile] = useState<DirectoryContact>();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const query = useCapiroQuery("directory.contacts", {
    query: {
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      page,
      pageSize: 25,
    },
  });
  const favorites = useCapiroQuery("directory.favorites", {});
  const data = query.data;
  const rows = (data?.contacts || []).filter(
    (c) =>
      !favoritesOnly ||
      favorites.data?.some((f) => f.directoryContactId === c.id),
  );
  function filter(key: keyof typeof filters, value: string) {
    setFilters({ ...filters, [key]: value });
    setPage(1);
    setSelected(undefined);
  }
  if (profile)
    return (
      <MemberProfile
        contact={profile}
        onBack={() => setProfile(undefined)}
        favorites={favorites}
      />
    );
  const options = {
    chamber: data?.availableFilters.chambers || [],
    state: data?.availableFilters.states || [],
    role: data?.availableFilters.roles || [],
    issue: data?.availableFilters.issues || [],
    committee: data?.availableFilters.committees || [],
  };
  return (
    <>
      <div className={styles.toolbar}>
        <TextInput
          aria-label="Search congressional offices and staff"
          placeholder="Name, role, member, issue or committee…"
          value={filters.q}
          onChange={(e) => filter("q", e.target.value)}
        />
        {(Object.keys(options) as (keyof typeof options)[]).map((key) => (
          <select
            key={key}
            className={styles.select}
            aria-label={key}
            value={filters[key]}
            onChange={(e) => filter(key, e.target.value)}
          >
            <option value="">
              {key === "issue"
                ? "Issue area"
                : key.charAt(0).toUpperCase() + key.slice(1)}{" "}
              · Any
            </option>
            {options[key].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        ))}
        <ActionButton
          onClick={() => {
            setFilters({
              q: "",
              chamber: "",
              state: "",
              role: "",
              issue: "",
              committee: "",
            });
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
        <div className={styles.split}>
          <Panel
            title={
              data
                ? `${data.total.toLocaleString()} offices · ${data.totals.staff.toLocaleString()} staff`
                : "Congressional Staff"
            }
            actions={
              <ActionButton
                onClick={() =>
                  setExpanded(
                    expanded.size ? new Set() : new Set(rows.map((r) => r.id)),
                  )
                }
              >
                {expanded.size ? "Collapse all" : "Expand all"}
              </ActionButton>
            }
          >
            <DataTable
              rows={rows}
              rowKey={(r) => r.id}
              caption="Congressional offices and staff"
              columns={[
                {
                  key: "person",
                  label: "Office / person",
                  render: (c) => (
                    <div>
                      <div className={styles.person}>
                        <button
                          className={styles.link}
                          aria-expanded={expanded.has(c.id)}
                          aria-label={`Expand ${c.fullName}`}
                          onClick={() =>
                            setExpanded((old) => {
                              const next = new Set(old);
                              next.has(c.id)
                                ? next.delete(c.id)
                                : next.add(c.id);
                              return next;
                            })
                          }
                        >
                          {expanded.has(c.id) ? "−" : "+"}
                        </button>
                        <span className={styles.avatar}>
                          {c.fullName
                            .split(" ")
                            .map((p) => p[0])
                            .slice(-2)
                            .join("")}
                        </span>
                        <button
                          className={styles.link}
                          onClick={() => setSelected(c)}
                        >
                          <strong>{c.fullName}</strong>
                          <div className={styles.muted}>
                            {[c.party, c.state, c.district, c.title]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </button>
                      </div>
                      {expanded.has(c.id) &&
                        c.staff.map((s) => (
                          <div key={s.id} className={styles.staff}>
                            <span>
                              {s.fullName}
                              <div className={styles.muted}>{s.title}</div>
                            </span>
                            <span className={styles.muted}>
                              {s.officeLocation}
                            </span>
                            <span className={styles.muted}>
                              {s.email || "Not provided"}
                            </span>
                          </div>
                        ))}
                    </div>
                  ),
                },
                {
                  key: "office",
                  label: "Office",
                  render: (c) => c.officeLocation || "—",
                },
                {
                  key: "committee",
                  label: "Committee",
                  render: (c) => c.committees?.join(" · ") || "—",
                },
                {
                  key: "contact",
                  label: "Contact",
                  render: (c) => c.email || c.phone || "—",
                },
              ]}
            />
            <DirectoryPagination
              page={page}
              total={data?.total || 0}
              pageSize={25}
              onPage={setPage}
            />
            {favoritesOnly && (
              <p className={styles.content}>
                Favorites are filtered within this results page. Search an
                office by name to find it directly.
              </p>
            )}
          </Panel>
          {selected && (
            <ContactPreview
              contact={selected}
              onOpen={() => setProfile(selected)}
            />
          )}
        </div>
      </StatusPanel>
    </>
  );
}
