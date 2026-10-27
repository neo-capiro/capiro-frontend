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
import { ResearchSharing } from "./share/ResearchSharing";
import { ResearchSnapshots } from "./ResearchSnapshots";
import { ResearchSubscriptions } from "./ResearchSubscriptions";
import { ResearchRules } from "./ResearchRules";
import { ResearchImports } from "./ResearchImports";
import { ResearchOutputs } from "./ResearchOutputs";
import { ResearchBookmarks } from "./ResearchBookmarks";
import { ResearchOperations } from "./ResearchOperations";
import { ResearchWatchConversion } from "./ResearchWatchConversion";
import { ResearchTour } from "./ResearchTour";
import { ResearchDrafts } from "./ResearchDrafts";
import { ResearchComparisons } from "./comparison/ResearchComparisons";
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
            <ResearchTour onView={onView} />
            {view === "drafts" && <ResearchDrafts key={p.id} portfolio={p} />}
            {view === "comparisons" && (
              <ResearchComparisons
                key={p.id}
                portfolio={p}
                onReload={query.reload}
              />
            )}
            {view === "rules" && (
              <ResearchRules key={p.id} portfolio={p} onReload={query.reload} />
            )}
            {view === "imports" && (
              <ResearchImports
                key={p.id}
                portfolio={p}
                onReload={query.reload}
              />
            )}
            {view === "outputs" && <ResearchOutputs key={p.id} portfolio={p} />}
            {view === "bookmarks" && (
              <ResearchBookmarks key={p.id} portfolio={p} />
            )}
            {view === "operations" && (
              <ResearchOperations key={p.id} portfolio={p} />
            )}
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
            {view === "subscriptions" && <ResearchSubscriptions id={id} />}{" "}
            {view === "subscriptions" && (
              <ResearchWatchConversion key={p.id} portfolio={p} />
            )}
            {view === "sharing" && <ResearchSharing portfolio={p} />}
          </>
        )}
      </StatusPanel>
    </>
  );
}
