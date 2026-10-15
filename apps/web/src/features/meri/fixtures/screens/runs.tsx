import {
  buildWorkspaceView,
  listRunAttempts,
  runStateLabels,
  type WorkspaceView,
} from "../../workspace/workspace-view";
import { projectSampleEvents, runActivityEvents } from "../run-activity-events";
import { RunsScreen, type RunsView } from "../../screens/runs/RunsScreen";
import {
  RunDetailScreen,
  type RunDetailView,
} from "../../screens/runs/RunDetailScreen";
import {
  SteerRunScreen,
  type SteerRunView,
} from "../../screens/runs/SteerRunScreen";
import {
  CheckpointRestoreScreen,
  type CheckpointRestoreView,
} from "../../screens/runs/CheckpointRestoreScreen";
import {
  InterruptedRunScreen,
  type InterruptedRunView,
} from "../../screens/runs/InterruptedRunScreen";
import { fixtureHref, fixtureUnavailable } from "./href";
import type { FixtureScreen } from "./types";

/** Run state, checkpoints, usage and errors come from the canonical projection of the shared sample events. */
function projectedRun(scenario: string, eventCount = Infinity): WorkspaceView {
  const events = runActivityEvents(scenario).slice(0, eventCount);
  const accepted = projectSampleEvents(events).accepted;
  const [selection] = listRunAttempts(accepted);
  if (!selection) throw new Error("Sample run events have no run attempt");
  return buildWorkspaceView(accepted, selection);
}
const stateLabel = (run: WorkspaceView) =>
  run.state ? runStateLabels[run.state] : "No status reported";
/** The meeting-brief run while it is still running: checkpoint and usage are recorded, completion is not. */
const runningBrief = () => projectedRun("activity", 11);

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

function runDetailView(): RunDetailView {
  const run = runningBrief();
  const saved = run.checkpointIds.length > 0;
  return {
    title: "Meeting brief",
    context: "Run MR-1042 · Anduril · Owned by Jordan Clayton",
    metrics: [
      {
        label: "Status",
        value: stateLabel(run),
        caption: "Step 2 of 4",
      },
      {
        label: "Elapsed",
        value: "2m 18s",
        caption: "Started 10:42 AM",
      },
      {
        label: "Usage",
        value: run.usageIds.length ? "$0.42" : "Not recorded",
        caption: "All attempts included",
      },
      {
        label: "Checkpoint",
        value: saved ? "Saved" : "None yet",
        caption: saved
          ? "Session and files verified"
          : "No verified checkpoint",
      },
    ],
    plan: {
      title: "Meeting brief · 4 steps",
      steps: [
        ["scope", "Confirm scope", "Anduril · 6 authorized sources", true],
        [
          "research",
          "Research developments",
          "Research specialist · Working",
          true,
        ],
        [
          "signals",
          "Analyze client signals",
          "Data specialist · Complete",
          false,
        ],
        [
          "brief",
          "Create and verify brief",
          "Document specialist · Queued",
          false,
        ],
      ].map(([id, title, detail, done]) => ({
        id: String(id),
        title: String(title),
        detail: String(detail),
        done: done === true,
      })),
    },
    activity: [
      ["10:42 · Starting", "Scope and access checked"],
      ["10:43 · Reading sources", "6 authorized sources returned"],
      ["10:44 · Analyzing", "Commitments table verified"],
      ["10:44 · Researching", "Checking public funding update"],
    ].map(([title = "", detail = ""]) => ({ id: title, title, detail })),
    toolActivityHref: fixtureHref("tool-activity"),
    steerHref: fixtureHref("steer-run"),
    conversationHref: fixtureHref("research-progress"),
  };
}

function steerView(): SteerRunView {
  return {
    title: `Meeting brief is ${stateLabel(runningBrief()).toLowerCase()}`,
    instruction:
      "Prioritize the restoration request and keep the brief under four pages.",
    accepted: "Accepted · 10:45 AM",
    timing: "The current source check will finish before the next step starts.",
    runHref: fixtureHref("run-detail"),
  };
}

function checkpointView(): CheckpointRestoreView {
  const run = runningBrief();
  return {
    context: "Meeting brief · Last checkpoint 10:44 AM",
    ...(run.checkpointIds.length
      ? {
          restored: {
            title: "Session and files restored",
            detail:
              "3 workspace files verified. Completed action receipts were checked before resuming.",
          },
        }
      : {}),
    checkpoint: "Checkpoint · After commitment analysis",
    items: [
      ["Conversation context", false, "Restored"],
      ["commitments.csv", true, "Checksum verified"],
      ["source-index.json", true, "Checksum verified"],
      ["meeting-brief-draft.docx", true, "Partial output preserved"],
      ["Completed actions", false, "Receipts reconciled"],
    ].map(([item, file, verification]) => ({
      id: String(item),
      item: String(item),
      file: file === true,
      verification: String(verification),
    })),
    forkHref: fixtureHref("interrupted-run"),
  };
}

function interruptedView(): InterruptedRunView {
  const run = projectedRun("failed");
  const [error] = run.errors;
  return {
    title: "Meeting brief interrupted",
    ...(run.state === "failed" && error
      ? {
          interruption: {
            title:
              error.code === "provider_unavailable"
                ? "Provider temporarily unavailable"
                : error.message,
            detail:
              "The document step did not complete. Earlier analysis and files are preserved.",
          },
        }
      : {}),
    forkName: "Anduril brief — revised focus",
    startFrom: "Checkpoint · Commitment analysis · 10:44 AM",
    restoreHref: fixtureHref("checkpoint-restore"),
    runHref: fixtureHref("run-detail"),
  };
}

function runsView(): RunsView {
  return {
    ...runs,
    cancelled: {
      status: stateLabel(projectedRun("cancelled")),
      filesHref: fixtureHref("workspace-files"),
      conversationHref: fixtureHref("research-progress"),
    },
  };
}

export const runScreens: readonly FixtureScreen[] = [
  {
    slug: "background-runs",
    figmaId: "02.04",
    figmaNode: "1064:144817",
    title: "Background runs",
    Screen: () => (
      <RunsScreen
        view={runsView()}
        runHrefs={{ "run-brief": fixtureHref("run-detail") }}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "run-detail",
    figmaId: "02.03",
    figmaNode: "1064:144708",
    title: "Run detail",
    Screen: () => (
      <RunDetailScreen
        view={runDetailView()}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "steer-run",
    figmaId: "02.05",
    figmaNode: "1064:144923",
    title: "Steer and stop a run",
    Screen: () => (
      <SteerRunScreen view={steerView()} unavailable={fixtureUnavailable} />
    ),
  },
  {
    slug: "checkpoint-restore",
    figmaId: "02.06",
    figmaNode: "1064:144982",
    title: "Checkpoint and verified restore",
    Screen: () => (
      <CheckpointRestoreScreen
        view={checkpointView()}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "interrupted-run",
    figmaId: "02.08",
    figmaNode: "1064:145144",
    title: "Interrupted run and fork",
    Screen: () => (
      <InterruptedRunScreen
        view={interruptedView()}
        unavailable={fixtureUnavailable}
      />
    ),
  },
];
