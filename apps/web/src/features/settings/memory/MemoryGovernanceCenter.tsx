"use client";
import Link from "next/link";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { DataTable, StatusPanel } from "../../../shared/module-ui";
import { SettingsCard, SettingsNotice, SettingsTabs } from "../components";
import { MemoryAccessGrants } from "./MemoryAccessGrants";
import { MemoryPaging, useMemoryPage } from "./MemoryPaging";
import {
  GovernanceItems,
  GovernanceTransitions,
  ProjectionHealth,
} from "./MemoryGovernanceViews";

const tabs = [
  "Overview",
  "Active",
  "Pending review",
  "Conflicts",
  "Review due",
  "History",
  "Access grants",
  "Transition history",
  "Projection health",
];
export function MemoryGovernanceCenter({
  readOnly,
  revision = 0,
}: {
  readOnly: boolean;
  revision?: number;
}) {
  const [tab, setTab] = useState("Overview");
  return (
    <SettingsCard title="Memory Governance Center">
      <SettingsTabs
        label="Memory governance"
        items={tabs.map((label) => ({ id: label, label }))}
        value={tab}
        onChange={setTab}
      />
      <div key={`${tab}:${revision}`}>
        {tab === "Overview" ? (
          <Overview />
        ) : tab === "Pending review" ? (
          <PendingReviews />
        ) : tab === "Access grants" ? (
          <MemoryAccessGrants readOnly={readOnly} />
        ) : tab === "Transition history" ? (
          <GovernanceTransitions />
        ) : tab === "Projection health" ? (
          <ProjectionHealth readOnly={readOnly} />
        ) : (
          <GovernanceItems
            bucket={
              tab === "Active"
                ? "active"
                : tab === "Conflicts"
                  ? "conflicts"
                  : tab === "Review due"
                    ? "review_due"
                    : "history"
            }
            readOnly={readOnly}
          />
        )}
      </div>
    </SettingsCard>
  );
}
function Overview() {
  const result = useCapiroQuery("settings.memory.governance.overview", {});
  return (
    <StatusPanel
      loading={result.loading}
      error={result.error}
      onRetry={result.reload}
    >
      {result.data?.enabled === false && (
        <SettingsNotice title="Memory governance unavailable">
          The service is not enabled for this workspace.
        </SettingsNotice>
      )}
      {result.data?.enabled && (
        <>
          <dl>
            {Object.entries(result.data.counts).map(([key, value]) => (
              <div key={key}>
                <dt>
                  {key.replace(
                    /[A-Z]/g,
                    (character) => ` ${character.toLowerCase()}`,
                  )}
                </dt>
                <dd>
                  {key === "pendingReview" &&
                  result.data?.pendingReviewCountStatus !== "complete"
                    ? "Review service unavailable"
                    : value}
                </dd>
              </div>
            ))}
          </dl>
          <p>
            These counts come from the server. Active memory and projection
            processing have separate states.
          </p>
        </>
      )}
    </StatusPanel>
  );
}
function PendingReviews() {
  const page = useMemoryPage();
  const result = useCapiroQuery("memory.review.inbox", {
    query: {
      view: "all_pending",
      limit: 50,
      ...(page.cursor ? { cursor: page.cursor } : {}),
    },
  });
  return (
    <StatusPanel
      loading={result.loading}
      error={result.error}
      onRetry={result.reload}
    >
      {result.data?.enabled === false && (
        <SettingsNotice title="Memory review unavailable">
          The review service is not enabled.
        </SettingsNotice>
      )}
      {result.data?.enabled && (
        <>
          <DataTable
            caption="Pending memory review"
            rows={result.data.items}
            rowKey={(row) => row.reviewRequestId}
            emptyMessage="No review items on this page."
            columns={[
              {
                key: "title",
                label: "Proposal",
                render: (row) => (
                  <Link href={`/meri/memory/review/${row.reviewRequestId}`}>
                    {row.title}
                  </Link>
                ),
              },
              {
                key: "scope",
                label: "Scope",
                render: (row) => row.client?.name ?? row.scope,
              },
              {
                key: "status",
                label: "Status",
                render: (row) => row.status.replaceAll("_", " "),
              },
              {
                key: "version",
                label: "Revision",
                render: (row) => row.revisionNumber,
              },
              {
                key: "reviewer",
                label: "Reviewer",
                render: (row) => row.assignedReviewer?.name ?? "Unassigned",
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
  );
}
