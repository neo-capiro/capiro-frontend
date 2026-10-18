"use client";

import Link from "next/link";
import { useState } from "react";
import type { Destinations } from "@/shared/portfolio/config/config";
import { Shell } from "@/shared/portfolio/shell/Shell";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useClients } from "@/shared/portfolio/api/clients";
import { clientSectorLabel } from "./contracts";
import { filterClients } from "./filter";
import styles from "./portfolio.module.css";

/** Only the Core-native client roster is qualified for this preview. */
export function PreviewClientCatalog({
  destinations,
}: {
  destinations: Destinations;
}) {
  const clients = useClients();
  const [search, setSearch] = useState("");
  const roster =
    clients.isSuccess && !clients.error
      ? clients.data.filter((client) => client.profileType === "CLIENT")
      : undefined;
  const rows = roster
    ? filterClients(roster, { search, status: "", sector: "", owner: "" }, {})
    : undefined;

  return (
    <Shell destinations={destinations}>
      <div className={`page ${styles.indexPage}`}>
        <header className={`pageHeader ${styles.indexHeader}`}>
          <div className="stack" style={{ gap: 10 }}>
            <p className="eyebrow">Portfolio · Preview</p>
            <h1 className={styles.title}>
              Clients <span>{roster?.length ?? "—"}</span>
            </h1>
          </div>
          <div className={styles.headerActions}>
            <label className={styles.search}>
              <input
                aria-label="Search available clients"
                placeholder="Search clients"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
        </header>
        <p className="status" role="note">
          This preview supports the client list and client selection in Modules.
          Account owners, saved layouts, alerts, profile details, and editing
          are unavailable here.
        </p>
        <QueryState
          pending={clients.isPending}
          error={clients.error}
          retry={() => void clients.refetch()}
        />
        {rows && roster && (
          <section aria-label="Available clients">
            <p className={styles.resultCount} role="status">
              {rows.length} of {roster.length} available client
              {roster.length === 1 ? "" : "s"}
            </p>
            {rows.length ? (
              <div className="tableWrap">
                <table aria-label="Available clients">
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Sector</th>
                      <th>Status</th>
                      <th>Client scope</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((client) => (
                      <tr key={client.id}>
                        <td>
                          <strong>{client.name}</strong>
                        </td>
                        <td>{clientSectorLabel(client) ?? "—"}</td>
                        <td>
                          <span className="chip">{client.profileStatus}</span>
                        </td>
                        <td>
                          <Link
                            href={`/modules?clientId=${encodeURIComponent(client.id)}`}
                            aria-label={`Select ${client.name} in Modules`}
                          >
                            Select in Modules
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="status" role="status">
                {roster.length
                  ? "No clients match this search."
                  : "No clients are available to this session."}
              </p>
            )}
          </section>
        )}
      </div>
    </Shell>
  );
}
