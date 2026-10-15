import {
  ApprovalsScreen,
  type ApprovalsView,
} from "../../screens/approvals/ApprovalsScreen";
import { fixtureUnavailable } from "./href";
import type { FixtureScreen } from "./types";

const approvals: ApprovalsView = {
  pending: [
    {
      id: "MP-1042",
      proposal: "MP-1042 · Briefing preference",
      client: "Anduril",
      action: "Memory replacement",
      expires: "Today, 11:15 AM",
    },
    {
      id: "TP-2048",
      proposal: "TP-2048 · Restoration follow-up",
      client: "Anduril",
      action: "Create task",
      expires: "Today, 11:20 AM",
    },
    {
      id: "FL-1042",
      proposal: "FL-1042 · Meeting brief v2",
      client: "Anduril",
      action: "File artifact version",
      expires: "Today, 11:30 AM",
    },
  ],
  history: [
    {
      id: "TP-2031",
      proposal: "TP-2031 · Hearing follow-up",
      client: "Anduril",
      action: "Create task · Approved",
      expires: "Closed 9 Oct",
    },
  ],
  reviews: [
    { label: "Review memory update" },
    { label: "Review task" },
    { label: "Review artifact filing" },
  ],
};

export const approvalScreens: readonly FixtureScreen[] = [
  {
    slug: "approval-center",
    figmaId: "06.01",
    figmaNode: "1064:147397",
    title: "Approval center",
    Screen: () => (
      <ApprovalsScreen view={approvals} unavailable={fixtureUnavailable} />
    ),
  },
];
