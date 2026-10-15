import {
  StateBoardScreen,
  type StateBoardView,
} from "../../screens/states/StateBoardScreen";
import type { StateCard } from "../../screens/states/StateCardList";
import { fixtureHref, fixtureUnavailable } from "./href";
import { approvalPermissionStates } from "./states-approvals";
import { emptySuccessStates } from "./states-empty";
import { fileArtifactStates } from "./states-files";
import { conversationMemoryStates } from "./states-lifecycle";
import { runRecoveryStates } from "./states-run";
import type { FixtureScreen } from "./types";

/**
 * Fixture destinations for recovery actions that only navigate, keyed by state
 * title. Actions that would mutate, retry, upload or restart stay disabled.
 */
type StateLinks = Readonly<Record<string, string>>;

const runLinks: StateLinks = {
  Queued: fixtureHref("background-runs"),
  Running: fixtureHref("research-progress"),
  "Waiting for approval": fixtureHref("review-task-action"),
  Cancelling: fixtureHref("background-runs"),
  Cancelled: fixtureHref("action-receipts"),
  "Deadline reached": fixtureHref("analysis-outputs"),
  "Workspace not persisted": fixtureHref("analysis-outputs"),
};
const fileLinks: StateLinks = {
  "Duplicate attachment": fixtureHref("workspace-files"),
  "Stale version": fixtureHref("artifact-versions"),
};
const approvalLinks: StateLinks = {
  "Pending review": fixtureHref("review-task-action"),
  Approved: fixtureHref("action-receipts"),
  Executing: fixtureHref("review-task-action"),
  Succeeded: fixtureHref("action-receipts"),
  Rejected: fixtureHref("reject-or-request-changes"),
  "Changes requested": fixtureHref("draft-client-task"),
  Expired: fixtureHref("draft-client-task"),
  "Permission revoked": fixtureHref("data-coverage"),
  "Already completed": fixtureHref("action-receipts"),
  "Destination unavailable": fixtureHref("review-artifact-filing"),
  "Read-only role": fixtureHref("data-coverage"),
};
const lifecycleLinks: StateLinks = {
  Reconnecting: fixtureHref("research-progress"),
  "Personal memory": fixtureHref("memory-recall"),
  "Superseded memory": fixtureHref("memory-detail"),
  "Memory proposal expired": fixtureHref("memory-proposal"),
  "Grant expired": fixtureHref("access-changed"),
  "Conversation export": fixtureHref("conversation-management"),
};
const emptyLinks: StateLinks = {
  "No pending approvals": fixtureHref("approval-center"),
  "No routines": fixtureHref("routine-editor"),
  "No source matches": fixtureHref("data-coverage"),
  "No authorized client": fixtureHref("choose-scope"),
  "Object deleted": fixtureHref("conversation-history"),
  "Duplicate prevented": fixtureHref("action-receipts"),
};

const board = (view: StateBoardView, links: StateLinks) =>
  function StateBoard() {
    return (
      <StateBoardScreen
        view={view}
        actionHref={(state: StateCard) => links[state.title]}
        unavailable={fixtureUnavailable}
      />
    );
  };

export const stateScreens: readonly FixtureScreen[] = [
  {
    slug: "states-run-recovery",
    figmaId: "11.01",
    figmaNode: "1064:149425",
    title: "Run and recovery state board",
    Screen: board(runRecoveryStates, runLinks),
  },
  {
    slug: "states-file-artifact",
    figmaId: "11.02",
    figmaNode: "1064:149528",
    title: "File and artifact error state board",
    Screen: board(fileArtifactStates, fileLinks),
  },
  {
    slug: "states-approval-permission",
    figmaId: "11.03",
    figmaNode: "1064:149631",
    title: "Approval and permission state board",
    Screen: board(approvalPermissionStates, approvalLinks),
  },
  {
    slug: "states-conversation-memory",
    figmaId: "11.04",
    figmaNode: "1064:149734",
    title: "Conversation and memory lifecycle states",
    Screen: board(conversationMemoryStates, lifecycleLinks),
  },
  {
    slug: "states-empty-success",
    figmaId: "11.05",
    figmaNode: "1064:149837",
    title: "Empty, search and success states",
    Screen: board(emptySuccessStates, emptyLinks),
  },
];
