import type { StatusTone } from "../../ui/StatusPill";
import {
  buildWorkspaceView,
  listRunAttempts,
  runStateLabels,
  type WorkspaceView,
} from "../../workspace/workspace-view";
import { projectSampleEvents, runActivityEvents } from "../run-activity-events";
import {
  ScopeScreen,
  type ScopeView,
} from "../../screens/conversation/ScopeScreen";
import {
  ConversationHistoryScreen,
  type HistoryView,
} from "../../screens/conversation/ConversationHistoryScreen";
import {
  CommandPaletteScreen,
  type PaletteView,
} from "../../screens/conversation/CommandPaletteScreen";
import {
  ResearchProgressScreen,
  type ResearchProgressView,
} from "../../screens/conversation/ResearchProgressScreen";
import {
  SpecialistActivityScreen,
  type SpecialistView,
} from "../../screens/conversation/SpecialistActivityScreen";
import {
  ToolActivityScreen,
  type ToolActivityView,
} from "../../screens/conversation/ToolActivityScreen";
import {
  ConversationManagementScreen,
  type ManagementView,
} from "../../screens/conversation/ConversationManagementScreen";
import { fixtureHref, fixtureUnavailable } from "./href";
import type { FixtureScreen } from "./types";

/** Sample run state comes from the canonical public projection of the shared sample events. */
function sampleRun(eventCount: number): WorkspaceView {
  const events = runActivityEvents("activity").slice(0, eventCount);
  const accepted = projectSampleEvents(events).accepted;
  const [selection] = listRunAttempts(accepted);
  if (!selection) throw new Error("Sample run events have no run attempt");
  return buildWorkspaceView(accepted, selection);
}
const runTone = (state: WorkspaceView["state"]): StatusTone =>
  state === "running" || state === "completed"
    ? "success"
    : state === "failed" || state === "cancelled"
      ? "danger"
      : state === "waiting-for-approval" || state === "paused"
        ? "warning"
        : "neutral";

const scope: ScopeView = {
  appliedId: "anduril",
  options: [
    {
      id: "anduril",
      name: "Anduril",
      detail: "Client records, files, tasks and approved memory",
      dataScope: [
        "Client records and timelines",
        "Approved institutional memory",
        "Authorized mailboxes and documents",
        "Public sources",
      ],
    },
    {
      id: "general",
      name: "General workspace",
      detail: "Your permitted firm sources and personal files",
      dataScope: ["Permitted firm sources", "Personal files", "Public sources"],
    },
    {
      id: "aerovironment",
      name: "AeroVironment",
      detail: "Authorized client workspace",
      dataScope: ["Client records and timelines", "Public sources"],
    },
  ],
};

const history: HistoryView = {
  rows: [
    ["brief", "Anduril meeting brief", "Anduril", "Complete", "Just now"],
    ["funding", "FY27 funding landscape", "General", "Running", "2 min ago"],
    ["updates", "Weekly client updates", "Anduril", "Complete", "Yesterday"],
    ["sources", "Source comparison", "Anduril", "Archived", "7 Oct"],
  ].map(([id = "", title = "", client = "", status = "", updated = ""]) => ({
    id,
    title,
    client,
    status,
    updated,
  })),
  background: {
    title: "1 run is continuing in the background",
    detail:
      "Open Runs to check progress. Conversation navigation preserves your draft.",
    runsHref: fixtureHref("background-runs"),
  },
  outcome: {
    title: "Conversation deleted",
    detail:
      "The item is removed from your view. Retained receipts follow policy.",
  },
  manageHref: fixtureHref("conversation-management"),
};

const palette: PaletteView = {
  initialQuery: "meeting brief",
  items: [
    {
      id: "brief",
      kind: "conversation",
      title: "Anduril meeting brief",
      detail: "Conversation · Anduril · Today",
    },
    {
      id: "brief-docx",
      kind: "artifact",
      title: "meeting-brief-v2.docx",
      detail: "Artifact · Version 2 · Verified",
    },
    {
      id: "monday",
      kind: "routine",
      title: "Monday meeting preparation",
      detail: "Routine · America/New_York",
      href: fixtureHref("routines"),
    },
    {
      id: "new",
      kind: "command",
      title: "Create a new conversation",
      detail: "Command",
    },
  ],
};

function researchView(): ResearchProgressView {
  const run = sampleRun(6);
  return {
    title: "Anduril meeting brief",
    context: "Anduril · Started 2 minutes ago",
    request:
      "Research recent developments, analyze open commitments, and create a sourced meeting brief.",
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
    status: {
      label: run.state ? runStateLabels[run.state] : "No status reported",
      tone: runTone(run.state),
    },
    specialists: {
      title: "3 specialists working",
      detail: "Research · Data · Document",
      href: fixtureHref("specialist-activity"),
    },
    sources: {
      title: "6 sources found",
      breakdown: "4 client records · 2 public sources",
      note: "Evidence is checked before it appears in the brief.",
    },
    steer: "Please prioritize the open restoration request.",
    backgroundHref: fixtureHref("background-runs"),
  };
}

const specialist = (
  id: string,
  status: string,
  tone: StatusTone,
  task: string,
  progress: string,
  details: readonly string[],
) => ({
  id,
  name: id,
  status: { label: status, tone },
  task,
  progress,
  details,
});
const specialists: SpecialistView = {
  context: "Meeting brief · Work delegated within this run",
  specialists: [
    specialist(
      "Research",
      "Working",
      "neutral",
      "Find current funding and client developments.",
      "6 sources · checking one date",
      ["Reading 4 client records", "Checking the date on 1 public source"],
    ),
    specialist(
      "Data",
      "Complete",
      "success",
      "Analyze authorized commitments and meeting notes.",
      "2 open commitments · 1 timing risk",
      ["Wrote commitments.csv", "Flagged 1 timing risk for review"],
    ),
    specialist(
      "Document",
      "Queued",
      "neutral",
      "Create a concise meeting brief with citations.",
      "Waiting for research",
      ["Starts when research finishes"],
    ),
    specialist(
      "Verification",
      "Queued",
      "neutral",
      "Validate output, links and rendering.",
      "Waiting for document",
      ["Starts when the document is drafted"],
    ),
  ],
  limit: {
    title: "Run limits are active",
    detail:
      "Up to 3 specialists may work at once. Queued work starts as capacity becomes available.",
  },
  outputs: [
    ["source-index.json", "Research", "Working"],
    ["commitments.csv", "Data", "Verified"],
    ["meeting-brief.docx", "Document", "Queued"],
  ].map(([name = "", owner = "", status = ""]) => ({
    id: name,
    name,
    owner,
    status,
  })),
};

function toolActivityView(): ToolActivityView {
  const run = sampleRun(Infinity);
  const read = run.tools.find((tool) => tool.name === "sample.source_read");
  const complete = read?.resultReference != null;
  return {
    tool: {
      title: "Search authorized client records",
      status: complete
        ? { label: "Complete", tone: "success" }
        : { label: "Running", tone: "neutral" },
      request:
        "Client: Anduril · Sources: tasks, meetings, files · Time range: last 30 days",
      records: [
        ["Restoration request", "Task", "Open"],
        ["Strategy review", "Meeting", "7 Oct"],
        ["White paper v2", "Document", "6 Oct"],
      ].map(([record = "", type = "", result = ""]) => ({
        id: record,
        record,
        type,
        result,
      })),
      coverage:
        "Coverage: 23 records returned · All 2 pages read · 1 encrypted attachment excluded",
    },
    ...(run.artifacts.length
      ? {
          receipt: {
            title: "Workspace file created",
            detail: "commitments.csv · Verified · 2 rows · Saved at 10:44 AM",
          },
        }
      : {}),
  };
}

const management: ManagementView = {
  title: "Anduril meeting brief",
  suggestedTitle: "Anduril meeting brief — October",
  branches: [
    { id: "first", prompt: "Create a one-page brief for the Anduril meeting." },
    {
      id: "second",
      prompt: "Create a two-page brief focused on open commitments.",
    },
  ],
  archived: {
    title: "Archived",
    detail:
      "This conversation is hidden from recent history and remains searchable where permitted.",
  },
};

export const conversationScreens: readonly FixtureScreen[] = [
  {
    slug: "choose-scope",
    figmaId: "01.03",
    figmaNode: "1064:144332",
    title: "Choose client and data scope",
    Screen: () => <ScopeScreen view={scope} unavailable={fixtureUnavailable} />,
  },
  {
    slug: "conversation-history",
    figmaId: "01.04",
    figmaNode: "1064:144425",
    title: "Conversation history",
    Screen: () => (
      <ConversationHistoryScreen
        view={history}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "command-palette",
    figmaId: "01.05",
    figmaNode: "1064:144529",
    title: "Search and command palette",
    Screen: () => <CommandPaletteScreen view={palette} />,
  },
  {
    slug: "research-progress",
    figmaId: "02.01",
    figmaNode: "1064:144151",
    title: "Research in progress",
    Screen: () => (
      <ResearchProgressScreen
        view={researchView()}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "specialist-activity",
    figmaId: "02.02",
    figmaNode: "1064:144601",
    title: "Parallel specialist activity",
    Screen: () => (
      <SpecialistActivityScreen
        view={specialists}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "tool-activity",
    figmaId: "02.07",
    figmaNode: "1064:145061",
    title: "Tool activity and receipts",
    Screen: () => (
      <ToolActivityScreen
        view={toolActivityView()}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "conversation-management",
    figmaId: "09.08",
    figmaNode: "1064:148633",
    title: "Conversation management and branches",
    Screen: () => (
      <ConversationManagementScreen
        view={management}
        unavailable={fixtureUnavailable}
      />
    ),
  },
];
