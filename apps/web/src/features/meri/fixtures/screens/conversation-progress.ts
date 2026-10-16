import type { StatusTone } from "../../ui/StatusPill";
import {
  buildWorkspaceView,
  listRunAttempts,
  runStateLabels,
  type WorkspaceView,
} from "../../workspace/workspace-view";
import { projectSampleEvents, runActivityEvents } from "../run-activity-events";
import type { ResearchProgressView } from "../../screens/conversation/ResearchProgressScreen";
import type { SpecialistView } from "../../screens/conversation/SpecialistActivityScreen";
import type { ToolActivityView } from "../../screens/conversation/ToolActivityScreen";
import type { ExpandedToolActivityView } from "../../screens/conversation/ExpandedToolActivityScreen";
import { meetingBriefPlan } from "./runs-plan";
import { fixtureHref } from "./href";

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
    : state === "failed"
      ? "danger"
      : state === "waiting-for-approval" ||
          state === "paused" ||
          state === "cancelled"
        ? "warning"
        : "neutral";

/** 02.01: the run works over the three sources defined by 05.01. */
export function researchView(): ResearchProgressView {
  const run = sampleRun(6);
  return {
    title: "Anduril meeting brief",
    context: "Anduril · Started 2 minutes ago",
    request:
      "Research recent developments, analyze open commitments, and create a sourced meeting brief.",
    plan: meetingBriefPlan("Anduril · 3 defined authorized sources"),
    status: {
      label: run.state ? runStateLabels[run.state] : "No status reported",
      tone: runTone(run.state),
    },
    specialists: {
      title: "3 specialists assigned",
      detail: "Research working · Data complete · Document queued",
      href: fixtureHref("specialist-activity"),
    },
    sources: {
      title: "3 sources found",
      breakdown: "2 client records · 1 public source",
      note: "Evidence is checked before it appears in the brief.",
    },
    steer: "Please prioritize the open restoration request.",
    backgroundHref: fixtureHref("background-runs"),
    runHref: fixtureHref("run-detail"),
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
export const specialists: SpecialistView = {
  context: "Meeting brief · Work delegated within this run",
  specialists: [
    specialist(
      "Research",
      "Working",
      "neutral",
      "Find current funding and client developments.",
      "3 sources · checking one date",
      ["Reading 2 client records", "Checking the date on 1 public source"],
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

/** The workspace file receipt exists only once the projected run recorded its artifact. */
const fileReceipt = (run: WorkspaceView) =>
  run.artifacts.length ? "commitments.csv · 2 rows · Verified" : undefined;

export function toolActivityView(): ToolActivityView {
  const run = sampleRun(Infinity);
  const read = run.tools.find((tool) => tool.name === "sample.source_read");
  const complete = read?.resultReference != null;
  const file = fileReceipt(run);
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
    ...(file
      ? {
          receipt: {
            title: "Workspace file created",
            detail: "commitments.csv · Verified · 2 rows · Saved at 10:44 AM",
          },
        }
      : {}),
    expandedHref: fixtureHref("tool-activity-expanded"),
  };
}

/** 02.07A: the same projected read and its output receipt, fact by fact. */
export function expandedToolActivityView(): ExpandedToolActivityView {
  const file = fileReceipt(sampleRun(Infinity));
  return {
    title: "Tool activity · Exact read and output receipt",
    context: "Anduril meeting brief · Authorized client sources",
    receipt: {
      title: "Search and workspace output details",
      facts: [
        { label: "Operation", value: "search authorized client records" },
        { label: "Scope", value: "Anduril · Last 30 days" },
        { label: "Sources requested", value: "tasks, meetings and files" },
        { label: "Returned", value: "23 records · All 2 result pages read" },
        { label: "Excluded", value: "1 encrypted attachment" },
        ...(file ? [{ label: "Output", value: `${file} · 10:44 AM` }] : []),
      ],
      limits:
        "Only the authorized, successfully retrieved records support this receipt. The excluded attachment was not analyzed. This activity view does not expose hidden reasoning or expand source access.",
    },
    backHref: fixtureHref("tool-activity"),
  };
}
