import {
  RoutinesScreen,
  type RoutineRow,
} from "../../screens/routines/RoutinesScreen";
import { RoutineEditorScreen } from "../../screens/routines/RoutineEditorScreen";
import {
  RoutineDetailScreen,
  type RoutineDetailView,
} from "../../screens/routines/RoutineDetailScreen";
import { RoutineHistoryScreen } from "../../screens/routines/RoutineHistoryScreen";
import { fixtureHref, fixtureUnavailable } from "./href";
import {
  cancelledHistory,
  disabledHistory,
  editor,
  editRoutine,
  history,
  pausedHistory,
} from "./routines-history";
import type { FixtureScreen } from "./types";

const routines: readonly RoutineRow[] = [
  {
    id: "rt-monday",
    name: "Monday meeting preparation",
    client: "Anduril",
    nextRun: "19 Oct, 9:00 AM ET",
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

const detail: RoutineDetailView = {
  name: "Monday meeting preparation",
  owner: "Owned by Jordan Clayton · Created 9 Oct",
  summary: [
    { label: "Status", value: "Active", detail: "Current permissions apply" },
    { label: "Next run", value: "19 Oct", detail: "9:00 AM America/New_York" },
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
  editHref: fixtureHref("edit-routine"),
  historyHref: fixtureHref("routine-history"),
};

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
    slug: "edit-routine",
    figmaId: "08.02A",
    figmaNode: "3024:31132",
    title: "Edit routine",
    Screen: () => (
      <RoutineEditorScreen
        view={editRoutine}
        unavailable={fixtureUnavailable}
      />
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
      <RoutineHistoryScreen view={history} unavailable={fixtureUnavailable} />
    ),
  },
  {
    slug: "routine-paused",
    figmaId: "08.04A",
    figmaNode: "3024:31351",
    title: "Routine paused",
    Screen: () => (
      <RoutineHistoryScreen
        view={pausedHistory}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "routine-disabled",
    figmaId: "08.04B",
    figmaNode: "3024:31580",
    title: "Routine automatically disabled",
    Screen: () => (
      <RoutineHistoryScreen
        view={disabledHistory}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "routine-cancelled",
    figmaId: "08.04C",
    figmaNode: "3024:31809",
    title: "Routine cancelled",
    Screen: () => (
      <RoutineHistoryScreen
        view={cancelledHistory}
        unavailable={fixtureUnavailable}
      />
    ),
  },
];
