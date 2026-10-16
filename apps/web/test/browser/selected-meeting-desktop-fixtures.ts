import type { Page } from "@playwright/test";
import type { EngagementMeeting } from "../../src/shared/capiro/operations/engagement";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { meeting, setup } from "./next-modules-fixtures";

/** Fresh synthetic current records, using only the canonical meeting/prep fields. */
export function selectedMeetingFixture() {
  const prep = {
    id: "41000000-0000-4000-8000-000000000001",
    status: "generated",
    summary:
      "Synthetic briefing summary: review the evidence needed for the next policy decision.",
    agenda: [
      "Review the synthetic operational objective and current context.",
      "Confirm the decision, accountable owner and follow-through evidence.",
    ],
    talkingPoints: [
      "Explain the synthetic readiness timeline and its assumptions.",
      "Ask which evidence the participants need to evaluate the proposal.",
    ],
    risks: [
      "The synthetic timeline remains uncertain until its assumptions are checked.",
    ],
    followUps: [
      "Record the next decision and its owner after this synthetic meeting.",
    ],
  };
  const note = {
    id: "42000000-0000-4000-8000-000000000001",
    status: "draft",
    body: "Synthetic private meeting notes; saving does not share or approve them.",
    createdAt: "2050-10-12T12:00:00Z",
  };
  const current: EngagementMeeting = {
    ...meeting,
    subject: "Synthetic selected policy briefing",
    startsAt: "2050-10-12T14:00:00Z",
    endsAt: "2050-10-12T15:00:00Z",
    location: "Synthetic video room",
    description: "Synthetic current meeting; no provider action is executed.",
    visibility: "private",
    joinLink: "https://meet.example.test/synthetic-current",
    preps: [prep],
    notes: [{ id: note.id, status: note.status }],
    debriefs: [],
  };
  const second: EngagementMeeting = {
    ...current,
    id: "40000000-0000-4000-8000-000000000002",
    subject: "Synthetic second policy briefing",
    startsAt: "2050-10-14T14:00:00Z",
    endsAt: "2050-10-14T15:00:00Z",
    preps: [],
    notes: [],
  };
  return { current, second, prep, note };
}

export async function setupSelectedMeeting(page: Page) {
  const fixture = selectedMeetingFixture();
  await setup(page, {
    ...moduleRouteFixtures,
    "engagement.meetings": [fixture.current, fixture.second],
    "engagement.library": {
      data: [fixture.current],
      total: 1,
      page: 1,
      limit: 25,
    },
    "engagement.meeting": (input) => {
      const id = (input as { params: { id: string } }).params.id;
      return id === fixture.current.id ? fixture.current : fixture.second;
    },
    "engagement.notes": [fixture.note],
    "engagement.debriefs": [],
  });
  return fixture;
}
