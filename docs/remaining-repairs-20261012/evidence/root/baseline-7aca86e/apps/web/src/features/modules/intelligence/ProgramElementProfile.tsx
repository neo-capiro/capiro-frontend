"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  PageHeader,
  Panel,
  StatusPanel,
  Tabs,
} from "../../../shared/module-ui";
import styles from "./intelligence.module.css";
import {
  ProgramBills,
  ProgramSources,
  ProgramStructure,
} from "./ProgramEvidence";
const money = (value: string | number | null | undefined) =>
  value == null ? "Not available" : `$${value}M`;
export function ProgramElementProfile({
  peCode,
  onBack,
}: {
  peCode: string;
  onBack: () => void;
}) {
  const api = useCapiro();
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const query = useCapiroQuery("intelligence.defense.detail", {
    params: { peCode },
  });
  const d = query.data;
  async function watch() {
    if (!d) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.request("intelligence.defense.watch", {
        params: { peCode },
        body: { watching: !d.currentUserIsWatching },
      });
      query.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update watch");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ActionButton onClick={onBack}>Back to defense budget</ActionButton>
      <PageHeader
        title={d?.title || peCode}
        eyebrow="Defense Budget"
        description={[peCode, d?.service, d?.budgetActivity]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <ActionButton primary disabled={busy || !d} onClick={watch}>
            {d?.currentUserIsWatching ? "Watching" : "Watch line"}
          </ActionButton>
        }
      />
      {error && <p role="alert">{error}</p>}
      <Tabs
        items={[
          { id: "overview", label: "Overview" },
          { id: "funding", label: "Funding and lifecycle" },
          { id: "congressional", label: "Congressional" },
          { id: "structure", label: "Program structure" },
          { id: "sources", label: "Sources and proof" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {d && (
          <>
            {tab === "congressional" && <ProgramBills peCode={peCode} />}
            {tab === "structure" && <ProgramStructure peCode={peCode} />}
            {tab === "sources" && <ProgramSources peCode={peCode} />}
            {tab === "overview" && (
              <div className={styles.split}>
                <div className={styles.stack}>
                  <Panel title="Program overview">
                    <p className={styles.content}>
                      {d.description || "Program description not provided"}
                    </p>
                    {d.fundingSummary && (
                      <p className={styles.content}>{d.fundingSummary}</p>
                    )}
                  </Panel>
                  <ProgramBills peCode={peCode} />
                </div>
                <Panel title="Source coverage">
                  <dl className={styles.details}>
                    <div>
                      <dt>Last synced</dt>
                      <dd>{d.lastSyncedAt}</dd>
                    </div>
                    <div>
                      <dt>Sources</dt>
                      <dd>{d.sourceCount ?? "Not stated"}</dd>
                    </div>
                  </dl>
                  {d.unsupportedSourceFamily && (
                    <p className={styles.content}>
                      This source family is not currently supported.
                    </p>
                  )}
                </Panel>
              </div>
            )}
            {tab === "funding" && (
              <Panel
                title="Funding history"
                description="USD millions. Authorization and appropriations remain separate columns."
              >
                <DataTable
                  rows={d.years}
                  rowKey={(r) => r.id}
                  caption="Program element funding history"
                  columns={[
                    { key: "fy", label: "Fiscal year", render: (r) => r.fy },
                    {
                      key: "request",
                      label: "Request",
                      render: (r) => money(r.request),
                    },
                    {
                      key: "hasc",
                      label: "HASC",
                      render: (r) => money(r.hascMark),
                    },
                    {
                      key: "sasc",
                      label: "SASC",
                      render: (r) => money(r.sascMark),
                    },
                    {
                      key: "hacd",
                      label: "HAC-D",
                      render: (r) => money(r.hacDMark),
                    },
                    {
                      key: "sacd",
                      label: "SAC-D",
                      render: (r) => money(r.sacDMark),
                    },
                    {
                      key: "conf",
                      label: "Appropriations conference",
                      render: (r) => money(r.conference),
                    },
                    {
                      key: "ndaa",
                      label: "NDAA conference",
                      render: (r) => money(r.ndaaConference),
                    },
                    {
                      key: "enacted",
                      label: "Enacted",
                      render: (r) => money(r.enacted),
                    },
                  ]}
                />
              </Panel>
            )}
          </>
        )}
      </StatusPanel>
    </>
  );
}
