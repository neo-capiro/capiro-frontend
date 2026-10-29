"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { DataTable, StatusPanel } from "../../../shared/module-ui";
import { SettingsButton, SettingsNotice } from "../components";
import { MemoryPaging, useMemoryPage } from "./MemoryPaging";
import { GovernanceDetail, ProjectionRetry } from "./MemoryGovernanceActions";

export function GovernanceItems({
  bucket,
  readOnly,
}: {
  bucket: "active" | "conflicts" | "review_due" | "history";
  readOnly: boolean;
}) {
  const page = useMemoryPage();
  const [selected, select] = useState("");
  const result = useCapiroQuery("settings.memory.governance.items", {
    query: {
      bucket,
      limit: 50,
      ...(page.cursor ? { cursor: page.cursor } : {}),
    },
  });
  return (
    <>
      <StatusPanel
        loading={result.loading}
        error={result.error}
        onRetry={result.reload}
      >
        {result.data?.enabled === false && (
          <SettingsNotice title="Memory governance unavailable" />
        )}
        {result.data?.enabled && (
          <>
            <DataTable
              caption={`${bucket.replaceAll("_", " ")} memory`}
              rows={result.data.items}
              rowKey={(row) => row.id}
              emptyMessage="No accessible memory items on this page."
              columns={[
                {
                  key: "title",
                  label: "Memory",
                  render: (row) => (
                    <SettingsButton small onClick={() => select(row.id)}>
                      {row.title}
                    </SettingsButton>
                  ),
                },
                {
                  key: "scope",
                  label: "Scope",
                  render: (row) => row.clientName ?? row.memoryScope,
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => row.governedStatus,
                },
                {
                  key: "review",
                  label: "Review due",
                  render: (row) => row.reviewDueAt ?? "No date recorded",
                },
                {
                  key: "hold",
                  label: "Legal hold",
                  render: (row) =>
                    row.legalHold ? "Held" : "No hold recorded",
                },
              ]}
            />
            <MemoryPaging
              page={page}
              nextCursor={result.data.nextCursor}
              busy={result.loading}
            />
          </>
        )}
      </StatusPanel>
      {selected && (
        <GovernanceDetail
          key={selected}
          itemId={selected}
          readOnly={readOnly}
          onChange={result.reload}
          onClose={() => select("")}
        />
      )}
    </>
  );
}
export function GovernanceTransitions() {
  const page = useMemoryPage();
  const result = useCapiroQuery("settings.memory.governance.transitions", {
    query: { limit: 50, ...(page.cursor ? { cursor: page.cursor } : {}) },
  });
  return (
    <StatusPanel
      loading={result.loading}
      error={result.error}
      onRetry={result.reload}
    >
      {result.data?.enabled === false && (
        <SettingsNotice title="Transition history unavailable" />
      )}
      {result.data?.enabled && (
        <>
          <DataTable
            caption="Memory transition history"
            rows={result.data.transitions}
            rowKey={(row) => row.id}
            emptyMessage="No accessible transitions on this page."
            columns={[
              {
                key: "time",
                label: "Recorded",
                render: (row) => row.occurredAt,
              },
              {
                key: "from",
                label: "From",
                render: (row) => row.fromStatus ?? "Created",
              },
              { key: "to", label: "To", render: (row) => row.toStatus },
              { key: "reason", label: "Reason", render: (row) => row.reason },
            ]}
          />
          <MemoryPaging
            page={page}
            nextCursor={result.data.nextCursor}
            busy={result.loading}
          />
        </>
      )}
    </StatusPanel>
  );
}
export function ProjectionHealth({ readOnly }: { readOnly: boolean }) {
  const result = useCapiroQuery("settings.memory.governance.projections", {});
  const [selected, select] = useState<{ id: string; version: string } | null>(
    null,
  );
  return (
    <>
      <StatusPanel
        loading={result.loading}
        error={result.error}
        onRetry={result.reload}
      >
        {result.data?.enabled === false && (
          <SettingsNotice title="Projection health unavailable" />
        )}
        {result.data?.enabled && (
          <>
            <dl>
              {Object.entries(result.data.counts).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p>
              Recent failures shown below are a bounded sample. Counts above
              describe the full visible server state. A queued retry is not a
              completed projection.
            </p>
            {result.data.recentFailures.map((job) => (
              <section key={job.id}>
                <h3>{job.title ?? "Memory projection"}</h3>
                <p>
                  {job.status} · {job.attempts} attempts ·{" "}
                  {job.lastError ?? "No failure detail"}
                </p>
                <SettingsButton
                  onClick={() => select({ id: job.id, version: job.version })}
                >
                  Inspect retry and progress
                </SettingsButton>
              </section>
            ))}
            {result.data.recentFailures.length === 0 && (
              <p>No recent failures were returned.</p>
            )}
          </>
        )}
      </StatusPanel>
      {selected && (
        <section aria-label="Selected projection progress">
          <ProjectionRetry
            key={selected.id}
            job={selected}
            readOnly={readOnly}
            onChange={result.reload}
          />
        </section>
      )}
    </>
  );
}
