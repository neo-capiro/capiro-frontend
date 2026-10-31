"use client";
/* eslint-disable @next/next/no-img-element */
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import type { Destinations } from "@/shared/portfolio/config/config";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { PastPerformance } from "@/features/portfolio/client-profile/past-performance/public";
import { useCapabilities } from "./queries";
import { maturity } from "./contracts";
import { CapabilityEditor } from "./CapabilityEditor";
import { CapabilityFit } from "./CapabilityFit";
import { Registrations } from "./Registrations";
import styles from "./capabilities.module.css";
export function CapabilitiesPage({
  clientId,
  destinations,
}: {
  clientId: string;
  destinations: Destinations;
}) {
  const query = useCapabilities(clientId);
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [codes, setCodes] = useState(false);
  const selected = params.get("capability");
  const records = query.isSuccess && !query.error ? query.data : undefined;
  const capability = records?.find((cap) => cap.id === selected);
  const open = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("capability", id);
    else next.delete("capability");
    router.replace(`${path}?${next}`, { scroll: false });
  };
  return (
    <div className="page stack">
      <header className="row between">
        <div className={styles.heading}>
          <h1>Capabilities</h1>
          <span className={styles.infoTip} aria-hidden="true">
            i
          </span>
        </div>
        <div className="row">
          <button
            className="button"
            disabled={!records || query.isFetching}
            onClick={() => open("new")}
          >
            Add capability
          </button>
          <button className="button" onClick={() => setCodes(true)}>
            Registrations &amp; codes
          </button>
        </div>
      </header>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      <div className={styles.surface}>
        {records && (
          <section className={styles.areas}>
            <header className={`row between ${styles.areasHeader}`}>
              <p className="eyebrow">
                Capability areas
                <span className={styles.mobileCount}> · {records.length}</span>
              </p>
              <small className={styles.desktopCount}>
                {records.length} areas ·{" "}
                {
                  records.filter((cap) => maturity(cap.trl) === "Fielded")
                    .length
                }{" "}
                fielded
              </small>
            </header>
            <div className={styles.grid}>
              {records.map((cap) => {
                const program = cap.peNumbers.join(", ") || cap.peNumber;
                return (
                  <button
                    key={cap.id}
                    className={styles.card}
                    disabled={query.isFetching}
                    onClick={() => open(cap.id)}
                  >
                    <span className="monogram">
                      <img
                        src="/design/portfolio-34/capability-layers.svg"
                        alt=""
                      />
                    </span>
                    <strong className={styles.name}>{cap.name}</strong>
                    <p className="muted">{cap.description}</p>
                    <div className={`row ${styles.metadata}`}>
                      <span
                        className={`chip ${styles.maturity}`}
                        data-maturity={maturity(cap.trl)}
                      >
                        {maturity(cap.trl)}
                      </span>
                      <small
                        className={styles.program}
                        data-mapped={Boolean(program)}
                      >
                        {program
                          ? `${/^PE\s/i.test(program) ? "" : "PE "}${program}`
                          : "No program line mapped"}
                      </small>
                    </div>
                  </button>
                );
              })}
            </div>
            {records.length === 0 && (
              <p className="empty">
                Add a capability area to describe what this client can deliver.
              </p>
            )}
          </section>
        )}
        <CapabilityFit
          clientId={clientId}
          existingApp={destinations.existingApp}
          compact
        />
        <details className={styles.performance}>
          <summary>
            <span>Past performance</span>
            <span>View saved submissions</span>
          </summary>
          <div className={styles.performanceBody}>
            <PastPerformance clientId={clientId} />
            <p className="muted">
              Past advocacy:{" "}
              <Link href={`/portfolio/${clientId}/objectives`}>
                Advocacy history ↗
              </Link>
            </p>
          </div>
        </details>
      </div>
      {records && (selected === "new" || capability) && (
        <CapabilityEditor
          key={`${clientId}:${selected}`}
          clientId={clientId}
          capability={capability}
          choices={records}
          open={selected === "new" || Boolean(capability)}
          onClose={() => open(null)}
        />
      )}
      {codes && (
        <Registrations
          key={clientId}
          clientId={clientId}
          open={codes}
          onClose={() => setCodes(false)}
        />
      )}
    </div>
  );
}
