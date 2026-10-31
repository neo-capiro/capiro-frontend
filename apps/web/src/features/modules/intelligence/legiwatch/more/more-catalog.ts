import { MonitoringScreen } from "../monitoring/MonitoringScreen";
import { ResearchScreen } from "../research/ResearchScreen";
import { BriefingsScreen } from "./BriefingsScreen";
import { LegiWatchSettings } from "./LegiWatchSettings";
import { TrendsScreen } from "./TrendsScreen";

export const moreCatalog = [
  {
    id: "trends",
    Screen: TrendsScreen,
    title: "Trends",
    description:
      "Service-derived signal volume, issue momentum, client exposure and source coverage.",
  },
  {
    id: "monitoring",
    Screen: MonitoringScreen,
    title: "Monitoring",
    description:
      "Keyword rules, internal workflows, bill and agenda rules, and reviewed statute monitors.",
  },
  {
    id: "research",
    Screen: ResearchScreen,
    title: "Research evidence",
    description:
      "Retained legislative text, exact versions, Florida law and official source dates.",
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
