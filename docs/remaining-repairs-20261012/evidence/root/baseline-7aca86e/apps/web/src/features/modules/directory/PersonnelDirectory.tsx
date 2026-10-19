"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import { DirectoryPagination } from "./DirectoryPagination";
import styles from "./directory.module.css";
export function PersonnelDirectory() {
  const [q, setQ] = useState("");
  const [service, setService] = useState("");
  const [aligned, setAligned] = useState<"" | "aligned" | "unaligned">("");
  const [page, setPage] = useState(1);
  const query = useCapiroQuery("directory.personnel", {
    query: {
      q,
      service: service || undefined,
      pe_aligned: aligned || undefined,
      page,
      limit: 25,
      sort: "pe_first",
    },
  });
  return (
    <>
      <div className={styles.toolbar}>
        <TextInput
          aria-label="Search defense personnel"
          placeholder="Name, office, program or PE…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          className={styles.select}
          aria-label="Service"
          value={service}
          onChange={(e) => {
            setService(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Service · Any</option>
          {["Army", "Navy", "Air Force", "Space Force", "Defense-wide"].map(
            (x) => (
              <option key={x}>{x}</option>
            ),
          )}
        </select>
        <select
          className={styles.select}
          aria-label="PE alignment"
          value={aligned}
          onChange={(e) => {
            setAligned(e.target.value as typeof aligned);
            setPage(1);
          }}
        >
          <option value="">PE alignment · Any</option>
          <option value="aligned">PE aligned</option>
          <option value="unaligned">Unaligned</option>
        </select>
        <ActionButton
          onClick={() => {
            setQ("");
            setService("");
            setAligned("");
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
            query.data ? `${query.data.total} personnel` : "Department of War"
          }
        >
          <DataTable
            rows={query.data?.data || []}
            rowKey={(r) => r.id}
            caption="Defense personnel directory"
            columns={[
              {
                key: "name",
                label: "Name / title",
                render: (r) => (
                  <>
                    <strong>{r.fullName}</strong>
                    <div className={styles.muted}>
                      {r.title || r.role || "Title not provided"}
                    </div>
                  </>
                ),
              },
              {
                key: "office",
                label: "Office / organization",
                render: (r) => r.organization || "—",
              },
              {
                key: "service",
                label: "Service",
                render: (r) => r.service || "—",
              },
              {
                key: "pe",
                label: "Program elements",
                render: (r) => (
                  <>
                    {[r.pePrimary, ...r.peSecondary]
                      .filter(Boolean)
                      .map((pe) => (
                        <a
                          key={pe}
                          href={`/modules/intelligence?view=defense-budget&peCode=${encodeURIComponent(pe || "")}`}
                        >
                          {pe}{" "}
                        </a>
                      ))}
                  </>
                ),
              },
              {
                key: "status",
                label: "Evidence",
                render: (r) => (
                  <Badge>
                    {r.status} · {r.sourceCount} sources
                  </Badge>
                ),
              },
              {
                key: "contact",
                label: "Contact",
                render: (r) =>
                  r.email ||
                  (r.publicProfileUrl && (
                    <a
                      href={
                        /^https?:\/\//.test(r.publicProfileUrl)
                          ? r.publicProfileUrl
                          : undefined
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Public profile
                    </a>
                  )) ||
                  "Not available",
              },
            ]}
          />
          <DirectoryPagination
            page={page}
            total={query.data?.total || 0}
            pageSize={25}
            onPage={setPage}
          />
        </Panel>
      </StatusPanel>
    </>
  );
}
