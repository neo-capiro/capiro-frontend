import type { Page } from "@playwright/test";
import {
  stafferFixture,
  meeting,
  type CorrectionWrite,
} from "./workspace-staffer-picker-fixture";
import { at, documentId, resumeUrl } from "./workspace-hillday-resume-fixture";
import { clientId } from "./next-modules-fixtures";
import type { SavedMeetingFacts } from "../../src/features/modules/workspace/hillday/meeting-facts-draft";

export const storedFacts: SavedMeetingFacts = {
  subject: "Discussion with the district office",
  location: null,
  startsAt: "2026-11-01T01:30:00.120-04:00",
  endsAt: "2026-11-01T02:30:00.120-05:00",
  timeZone: "America/New_York",
};

export async function factsFixture(
  page: Page,
  options: {
    read?: (
      count: number,
      response: ReturnType<typeof resolution>,
    ) =>
      | Promise<{ json: unknown; status?: number }>
      | { json: unknown; status?: number };
    writeGate?: Promise<void>;
    wrongReceipt?: boolean;
  } = {},
) {
  const inherited = await stafferFixture(page);
  const state = {
    ...inherited,
    facts: { ...storedFacts },
    reads: 0,
    resolves: 0,
    writes: [] as CorrectionWrite[],
  };
  await page.route(
    "**/api/capiro/workspace.hillday.resolution?*",
    async (route) => {
      state.reads++;
      const reply = (await options.read?.(
        state.reads,
        resolution(state.facts),
      )) ?? { json: resolution(state.facts) };
      await route.fulfill(reply).catch(() => {});
    },
  );
  await page.route("**/api/capiro/workspace.hillday.resolve", (route) => {
    state.resolves++;
    const { meetingFacts: _facts, ...postResolution } = resolution(state.facts);
    void _facts;
    return route.fulfill({ json: postResolution });
  });
  await page.route(
    "**/api/capiro/workspace.hillday.correction",
    async (route) => {
      const write = route.request().postDataJSON() as CorrectionWrite;
      state.writes.push(write);
      await options.writeGate;
      const { kind: _kind, ...changes } = write.body;
      void _kind;
      state.facts = { ...state.facts, ...changes };
      await route
        .fulfill({
          json: {
            resolution: {
              ...meeting(1),
              eventId: options.wrongReceipt ? "other-event" : "event-1",
            },
            event: {
              ...state.facts,
              eventId: "event-1",
              kind: "hill",
              source: "manual",
              clientId,
              attendees: [],
              reason: {
                kind: "manual",
                detail: "Synthetic",
                matchedAddresses: [],
              },
            },
          },
        })
        .catch(() => {});
    },
  );
  return state;
}

function resolution(facts: SavedMeetingFacts) {
  return {
    documentId,
    status: "partial",
    resolvedAt: at,
    sources: [],
    meetings: [meeting(1), meeting(2)],
    meetingFacts: [
      { meetingId: "meeting-1", eventId: "event-1", facts },
      { meetingId: "meeting-2", eventId: "event-2", facts: null },
    ],
  };
}

export async function openFactsDialog(page: Page) {
  await page.goto(resumeUrl("resolution"));
  await page
    .getByRole("button", { name: "Edit details", exact: true })
    .first()
    .click();
  return page.getByRole("dialog", {
    name: "Edit meeting details",
    exact: true,
  });
}
