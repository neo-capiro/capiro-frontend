"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader, Tabs } from "../../../shared/module-ui";
import { DataExplorer } from "./DataExplorer";
import { DefenseBudget } from "./DefenseBudget";
import { DistrictNexus } from "./DistrictNexus";
import { FundingOpportunities } from "./FundingOpportunities";
import { LegiWatchScreen } from "./legiwatch/LegiWatchScreen";
const views = [
  { id: "explorer", label: "Data Explorer" },
  { id: "legiwatch", label: "LegiWatch" },
  { id: "defense", label: "Defense Budget" },
  { id: "funding", label: "Funding Opportunities" },
  { id: "district-nexus", label: "District Nexus" },
  { id: "federal-spending", label: "Federal Spending" },
];
export function IntelligenceScreen() {
  const params = useSearchParams();
  const hint = params.get("view");
  const router = useRouter(),
    pathname = usePathname();
  const view = views.some((v) => v.id === hint) ? hint! : "explorer";
  const setView = (next: string) => {
    if (!views.some((item) => item.id === next)) return;
    const search = new URLSearchParams();
    search.set("view", next);
    const clientId = params.get("clientId");
    if (clientId) search.set("clientId", clientId);
    router.push(`${pathname}?${search}`);
  };
  if (view === "legiwatch") return <LegiWatchScreen />;
  // District Nexus owns its own header (Figma 3.4 1064:241658 puts the Scope,
  // Freshness and Data quality controls on the title row), so it composes the
  // header itself the same way LegiWatchScreen does. The tab strip is passed
  // through so this view stays switchable from the same place.
  if (view === "district-nexus")
    return (
      <DistrictNexus
        tabs={<Tabs items={views} value={view} onChange={setView} />}
      />
    );
  return (
    <>
      <PageHeader title="Intelligence Center" />
      <Tabs items={views} value={view} onChange={setView} />
      {view === "explorer" && <DataExplorer />}
      {view === "defense" && <DefenseBudget />}
      {view === "funding" && <FundingOpportunities />}
      {view === "federal-spending" && <DataExplorer initialDataset="awards" />}
    </>
  );
}
