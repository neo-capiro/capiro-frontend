import {
  RoutinesScreen,
  type RoutineRow,
} from "../../screens/routines/RoutinesScreen";
import {
  RoutineEditorScreen,
  type RoutineEditorView,
} from "../../screens/routines/RoutineEditorScreen";
import {
  RoutineDetailScreen,
  type RoutineDetailView,
} from "../../screens/routines/RoutineDetailScreen";
import {
  RoutineHistoryScreen,
  type RoutineRun,
} from "../../screens/routines/RoutineHistoryScreen";
import { fixtureHref, fixtureUnavailable } from "./href";
import type { FixtureScreen } from "./types";

const routines: readonly RoutineRow[] = [
  {
    id: "rt-monday",
    name: "Monday meeting preparation",
    client: "Anduril",
    nextRun: "12 Oct, 9:00 AM ET",
    status: "Active",
    lastOutcome: "Brief ready",
  },
  {
    id: "rt-weekly",
    name: "Weekly client updates",
    client: "Anduril",
    nextRun: "16 Oct, 4:00 PM ET",
    status: "Active",
    lastOutcome: "Needs review",
  },
  {
    id: "rt-digest",
    name: "Monthly source digest",
    client: "General",
    nextRun: "—",
    status: "Paused",
    lastOutcome: "Completed",
  },
  {
    id: "rt-portal",
    name: "Research portal summary",
    client: "Anduril",
    nextRun: "—",
    status: "Disabled",
    lastOutcome: "Access revoked",
  },
];

const editor: RoutineEditorView = {
  draft: {
    name: "Monday meeting preparation",
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
  },
  nextRuns: "Next runs: 12 Oct · 19 Oct · 26 Oct, 9:00 AM America/New_York",
  cancelHref: fixtureHref("routines"),
};

const detail: RoutineDetailView = {
  name: "Monday meeting preparation",
  owner: "Owned by Jordan Clayton · Created 9 Oct",
  summary: [
    { label: "Status", value: "Active", detail: "Current permissions apply" },
    { label: "Next run", value: "12 Oct", detail: "9:00 AM America/New_York" },
    {
      label: "Last output",
      value: "Brief ready",
      detail: "4 pages · Verified",
    },
  ],
  configuration: [
    {
      label: "Instructions",
      value: "Sourced meeting brief with developments and commitments",
    },
    { label: "Client / sources", value: "Anduril · Authorized sources" },
    { label: "Output", value: "New Meri conversation and verified files" },
    { label: "Frequency", value: "Monday, 9:00 AM · America/New_York" },
    {
      label: "Budget / retries",
      value: "Workspace policy; limits include every attempt",
    },
    {
      label: "Actions",
      value: "Drafting only; review required for governed actions",
    },
  ],
  editHref: fixtureHref("routine-editor"),
  historyHref: fixtureHref("routine-history"),
};

const runs: readonly RoutineRun[] = [
  {
    id: "SR-1040",
    status: "Complete",
    output: "Meeting brief v1",
    usage: "$0.64",
    started: "5 Oct, 9:00 AM",
  },
  {
    id: "SR-1023",
    status: "Complete",
    output: "Meeting brief v1",
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

export const routineScreens: readonly FixtureScreen[] = [
  {
    slug: "routines",
    figmaId: "08.01",
    figmaNode: "1064:148241",
    title: "Routines",
    Screen: () => (
      <RoutinesScreen
        routines={routines}
        createHref={fixtureHref("routine-editor")}
        routineHrefs={{ "rt-monday": fixtureHref("routine-detail") }}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "routine-editor",
    figmaId: "08.02",
    figmaNode: "1064:148347",
    title: "Create or edit routine",
    Screen: () => (
      <RoutineEditorScreen view={editor} unavailable={fixtureUnavailable} />
    ),
  },
  {
    slug: "routine-detail",
    figmaId: "08.03",
    figmaNode: "1064:148440",
    title: "Routine detail",
    Screen: () => (
      <RoutineDetailScreen view={detail} unavailable={fixtureUnavailable} />
    ),
  },
  {
    slug: "routine-history",
    figmaId: "08.04",
    figmaNode: "1064:148534",
    title: "Routine history and authority changes",
    Screen: () => (
      <RoutineHistoryScreen
        runs={runs}
        routine="Monday meeting preparation"
        unavailable={fixtureUnavailable}
      />
    ),
  },
];
