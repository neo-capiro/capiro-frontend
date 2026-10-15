import type { RoutineEditorView } from "../../screens/routines/RoutineEditorScreen";
import type {
  RoutineHistoryView,
  RoutineRun,
} from "../../screens/routines/RoutineHistoryScreen";
import { fixtureHref } from "./href";

const routine = "Monday meeting preparation";

const draft: RoutineEditorView["draft"] = {
  name: routine,
  instructions:
    "Create a sourced meeting brief with recent developments and open commitments.",
  scope: "Anduril · Authorized sources",
  initiator: "Jordan Clayton",
  destination: "Meri workspace · New conversation and verified files",
  frequency: "Every Monday",
  startTime: "9:00 AM",
  timezone: "America/New_York",
  budget: "Workspace policy · Per-run limits enforced",
  retry: "Retry transient errors within the same run limit",
  notifications: "In-app completion and approval notifications",
};

/** Next runs follow the selected schedule (every Monday, 9:00 AM New York) from 15 Oct 2026. */
const nextRuns =
  "Next runs: 19 Oct, 26 Oct and 2 Nov 2026 · Mondays at 9:00 AM America/New_York · Preview as of 15 Oct 2026";

/** 08.02 */
export const editor: RoutineEditorView = {
  mode: "create",
  description: "Choose when Meri works and where the output should appear.",
  draft,
  nextRuns,
  cancelHref: fixtureHref("routines"),
};

/** 08.02A: saves the existing routine; it does not create another. */
export const editRoutine: RoutineEditorView = {
  mode: "edit",
  description: `${routine} · Existing routine · Changes are rechecked before the next run.`,
  draft,
  nextRuns,
  cancelHref: fixtureHref("routine-detail"),
};

const runs: readonly RoutineRun[] = [
  {
    id: "SR-1040",
    status: "Complete",
    output: "Meeting brief · 5 Oct · v1",
    usage: "$0.64",
    started: "5 Oct, 9:00 AM",
  },
  {
    id: "SR-1023",
    status: "Complete",
    output: "Meeting brief · 28 Sep · v1",
    usage: "$0.58",
    started: "28 Sep, 9:00 AM",
  },
  {
    id: "SR-1001",
    status: "Failed",
    output: "Partial output",
    usage: "$0.22",
    started: "21 Sep, 9:00 AM",
  },
];

const stateDescription = `${routine} · Each run keeps its own evidence, output and usage record.`;

/** 08.04 */
export const history: RoutineHistoryView = {
  title: "Routine history",
  description: "Every run keeps its own evidence, output and usage record.",
  routine,
  runs,
  state: { kind: "active" },
};

/** 08.04A */
export const pausedHistory: RoutineHistoryView = {
  title: "Routine history · Paused",
  description: stateDescription,
  routine,
  runs,
  state: {
    kind: "paused",
    title: "Paused · No future run is queued",
    body: "Resume only while current scope and authority remain valid. All previous runs remain subject to access and retention policy.",
  },
};

/** 08.04B */
export const disabledHistory: RoutineHistoryView = {
  title: "Routine history · Disabled",
  description: stateDescription,
  routine,
  runs,
  state: {
    kind: "disabled",
    title: "Automatically disabled · Source access changed",
    body: "Revoked sources cannot be reused. Review current access and save a newly authorized scope before re-enabling this routine.",
    reviewAccessHref: fixtureHref("access-changed"),
  },
};

/** 08.04C */
export const cancelledHistory: RoutineHistoryView = {
  title: "Routine history · Cancelled",
  description: stateDescription,
  routine,
  runs,
  state: {
    kind: "cancelled",
    title: "Cancelled · No future runs will start",
    body: "The cancellation is recorded. Past run outputs and receipts remain available only under current access and retention policy. Create a new routine to schedule future work.",
    createHref: fixtureHref("routine-editor"),
  },
};
