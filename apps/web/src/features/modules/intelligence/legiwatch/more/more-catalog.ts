import { BudgetScreen } from "../evidence/BudgetScreen";
import { NewsScreen } from "../evidence/NewsScreen";
import { ImportScreen } from "../imports/ImportScreen";
import { MonitoringScreen } from "../monitoring/MonitoringScreen";
import { ReportsScreen } from "../reports/ReportsScreen";
import { ResearchScreen } from "../research/ResearchScreen";
import { BriefingsScreen } from "./BriefingsScreen";
import { DigestScreen } from "./DigestScreen";
import { LegiWatchSettings } from "./LegiWatchSettings";
import { TrendsScreen } from "./TrendsScreen";

import { ResearchImports } from "../imports/ResearchImports";
export const moreCatalog = [
  {
    id: "research-imports",
    Screen: ResearchImports,
    title: "Research import review",
    description:
      "Resolve captured statute memberships against exact source editions and review inactive monitors.",
  },
  {
    id: "imports",
    Screen: ImportScreen,
    title: "Import review",
    description:
      "Inspect captured records, reconcile mappings and apply selected source items.",
  },
  {
    id: "trends",
    Screen: TrendsScreen,
    title: "Trends",
    description:
      "Service-derived signal volume, issue momentum, client exposure and source coverage.",
  },
  {
    id: "digest",
    Screen: DigestScreen,
    title: "Legacy digest",
    description: "Saved intelligence digests and explicit manual preparation.",
  },
  {
    id: "monitoring",
    Screen: MonitoringScreen,
    title: "Monitoring",
    description:
      "Daily subscriptions, bill and agenda rules, and reviewed statute monitors.",
  },
  {
    id: "research",
    Screen: ResearchScreen,
    title: "Research evidence",
    description:
      "Retained legislative text, exact versions, Florida law and official source dates.",
  },
  {
    id: "reports",
    Screen: ReportsScreen,
    title: "Reports",
    description:
      "Saved report definitions, frozen runs, recipients and delivery history.",
  },
  {
    id: "news",
    Screen: NewsScreen,
    title: "News evidence",
    description:
      "Retained source coverage, news monitors, personnel observations and attributed evidence.",
  },
  {
    id: "budget",
    Screen: BudgetScreen,
    title: "Florida Budget",
    description:
      "Project requests, source documents and exact comparable retained amounts.",
  },
  {
    id: "briefings",
    Screen: BriefingsScreen,
    title: "Client briefings",
    description:
      "Cited drafts, exact edited-output approval and separate delivery review.",
  },
  {
    id: "settings",
    Screen: LegiWatchSettings,
    title: "LegiWatch settings",
    description: "Display preferences and committee email opt-in.",
  },
] as const;
