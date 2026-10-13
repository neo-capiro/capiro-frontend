"use client";
import Link from "next/link";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  PageHeader,
  StatusPanel,
  Tabs,
} from "../../../shared/module-ui";
import { ResearchAnalytics } from "./ResearchAnalytics";
import { ResearchChanges } from "./ResearchChanges";
import { ResearchMembers } from "./ResearchMembers";
import { ResearchOverview } from "./ResearchOverview";
import { ResearchReviews } from "./ResearchReviews";
import { ResearchSettings } from "./ResearchSettings";
import { ResearchSnapshots } from "./ResearchSnapshots";
import { ResearchSubscriptions } from "./ResearchSubscriptions";
const tabs = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members" },
  { id: "changes", label: "Changes" },
  { id: "analytics", label: "Analytics" },
  { id: "reviews", label: "Reviews" },
  { id: "settings", label: "Settings" },
  { id: "snapshots", label: "Snapshots" },
  { id: "subscriptions", label: "Subscriptions" },
];
export function ResearchPortfolioDetail({
  id,
  initialView = "overview",
  onBack,
}: {
  id: string;
  initialView?: string;
  onBack: () => void;
}) {
  const [view, setView] = useState(
    tabs.some((t) => t.id === initialView) ? initialView : "overview",
  );
  const query = useCapiroQuery("research.detail", { params: { id } });
  const p = query.data;
  return (
    <>
      <ActionButton onClick={onBack}>Back to portfolios</ActionButton>
      <PageHeader
        title={p?.name || "Research Portfolio"}
        eyebrow="Research Portfolios"
        description={p?.purpose || undefined}
        actions={
          <Link href={`/meri?researchPortfolioId=${encodeURIComponent(id)}`}>
            Ask Meri
          </Link>
        }
      />
      <Tabs items={tabs} value={view} onChange={setView} />
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {p && (
          <>
            {view === "overview" && <ResearchOverview portfolio={p} />}{" "}
            {view === "members" && (
              <ResearchMembers portfolio={p} onReload={query.reload} />
            )}{" "}
            {view === "changes" && <ResearchChanges id={id} />}{" "}
            {view === "analytics" && <ResearchAnalytics id={id} />}{" "}
            {view === "reviews" && (
              <ResearchReviews portfolio={p} onReload={query.reload} />
            )}{" "}
            {view === "settings" && (
              <ResearchSettings
                key={p.revision}
                portfolio={p}
                onReload={query.reload}
              />
            )}{" "}
            {view === "snapshots" && (
              <ResearchSnapshots portfolio={p} onReload={query.reload} />
            )}{" "}
            {view === "subscriptions" && <ResearchSubscriptions id={id} />}
          </>
        )}
      </StatusPanel>
    </>
  );
}
