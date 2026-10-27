"use client";
import { PageHeader, Tabs } from "../../../../shared/module-ui";
import { useResearchLocation } from "../research/ResearchNavigation";
import { BudgetChanges } from "./BudgetChanges";
import { CongressionalChanges } from "./CongressionalChanges";
import { MonitoredChanges } from "./MonitoredChanges";
import { PortfolioActions } from "./PortfolioActions";
const tabs = [
  { id: "budget", label: "Budget" },
  { id: "congressional", label: "Congressional" },
  { id: "monitored", label: "Monitored" },
  { id: "actions", label: "Actions" },
] as const;
export function ChangesWorkspace() {
  const { params, update } = useResearchLocation();
  const tab =
    tabs.find((item) => item.id === params.get("changesTab"))?.id || "budget";
  return (
    <>
      <PageHeader
        title="Changes"
        description="Budget and legislative changes, client monitoring, and research portfolio reviews."
      />
      <Tabs
        items={tabs}
        value={tab}
        label="Changes views"
        onChange={(changesTab) => update({ changesTab })}
      />
      {tab === "budget" && <BudgetChanges />}
      {tab === "congressional" && <CongressionalChanges />}
      {tab === "monitored" && <MonitoredChanges />}
      {tab === "actions" && <PortfolioActions />}
    </>
  );
}
