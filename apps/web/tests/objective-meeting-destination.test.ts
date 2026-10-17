import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectiveMeetingDestination } from "../src/features/portfolio/calendar/ObjectiveMeetingDestination";
import { operationalResourceHref } from "../src/features/portfolio/objectives/operational/operational-links";

const state = vi.hoisted(() => ({
  query: "",
  selection: "authorized-client",
  selectedClientId: "30000000-0000-4000-8000-000000000001",
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(state.query),
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => ({
    state: state.selection,
    requestedId: state.selectedClientId,
    client: { id: state.selectedClientId },
  }),
}));

const clientId = "30000000-0000-4000-8000-000000000001";
const otherClientId = "30000000-0000-4000-8000-000000000002";
const meetingId = "40000000-0000-4000-8000-000000000001";
const otherMeetingId = "40000000-0000-4000-8000-000000000002";
const render = () =>
  renderToStaticMarkup(
    createElement(ObjectiveMeetingDestination, {
      expectedClientId: clientId,
      children: createElement("span", null, "Calendar meeting read mounted"),
    }),
  );

beforeEach(() => {
  state.query = `meeting=${meetingId}&objectiveMeeting=1`;
  state.selection = "authorized-client";
  state.selectedClientId = clientId;
});

describe("Objective meeting link admission", () => {
  it("routes the exact admitted meeting to its client Portfolio Calendar", () => {
    const resource = {
      selection: { kind: "meeting" as const, id: meetingId },
      title: "Synthetic meeting",
      ownerVersion: { kind: "counter" as const, value: 2 },
      observedAt: "2026-10-17T12:00:00Z",
    };
    expect(
      operationalResourceHref(
        resource,
        [
          {
            kind: "open_resource",
            resource: resource.selection,
            ownerVersion: resource.ownerVersion,
            contentView: "current",
          },
        ],
        clientId,
      ),
    ).toBe(
      `/portfolio/${clientId}/calendar?meeting=${meetingId}&objectiveMeeting=1`,
    );
    expect(render()).toContain("Calendar meeting read mounted");
  });

  it("does not mount Calendar for malformed, duplicate or ambiguous direct links", () => {
    for (const query of [
      "objectiveMeeting=1",
      `meeting=invalid&objectiveMeeting=1`,
      `meeting=${meetingId}&meeting=${otherMeetingId}&objectiveMeeting=1`,
      `meeting=${meetingId}&objectiveMeeting=1&objectiveMeeting=1`,
      `meeting=${meetingId}&objectiveMeeting=invalid`,
      `meeting=${meetingId}&objectiveMeeting=1&clientId=${otherClientId}`,
    ]) {
      state.query = query;
      expect(render()).toContain("This meeting link is invalid.");
      expect(render()).not.toContain("Calendar meeting read mounted");
    }
  });

  it("does not mount Calendar before the selected client is verified", () => {
    state.selection = "loading";
    expect(render()).toContain("Verifying selected client.");
    expect(render()).not.toContain("Calendar meeting read mounted");
    state.selection = "authorized-client";
    state.selectedClientId = otherClientId;
    expect(render()).toContain(
      "This meeting is unavailable in the selected client scope.",
    );
    expect(render()).not.toContain("Calendar meeting read mounted");
  });

  it("leaves ordinary Calendar meeting selections unchanged", () => {
    state.query = "meeting=meeting-one";
    expect(render()).toContain("Calendar meeting read mounted");
  });
});
