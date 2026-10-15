import { WorkflowSetupScreen } from "../../screens/workflows/WorkflowSetupScreen";
import {
  TaskDraftFromCommitmentScreen,
  TaskReviewScreen,
} from "../../screens/workflows/CommitmentTaskScreens";
import {
  TaskReceiptScreen,
  TaskRecordScreen,
} from "../../screens/workflows/TaskReceiptScreens";
import type { WorkflowSetupView } from "../../screens/workflows/WorkflowSetup";
import { workflowSetups } from "./workflows-setups";
import {
  taskDraft,
  taskReceipt,
  taskRecord,
  taskReview,
} from "./workflows-tasks";
import { fixtureHref, fixtureUnavailable } from "./href";
import type { FixtureScreen } from "./types";

/** Setup closes back to the library; only the designed commitments flow continues to its review frame. */
const setup = (view: WorkflowSetupView, continueHref?: string) =>
  function Setup() {
    return (
      <WorkflowSetupScreen
        setup={view}
        closeHref={fixtureHref("workflow-library")}
        continueHref={continueHref}
        unavailable={fixtureUnavailable}
      />
    );
  };

/** Figma 3.4 03 · Workflow setup & task actions: fourteen setups on one form, then the exact task flow. */
export const workflowSetupScreens: readonly FixtureScreen[] = [
  {
    slug: "setup-research-company",
    figmaId: "Setup · Research a Company",
    figmaNode: "1064:152953",
    title: "Setup · Research a Company",
    Screen: setup(workflowSetups.research_company),
  },
  {
    slug: "setup-relationship-brief",
    figmaId: "Setup · Relationship Brief",
    figmaNode: "1064:152955",
    title: "Setup · Relationship Brief",
    Screen: setup(workflowSetups.relationship_brief),
  },
  {
    slug: "setup-client-changes",
    figmaId: "Setup · Client Changes",
    figmaNode: "1064:152957",
    title: "Setup · Client Changes",
    Screen: setup(workflowSetups.client_changes),
  },
  {
    slug: "setup-portfolio-changes",
    figmaId: "Setup · Portfolio Changes",
    figmaNode: "1064:152959",
    title: "Setup · Portfolio Changes",
    Screen: setup(workflowSetups.portfolio_changes),
  },
  {
    slug: "setup-portfolio-overlap",
    figmaId: "Setup · Portfolio Overlap",
    figmaNode: "1064:152961",
    title: "Setup · Portfolio Overlap",
    Screen: setup(workflowSetups.portfolio_overlap),
  },
  {
    slug: "setup-mail-history",
    figmaId: "Setup · Mail History",
    figmaNode: "1064:152963",
    title: "Setup · Mail History",
    Screen: setup(workflowSetups.mail_history),
  },
  {
    slug: "setup-meeting-prep",
    figmaId: "Setup · Meeting Prep Brief",
    figmaNode: "1064:152965",
    title: "Setup · Meeting Prep Brief",
    Screen: setup(workflowSetups.meeting_prep),
  },
  {
    slug: "setup-commitments-audit",
    figmaId: "Setup · Commitments & Deliverables",
    figmaNode: "1064:152967",
    title: "Setup · Commitments & Deliverables",
    Screen: setup(
      workflowSetups.commitments_audit,
      fixtureHref("workflow-request"),
    ),
  },
  {
    slug: "setup-funding-opportunity-match",
    figmaId: "Setup · Funding Opportunity Match",
    figmaNode: "1064:152969",
    title: "Setup · Funding Opportunity Match",
    Screen: setup(workflowSetups.funding_opportunity_match),
  },
  {
    slug: "setup-pe-deep-dive",
    figmaId: "Setup · PE Deep Dive",
    figmaNode: "1064:152971",
    title: "Setup · PE Deep Dive",
    Screen: setup(workflowSetups.pe_deep_dive),
  },
  {
    slug: "setup-bill-watch",
    figmaId: "Setup · Bill Watch",
    figmaNode: "1064:152973",
    title: "Setup · Bill Watch",
    Screen: setup(workflowSetups.bill_watch),
  },
  {
    slug: "setup-hearing-watch",
    figmaId: "Setup · Hearing Watch",
    figmaNode: "1064:152975",
    title: "Setup · Hearing Watch",
    Screen: setup(workflowSetups.hearing_watch),
  },
  {
    slug: "setup-representation-lookup",
    figmaId: "Setup · Representation Lookup",
    figmaNode: "1064:152977",
    title: "Setup · Representation Lookup",
    Screen: setup(workflowSetups.representation_lookup),
  },
  {
    slug: "setup-regulatory-docket-brief",
    figmaId: "Setup · Regulatory Docket Brief",
    figmaNode: "1064:152979",
    title: "Setup · Regulatory Docket Brief",
    Screen: setup(workflowSetups.regulatory_docket_brief),
  },
  {
    slug: "task-draft-commitment",
    figmaId: "Task · Draft from commitment",
    figmaNode: "1064:152981",
    title: "Task · Draft from commitment",
    Screen: () => (
      <TaskDraftFromCommitmentScreen
        view={taskDraft}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "task-review-source-action",
    figmaId: "Task · Review exact source action",
    figmaNode: "1064:153002",
    title: "Task · Review exact source action",
    Screen: () => (
      <TaskReviewScreen view={taskReview} unavailable={fixtureUnavailable} />
    ),
  },
  {
    slug: "task-creation-receipt",
    figmaId: "Task · Source creation receipt",
    figmaNode: "1064:153038",
    title: "Task · Source creation receipt",
    Screen: () => (
      <TaskReceiptScreen view={taskReceipt} unavailable={fixtureUnavailable} />
    ),
  },
  {
    slug: "task-canonical-record",
    figmaId: "Task · Canonical source record",
    figmaNode: "1064:153081",
    title: "Task · Canonical source record",
    Screen: () => (
      <TaskRecordScreen view={taskRecord} unavailable={fixtureUnavailable} />
    ),
  },
];
