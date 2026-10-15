import { RunsScreen, type RunsView } from "../../screens/runs/RunsScreen";
import { fixtureUnavailable } from "./href";
import type { FixtureScreen } from "./types";

const runs: RunsView = {
  active: [
    {
      id: "run-brief",
      title: "Anduril meeting brief",
      client: "Anduril",
      status: "Running",
      updated: "Just now",
      output: "Drafting brief",
    },
    {
      id: "run-funding",
      title: "Funding landscape",
      client: "General",
      status: "Queued",
      updated: "2 min ago",
      output: "—",
    },
    {
      id: "run-updates",
      title: "Weekly client updates",
      client: "Anduril",
      status: "Needs approval",
      updated: "4 min ago",
      output: "Task proposal",
    },
    {
      id: "run-sources",
      title: "Source comparison",
      client: "Anduril",
      status: "Complete",
      updated: "Yesterday",
      output: "2 artifacts",
    },
  ],
  recent: [
    {
      id: "run-sources",
      title: "Source comparison",
      client: "Anduril",
      status: "Complete",
      updated: "Yesterday",
      output: "2 artifacts",
    },
    {
      id: "run-digest",
      title: "Monthly source digest",
      client: "General",
      status: "Cancelled",
      updated: "3 days ago",
      output: "Partial outputs kept",
    },
  ],
  completion: {
    title: "Source comparison completed",
    detail:
      "2 verified artifacts are ready. Your current conversation remains open.",
  },
};

export const runScreens: readonly FixtureScreen[] = [
  {
    slug: "background-runs",
    figmaId: "02.04",
    figmaNode: "1064:144817",
    title: "Background runs",
    Screen: () => <RunsScreen view={runs} unavailable={fixtureUnavailable} />,
  },
];
