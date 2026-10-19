"use client";
import Link from "next/link";
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
import {
  readResearchPortfolioView,
  researchPortfolioTabs,
  type ResearchPortfolioView,
} from "./research-navigation";
export function ResearchPortfolioDetail({
  id,
  view,
  onView,
  onBack,
}: {
  id: string;
  view: ResearchPortfolioView;
  onView: (view: ResearchPortfolioView) => void;
  onBack: () => void;
}) {
  const query = useCapiroQuery("research.detail", { params: { id } });
  const p = query.data;
  const back = <ActionButton onClick={onBack}>Back to portfolios</ActionButton>;
  if (p && p.id !== id)
    return (
      <>
        {back}
        <StatusPanel
          error="This research portfolio could not be verified. Try again."
          onRetry={query.reload}
        />
      </>
    );
  return (
    <>
      {back}
      <PageHeader
        title={p?.name || "Research Portfolio"}
        eyebrow="Research Portfolios"
        description={p?.purpose || undefined}
        actions={
          p?.id === id ? (
            <Link href={`/meri?researchPortfolioId=${encodeURIComponent(id)}`}>
              Ask Meri
            </Link>
          ) : undefined
        }
      />
      <Tabs
        items={researchPortfolioTabs}
        value={view}
        onChange={(nextView) => onView(readResearchPortfolioView(nextView))}
      />
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
