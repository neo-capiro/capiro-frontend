import {
  RoutinesScreen,
  type RoutineRow,
} from "../../screens/routines/RoutinesScreen";
import { fixtureUnavailable } from "./href";
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

export const routineScreens: readonly FixtureScreen[] = [
  {
    slug: "routines",
    figmaId: "08.01",
    figmaNode: "1064:148241",
    title: "Routines",
    Screen: () => (
      <RoutinesScreen routines={routines} unavailable={fixtureUnavailable} />
    ),
  },
];
